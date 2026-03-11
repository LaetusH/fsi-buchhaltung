import { defineEventHandler, readBody } from 'h3'
import { query, withTransaction } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import { isValidPermissionKey } from '~/server/utils/permissions'

interface SetPositionPermissionsBody {
  position_id: number
  permissions: string[]
}

interface SetPositionPermissionsSuccess {
  ok: true
}

interface SetPositionPermissionsError {
  ok: false
  error: string
}

type SetPositionPermissionsResponse = SetPositionPermissionsSuccess | SetPositionPermissionsError

export default defineEventHandler(async (event): Promise<SetPositionPermissionsResponse> => {
  const current = await getCurrentUserFromEvent(event, false)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (!current.user.permissions.includes('permissions.manage')) return { ok: false, error: 'Not authorized' }

  const body = await readBody<SetPositionPermissionsBody>(event)
  const positionId = Number(body.position_id)
  if (!positionId) return { ok: false, error: 'Missing position id' }

  const rows = await query<{ id: number }[]>(
    `SELECT id FROM positions WHERE id = ? LIMIT 1`,
    [positionId]
  )
  if (!rows.length) return { ok: false, error: 'Position not found' }

  const newPermissions = Array.isArray(body.permissions)
    ? body.permissions.filter(isValidPermissionKey)
    : []

  try {
    await withTransaction(async (conn) => {
      const existingRows = await query<{ permission_key: string }[]>(
        `SELECT permission_key
         FROM position_permissions
         WHERE position_id = ?`,
        [positionId],
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
            entityType: 'position',
            entityId: positionId,
            subEntityType: 'permission',
            subEntityId: null,
            field: 'permission_removed',
            oldValue: perm,
            newValue: null,
            userId: current.user.id,
          }, conn)

          await query(
            `DELETE FROM position_permissions
             WHERE position_id = ? AND permission_key = ?`,
            [positionId, perm],
            conn
          )
        }
      }

      for (const perm of newPermissions) {
        if (!existingSet.has(perm)) {
          await logChange({
            entityType: 'position',
            entityId: positionId,
            subEntityType: 'permission',
            subEntityId: null,
            field: 'permission_added',
            oldValue: null,
            newValue: perm,
            userId: current.user.id,
          }, conn)

          await query(
            `INSERT INTO position_permissions (position_id, permission_key)
             VALUES (?, ?)`,
            [positionId, perm],
            conn
          )
        }
      }
    })

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: `Failed to update position permissions: ${err}` }
  }
})
