import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { normalizeBigInt } from '~/server/utils/normalize'
import { requirePermission } from '~/server/utils/api/guards'
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
  const current = await requirePermission(event, 'cost_centres.view')
  if (!current.ok) return current

  const rows = await query(`
    SELECT id, code, name, is_active, description, parent_id
    FROM cost_centres
    ORDER BY code ASC
  `) as CostCentreRow[]

  return { ok: true, costCentres: normalizeBigInt(rows) as CostCentreRow[] }
})
