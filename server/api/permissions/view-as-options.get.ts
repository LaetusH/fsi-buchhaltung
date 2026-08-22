import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/api/guards'
import { isValidPermissionKey } from '~/server/utils/permissions'

interface RoleRow {
  id: number
  code: string
  name: string
}

interface PositionRow {
  id: number
  code: string
  name: string
}

interface RolePermissionRow {
  role_id: number
  permission_key: string
}

interface PositionPermissionRow {
  position_id: number
  permission_key: string
}

interface ViewAsOptionsSuccess {
  ok: true
  roles: Array<{ id: number, code: string, name: string, permissions: string[] }>
  positions: Array<{ id: number, code: string, name: string, permissions: string[] }>
}

interface ViewAsOptionsError {
  ok: false
  error: string
}

type ViewAsOptionsResponse = ViewAsOptionsSuccess | ViewAsOptionsError

export default defineEventHandler(async (event): Promise<ViewAsOptionsResponse> => {
  const current = await requirePermission(event, 'settings.viewAs')
  if (!current.ok) return current

  const roles = await query<RoleRow[]>(
    `SELECT id, code, name
     FROM roles
     WHERE is_active = 1
     ORDER BY code ASC`
  )

  const positions = await query<PositionRow[]>(
    `SELECT id, code, name
     FROM positions
     WHERE is_active = 1
     ORDER BY code ASC`
  )

  const rolePermissions = await query<RolePermissionRow[]>(
    `SELECT role_id, permission_key
     FROM role_permissions`
  )

  const positionPermissions = await query<PositionPermissionRow[]>(
    `SELECT position_id, permission_key
     FROM position_permissions`
  )

  const permissionsByRole = new Map<number, string[]>()
  for (const rp of rolePermissions) {
    if (!isValidPermissionKey(rp.permission_key)) continue
    if (!permissionsByRole.has(rp.role_id)) permissionsByRole.set(rp.role_id, [])
    permissionsByRole.get(rp.role_id)!.push(rp.permission_key)
  }

  const permissionsByPosition = new Map<number, string[]>()
  for (const pp of positionPermissions) {
    if (!isValidPermissionKey(pp.permission_key)) continue
    const id = Number(pp.position_id)
    if (!permissionsByPosition.has(id)) permissionsByPosition.set(id, [])
    permissionsByPosition.get(id)!.push(pp.permission_key)
  }

  return {
    ok: true,
    roles: roles.map(role => ({
      id: Number(role.id),
      code: role.code,
      name: role.name,
      permissions: permissionsByRole.get(Number(role.id)) ?? []
    })),
    positions: positions.map(position => ({
      id: Number(position.id),
      code: position.code,
      name: position.name,
      permissions: permissionsByPosition.get(Number(position.id)) ?? []
    }))
  }
})
