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

const TABLE_NAME = 'invoices'
const COLUMN_NAME = 'paid_at'

async function tableExists(conn, databaseName, tableName) {
  const rows = await conn.query(
    `SELECT TABLE_NAME AS table_name
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
     LIMIT 1`,
    [databaseName, tableName],
  )

  return Boolean(rows[0]?.table_name)
}

async function columnExists(conn, databaseName, tableName, columnName) {
  const rows = await conn.query(
    `SELECT COLUMN_NAME AS column_name
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [databaseName, tableName, columnName],
  )

  return Boolean(rows[0]?.column_name)
}

async function getCurrentDatabaseName(conn) {
  const rows = await conn.query('SELECT DATABASE() AS db_name')
  const databaseName = rows[0]?.db_name?.trim()

  if (!databaseName) {
    throw new Error('Failed to resolve current database name for invoice paid_at migration')
  }

  return databaseName
}

async function migrateInvoicePaidAt() {
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

    if (!await tableExists(conn, databaseName, TABLE_NAME)) {
      console.log(`migrate-invoice-paid-at: skipped (${TABLE_NAME} does not exist)`)
      return
    }

    if (!await columnExists(conn, databaseName, TABLE_NAME, COLUMN_NAME)) {
      await conn.query(
        `ALTER TABLE ${TABLE_NAME}
         ADD COLUMN ${COLUMN_NAME} DATE NULL AFTER due_date`,
      )
      console.log(`migrate-invoice-paid-at: added nullable ${COLUMN_NAME} column`)
    }

    const result = await conn.query(
      `UPDATE ${TABLE_NAME}
       SET ${COLUMN_NAME} = due_date
       WHERE status = 'paid'
         AND ${COLUMN_NAME} IS NULL`,
    )
    console.log(`migrate-invoice-paid-at: backfilled ${Number(result.affectedRows || 0)} paid invoices with due_date`)

    const clearedResult = await conn.query(
      `UPDATE ${TABLE_NAME}
       SET ${COLUMN_NAME} = NULL
       WHERE status <> 'paid'
         AND ${COLUMN_NAME} IS NOT NULL`,
    )
    console.log(`migrate-invoice-paid-at: cleared ${Number(clearedResult.affectedRows || 0)} payment dates from unpaid invoices`)

    console.log('migrate-invoice-paid-at: complete')
  } finally {
    if (conn) conn.release()
    await pool.end()
  }
}

migrateInvoicePaidAt().catch((error) => {
  const errorCode = error?.code || error?.cause?.code
  if (errorCode === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR' || errorCode === 'ER_ACCESS_DENIED_ERROR') {
    const attemptedUser = DB_AUDIT_SETUP_USER || DB_USER
    const attemptedPasswordVar = DB_AUDIT_SETUP_USER ? 'DB_AUDIT_SETUP_PASSWORD' : 'DB_PASSWORD'

    console.error(
      `migrate-invoice-paid-at: database authentication failed for user "${attemptedUser}". ` +
      `Check DB_HOST/DB_PORT/DB_NAME and the ${attemptedPasswordVar} value in .env.`,
    )
  }

  console.error('migrate-invoice-paid-at: failed', error)
  process.exit(1)
})
