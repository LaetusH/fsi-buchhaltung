import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import { isValidPermissionKey } from '~/server/utils/permissions'

interface RoleRow {
  id: number
  code: string
  name: string
  is_active: number
  description: string | null
}

interface RolePermissionRow {
  role_id: number
  permission_key: string
}

interface GetRolesSuccess {
  ok: true
  roles: Array<{
    id: number
    code: string
    name: string
    is_active: boolean
    description: string | null
    permissions: string[]
  }>
}

interface GetRolesError {
  ok: false
  error: string
}

type GetRolesResponse = GetRolesSuccess | GetRolesError

export default defineEventHandler(async (event): Promise<GetRolesResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (!current.user.permissions.includes('permissions.manage')) return { ok: false, error: 'Not authorized' }

  const roles = await query<RoleRow[]>(
    `SELECT id, code, name, is_active, description
     FROM roles
     ORDER BY code ASC`
  )

  const rolePermissions = await query<RolePermissionRow[]>(
    `SELECT role_id, permission_key
     FROM role_permissions`
  )

  const permissionsByRole = new Map<number, string[]>()
  for (const rp of rolePermissions) {
    if (!isValidPermissionKey(rp.permission_key)) continue
    if (!permissionsByRole.has(rp.role_id)) permissionsByRole.set(rp.role_id, [])
    permissionsByRole.get(rp.role_id)!.push(rp.permission_key)
  }

  return {
    ok: true,
    roles: roles.map(r => ({
      id: r.id,
      code: r.code,
      name: r.name,
      is_active: r.is_active === 1,
      description: r.description ?? null,
      permissions: permissionsByRole.get(r.id) ?? []
    }))
  }
})
