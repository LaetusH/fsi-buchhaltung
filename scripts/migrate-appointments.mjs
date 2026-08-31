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

const TABLE_DEFINITIONS = [
  ['appointment_types', `
    CREATE TABLE appointment_types (
      id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(127) NOT NULL,
      color VARCHAR(16) NOT NULL DEFAULT '#3b82f6',
      icon VARCHAR(127) NULL,
      sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      description TEXT NULL
    )
  `],
  ['appointments', `
    CREATE TABLE appointments (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      type_id SMALLINT UNSIGNED NULL,
      title VARCHAR(255) NOT NULL,
      agenda MEDIUMTEXT NULL,
      location VARCHAR(255) NULL,
      starts_at DATETIME NOT NULL,
      ends_at DATETIME NOT NULL,
      all_day TINYINT(1) NOT NULL DEFAULT 0,
      status ENUM('active','cancelled') NOT NULL DEFAULT 'active',
      recurrence_freq ENUM('daily','weekly','monthly') NULL,
      recurrence_interval TINYINT UNSIGNED NOT NULL DEFAULT 1,
      recurrence_weekdays VARCHAR(32) NULL,
      recurrence_monthly_mode ENUM('day_of_month','weekday_of_month') NULL,
      recurrence_until DATE NULL,
      recurrence_count SMALLINT UNSIGNED NULL,
      notify_on_create TINYINT(1) NOT NULL DEFAULT 1,
      notify_on_change TINYINT(1) NOT NULL DEFAULT 1,
      notify_reminder TINYINT(1) NOT NULL DEFAULT 1,
      reminder_lead_minutes VARCHAR(64) NULL,
      created_by BIGINT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_appointments_starts_at (starts_at),
      FOREIGN KEY (type_id) REFERENCES appointment_types(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `],
  ['appointment_occurrence_overrides', `
    CREATE TABLE appointment_occurrence_overrides (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      appointment_id BIGINT UNSIGNED NOT NULL,
      occurrence_date DATETIME NOT NULL,
      is_cancelled TINYINT(1) NOT NULL DEFAULT 0,
      title VARCHAR(255) NULL,
      agenda MEDIUMTEXT NULL,
      location VARCHAR(255) NULL,
      starts_at DATETIME NULL,
      ends_at DATETIME NULL,
      UNIQUE KEY unique_appointment_occurrence (appointment_id, occurrence_date),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
    )
  `],
  ['appointment_subdivisions', `
    CREATE TABLE appointment_subdivisions (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      appointment_id BIGINT UNSIGNED NOT NULL,
      subdivision_id MEDIUMINT UNSIGNED NOT NULL,
      UNIQUE KEY unique_appointment_subdivision (appointment_id, subdivision_id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
      FOREIGN KEY (subdivision_id) REFERENCES subdivisions(id)
    )
  `],
  ['appointment_members', `
    CREATE TABLE appointment_members (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      appointment_id BIGINT UNSIGNED NOT NULL,
      member_id BIGINT UNSIGNED NOT NULL,
      UNIQUE KEY unique_appointment_member (appointment_id, member_id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id)
    )
  `],
  ['appointment_responses', `
    CREATE TABLE appointment_responses (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      appointment_id BIGINT UNSIGNED NOT NULL,
      member_id BIGINT UNSIGNED NOT NULL,
      occurrence_date DATETIME NOT NULL,
      response ENUM('yes','no','maybe') NOT NULL,
      comment VARCHAR(255) NULL,
      responded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_appointment_response (appointment_id, member_id, occurrence_date),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id)
    )
  `],
]

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

async function getDefaultRoleId(conn) {
  const rows = await conn.query(
    `SELECT id
     FROM roles
     WHERE is_default = 1
       AND is_active = 1
     ORDER BY id ASC
     LIMIT 1`,
  )
  return rows.length > 0 ? Number(rows[0].id) : null
}

async function migrateAppointments() {
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
  })

  let conn

  try {
    conn = await pool.getConnection()
    const rows = await conn.query('SELECT DATABASE() AS db_name')
    const databaseName = rows[0]?.db_name?.trim()
    if (!databaseName) throw new Error('Failed to resolve current database name')

    // Ordered: the FKs of the later tables point at the earlier ones.
    for (const [tableName, ddl] of TABLE_DEFINITIONS) {
      if (await tableExists(conn, databaseName, tableName)) continue
      await conn.query(ddl)
      console.log(`migrate-appointments: created ${tableName}`)
    }

    // ensureRole() in seed-admin.mjs only seeds permissions when it *creates* a role, so an
    // already-seeded install needs the grant here.
    const defaultRoleId = await getDefaultRoleId(conn)
    if (defaultRoleId) {
      await conn.query(
        `INSERT IGNORE INTO role_permissions (role_id, permission_key) VALUES (?, 'calendar.view')`,
        [defaultRoleId],
      )
      console.log(`migrate-appointments: granted calendar.view to default role ${defaultRoleId}`)
    } else {
      console.log('migrate-appointments: no default role found, skipping permission grant')
    }

    console.log('migrate-appointments: complete')
  }
  finally {
    if (conn) conn.release()
    await pool.end()
  }
}

migrateAppointments().catch((error) => {
  const errorCode = error?.code || error?.cause?.code
  if (errorCode === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR' || errorCode === 'ER_ACCESS_DENIED_ERROR') {
    const attemptedUser = DB_AUDIT_SETUP_USER || DB_USER
    const attemptedPasswordVar = DB_AUDIT_SETUP_USER ? 'DB_AUDIT_SETUP_PASSWORD' : 'DB_PASSWORD'
    console.error(
      `migrate-appointments: database authentication failed for user "${attemptedUser}". ` +
      `Check DB_HOST/DB_PORT/DB_NAME and the ${attemptedPasswordVar} value in .env.`,
    )
  }
  console.error('migrate-appointments: failed', error)
  process.exit(1)
})
