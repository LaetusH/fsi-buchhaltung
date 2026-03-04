import { defineEventHandler, readBody } from 'h3'
import { query, withTransaction } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import type { CostCentreRow, SaveCostCentreBody } from '~/types/costCentre'

interface SaveCostCentreSuccess {
  ok: true
  id: number
}

interface SaveCostCentreError {
  ok: false
  error: string
}

type SaveCostCentreResponse = SaveCostCentreSuccess | SaveCostCentreError

interface MysqlError extends Error {
  code?: string
}

export default defineEventHandler(async (event): Promise<SaveCostCentreResponse> => {
  const current = await getCurrentUserFromEvent(event, false)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  const body = await readBody<SaveCostCentreBody>(event)
  if (!body.code || !body.name) return { ok: false, error: 'Missing fields' }
  const updated = body

  if (updated.is_active === undefined || updated.is_active === null) updated.is_active = true
  const active = updated.is_active ? 1 : 0

  try {
    return await withTransaction(async (conn) => {
      if (updated.id && updated.id > 0) {
        const existingRows: CostCentreRow[] = await query(
          `SELECT * FROM cost_centres WHERE id = ? LIMIT 1`,
          [updated.id],
          conn
        )
      
        if (!existingRows.length) return { ok: false, error: 'No matching cost centres in database' }
        const existing = existingRows[0]

        const fields = ['code', 'name', 'description'] as (keyof SaveCostCentreBody)[]
            
        for (const field of fields) {
          await logChange({
            entityType: 'cost_centre',
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
          `UPDATE cost_centres
          SET code = ?, name = ?, description = ?
          WHERE id = ?`,
          [updated.code, updated.name, updated.description],
          conn
        )

        return { ok: true, id: updated.id }
      }

      const res = await query(
        `INSERT INTO cost_centres (code, name, is_active, description, created_by)
        VALUES (?, ?, ?, ?, ?)`,
        [updated.code, updated.name, active, updated.description, current.user.id],
        conn
      )

      return { ok: true, id: res.insertId }
    })
  } catch (err: unknown) {
    const error = err as MysqlError
    return { ok: false, error: `An error occured while saving the cost centre: ${error.code ?? 'DB_ERROR'}` }
  }
})