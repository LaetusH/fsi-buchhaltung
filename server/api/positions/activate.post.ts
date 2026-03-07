import { defineEventHandler, readBody } from 'h3'
import type { ActivateBody, ActivateResponse } from '~/types/activate'
import type { PositionRow } from '~/types/position'
import { logChange } from '~/server/utils/changeLogger'
import { query, withTransaction } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'

export default defineEventHandler(async (event): Promise<ActivateResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (current.user.role !== 'admin') return { ok: false, error: 'Not authorized' }

  const { id, is_active } = await readBody<ActivateBody>(event)
  if (id === undefined || id === null || is_active === undefined || is_active === null) {
    return { ok: false, error: 'Missing fields' }
  }

  const active = is_active ? 1 : 0

  try {
    return await withTransaction(async (conn) => {
      const existingRows: PositionRow[] = await query(
        `SELECT * FROM positions WHERE id = ? LIMIT 1`,
        [id],
        conn
      )

      if (!existingRows.length) return { ok: false, error: 'No matching positions in database' }
      const existing = existingRows[0]

      await logChange({
        entityType: 'position',
        entityId: id,
        subEntityType: null,
        subEntityId: null,
        field: 'is_active',
        oldValue: existing.is_active,
        newValue: active,
        userId: current.user.id,
      }, conn)

      await query(
        `UPDATE positions
          SET is_active = ?
        WHERE id = ?`,
        [active, id],
        conn
      )

      return { ok: true }
    })
  } catch (err: any) {
    return { ok: false, error: `An error occured while activating/deactivating the position: ${err}` }
  }
})
