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

async function columnExists(conn) {
  const rows = await conn.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'calendar_token_hash'
     LIMIT 1`,
    [DB_NAME],
  )

  return rows.length > 0
}

async function main() {
  let conn

  try {
    conn = await pool.getConnection()
    if (await columnExists(conn)) {
      console.log('migrate-calendar-token: column already exists')
      return
    }

    await conn.query(
      `ALTER TABLE users
       ADD COLUMN calendar_token_hash CHAR(64) NULL AFTER must_change_password,
       ADD COLUMN calendar_token_created_at DATETIME NULL AFTER calendar_token_hash`,
    )
    console.log('migrate-calendar-token: added users.calendar_token_hash, users.calendar_token_created_at')
  } finally {
    if (conn) conn.release()
    await pool.end()
  }
}

main().catch((err) => {
  const errorCode = err?.code || err?.cause?.code
  if (errorCode === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR' || errorCode === 'ER_ACCESS_DENIED_ERROR') {
    const attemptedPasswordVar = DB_AUDIT_SETUP_USER ? 'DB_AUDIT_SETUP_PASSWORD' : 'DB_PASSWORD'

    console.error(
      `migrate-calendar-token: database authentication failed for user "${migrationUser}". ` +
      `Check DB_HOST/DB_PORT/DB_NAME and the ${attemptedPasswordVar} value in .env.`,
    )
  }

  console.error('migrate-calendar-token: failed', err)
  process.exit(1)
})
