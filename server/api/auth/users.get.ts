import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import { normalizeBigInt } from '~/server/utils/normalize'
import { UserRole } from '~/types/user'

interface UserRow {
  id: number
  username: string
  role: UserRole
  is_active: number
  created_at: string
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
  const current = await getCurrentUserFromEvent(event, true )
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (current.user.role !== 'admin') return { ok: false, error: 'Not authorized' }

  const rows = await query(`
    SELECT id, username, role, is_active, created_at
    FROM users
    ORDER BY id ASC
  `) as UserRow[]

  return { ok: true, users: normalizeBigInt(rows) as UserRow[] }
})