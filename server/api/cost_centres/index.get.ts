import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import { normalizeBigInt } from '~/server/utils/normalize'
import type { CostCentreRow } from '~/types/costCentre'

interface GetCostCentresSuccess {
  ok: true
  costCentres: CostCentreRow[]
}

interface GetCostCentresError {
  ok: false
  error: string
}

type GetCostCentresResponse = GetCostCentresSuccess | GetCostCentresError

export default defineEventHandler(async (event): Promise<GetCostCentresResponse> => {
  const current = await getCurrentUserFromEvent(event, true )
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  const rows = await query(`
    SELECT id, code, name, is_active, description, created_at
    FROM cost_centres
    ORDER BY code ASC
  `) as CostCentreRow[]

  return { ok: true, costCentres: normalizeBigInt(rows) as CostCentreRow[] }
})