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

async function indexExists(conn, databaseName, tableName, indexName) {
  const rows = await conn.query(
    `SELECT INDEX_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?
     LIMIT 1`,
    [databaseName, tableName, indexName],
  )
  return rows.length > 0
}

async function constraintExists(conn, databaseName, tableName, constraintName) {
  const rows = await conn.query(
    `SELECT CONSTRAINT_NAME
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?
     LIMIT 1`,
    [databaseName, tableName, constraintName],
  )
  return rows.length > 0
}

async function migrateChecklistTaskLink() {
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

    if (!(await columnExists(conn, databaseName, 'event_checklists', 'task_id'))) {
      await conn.query(`ALTER TABLE event_checklists ADD COLUMN task_id BIGINT UNSIGNED NULL`)
      console.log('migrate-checklist-task-link: added task_id column to event_checklists')
    }

    if (!(await indexExists(conn, databaseName, 'event_checklists', 'uq_checklist_task'))) {
      await conn.query(`ALTER TABLE event_checklists ADD UNIQUE KEY uq_checklist_task (task_id)`)
      console.log('migrate-checklist-task-link: added unique key uq_checklist_task')
    }

    if (!(await constraintExists(conn, databaseName, 'event_checklists', 'fk_checklist_task'))) {
      await conn.query(
        `ALTER TABLE event_checklists
         ADD CONSTRAINT fk_checklist_task
         FOREIGN KEY (task_id) REFERENCES event_tasks(id) ON DELETE SET NULL`,
      )
      console.log('migrate-checklist-task-link: added foreign key fk_checklist_task')
    }

    console.log('migrate-checklist-task-link: complete')
  }
  finally {
    if (conn) conn.release()
    await pool.end()
  }
}

migrateChecklistTaskLink().catch((error) => {
  const errorCode = error?.code || error?.cause?.code
  if (errorCode === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR' || errorCode === 'ER_ACCESS_DENIED_ERROR') {
    const attemptedUser = DB_AUDIT_SETUP_USER || DB_USER
    const attemptedPasswordVar = DB_AUDIT_SETUP_USER ? 'DB_AUDIT_SETUP_PASSWORD' : 'DB_PASSWORD'
    console.error(
      `migrate-checklist-task-link: database authentication failed for user "${attemptedUser}". ` +
      `Check DB_HOST/DB_PORT/DB_NAME and the ${attemptedPasswordVar} value in .env.`,
    )
  }
  console.error('migrate-checklist-task-link: failed', error)
  process.exit(1)
})
