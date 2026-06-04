import { defineEventHandler } from 'h3'
import { hasPermission, requirePermission } from '~/server/utils/api/guards'
import { getNumericRouteParam } from '~/server/utils/api/request'
import { loadEventChecklists, loadEventChecklistTemplates } from '~/server/utils/eventChecklists'
import { eventExists } from '~/server/utils/eventShifts'
import type { EventChecklist, EventChecklistTemplate } from '~/types/event'

interface GetEventChecklistsSuccess {
  ok: true
  checklists: EventChecklist[]
  templates: EventChecklistTemplate[]
  canManageChecklists: boolean
}

interface GetEventChecklistsError {
  ok: false
  error: string
}

export type GetEventChecklistsResponse = GetEventChecklistsSuccess | GetEventChecklistsError

export default defineEventHandler(async (event): Promise<GetEventChecklistsResponse> => {
  const current = await requirePermission(event, 'events.view')
  if (!current.ok) return current

  const eventId = getNumericRouteParam(event)
  if (!eventId) return { ok: false, error: 'Invalid event id' }

  try {
    if (!await eventExists(eventId)) return { ok: false, error: 'Event not found' }

    return {
      ok: true,
      checklists: await loadEventChecklists(eventId),
      templates: await loadEventChecklistTemplates(),
      canManageChecklists: hasPermission(current.user, 'events.edit'),
    }
  } catch (err: any) {
    return { ok: false, error: `Failed to load event checklists: ${err}` }
  }
})
