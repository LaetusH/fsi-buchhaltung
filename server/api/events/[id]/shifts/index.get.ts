import { defineEventHandler } from 'h3'
import { hasPermission, requireAuth } from '~/server/utils/api/guards'
import { getNumericRouteParam } from '~/server/utils/api/request'
import { isEventOrganizer } from '~/server/utils/events'
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
  const current = await requireAuth(event)
  if (!current.ok) return current

  const eventId = getNumericRouteParam(event)
  if (!eventId) return { ok: false, error: 'Invalid event id' }

  try {
    if (!await eventExists(eventId)) return { ok: false, error: 'Event not found' }

    const [organizer, currentMemberId, shifts] = await Promise.all([
      isEventOrganizer(current.user.id, eventId),
      loadCurrentMemberIdForUser(current.user.id),
      loadEventShiftSlots(eventId),
    ])

    if (!hasPermission(current.user, ['events.access', 'events.view', 'events.shifts.signup']) && !organizer) {
      return { ok: false, error: 'Not authorized' }
    }

    return {
      ok: true,
      shifts,
      currentMemberId,
      canManageShifts: hasPermission(current.user, 'events.edit') || organizer,
      canSelfSignup: hasPermission(current.user, ['events.edit', 'events.shifts.signup']) || organizer,
    }
  } catch (err: any) {
    return { ok: false, error: `Failed to load event shifts: ${err}` }
  }
})
