import mariadb from 'mariadb'

const {
  DB_HOST = 'buchhaltung-db-local',
  DB_PORT = '3307',
  DB_USER = 'fsi',
  DB_PASSWORD = 'fsi_password',
  DB_NAME = 'fsi_buchhaltung',
  DB_AUDIT_SETUP_USER,
  DB_AUDIT_SETUP_PASSWORD,
  DB_CONN_LIMIT = '2',
} = process.env

const DEFAULT_SETTINGS = [
  ['notifications_enabled', 'true'],
  ['notifications_channels_enabled', JSON.stringify({ in_app: true, email: true, push: false })],
  // Per-type overrides; empty means every type follows the defaults in config/notificationTypes.ts.
  ['notifications_type_settings', '{}'],
  ['notifications_lead_times', JSON.stringify({
    'shift.reminder': [1440, 120],
    'shift.understaffed': [2880],
    'task.deadline_reminder': [2880, 480],
    'event.reminder': [10080, 1440],
  })],
  ['notifications_templates', '{}'],
  ['notifications_email_from_name', ''],
  ['notifications_email_subject_prefix', ''],
  ['notifications_email_footer', ''],
  ['notifications_quiet_hours', JSON.stringify({ enabled: false, start: '22:00', end: '07:00' })],
  ['notifications_retention_days', '365'],
  // How long an in-app message stays in the bell, independent of the history retention above.
  ['notifications_inbox_retention_days', '30'],
]

async function columnType(conn, databaseName, tableName, columnName) {
  const rows = await conn.query(
    `SELECT DATA_TYPE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [databaseName, tableName, columnName],
  )
  return rows[0]?.DATA_TYPE ?? null
}

/**
 * `created_at` started out as a TIMESTAMP, which MySQL converts between UTC and the session time
 * zone on every read and write — while every other notification timestamp (`scheduled_for`,
 * `sent_at`, `cancelled_at`, `read_at`) is a timezone-naive DATETIME holding the association's local
 * wall clock, like the rest of the app. Reading the table with a session in Europe/Berlin therefore
 * showed `created_at` one or two hours ahead of the `sent_at` next to it. The connection below runs
 * with time_zone = UTC, the same frame the values were written in, so the conversion keeps the
 * stored wall clock exactly as it is.
 */
async function convertCreatedAtToDatetime(conn, databaseName, tableName) {
  if (!(await tableExists(conn, databaseName, tableName))) return
  if ((await columnType(conn, databaseName, tableName, 'created_at')) !== 'timestamp') return

  await conn.query(`ALTER TABLE ${tableName} MODIFY created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`)
  console.log(`migrate-notifications: converted ${tableName}.created_at to DATETIME`)
}

async function tableExists(conn, databaseName, tableName) {
  const rows = await conn.query(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
     LIMIT 1`,
    [databaseName, tableName],
  )
  return rows.length > 0
}

