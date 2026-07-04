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

async function columnExists(conn, databaseName, tableName, columnName) {
  const rows = await conn.query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [databaseName, tableName, columnName],
  )
  return rows.length > 0
}

async function migrateShiftTemplates() {
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

    if (!(await columnExists(conn, databaseName, 'event_shift_slots', 'description'))) {
      await conn.query(`ALTER TABLE event_shift_slots ADD COLUMN description TEXT NOT NULL DEFAULT '' AFTER name`)
      console.log('migrate-shift-templates: added description column to event_shift_slots')
    }

    await conn.query(
      `CREATE TABLE IF NOT EXISTS event_shift_templates (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        required_people SMALLINT UNSIGNED NOT NULL DEFAULT 1
      )`,
    )
    console.log('migrate-shift-templates: ensured event_shift_templates table')

    await conn.query(
      `CREATE TABLE IF NOT EXISTS event_shift_type_descriptions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        event_id BIGINT UNSIGNED NOT NULL,
        name_key VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        UNIQUE KEY unique_event_shift_type (event_id, name_key),
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      )`,
    )
    console.log('migrate-shift-templates: ensured event_shift_type_descriptions table')

    console.log('migrate-shift-templates: complete')
  }
  finally {
    if (conn) conn.release()
    await pool.end()
  }
}

migrateShiftTemplates().catch((error) => {
  const errorCode = error?.code || error?.cause?.code
  if (errorCode === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR' || errorCode === 'ER_ACCESS_DENIED_ERROR') {
    const attemptedUser = DB_AUDIT_SETUP_USER || DB_USER
    const attemptedPasswordVar = DB_AUDIT_SETUP_USER ? 'DB_AUDIT_SETUP_PASSWORD' : 'DB_PASSWORD'
    console.error(
      `migrate-shift-templates: database authentication failed for user "${attemptedUser}". ` +
      `Check DB_HOST/DB_PORT/DB_NAME and the ${attemptedPasswordVar} value in .env.`,
    )
  }
  console.error('migrate-shift-templates: failed', error)
  process.exit(1)
})
