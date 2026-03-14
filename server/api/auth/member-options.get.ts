import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/api/guards'

interface MemberOptionRow {
  id: number
  full_name: string
  account: number | null
  account_username: string | null
}

interface GetMemberOptionsSuccess {
  ok: true
  members: MemberOptionRow[]
}

interface GetMemberOptionsError {
  ok: false
  error: string
}

type GetMemberOptionsResponse = GetMemberOptionsSuccess | GetMemberOptionsError

export default defineEventHandler(async (event): Promise<GetMemberOptionsResponse> => {
  const current = await requirePermission(event, 'users.manage')
  if (!current.ok) return current

  const rows = await query(`
    SELECT
      m.id,
      TRIM(CONCAT(m.first_name, ' ', m.last_name)) AS full_name,
      m.account,
      u.username AS account_username
    FROM members m
    LEFT JOIN users u ON u.id = m.account
    ORDER BY m.last_name ASC, m.first_name ASC
  `) as MemberOptionRow[]

  return { ok: true, members: rows }
})
