import { defineEventHandler, readBody } from 'h3'
import { query, withTransaction } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import type { ActivateBody, ActivateResponse } from '~/types/activate'
import { SphereRow } from '~/types/sphere'

export default defineEventHandler(async (event): Promise<ActivateResponse> => {
  const current = await getCurrentUserFromEvent(event, true )
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (!current.user.permissions.includes('settings.spheres.manage')) return { ok: false, error: 'Not authorized' }

  const { id, is_active } = await readBody<ActivateBody>(event)
  if (id === undefined || id === null || is_active === undefined || is_active === null) return { ok: false, error: 'Missing fields' }
  const active = 1 ? is_active : 0

  try {
    return await withTransaction(async (conn) => {
      const existingRows: SphereRow[] = await query(
        `SELECT * FROM spheres WHERE id = ? LIMIT 1`,
        [id],
        conn
      )

      if (!existingRows.length) return { ok: false, error: 'No matching spheres in database' }
      const existing = existingRows[0]

      await logChange({
        entityType: 'sphere',
        entityId: id,
        subEntityType: null,
        subEntityId: null,
        field: 'is_active',
        oldValue: existing['is_active'],
        newValue: active,
        userId: current.user.id,
      }, conn)

      await query(
        `UPDATE spheres 
          SET is_active = ? 
        WHERE id = ?`, 
        [active, id], 
        conn
      )
      
      return { ok: true }
    })
  } catch (err: any) {
    return { ok: false, error: `An error occured while activating/deactivating the sphere: ${err}` }
  }
})
