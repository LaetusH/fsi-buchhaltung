import { defineEventHandler } from 'h3'
import { hasPermission, requirePermission } from '~/server/utils/api/guards'
import { getNumericRouteParam } from '~/server/utils/api/request'
import { eventExists, loadCurrentMemberIdForUser, loadEventShiftSlots } from '~/server/utils/eventShifts'
import type { EventShiftSlot } from '~/types/event'

interface GetEventShiftsSuccess {
  ok: true
  shifts: EventShiftSlot[]
  currentMemberId: number | null
  canManageShifts: boolean
  canSelfSignup: boolean
}

interface GetEventShiftsError {
  ok: false
  error: string
}

export type GetEventShiftsResponse = GetEventShiftsSuccess | GetEventShiftsError

export default defineEventHandler(async (event): Promise<GetEventShiftsResponse> => {
  const current = await requirePermission(event, 'events.view')
  if (!current.ok) return current

  const eventId = getNumericRouteParam(event)
  if (!eventId) return { ok: false, error: 'Invalid event id' }

  try {
    if (!await eventExists(eventId)) return { ok: false, error: 'Event not found' }

    return {
      ok: true,
      shifts: await loadEventShiftSlots(eventId),
      currentMemberId: await loadCurrentMemberIdForUser(current.user.id),
      canManageShifts: hasPermission(current.user, 'events.edit'),
      canSelfSignup: hasPermission(current.user, ['events.edit', 'events.shifts.signup']),
    }
  } catch (err: any) {
    return { ok: false, error: `Failed to load event shifts: ${err}` }
  }
})
