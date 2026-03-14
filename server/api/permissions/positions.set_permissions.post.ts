import { defineEventHandler, readBody } from 'h3'
import { query, withTransaction } from '~/server/utils/db'
import { isValidPermissionKey } from '~/server/utils/permissions'
import { logChange } from '~/server/utils/changeLogger'
import { syncScalarCollection } from '~/server/utils/api/audit'
import { requirePermission } from '~/server/utils/api/guards'

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
  const current = await requirePermission(event, 'permissions.manage', { touch: false })
  if (!current.ok) return current

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

      const existingPermissions = existingRows
        .map(row => row.permission_key)
        .filter(isValidPermissionKey)

      await syncScalarCollection({
        existing: existingPermissions,
        incoming: newPermissions,
        onRemove: async (perm) => {
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
        },
        onAdd: async (perm) => {
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
        },
      })
    })

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: `Failed to update position permissions: ${err}` }
  }
})
