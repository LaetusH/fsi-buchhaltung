import { defineEventHandler } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { getNumericRouteParam } from '~/server/utils/api/request'
import { withAuditTransaction } from '~/server/utils/db'
import {
  addSelfToShift,
  loadCurrentMemberIdForUser,
  loadEventShiftSlots,
} from '~/server/utils/eventShifts'
import type { EventShiftSlot } from '~/types/event'

interface AddSelfToShiftSuccess {
  ok: true
  shifts: EventShiftSlot[]
}

interface AddSelfToShiftError {
  ok: false
  error: string
}

export type AddSelfToShiftResponse = AddSelfToShiftSuccess | AddSelfToShiftError

export default defineEventHandler(async (event): Promise<AddSelfToShiftResponse> => {
  const current = await requirePermission(event, ['events.edit', 'events.shifts.signup'])
  if (!current.ok) return current

  const eventId = getNumericRouteParam(event, 'id')
  const shiftId = getNumericRouteParam(event, 'shiftId')
  if (!eventId) return { ok: false, error: 'Invalid event id' }
  if (!shiftId) return { ok: false, error: 'Invalid shift id' }

  try {
    return await withAuditTransaction(current.user, async (conn) => {
      const memberId = await loadCurrentMemberIdForUser(current.user.id, conn)
      if (!memberId) return { ok: false, error: 'Current account is not linked to a member' }

      const error = await addSelfToShift({
        eventId,
        shiftId,
        memberId,
        conn,
      })
      if (error) return { ok: false, error }

      return {
        ok: true,
        shifts: await loadEventShiftSlots(eventId, conn),
      }
    })
  } catch (err: any) {
    return { ok: false, error: `Failed to assign shift member: ${err}` }
  }
})
