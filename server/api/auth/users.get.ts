import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import { normalizeBigInt } from '~/server/utils/normalize'

interface UserRow {
  id: number
  username: string
  is_active: number
  created_at: string
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
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  const canViewUsers = current.user.permissions.includes('users.view') || current.user.permissions.includes('users.manage')
  if (!canViewUsers) return { ok: false, error: 'Not authorized' }

  const rows = await query(`
    SELECT
      u.id,
      u.username,
      u.is_active,
      u.created_at,
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
