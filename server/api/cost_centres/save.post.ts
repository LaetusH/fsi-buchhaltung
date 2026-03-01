import { defineEventHandler, readBody } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import type { SaveCostCentreBody } from '~/types/costCentre'

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
  const { id, code, name, is_active = true, description } = body

  if (!code || !name) return { ok: false, error: 'Missing fields' }

  const active = 1 ? is_active : 0

  try {
    if (id && id > 0) {
      await query(
        `UPDATE cost_centres
         SET code = ?, name = ?, is_active = ?, description = ?, updated_by = ?
         WHERE id = ?`,
        [code, name, active, description, current.user.id, id]
      )

      return { ok: true, id }
    }

    const res = await query(
      `INSERT INTO cost_centres (code, name, is_active, description, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [code, name, active, description, current.user.id, current.user.id]
    )

    return { ok: true, id: normalizeBigInt(res.insertId) }
  } catch (err: unknown) {
    const error = err as MysqlError
    return { ok: false, error: error.code ?? 'DB_ERROR' }
  }
})