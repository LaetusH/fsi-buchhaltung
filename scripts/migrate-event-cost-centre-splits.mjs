import mariadb from 'mariadb'

const {
  DB_HOST = 'db',
  DB_PORT = '3306',
  DB_USER = 'fsi',
  DB_PASSWORD = 'fsi_password',
  DB_NAME = 'fsi_buchhaltung',
  DB_CONN_LIMIT = '2',
  EVENT_COST_CENTRE_SPLITS_MIGRATION_SPHERE_ID,
} = process.env

const TABLE_NAME = 'event_cost_centre_splits'
const SPHERE_FK_NAME = 'fk_event_cost_centre_splits_sphere'

function parsePositiveInteger(value) {
  if (value === undefined || value === null || value === '') return null

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
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

async function loadColumnMetadata(conn, databaseName, tableName, columnName) {
  const rows = await conn.query(
    `SELECT IS_NULLABLE AS is_nullable
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [databaseName, tableName, columnName],
  )

  return rows[0] ?? null
}

async function foreignKeyExists(conn, databaseName, tableName, columnName, referencedTableName) {
  const rows = await conn.query(
    `SELECT kcu.CONSTRAINT_NAME AS constraint_name
     FROM information_schema.KEY_COLUMN_USAGE kcu
     JOIN information_schema.TABLE_CONSTRAINTS tc
       ON tc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
      AND tc.TABLE_NAME = kcu.TABLE_NAME
      AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
     WHERE kcu.TABLE_SCHEMA = ?
       AND kcu.TABLE_NAME = ?
       AND kcu.COLUMN_NAME = ?
       AND kcu.REFERENCED_TABLE_NAME = ?
       AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
     LIMIT 1`,
    [databaseName, tableName, columnName, referencedTableName],
  )

  return Boolean(rows[0]?.constraint_name)
}

async function getCurrentDatabaseName(conn) {
  const rows = await conn.query('SELECT DATABASE() AS db_name')
  const databaseName = rows[0]?.db_name?.trim()

  if (!databaseName) {
    throw new Error('Failed to resolve current database name for event cost centre split migration')
  }

  return databaseName
}

async function countRows(conn) {
  const rows = await conn.query(`SELECT COUNT(*) AS row_count FROM ${TABLE_NAME}`)
  return Number(rows[0]?.row_count ?? 0)
}

async function loadSphereId(conn, requestedSphereId) {
  if (requestedSphereId) {
    const rows = await conn.query(
      `SELECT id
       FROM spheres
       WHERE id = ?
       LIMIT 1`,
      [requestedSphereId],
    )

    if (!rows.length) {
      throw new Error(
        `EVENT_COST_CENTRE_SPLITS_MIGRATION_SPHERE_ID=${requestedSphereId} does not exist in spheres`,
      )
    }

    return requestedSphereId
  }

  const rows = await conn.query(
    `SELECT id
     FROM spheres
     ORDER BY is_active DESC, id ASC
     LIMIT 1`,
  )

  return rows.length ? Number(rows[0].id) : null
}

async function backfillMissingSphereIds(conn) {
  const rows = await conn.query(
    `SELECT COUNT(*) AS row_count
     FROM ${TABLE_NAME}
     WHERE sphere_id IS NULL`,
  )
  const missingSphereIdCount = Number(rows[0]?.row_count ?? 0)

  if (missingSphereIdCount === 0) return

  const requestedSphereId = parsePositiveInteger(EVENT_COST_CENTRE_SPLITS_MIGRATION_SPHERE_ID)
  const sphereId = await loadSphereId(conn, requestedSphereId)

  if (!sphereId) {
    throw new Error(
      `${TABLE_NAME} contains rows without sphere_id, but no sphere exists to backfill them. ` +
      'Create a sphere or set EVENT_COST_CENTRE_SPLITS_MIGRATION_SPHERE_ID to an existing sphere id.',
    )
  }

  await conn.query(
    `UPDATE ${TABLE_NAME}
     SET sphere_id = ?
     WHERE sphere_id IS NULL`,
    [sphereId],
  )
  console.log(`migrate-event-cost-centre-splits: backfilled ${missingSphereIdCount} rows with sphere_id=${sphereId}`)
}

async function ensureSphereColumnNotNull(conn) {
  await backfillMissingSphereIds(conn)

  await conn.query(
    `ALTER TABLE ${TABLE_NAME}
     MODIFY COLUMN sphere_id TINYINT UNSIGNED NOT NULL`,
  )
  console.log('migrate-event-cost-centre-splits: made sphere_id NOT NULL')
}

async function ensureSphereColumn(conn, rowCount) {
  await conn.query(
    `ALTER TABLE ${TABLE_NAME}
     ADD COLUMN sphere_id TINYINT UNSIGNED NULL AFTER event_id`,
  )
  console.log('migrate-event-cost-centre-splits: added nullable sphere_id column')

  if (rowCount > 0) {
    await backfillMissingSphereIds(conn)
  }

  await ensureSphereColumnNotNull(conn)
}

async function migrateEventCostCentreSplits() {
  const pool = mariadb.createPool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    connectionLimit: Number(DB_CONN_LIMIT),
  })

  let conn

  try {
    conn = await pool.getConnection()
    const databaseName = await getCurrentDatabaseName(conn)

    if (!await tableExists(conn, databaseName, TABLE_NAME)) {
      console.log(`migrate-event-cost-centre-splits: skipped (${TABLE_NAME} does not exist)`)
      return
    }

    if (!await columnExists(conn, databaseName, TABLE_NAME, 'sphere_id')) {
      await ensureSphereColumn(conn, await countRows(conn))
    } else {
      const sphereColumn = await loadColumnMetadata(conn, databaseName, TABLE_NAME, 'sphere_id')
      if (sphereColumn?.is_nullable === 'YES') {
        await ensureSphereColumnNotNull(conn)
      }
    }

    if (!await foreignKeyExists(conn, databaseName, TABLE_NAME, 'sphere_id', 'spheres')) {
      await conn.query(
        `ALTER TABLE ${TABLE_NAME}
         ADD CONSTRAINT ${SPHERE_FK_NAME}
         FOREIGN KEY (sphere_id) REFERENCES spheres(id)`,
      )
      console.log(`migrate-event-cost-centre-splits: added ${SPHERE_FK_NAME}`)
    }

    console.log('migrate-event-cost-centre-splits: complete')
  } finally {
    if (conn) conn.release()
    await pool.end()
  }
}

migrateEventCostCentreSplits().catch((error) => {
  console.error('migrate-event-cost-centre-splits: failed', error)
  process.exit(1)
})
