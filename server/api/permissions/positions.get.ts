import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/api/guards'
import { isValidPermissionKey } from '~/server/utils/permissions'

interface PositionRow {
  id: number
  code: string
  name: string
  is_active: number
}

interface PositionPermissionRow {
  position_id: number
  permission_key: string
}

interface GetPositionsSuccess {
  ok: true
  positions: Array<{
    id: number
    code: string
    name: string
    is_active: boolean
    permissions: string[]
  }>
}

interface GetPositionsError {
  ok: false
  error: string
}

type GetPositionsResponse = GetPositionsSuccess | GetPositionsError

export default defineEventHandler(async (event): Promise<GetPositionsResponse> => {
  const current = await requirePermission(event, 'permissions.manage')
  if (!current.ok) return current

  const positions = await query<PositionRow[]>(
    `SELECT id, code, name, is_active
     FROM positions
     ORDER BY code ASC`
  )

  const positionPermissions = await query<PositionPermissionRow[]>(
    `SELECT position_id, permission_key
     FROM position_permissions`
  )

  const permissionsByPosition = new Map<number, string[]>()
  for (const pp of positionPermissions) {
    if (!isValidPermissionKey(pp.permission_key)) continue
    const id = Number(pp.position_id)
    if (!permissionsByPosition.has(id)) permissionsByPosition.set(id, [])
    permissionsByPosition.get(id)!.push(pp.permission_key)
  }

  return {
    ok: true,
    positions: positions.map(position => ({
      id: Number(position.id),
      code: position.code,
      name: position.name,
      is_active: position.is_active === 1,
      permissions: permissionsByPosition.get(Number(position.id)) ?? []
    }))
  }
})
