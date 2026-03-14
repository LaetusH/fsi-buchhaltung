import { defineEventHandler, readBody } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { toggleActiveRecord } from '~/server/utils/api/toggle'
import type { ActivateBody, ActivateResponse } from '~/types/activate'

export default defineEventHandler(async (event): Promise<ActivateResponse> => {
  const current = await requirePermission(event, 'settings.cost_centres.manage')
  if (!current.ok) return current

  const { id, is_active } = await readBody<ActivateBody>(event)
  if (id === undefined || id === null || is_active === undefined || is_active === null) return { ok: false, error: 'Missing fields' }

  try {
    return await toggleActiveRecord({
      table: 'cost_centres',
      entityType: 'cost_centre',
      id,
      isActive: is_active,
      userId: current.user.id,
      notFoundMessage: 'No matching cost centres in database',
    })
  } catch (err: any) {
    return { ok: false, error: `An error occured while activating/deactivating the cost centre: ${err}` }
  }
})
