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

async function getCurrentDatabaseName(conn) {
  const rows = await conn.query('SELECT DATABASE() AS db_name')
  const databaseName = rows[0]?.db_name?.trim()

  if (!databaseName) {
    throw new Error('Failed to resolve current database name for event planning migration')
  }

  return databaseName
}

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

async function ensureEventShiftSlotsTable(conn, databaseName) {
  if (await tableExists(conn, databaseName, 'event_shift_slots')) {
    return
  }

  await conn.query(
    `CREATE TABLE event_shift_slots (
       id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
       event_id BIGINT UNSIGNED NOT NULL,
       name VARCHAR(255) NOT NULL,
       starts_at DATETIME NOT NULL,
       ends_at DATETIME NOT NULL,
       required_people SMALLINT UNSIGNED NOT NULL DEFAULT 1,
       FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
     )`,
  )
  console.log('migrate-event-planning: created event_shift_slots')
}

async function ensureEventShiftMembersTable(conn, databaseName) {
  if (await tableExists(conn, databaseName, 'event_shift_members')) {
    return
  }

  await conn.query(
    `CREATE TABLE event_shift_members (
       shift_id BIGINT UNSIGNED NOT NULL,
       member_id BIGINT UNSIGNED NOT NULL,
       PRIMARY KEY (shift_id, member_id),
       FOREIGN KEY (shift_id) REFERENCES event_shift_slots(id) ON DELETE CASCADE,
       FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
     )`,
  )
  console.log('migrate-event-planning: created event_shift_members')
}

async function ensureEventChecklistTemplatesTable(conn, databaseName) {
  if (await tableExists(conn, databaseName, 'event_checklist_templates')) {
    return
  }

  await conn.query(
    `CREATE TABLE event_checklist_templates (
       id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
       title VARCHAR(255) NOT NULL,
       description TEXT NOT NULL
     )`,
  )
  console.log('migrate-event-planning: created event_checklist_templates')
}

async function ensureEventChecklistTemplateItemsTable(conn, databaseName) {
  if (await tableExists(conn, databaseName, 'event_checklist_template_items')) {
    return
  }

  await conn.query(
    `CREATE TABLE event_checklist_template_items (
       id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
       template_id BIGINT UNSIGNED NOT NULL,
       label VARCHAR(255) NOT NULL,
       position SMALLINT UNSIGNED NOT NULL,
       FOREIGN KEY (template_id) REFERENCES event_checklist_templates(id) ON DELETE CASCADE
     )`,
  )
  console.log('migrate-event-planning: created event_checklist_template_items')
}

async function ensureEventChecklistsTable(conn, databaseName) {
  if (await tableExists(conn, databaseName, 'event_checklists')) {
    return
  }

  await conn.query(
    `CREATE TABLE event_checklists (
       id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
       event_id BIGINT UNSIGNED NOT NULL,
       title VARCHAR(255) NOT NULL,
       description TEXT NOT NULL,
       FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
     )`,
  )
  console.log('migrate-event-planning: created event_checklists')
}

async function ensureEventChecklistItemsTable(conn, databaseName) {
  if (await tableExists(conn, databaseName, 'event_checklist_items')) {
    return
  }

  await conn.query(
    `CREATE TABLE event_checklist_items (
       id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
       checklist_id BIGINT UNSIGNED NOT NULL,
       label VARCHAR(255) NOT NULL,
       is_done TINYINT(1) NOT NULL DEFAULT 0,
       position SMALLINT UNSIGNED NOT NULL,
       FOREIGN KEY (checklist_id) REFERENCES event_checklists(id) ON DELETE CASCADE
     )`,
  )
  console.log('migrate-event-planning: created event_checklist_items')
}

async function ensureEventTasksTable(conn, databaseName) {
  if (await tableExists(conn, databaseName, 'event_tasks')) {
    return
  }

  await conn.query(
    `CREATE TABLE event_tasks (
       id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
       event_id BIGINT UNSIGNED NOT NULL,
       title VARCHAR(255) NOT NULL,
       status VARCHAR(20) NOT NULL DEFAULT 'open',
       deadline VARCHAR(20) NULL,
       position SMALLINT UNSIGNED NOT NULL DEFAULT 0,
       FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
     )`,
  )
  console.log('migrate-event-planning: created event_tasks')
}

