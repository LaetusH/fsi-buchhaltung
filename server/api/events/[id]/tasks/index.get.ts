import { defineEventHandler } from 'h3'
import { hasPermission, requirePermission } from '~/server/utils/api/guards'
import { getNumericRouteParam } from '~/server/utils/api/request'
import { eventExists } from '~/server/utils/eventShifts'
import { loadEventTasks } from '~/server/utils/eventTasks'
import type { EventTask } from '~/types/event'

interface GetEventTasksSuccess {
  ok: true
  tasks: EventTask[]
  canManageTasks: boolean
}

interface GetEventTasksError {
  ok: false
  error: string
}

export type GetEventTasksResponse = GetEventTasksSuccess | GetEventTasksError

export default defineEventHandler(async (event): Promise<GetEventTasksResponse> => {
  const current = await requirePermission(event, 'events.view')
  if (!current.ok) return current

  const eventId = getNumericRouteParam(event)
  if (!eventId) return { ok: false, error: 'Invalid event id' }

  try {
    if (!await eventExists(eventId)) return { ok: false, error: 'Event not found' }

    return {
      ok: true,
      tasks: await loadEventTasks(eventId),
      canManageTasks: hasPermission(current.user, 'events.edit'),
    }
  } catch (err: any) {
    return { ok: false, error: `Failed to load event tasks: ${err}` }
  }
})
