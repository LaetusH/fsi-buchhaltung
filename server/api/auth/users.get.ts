import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { normalizeBigInt } from '~/server/utils/normalize'
import { requirePermission } from '~/server/utils/api/guards'

interface UserRow {
  id: number
  username: string
  is_active: number
  must_change_password: number
  member_id: number | null
  member_name: string | null
}

interface GetUsersSuccess {
  ok: true
  users: UserRow[]
}

interface GetUsersError {
  ok: false
  error: string
}

type GetUsersResponse = GetUsersSuccess | GetUsersError

export default defineEventHandler(async (event): Promise<GetUsersResponse> => {
  const current = await requirePermission(event, ['users.view', 'users.manage'])
  if (!current.ok) return current

  const rows = await query(`
    SELECT
      u.id,
      u.username,
      u.is_active,
      u.must_change_password,
      m.id AS member_id,
      CASE
        WHEN m.id IS NULL THEN NULL
        ELSE TRIM(CONCAT(m.first_name, ' ', m.last_name))
      END AS member_name
    FROM users u
    LEFT JOIN members m ON m.account = u.id
    ORDER BY u.id ASC
  `) as UserRow[]

  return { ok: true, users: normalizeBigInt(rows) as UserRow[] }
})
