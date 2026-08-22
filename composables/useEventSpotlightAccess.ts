import { computed, type Ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import type { EventSpotlight } from '~/types/event'

export function useEventSpotlightAccess(active: Ref<EventSpotlight | null>) {
  const { resolveFlag } = useAuth()

  const canOpenActive = computed(() => resolveFlag(active.value?.canOpen ?? false, ['events.view', 'events.edit', 'events.shifts.signup']))
  const showPlanning = computed(() => Boolean(active.value?.planning) && resolveFlag(true, 'events.view'))
  const showShiftOverview = computed(() => Boolean(active.value?.shiftOverview) && resolveFlag(true, ['events.edit', 'events.shifts.signup']))

  return { canOpenActive, showPlanning, showShiftOverview }
}
