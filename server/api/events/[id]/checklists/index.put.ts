import { defineEventHandler, readBody } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { getNumericRouteParam } from '~/server/utils/api/request'
import { withAuditTransaction } from '~/server/utils/db'
import {
  loadEventChecklists,
  normalizeEventChecklists,
  replaceEventChecklists,
} from '~/server/utils/eventChecklists'
import { eventExists } from '~/server/utils/eventShifts'
import type { EventChecklist } from '~/types/event'

interface UpdateEventChecklistsSuccess {
  ok: true
  checklists: EventChecklist[]
  affectedTaskStatuses: Array<{ id: number; status: string }>
}

interface UpdateEventChecklistsError {
  ok: false
  error: string
}

export type UpdateEventChecklistsResponse = UpdateEventChecklistsSuccess | UpdateEventChecklistsError

export default defineEventHandler(async (event): Promise<UpdateEventChecklistsResponse> => {
  const current = await requirePermission(event, 'events.edit')
  if (!current.ok) return current

  const eventId = getNumericRouteParam(event)
  if (!eventId) return { ok: false, error: 'Invalid event id' }

  const body = await readBody(event)
  const checklists = normalizeEventChecklists(Array.isArray(body) ? body : body?.checklists)
  if (!checklists) return { ok: false, error: 'Invalid checklist data' }

  try {
    return await withAuditTransaction(current.user, async (conn) => {
      if (!await eventExists(eventId, conn)) return { ok: false, error: 'Event not found' }

      const result = await replaceEventChecklists({ eventId, checklists, conn })
      if ('error' in result) return { ok: false, error: result.error }

      return {
        ok: true,
        checklists: await loadEventChecklists(eventId, conn),
        affectedTaskStatuses: result.affectedTaskStatuses,
      }
    })
  } catch (err: any) {
    return { ok: false, error: `Failed to update event checklists: ${err}` }
  }
})
