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
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'must_change_password'
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
      console.log('migrate-user-password-change-required: column already exists')
      return
    }

    await conn.query(
      `ALTER TABLE users
       ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active`,
    )
    console.log('migrate-user-password-change-required: added users.must_change_password')
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
      `migrate-user-password-change-required: database authentication failed for user "${migrationUser}". ` +
      `Check DB_HOST/DB_PORT/DB_NAME and the ${attemptedPasswordVar} value in .env.`,
    )
  }

  console.error('migrate-user-password-change-required: failed', err)
  process.exit(1)
})
