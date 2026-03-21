<template>
  <Page :headline1="t('event.title')" @open-menu="$emit('openMenu')">
    <template #cards>
      <div class="col-span-12 lg:col-span-8 lg:col-start-3">
        <PageEventsForm
          v-model="form"
          :members="members"
          :subdivisions="subdivisions"
          :cost-centres="costCentres"
          :disabled="!canEdit"
          @submit="submit"
          @cancel="cancel"
        />
      </div>
    </template>
  </Page>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'
import { useI18n } from '~/composables/useI18n'
import { usePage } from '~/composables/usePage'
import { useReturnTarget } from '~/composables/useReturnTarget'
import { useToast } from '~/composables/useToast'
import type { GetEventResponse } from '~/server/api/events/[id].get'
import type { GetEventOptionsResponse } from '~/server/api/events/options.get'
import type { EventCostCentreOption, EventMemberOption, EventSubdivisionOption, SaveEventBody } from '~/types/event'
import PageEventsForm from './Form.vue'

const emit = defineEmits<{
  (e: 'openMenu'): void
}>()

const { hasPermission } = useAuth()
const { t } = useI18n()
const { pageMeta } = usePage()
const { goToReturnTarget } = useReturnTarget('Events')
const toast = useToast()

const canEdit = computed(() => hasPermission('events.edit'))

const isEditMode = ref(false)
const eventId = ref<number | null>(null)
const members = ref<EventMemberOption[]>([])
const subdivisions = ref<EventSubdivisionOption[]>([])
const costCentres = ref<EventCostCentreOption[]>([])

const form = ref<SaveEventBody>({
  name: '',
  starts_at: '',
  ends_at: '',
  location: '',
  expected_guests: 0,
  member_organizer_ids: [],
  subdivision_organizer_ids: [],
  cost_centre_splits: [],
})

onMounted(async () => {
  await loadOptions()

  eventId.value = pageMeta.value?.eventId || null
  if (!eventId.value) return

  isEditMode.value = true

  const res = await $fetch<GetEventResponse>(`/api/events/${eventId.value}`)
  if (!res.ok) {
    isEditMode.value = false
    return
  }

  form.value = {
    name: res.event.name,
    starts_at: res.event.starts_at,
    ends_at: res.event.ends_at,
    location: res.event.location,
    expected_guests: res.event.expected_guests,
    member_organizer_ids: res.event.member_organizers.map(organizer => organizer.id),
    subdivision_organizer_ids: res.event.subdivision_organizers.map(organizer => organizer.id),
    cost_centre_splits: res.event.cost_centre_splits.map(split => ({
      cost_centre_id: split.cost_centre_id,
      allocation_percentage: Number(split.allocation_percentage),
    })),
  }
})

async function loadOptions() {
  const res = await $fetch<GetEventOptionsResponse>('/api/events/options')
  if (!res.ok) return

  members.value = res.members
  subdivisions.value = res.subdivisions
  costCentres.value = res.costCentres
}

async function submit() {
  if (!canEdit.value) {
    toast.error(t('common.notAuthorized'))
    return
  }

  try {
    if (isEditMode.value && eventId.value) {
      const res = await $fetch(`/api/events/${eventId.value}`, {
        method: 'PUT',
        body: form.value,
      })
      if (!res.ok) throw new Error(res.error || t('event.saved.failedUpdate'))
    } else {
      const res = await $fetch('/api/events/create', {
        method: 'POST',
        body: form.value,
      })
      if (!res.ok) throw new Error(res.error || t('event.saved.failedCreate'))
    }

    toast.success(isEditMode.value ? t('event.saved.updated') : t('event.saved.created'))
    goToReturnTarget()
  } catch (err: any) {
    toast.error(err?.message || t('event.saved.failedSave'))
  }
}

function cancel() {
  goToReturnTarget()
}
</script>
