import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/api/guards'
import { normalizeBigInt } from '~/server/utils/normalize'
import { parseMemberStatus } from '~/server/utils/members'
import type { SubdivisionMemberOption } from '~/types/subdivision'

interface MemberOptionRow {
  id: number
  full_name: string
  status: string
  subject_name: string | null
}

interface GetSubdivisionMemberOptionsSuccess {
  ok: true
  members: SubdivisionMemberOption[]
}

interface GetSubdivisionMemberOptionsError {
  ok: false
  error: string
}

type GetSubdivisionMemberOptionsResponse = GetSubdivisionMemberOptionsSuccess | GetSubdivisionMemberOptionsError

export default defineEventHandler(async (event): Promise<GetSubdivisionMemberOptionsResponse> => {
  const current = await requirePermission(event, 'settings.subdivisions.manage')
  if (!current.ok) return current

  const rows = normalizeBigInt(await query<MemberOptionRow[]>(`
    SELECT
      m.id,
      TRIM(CONCAT(m.first_name, ' ', m.last_name)) AS full_name,
      m.status,
      s.name AS subject_name
    FROM members m
    LEFT JOIN subjects s ON s.id = m.subject
    ORDER BY m.last_name ASC, m.first_name ASC
  `)) as MemberOptionRow[]

  return {
    ok: true,
    members: rows.map(row => ({
      id: Number(row.id),
      full_name: String(row.full_name),
      status: parseMemberStatus(String(row.status)),
      subject_name: row.subject_name ? String(row.subject_name) : null,
    })),
  }
})