async function migrateNotifications() {
  const migrationUser = DB_AUDIT_SETUP_USER || DB_USER
  const migrationPassword = DB_AUDIT_SETUP_USER
    ? (DB_AUDIT_SETUP_PASSWORD ?? '')
    : DB_PASSWORD

  const pool = mariadb.createPool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: migrationUser,
    password: migrationPassword,
    database: DB_NAME,
    connectionLimit: Number(DB_CONN_LIMIT),
    // Same session time zone the application pool uses — see convertCreatedAtToDatetime().
    timezone: 'UTC',
  })

  let conn

  try {
    conn = await pool.getConnection()
    const rows = await conn.query('SELECT DATABASE() AS db_name')
    const databaseName = rows[0]?.db_name?.trim()
    if (!databaseName) throw new Error('Failed to resolve current database name')

    if (!(await tableExists(conn, databaseName, 'notifications'))) {
      await conn.query(`
        CREATE TABLE notifications (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          type_key VARCHAR(63) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
          scheduled_for DATETIME NOT NULL,
          created_by BIGINT UNSIGNED NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          sent_at DATETIME NULL,
          cancelled_at DATETIME NULL,
          recipient_rule TEXT NOT NULL,
          channels VARCHAR(127) NULL,
          payload TEXT NULL,
          subject_override VARCHAR(255) NULL,
          body_override TEXT NULL,
          link_page VARCHAR(63) NULL,
          link_meta VARCHAR(255) NULL,
          dedupe_key VARCHAR(191) NULL,
          UNIQUE KEY uq_notification_dedupe (dedupe_key),
          KEY idx_notification_due (status, scheduled_for),
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `)
      console.log('migrate-notifications: created notifications')
    }

    if (!(await tableExists(conn, databaseName, 'notification_deliveries'))) {
      await conn.query(`
        CREATE TABLE notification_deliveries (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          notification_id BIGINT UNSIGNED NOT NULL,
          member_id BIGINT UNSIGNED NULL,
          user_id BIGINT UNSIGNED NULL,
          channel VARCHAR(20) NOT NULL,
          address VARCHAR(255) NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          subject VARCHAR(255) NULL,
          body TEXT NULL,
          attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
          next_attempt_at DATETIME NULL,
          sent_at DATETIME NULL,
          read_at DATETIME NULL,
          error VARCHAR(500) NULL,
          unsubscribe_token CHAR(64) NULL,
          KEY idx_delivery_inbox (user_id, channel, read_at, id),
          KEY idx_delivery_retry (status, next_attempt_at),
          UNIQUE KEY uq_delivery (notification_id, channel, member_id, user_id),
          FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
          FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `)
      console.log('migrate-notifications: created notification_deliveries')
    }

    if (!(await tableExists(conn, databaseName, 'notification_preferences'))) {
      await conn.query(`
        CREATE TABLE notification_preferences (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          subject_type VARCHAR(10) NOT NULL,
          subject_id BIGINT UNSIGNED NOT NULL,
          type_key VARCHAR(63) NOT NULL,
          channel VARCHAR(20) NOT NULL,
          enabled TINYINT(1) NOT NULL,
          UNIQUE KEY uq_preference (subject_type, subject_id, type_key, channel)
        )
      `)
      console.log('migrate-notifications: created notification_preferences')
    }

    if (!(await tableExists(conn, databaseName, 'notification_push_subscriptions'))) {
      await conn.query(`
        CREATE TABLE notification_push_subscriptions (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          user_id BIGINT UNSIGNED NOT NULL,
          endpoint VARCHAR(500) NOT NULL,
          p256dh VARCHAR(255) NOT NULL,
          auth VARCHAR(255) NOT NULL,
          user_agent VARCHAR(255) NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_used_at DATETIME NULL,
          UNIQUE KEY uq_push_endpoint (endpoint),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `)
      console.log('migrate-notifications: created notification_push_subscriptions')
    }

    await convertCreatedAtToDatetime(conn, databaseName, 'notifications')
    await convertCreatedAtToDatetime(conn, databaseName, 'notification_push_subscriptions')

    // The separate understaffing switch was replaced by the per-type switches in the notification
    // settings ('notifications_type_settings'), so its setting row is dead weight.
    const removed = await conn.query(`DELETE FROM app_settings WHERE setting_key = 'notifications_understaffed_enabled'`)
    if (removed.affectedRows) console.log('migrate-notifications: removed obsolete notifications_understaffed_enabled setting')

    for (const [key, value] of DEFAULT_SETTINGS) {
      await conn.query(
        `INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES (?, ?)`,
        [key, value],
      )
    }
    console.log('migrate-notifications: seeded default app_settings rows')

    console.log('migrate-notifications: complete')
  }
  finally {
    if (conn) conn.release()
    await pool.end()
  }
}

migrateNotifications().catch((error) => {
  const errorCode = error?.code || error?.cause?.code
  if (errorCode === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR' || errorCode === 'ER_ACCESS_DENIED_ERROR') {
    const attemptedUser = DB_AUDIT_SETUP_USER || DB_USER
    const attemptedPasswordVar = DB_AUDIT_SETUP_USER ? 'DB_AUDIT_SETUP_PASSWORD' : 'DB_PASSWORD'
    console.error(
      `migrate-notifications: database authentication failed for user "${attemptedUser}". ` +
      `Check DB_HOST/DB_PORT/DB_NAME and the ${attemptedPasswordVar} value in .env.`,
    )
  }
  console.error('migrate-notifications: failed', error)
  process.exit(1)
})
