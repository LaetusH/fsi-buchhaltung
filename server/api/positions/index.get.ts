import { defineEventHandler } from 'h3'
import type { PositionRow } from '~/types/position'
import { normalizeBigInt } from '~/server/utils/normalize'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'

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
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  const rows = await query(`
    SELECT id, code, name, is_active, description, created_at
    FROM positions
    ORDER BY code ASC
  `) as PositionRow[]

  return { ok: true, positions: normalizeBigInt(rows) as PositionRow[] }
})
