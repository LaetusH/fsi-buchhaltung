import { defineEventHandler, readBody } from 'h3'
import type { PositionRow, SavePositionBody } from '~/types/position'
import { query, withTransaction } from '~/server/utils/db'
import { normalizeBigInt } from '~/server/utils/normalize'
import { logFieldChanges } from '~/server/utils/api/audit'
import { requirePermission } from '~/server/utils/api/guards'
import { toDbBoolean } from '~/server/utils/api/request'

interface SavePositionSuccess {
  ok: true
  id: number
}

interface SavePositionError {
  ok: false
  error: string
}

type SavePositionResponse = SavePositionSuccess | SavePositionError

interface MysqlError extends Error {
  code?: string
}

export default defineEventHandler(async (event): Promise<SavePositionResponse> => {
  const current = await requirePermission(event, 'settings.positions.manage', { touch: false })
  if (!current.ok) return current

  const body = await readBody<SavePositionBody>(event)
  if (!body.code || !body.name) return { ok: false, error: 'Missing fields' }
  const updated = body

  if (updated.is_active === undefined || updated.is_active === null) updated.is_active = true
  const active = toDbBoolean(updated.is_active)

  try {
    return await withTransaction(async (conn) => {
      if (updated.id && updated.id > 0) {
        const existingRows: PositionRow[] = await query(
          `SELECT * FROM positions WHERE id = ? LIMIT 1`,
          [updated.id],
          conn
        )

        if (!existingRows.length) return { ok: false, error: 'No matching positions in database' }
        const existing = existingRows[0]

        const fields = ['code', 'name', 'description'] as (keyof SavePositionBody)[]

        await logFieldChanges({
          entityType: 'position',
          entityId: updated.id,
          fields,
          previous: existing,
          next: updated,
          userId: current.user.id,
          conn,
        })

        await query(
          `UPDATE positions
            SET code = ?, name = ?, description = ?
          WHERE id = ?`,
          [updated.code, updated.name, updated.description, updated.id],
          conn
        )

        return { ok: true, id: updated.id }
      }

      const res = await query(
        `INSERT INTO positions (code, name, is_active, description, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [updated.code, updated.name, active, updated.description, current.user.id],
        conn
      )

      return { ok: true, id: normalizeBigInt(res.insertId) }
    })
  } catch (err: unknown) {
    const error = err as MysqlError
    return { ok: false, error: `An error occured while saving the position: ${error.code ?? 'DB_ERROR'}` }
  }
})
