import { defineEventHandler, readBody } from 'h3'
import type { ActivateBody, ActivateResponse } from '~/types/activate'
import { requirePermission } from '~/server/utils/api/guards'
import { toggleActiveRecord } from '~/server/utils/api/toggle'

export default defineEventHandler(async (event): Promise<ActivateResponse> => {
  const current = await requirePermission(event, 'settings.subdivisions.manage')
  if (!current.ok) return current

  const { id, is_active } = await readBody<ActivateBody>(event)
  if (id === undefined || id === null || is_active === undefined || is_active === null) {
    return { ok: false, error: 'Missing fields' }
  }

  try {
    return await toggleActiveRecord({
      table: 'subdivisions',
      entityType: 'subdivision',
      id,
      isActive: is_active,
      userId: current.user.id,
      notFoundMessage: 'No matching subdivisions in database',
    })
  } catch (err: any) {
    return { ok: false, error: `An error occured while activating/deactivating the subdivision: ${err}` }
  }
})
