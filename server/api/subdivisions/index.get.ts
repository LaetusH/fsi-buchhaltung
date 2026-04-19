import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/api/guards'
import { normalizeBigInt } from '~/server/utils/normalize'
import { parseMemberStatus } from '~/server/utils/members'
import type { SubdivisionMember, SubdivisionRow } from '~/types/subdivision'

interface SubdivisionBaseRow {
  id: number
  code: string
  name: string
  is_active: boolean
  description: string | null
}

interface SubdivisionMemberRow {
  subdivision_id: number
  member_id: number
  first_name: string
  last_name: string
  status: string
}

interface GetSubdivisionsSuccess {
  ok: true
  subdivisions: SubdivisionRow[]
}

interface GetSubdivisionsError {
  ok: false
  error: string
}

type GetSubdivisionsResponse = GetSubdivisionsSuccess | GetSubdivisionsError

export default defineEventHandler(async (event): Promise<GetSubdivisionsResponse> => {
  const current = await requirePermission(event, 'subdivisions.view')
  if (!current.ok) return current

  const subdivisionRows = normalizeBigInt(await query<SubdivisionBaseRow[]>(`
    SELECT id, code, name, is_active, description
    FROM subdivisions
    ORDER BY code ASC, name ASC
  `)) as SubdivisionBaseRow[]

  const memberRows = normalizeBigInt(await query<SubdivisionMemberRow[]>(`
    SELECT
      sm.subdivision_id,
      sm.member_id,
      m.first_name,
      m.last_name,
      m.status
    FROM subdivision_members sm
    JOIN members m ON m.id = sm.member_id
    ORDER BY m.last_name ASC, m.first_name ASC
  `)) as SubdivisionMemberRow[]

  const membersBySubdivision = new Map<number, SubdivisionMember[]>()

  for (const row of memberRows) {
    const bucket = membersBySubdivision.get(Number(row.subdivision_id)) ?? []
    const firstName = String(row.first_name)
    const lastName = String(row.last_name)

    bucket.push({
      id: Number(row.member_id),
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`.trim(),
      status: parseMemberStatus(String(row.status)),
    })

    membersBySubdivision.set(Number(row.subdivision_id), bucket)
  }

  return {
    ok: true,
    subdivisions: subdivisionRows.map(row => ({
      id: Number(row.id),
      code: String(row.code),
      name: String(row.name),
      is_active: Boolean(row.is_active),
      description: row.description ? String(row.description) : null,
      members: membersBySubdivision.get(Number(row.id)) ?? [],
    })),
  }
})
