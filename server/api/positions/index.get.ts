import { defineEventHandler } from 'h3'
import type { PositionRow } from '~/types/position'
import { normalizeBigInt } from '~/server/utils/normalize'
import { query } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/api/guards'

interface GetPositionsSuccess {
  ok: true
  positions: PositionRow[]
}

interface GetPositionsError {
  ok: false
  error: string
}

type GetPositionsResponse = GetPositionsSuccess | GetPositionsError

export default defineEventHandler(async (event): Promise<GetPositionsResponse> => {
  const current = await requirePermission(event, 'positions.view')
  if (!current.ok) return current

  const rows = await query(`
    SELECT id, code, name, is_active, description
    FROM positions
    ORDER BY code ASC
  `) as PositionRow[]

  return { ok: true, positions: normalizeBigInt(rows) as PositionRow[] }
})