async function ensureEventTaskMembersTable(conn, databaseName) {
  if (await tableExists(conn, databaseName, 'event_task_members')) {
    return
  }

  await conn.query(
    `CREATE TABLE event_task_members (
       task_id BIGINT UNSIGNED NOT NULL,
       member_id BIGINT UNSIGNED NOT NULL,
       PRIMARY KEY (task_id, member_id),
       FOREIGN KEY (task_id) REFERENCES event_tasks(id) ON DELETE CASCADE,
       FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
     )`,
  )
  console.log('migrate-event-planning: created event_task_members')
}

async function ensureEventTaskSubdivisionsTable(conn, databaseName) {
  if (await tableExists(conn, databaseName, 'event_task_subdivisions')) {
    return
  }

  await conn.query(
    `CREATE TABLE event_task_subdivisions (
       task_id BIGINT UNSIGNED NOT NULL,
       subdivision_id MEDIUMINT UNSIGNED NOT NULL,
       PRIMARY KEY (task_id, subdivision_id),
       FOREIGN KEY (task_id) REFERENCES event_tasks(id) ON DELETE CASCADE,
       FOREIGN KEY (subdivision_id) REFERENCES subdivisions(id) ON DELETE CASCADE
     )`,
  )
  console.log('migrate-event-planning: created event_task_subdivisions')
}

async function ensureEventColumnsNullable(conn, databaseName) {
  const rows = await conn.query(
    `SELECT COLUMN_NAME, IS_NULLABLE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'events'
       AND COLUMN_NAME IN ('location', 'expected_guests')`,
    [databaseName],
  )

  for (const row of rows) {
    if (row.IS_NULLABLE !== 'NO') continue

    if (row.COLUMN_NAME === 'location') {
      await conn.query(`ALTER TABLE events MODIFY COLUMN location VARCHAR(255) NULL`)
      console.log('migrate-event-planning: made events.location nullable')
    }
    else if (row.COLUMN_NAME === 'expected_guests') {
      await conn.query(`ALTER TABLE events MODIFY COLUMN expected_guests MEDIUMINT UNSIGNED NULL`)
      console.log('migrate-event-planning: made events.expected_guests nullable')
    }
  }
}

async function migrateEventPlanning() {
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

    await ensureEventColumnsNullable(conn, databaseName)
    await ensureEventShiftSlotsTable(conn, databaseName)
    await ensureEventShiftMembersTable(conn, databaseName)
    await ensureEventChecklistTemplatesTable(conn, databaseName)
    await ensureEventChecklistTemplateItemsTable(conn, databaseName)
    await ensureEventChecklistsTable(conn, databaseName)
    await ensureEventChecklistItemsTable(conn, databaseName)
    await ensureEventTasksTable(conn, databaseName)
    await ensureEventTaskMembersTable(conn, databaseName)
    await ensureEventTaskSubdivisionsTable(conn, databaseName)

    console.log('migrate-event-planning: complete')
  } finally {
    if (conn) conn.release()
    await pool.end()
  }
}

migrateEventPlanning().catch((error) => {
  const errorCode = error?.code || error?.cause?.code
  if (errorCode === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR' || errorCode === 'ER_ACCESS_DENIED_ERROR') {
    const attemptedUser = DB_AUDIT_SETUP_USER || DB_USER
    const attemptedPasswordVar = DB_AUDIT_SETUP_USER ? 'DB_AUDIT_SETUP_PASSWORD' : 'DB_PASSWORD'

    console.error(
      `migrate-event-planning: database authentication failed for user "${attemptedUser}". ` +
      `Check DB_HOST/DB_PORT/DB_NAME and the ${attemptedPasswordVar} value in .env.`,
    )
  }

  console.error('migrate-event-planning: failed', error)
  process.exit(1)
})
