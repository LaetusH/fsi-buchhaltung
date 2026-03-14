import { defineEventHandler, readBody } from 'h3'
import { query, withTransaction } from '~/server/utils/db'
import { logFieldChanges } from '~/server/utils/api/audit'
import { requirePermission } from '~/server/utils/api/guards'
import { toDbBoolean } from '~/server/utils/api/request'
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
  const current = await requirePermission(event, 'settings.cost_centres.manage', { touch: false })
  if (!current.ok) return current

  const body = await readBody<SaveCostCentreBody>(event)
  if (!body.code || !body.name) return { ok: false, error: 'Missing fields' }
  const updated = body

  if (updated.is_active === undefined || updated.is_active === null) updated.is_active = true
  const active = toDbBoolean(updated.is_active)

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

        await logFieldChanges({
          entityType: 'cost_centre',
          entityId: updated.id,
          fields,
          previous: existing,
          next: updated,
          userId: current.user.id,
          conn,
        })

        await query(
          `UPDATE cost_centres
          SET code = ?, name = ?, description = ?
          WHERE id = ?`,
          [updated.code, updated.name, updated.description, updated.id],
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
