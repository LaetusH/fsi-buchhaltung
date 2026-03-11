import { defineEventHandler, readBody } from 'h3'
import { query, withTransaction } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import { isValidPermissionKey } from '~/server/utils/permissions'

interface UpdateUserAccessBody {
  user_id: number
  roles: number[]
  permissions: string[]
}

interface UpdateUserAccessSuccess {
  ok: true
}

interface UpdateUserAccessError {
  ok: false
  error: string
}

type UpdateUserAccessResponse = UpdateUserAccessSuccess | UpdateUserAccessError

export default defineEventHandler(async (event): Promise<UpdateUserAccessResponse> => {
  const current = await getCurrentUserFromEvent(event, false)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (!current.user.permissions.includes('permissions.manage')) return { ok: false, error: 'Not authorized' }

  const body = await readBody<UpdateUserAccessBody>(event)
  const userId = Number(body.user_id)
  if (!userId) return { ok: false, error: 'Missing user id' }

  const userRows = await query<{ id: number }[]>(
    `SELECT id FROM users WHERE id = ? LIMIT 1`,
    [userId]
  )
  if (!userRows.length) return { ok: false, error: 'User not found' }

  const newRoles = Array.isArray(body.roles) ? body.roles : []
  const newPermissions = Array.isArray(body.permissions) 
    ? body.permissions.filter(isValidPermissionKey) 
    : []

  if (newRoles.length) {
    const validRoles = await query<{ id: number }[]>(
      `SELECT id FROM roles WHERE id IN (${newRoles.map(() => '?').join(',')})`,
      newRoles
    )
    const validRoleSet = new Set(validRoles.map(r => r.id))
    const filtered = newRoles.filter(r => validRoleSet.has(r))
    newRoles.length = 0
    newRoles.push(...filtered)
  }

  try {
    await withTransaction(async (conn) => {
      const existingRoleRows = await query<{ role_id: number }[]>(
        `SELECT role_id
         FROM user_roles
         WHERE user_id = ?`,
        [userId],
        conn
      )

      const existingRoles = existingRoleRows.map(r => r.role_id)

      const existingRoleSet = new Set(existingRoles)
      const newRoleSet = new Set(newRoles)

      for (const role of existingRoles) {
        if (!newRoleSet.has(role)) {
          await logChange({
            entityType: 'user',
            entityId: userId,
            subEntityType: 'role',
            subEntityId: null,
            field: 'role_removed',
            oldValue: role,
            newValue: null,
            userId: current.user.id,
          }, conn)

          await query(
            `DELETE FROM user_roles
             WHERE user_id = ? AND role_id = ?`,
            [userId, role],
            conn
          )
        }
      }

      for (const role of newRoles) {
        if (!existingRoleSet.has(role)) {
          await logChange({
            entityType: 'user',
            entityId: userId,
            subEntityType: 'role',
            subEntityId: null,
            field: 'role_added',
            oldValue: null,
            newValue: role,
            userId: current.user.id,
          }, conn)

          await query(
            `INSERT INTO user_roles (user_id, role_id)
             VALUES (?, ?)`,
            [userId, role],
            conn
          )
        }
      }


      const existingRows = await query<{ permission_key: string }[]>(
        `SELECT permission_key
         FROM user_permissions
         WHERE user_id = ?`,
        [userId],
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
            entityType: 'user',
            entityId: userId,
            subEntityType: 'permission',
            subEntityId: null,
            field: 'permission_removed',
            oldValue: perm,
            newValue: null,
            userId: current.user.id,
          }, conn)

          await query(
            `DELETE FROM user_permissions
             WHERE user_id = ? AND permission_key = ?`,
            [userId, perm],
            conn
          )
        }
      }

      for (const perm of newPermissions) {
        if (!existingSet.has(perm)) {
          await logChange({
            entityType: 'user',
            entityId: userId,
            subEntityType: 'permission',
            subEntityId: null,
            field: 'permission_added',
            oldValue: null,
            newValue: perm,
            userId: current.user.id,
          }, conn)

          await query(
            `INSERT INTO user_permissions (user_id, permission_key)
             VALUES (?, ?)`,
            [userId, perm],
            conn
          )
        }
      }
    })

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: `Failed to update user access: ${err}` }
  }
})
