import { defineEventHandler, readBody } from 'h3'
import { query, withTransaction } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import type { ActivateBody, ActivateResponse } from '~/types/activate'
import { logChange } from '~/server/utils/changeLogger'

interface UserActivateRow {
  id: number
  is_active: number
}

export default defineEventHandler(async (event): Promise<ActivateResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (!current.user.permissions.includes('users.manage')) return { ok: false, error: 'Not authorized' }

  const { id, is_active } = await readBody<ActivateBody>(event)
  if (id === undefined || id === null || is_active === undefined || is_active === null) {
    return { ok: false, error: 'Missing fields' }
  }

  const active = is_active ? 1 : 0

  try {
    return await withTransaction(async (conn) => {
      const existingRows = await query<UserActivateRow[]>(
        `SELECT id, is_active FROM users WHERE id = ? LIMIT 1`,
        [id],
        conn
      )
      const existing = existingRows[0]
      if (!existing) return { ok: false, error: 'No matching user in database' }

      await logChange({
        entityType: 'user',
        entityId: id,
        subEntityType: null,
        subEntityId: null,
        field: 'is_active',
        oldValue: existing.is_active,
        newValue: active,
        userId: current.user.id,
      }, conn)

      await query(
        `UPDATE users SET is_active = ? WHERE id = ?`,
        [active, id],
        conn
      )

      return { ok: true }
    })
  } catch (err: any) {
    return { ok: false, error: `An error occured while activating/deactivating the user: ${err}` }
  }
})
