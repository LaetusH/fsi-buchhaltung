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
  ['audit_retention_days', '1095'],
  ['audit_retention_finance_days', '0'],
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

async function columnExists(conn, databaseName, tableName, columnName) {
  const rows = await conn.query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [databaseName, tableName, columnName],
  )
  return rows.length > 0
}

async function indexExists(conn, databaseName, tableName, indexName) {
  const rows = await conn.query(
    `SELECT INDEX_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?
     LIMIT 1`,
    [databaseName, tableName, indexName],
  )
  return rows.length > 0
}

async function migrateAuditLog() {
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

    if (!(await tableExists(conn, databaseName, 'entity_versions'))) {
      console.log('migrate-audit-log: entity_versions table does not exist yet, skipping (created by ensure-audit-infrastructure)')
    } else {
      if (!(await columnExists(conn, databaseName, 'entity_versions', 'change_group_id'))) {
        await conn.query(`ALTER TABLE entity_versions ADD COLUMN change_group_id CHAR(36) NULL`)
        console.log('migrate-audit-log: added entity_versions.change_group_id')
      }

      if (!(await indexExists(conn, databaseName, 'entity_versions', 'idx_entity_versions_change_group'))) {
        await conn.query(`ALTER TABLE entity_versions ADD INDEX idx_entity_versions_change_group (change_group_id, id)`)
        console.log('migrate-audit-log: added idx_entity_versions_change_group')
      }
    }

    for (const [key, value] of DEFAULT_SETTINGS) {
      await conn.query(
        `INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES (?, ?)`,
        [key, value],
      )
    }
    console.log('migrate-audit-log: seeded default app_settings rows')

    console.log('migrate-audit-log: complete')
  } finally {
    if (conn) conn.release()
    await pool.end()
  }
}

migrateAuditLog().catch((error) => {
  const errorCode = error?.code || error?.cause?.code
  if (errorCode === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR' || errorCode === 'ER_ACCESS_DENIED_ERROR') {
    const attemptedUser = DB_AUDIT_SETUP_USER || DB_USER
    const attemptedPasswordVar = DB_AUDIT_SETUP_USER ? 'DB_AUDIT_SETUP_PASSWORD' : 'DB_PASSWORD'
    console.error(
      `migrate-audit-log: database authentication failed for user "${attemptedUser}". ` +
      `Check DB_HOST/DB_PORT/DB_NAME and the ${attemptedPasswordVar} value in .env.`,
    )
  }
  console.error('migrate-audit-log: failed', error)
  process.exit(1)
})
