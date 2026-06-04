import { useI18n } from '~/composables/useI18n'
import { useToast } from '~/composables/useToast'
import type { EventShiftSlot as PersistedEventShiftSlot, SaveEventShiftSlot } from '~/types/event'
import type { GetEventShiftsResponse } from '~/server/api/events/[id]/shifts/index.get'
import type { UpdateEventShiftsResponse } from '~/server/api/events/[id]/shifts/index.put'
import type { AddSelfToShiftResponse } from '~/server/api/events/[id]/shifts/[shiftId]/self.post'
import type { RemoveSelfFromShiftResponse } from '~/server/api/events/[id]/shifts/[shiftId]/self.delete'
import type { EventShiftPermissionMode, PlanningShiftSlot } from '~/components/Page/Events/planning/types'

export function useEventShifts(eventId: Ref<number | null>) {
  const { t } = useI18n()
  const toast = useToast()

  const shiftSlots = ref<PlanningShiftSlot[]>([])
  const shiftPermissionMode = ref<EventShiftPermissionMode>('manage')
  const currentMemberId = ref<number | null>(null)
  const shiftLoading = ref(false)
  const shiftSaving = ref(false)
  const canManageShifts = ref(false)
  const canSelfSignup = ref(false)

  function mapPersistedShiftToPanel(shift: PersistedEventShiftSlot): PlanningShiftSlot {
    return {
      id: shift.id,
      name: shift.name,
      startsAt: shift.starts_at,
      endsAt: shift.ends_at,
      requiredPeople: shift.required_people,
      memberIds: shift.members.map(member => member.id),
      memberQuery: '',
    }
  }

  function mapPanelShiftToPayload(shift: PlanningShiftSlot): SaveEventShiftSlot {
    return {
      ...(shift.id > 0 ? { id: shift.id } : {}),
      name: shift.name,
      starts_at: shift.startsAt,
      ends_at: shift.endsAt,
      required_people: shift.requiredPeople,
      member_ids: shift.memberIds,
    }
  }

  async function loadShiftSlots(id: number) {
    if (shiftLoading.value) return

    try {
      shiftLoading.value = true
      const res = await $fetch<GetEventShiftsResponse>(`/api/events/${id}/shifts`)
      if (!res.ok) throw new Error(res.error)

      shiftSlots.value = res.shifts.map(mapPersistedShiftToPanel)
      currentMemberId.value = res.currentMemberId
      canManageShifts.value = res.canManageShifts
      canSelfSignup.value = res.canSelfSignup
      shiftPermissionMode.value = res.canManageShifts ? 'manage' : 'own'
    }
    catch (err: any) {
      toast.error(err?.message || t('event.planning.failedLoadShifts'))
    }
    finally {
      shiftLoading.value = false
    }
  }

  async function saveShiftSlots(nextSlots: PlanningShiftSlot[]) {
    if (!eventId.value || shiftSaving.value) return

    try {
      shiftSaving.value = true
      const res = await $fetch<UpdateEventShiftsResponse>(`/api/events/${eventId.value}/shifts`, {
        method: 'PUT',
        body: { shifts: nextSlots.map(mapPanelShiftToPayload) },
      })
      if (!res.ok) throw new Error(res.error)

      shiftSlots.value = res.shifts.map(mapPersistedShiftToPanel)
    }
    catch (err: any) {
      toast.error(err?.message || t('event.planning.failedSaveShifts'))
      if (eventId.value) await loadShiftSlots(eventId.value)
    }
    finally {
      shiftSaving.value = false
    }
  }

  async function assignCurrentMemberToShift(shiftId: number) {
    if (!eventId.value || shiftSaving.value) return

    try {
      shiftSaving.value = true
      const res = await $fetch<AddSelfToShiftResponse>(`/api/events/${eventId.value}/shifts/${shiftId}/self`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error(res.error)

      shiftSlots.value = res.shifts.map(mapPersistedShiftToPanel)
    }
    catch (err: any) {
      toast.error(err?.message || t('event.planning.failedSaveShifts'))
    }
    finally {
      shiftSaving.value = false
    }
  }

  async function removeCurrentMemberFromShift(shiftId: number) {
    if (!eventId.value || shiftSaving.value) return

    try {
      shiftSaving.value = true
      const res = await $fetch<RemoveSelfFromShiftResponse>(`/api/events/${eventId.value}/shifts/${shiftId}/self`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(res.error)

      shiftSlots.value = res.shifts.map(mapPersistedShiftToPanel)
    }
    catch (err: any) {
      toast.error(err?.message || t('event.planning.failedSaveShifts'))
    }
    finally {
      shiftSaving.value = false
    }
  }

  function reset() {
    shiftSlots.value = []
    currentMemberId.value = null
    canManageShifts.value = false
    canSelfSignup.value = false
  }

  return {
    shiftSlots,
    shiftPermissionMode,
    currentMemberId,
    shiftLoading,
    shiftSaving,
    canManageShifts,
    canSelfSignup,
    loadShiftSlots,
    saveShiftSlots,
    assignCurrentMemberToShift,
    removeCurrentMemberFromShift,
    reset,
  }
}
