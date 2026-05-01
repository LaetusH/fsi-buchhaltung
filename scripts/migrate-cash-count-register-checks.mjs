import mariadb from 'mariadb'

const {
  DB_HOST = 'db',
  DB_PORT = '3306',
  DB_USER = 'fsi',
  DB_PASSWORD = 'fsi_password',
  DB_NAME = 'fsi_buchhaltung',
  DB_AUDIT_SETUP_USER,
  DB_AUDIT_SETUP_PASSWORD,
  DB_CONN_LIMIT = '2',
} = process.env

const TABLE_NAME = 'cash_counts'

async function getCurrentDatabaseName(conn) {
  const rows = await conn.query('SELECT DATABASE() AS db_name')
  const databaseName = rows[0]?.db_name?.trim()

  if (!databaseName) {
    throw new Error('Failed to resolve current database name for cash count register check migration')
  }

  return databaseName
}

async function tableExists(conn, databaseName) {
  const rows = await conn.query(
    `SELECT TABLE_NAME AS table_name
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
     LIMIT 1`,
    [databaseName, TABLE_NAME],
  )

  return Boolean(rows[0]?.table_name)
}

async function getColumnNullability(conn, databaseName, columnName) {
  const rows = await conn.query(
    `SELECT IS_NULLABLE AS is_nullable
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [databaseName, TABLE_NAME, columnName],
  )

  return rows[0]?.is_nullable || null
}

async function migrateCashCountRegisterChecks() {
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
    const databaseName = await getCurrentDatabaseName(conn)

    if (!await tableExists(conn, databaseName)) {
      console.log(`migrate-cash-count-register-checks: skipped (${TABLE_NAME} does not exist)`)
      return
    }

    const eventIdNullable = await getColumnNullability(conn, databaseName, 'event_id')
    const countedBeforeAtNullable = await getColumnNullability(conn, databaseName, 'counted_before_at')

    if (eventIdNullable !== 'YES') {
      await conn.query(
        `ALTER TABLE ${TABLE_NAME}
         MODIFY event_id BIGINT UNSIGNED NULL`,
      )
      console.log('migrate-cash-count-register-checks: made event_id nullable')
    }

    if (countedBeforeAtNullable !== 'YES') {
      await conn.query(
        `ALTER TABLE ${TABLE_NAME}
         MODIFY counted_before_at TIMESTAMP NULL`,
      )
      console.log('migrate-cash-count-register-checks: made counted_before_at nullable')
    }

    console.log('migrate-cash-count-register-checks: complete')
  } finally {
    if (conn) conn.release()
    await pool.end()
  }
}

migrateCashCountRegisterChecks().catch((error) => {
  const errorCode = error?.code || error?.cause?.code
  if (errorCode === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR' || errorCode === 'ER_ACCESS_DENIED_ERROR') {
    const attemptedUser = DB_AUDIT_SETUP_USER || DB_USER
    const attemptedPasswordVar = DB_AUDIT_SETUP_USER ? 'DB_AUDIT_SETUP_PASSWORD' : 'DB_PASSWORD'

    console.error(
      `migrate-cash-count-register-checks: database authentication failed for user "${attemptedUser}". ` +
      `Check DB_HOST/DB_PORT/DB_NAME and the ${attemptedPasswordVar} value in .env.`,
    )
  }

  console.error('migrate-cash-count-register-checks: failed', error)
  process.exit(1)
})
