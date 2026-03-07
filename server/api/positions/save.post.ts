import { defineEventHandler, readBody } from 'h3'
import type { PositionRow, SavePositionBody } from '~/types/position'
import { logChange } from '~/server/utils/changeLogger'
import { query, withTransaction } from '~/server/utils/db'
import { normalizeBigInt } from '~/server/utils/normalize'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'

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
  const current = await getCurrentUserFromEvent(event, false)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  const body = await readBody<SavePositionBody>(event)
  if (!body.code || !body.name) return { ok: false, error: 'Missing fields' }
  const updated = body

  if (updated.is_active === undefined || updated.is_active === null) updated.is_active = true
  const active = updated.is_active ? 1 : 0

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

        for (const field of fields) {
          await logChange({
            entityType: 'position',
            entityId: updated.id,
            subEntityType: null,
            subEntityId: null,
            field,
            oldValue: existing[field],
            newValue: updated[field],
            userId: current.user.id,
          }, conn)
        }

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
