import { defineEventHandler, readBody } from 'h3'
import { query, withTransaction } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import { isValidPermissionKey } from '~/server/utils/permissions'
import { logChange } from '~/server/utils/changeLogger'

interface SetRolePermissionsBody {
  role_id: number
  permissions: string[]
}

interface SetRolePermissionsSuccess {
  ok: true
}

interface SetRolePermissionsError {
  ok: false
  error: string
}

type SetRolePermissionsResponse = SetRolePermissionsSuccess | SetRolePermissionsError

export default defineEventHandler(async (event): Promise<SetRolePermissionsResponse> => {
  const current = await getCurrentUserFromEvent(event, false)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (!current.user.permissions.includes('permissions.manage')) return { ok: false, error: 'Not authorized' }

  const body = await readBody<SetRolePermissionsBody>(event)
  const roleId = body.role_id
  if (!roleId) return { ok: false, error: 'Missing role id' }

  const roleRows = await query<{ id: number }[]>(
    `SELECT id FROM roles WHERE id = ? LIMIT 1`,
    [roleId]
  )
  if (!roleRows.length) return { ok: false, error: 'Role not found' }

  const newPermissions = Array.isArray(body.permissions)
    ? body.permissions.filter(isValidPermissionKey)
    : []

  try {
    await withTransaction(async (conn) => {
      const existingRows = await query<{ permission_key: string }[]>(
        `SELECT permission_key
         FROM role_permissions
         WHERE role_id = ?`,
        [roleId],
        conn
      )

      const existing = existingRows.map(r => r.permission_key)
      const existingPermissions = Array.isArray(existing)
        ? existing.filter(isValidPermissionKey)
        : []

      const existingSet = new Set(existingPermissions)
      const newSet = new Set(newPermissions)

      for (const perm of existingPermissions) {
        if (!newSet.has(perm)) {
          await logChange({
            entityType: 'role',
            entityId: roleId,
            subEntityType: 'permission',
            subEntityId: null,
            field: 'permission_removed',
            oldValue: perm,
            newValue: null,
            userId: current.user.id,
          }, conn)

          await query(
            `DELETE FROM role_permissions
             WHERE role_id = ? AND permission_key = ?`,
            [roleId, perm],
            conn
          )
        }
      }

      for (const perm of newPermissions) {
        if (!existingSet.has(perm)) {
          await logChange({
            entityType: 'role',
            entityId: roleId,
            subEntityType: 'permission',
            subEntityId: null,
            field: 'permission_added',
            oldValue: null,
            newValue: perm,
            userId: current.user.id,
          }, conn)

          await query(
            `INSERT INTO role_permissions (role_id, permission_key)
             VALUES (?, ?)`,
            [roleId, perm],
            conn
          )
        }
      }
    })

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: `Failed to update role permissions: ${err}` }
  }
})
