import { defineEventHandler } from 'h3'
import type { PositionMemberOption } from '~/types/position'
import { query } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/api/guards'
import { normalizeBigInt } from '~/server/utils/normalize'

interface MemberOptionRow {
  id: number
  full_name: string
}

interface GetPositionMemberOptionsSuccess {
  ok: true
  members: PositionMemberOption[]
}

interface GetPositionMemberOptionsError {
  ok: false
  error: string
}

type GetPositionMemberOptionsResponse = GetPositionMemberOptionsSuccess | GetPositionMemberOptionsError

export default defineEventHandler(async (event): Promise<GetPositionMemberOptionsResponse> => {
  const current = await requirePermission(event, 'settings.positions.manage')
  if (!current.ok) return current

  const rows = normalizeBigInt(await query<MemberOptionRow[]>(`
    SELECT
      m.id,
      TRIM(CONCAT(m.first_name, ' ', m.last_name)) AS full_name
    FROM members m
    ORDER BY m.last_name ASC, m.first_name ASC
  `)) as MemberOptionRow[]

  return {
    ok: true,
    members: rows.map(row => ({
      id: Number(row.id),
      full_name: String(row.full_name),
    })),
  }
})
