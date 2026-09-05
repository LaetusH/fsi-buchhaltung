import { query, getDbConnection } from '~/server/utils/db'
import { assertTestDatabase } from '../setup/guard'

let cachedTables: string[] | null = null

async function listTables(): Promise<string[]> {
  if (cachedTables) return cachedTables

  const target = assertTestDatabase()
  const rows = await query<Array<{ name: string }>>(
    `SELECT TABLE_NAME AS name
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
    [target.database],
  )

  cachedTables = rows.map(row => row.name)
  return cachedTables
}

async function nonEmptyTables(): Promise<string[]> {
  const tables = await listTables()
  const probe = tables
    .map(table => `SELECT ${JSON.stringify(table)} AS t WHERE EXISTS (SELECT 1 FROM \`${table}\`)`)
    .join(' UNION ALL ')

  const rows = await query<Array<{ t: string }>>(probe)
  return rows.map(row => row.t)
}

export async function resetDatabase() {
  assertTestDatabase()

  const dirty = await nonEmptyTables()
  if (!dirty.length) return

  const conn = await getDbConnection()

  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0')
    for (const table of dirty) {
      await conn.query(`DELETE FROM \`${table}\``)
    }
  } finally {
    await conn.query('SET FOREIGN_KEY_CHECKS = 1')
    conn.release()
  }
}

export async function countRows(table: string, where = '1', params: unknown[] = []) {
  const rows = await query<Array<{ count: number }>>(
    `SELECT COUNT(*) AS count FROM \`${table}\` WHERE ${where}`,
    params,
  )
  return Number(rows[0]?.count ?? 0)
}

export async function auditRowsFor(table: string, recordId: number | string, primaryKeyColumn = 'id') {
  return auditRowsForKey(table, `${primaryKeyColumn}=${recordId}`)
}

export async function auditRowsForKey(table: string, recordKey: string) {
  return query<Array<{
    id: number
    table_name: string
    record_key: string
    operation: string
    state: string | null
    changed_by: number | null
    changed_by_username: string | null
    change_group_id: string | null
  }>>(
    `SELECT id, table_name, record_key, operation, state, changed_by, changed_by_username, change_group_id
     FROM entity_versions
     WHERE table_name = ? AND record_key = ?
     ORDER BY id ASC`,
    [table, String(recordKey)],
  )
}

export function auditState<T = Record<string, any>>(row: { state: string | null }): T {
  return JSON.parse(row.state ?? '{}') as T
}
