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

const SELF_EDIT_ELIGIBLE_FIELDS = [
  'first_name',
  'last_name',
  'birthdate',
  'phone',
  'email',
  'street',
  'street_number',
  'postal_code',
  'city',
  'subject',
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

async function migrateMemberSelfService() {
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

    if (!(await tableExists(conn, databaseName, 'member_self_edit_field_config'))) {
      await conn.query(`
        CREATE TABLE member_self_edit_field_config (
          field_name VARCHAR(63) NOT NULL PRIMARY KEY,
          mode VARCHAR(16) NOT NULL DEFAULT 'locked'
        )
      `)
      console.log('migrate-member-self-service: created member_self_edit_field_config')
    }

    if (!(await tableExists(conn, databaseName, 'member_pending_field_changes'))) {
      await conn.query(`
        CREATE TABLE member_pending_field_changes (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          member_id BIGINT UNSIGNED NOT NULL,
          field_name VARCHAR(63) NOT NULL,
          old_value TEXT NULL,
          new_value TEXT NULL,
          requested_by BIGINT UNSIGNED NOT NULL,
          requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
          FOREIGN KEY (requested_by) REFERENCES users(id),
          UNIQUE KEY uq_member_field (member_id, field_name)
        )
      `)
      console.log('migrate-member-self-service: created member_pending_field_changes')
    }

    for (const fieldName of SELF_EDIT_ELIGIBLE_FIELDS) {
      await conn.query(
        `INSERT IGNORE INTO member_self_edit_field_config (field_name, mode) VALUES (?, 'locked')`,
        [fieldName],
      )
    }
    console.log('migrate-member-self-service: seeded self-edit field config rows')

    const defaultRoleId = await getDefaultRoleId(conn)
    if (defaultRoleId) {
      await conn.query(
        `INSERT IGNORE INTO role_permissions (role_id, permission_key) VALUES (?, 'members.editOwnData')`,
        [defaultRoleId],
      )
      console.log(`migrate-member-self-service: granted members.editOwnData to default role ${defaultRoleId}`)
    } else {
      console.log('migrate-member-self-service: no default role found, skipping permission grant')
    }

    console.log('migrate-member-self-service: complete')
  }
  finally {
    if (conn) conn.release()
    await pool.end()
  }
}

migrateMemberSelfService().catch((error) => {
  const errorCode = error?.code || error?.cause?.code
  if (errorCode === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR' || errorCode === 'ER_ACCESS_DENIED_ERROR') {
    const attemptedUser = DB_AUDIT_SETUP_USER || DB_USER
    const attemptedPasswordVar = DB_AUDIT_SETUP_USER ? 'DB_AUDIT_SETUP_PASSWORD' : 'DB_PASSWORD'
    console.error(
      `migrate-member-self-service: database authentication failed for user "${attemptedUser}". ` +
      `Check DB_HOST/DB_PORT/DB_NAME and the ${attemptedPasswordVar} value in .env.`,
    )
  }
  console.error('migrate-member-self-service: failed', error)
  process.exit(1)
})
