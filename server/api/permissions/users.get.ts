import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import { isValidPermissionKey } from '~/server/utils/permissions'

interface UserRow {
  id: number
  username: string
  is_active: number
}

interface UserRoleRow {
  user_id: number
  role_id: number
}

interface UserPermissionRow {
  user_id: number
  permission_key: string
}

interface GetUsersSuccess {
  ok: true
  users: Array<{
    id: number
    username: string
    is_active: boolean
    roles: number[]
    permissions: string[]
  }>
}

interface GetUsersError {
  ok: false
  error: string
}

type GetUsersResponse = GetUsersSuccess | GetUsersError

export default defineEventHandler(async (event): Promise<GetUsersResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (!current.user.permissions.includes('permissions.manage')) return { ok: false, error: 'Not authorized' }

  const users = await query<UserRow[]>(
    `SELECT id, username, is_active
     FROM users
     ORDER BY username ASC`
  )

  const roles = await query<UserRoleRow[]>(
    `SELECT user_id, role_id
     FROM user_roles`
  )

  const perms = await query<UserPermissionRow[]>(
    `SELECT user_id, permission_key
     FROM user_permissions`
  )

  const rolesByUser = new Map<number, number[]>()
  for (const row of roles) {
    const id = Number(row.user_id)
    if (!rolesByUser.has(id)) rolesByUser.set(id, [])
    rolesByUser.get(id)!.push(row.role_id)
  }

  const permsByUser = new Map<number, string[]>()
  for (const row of perms) {
    if (!isValidPermissionKey(row.permission_key)) continue
    const id = Number(row.user_id)
    if (!permsByUser.has(id)) permsByUser.set(id, [])
    permsByUser.get(id)!.push(row.permission_key)
  }

  return {
    ok: true,
    users: users.map(u => ({
      id: Number(u.id),
      username: u.username,
      is_active: u.is_active === 1,
      roles: (rolesByUser.get(Number(u.id)) ?? []),
      permissions: permsByUser.get(Number(u.id)) ?? []
    }))
  }
})
