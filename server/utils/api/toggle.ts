import type mariadb from 'mariadb'
import { query, withTransaction } from '~/server/utils/db'
import { logChange } from '~/server/utils/changeLogger'
import { toDbBoolean } from '~/server/utils/api/request'

interface ToggleActiveOptions<T extends Record<string, any>> {
  table: string
  entityType: string
  id: number
  isActive: boolean
  userId: number
  notFoundMessage: string
}

export async function toggleActiveRecord<T extends Record<string, any>>({
  table,
  entityType,
  id,
  isActive,
  userId,
  notFoundMessage,
}: ToggleActiveOptions<T>) {
  const active = toDbBoolean(isActive)

  return withTransaction(async (conn: mariadb.PoolConnection) => {
    const existingRows = await query<T[]>(
      `SELECT * FROM ${table} WHERE id = ? LIMIT 1`,
      [id],
      conn,
    )

    if (!existingRows.length) {
      return { ok: false as const, error: notFoundMessage }
    }

    await logChange({
      entityType,
      entityId: id,
      subEntityType: null,
      subEntityId: null,
      field: 'is_active',
      oldValue: existingRows[0]?.is_active,
      newValue: active,
      userId,
    }, conn)

    await query(
      `UPDATE ${table} SET is_active = ? WHERE id = ?`,
      [active, id],
      conn,
    )

    return { ok: true as const }
  })
}
