<template>
  <div class="space-y-6">
    <section class="bg-white rounded-xl shadow-lg p-4 space-y-4">
      <h2 class="text-lg font-semibold">{{ t('event.masterData') }}</h2>

      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('event.name') }}</label>
          <input v-model="form.name" class="input" :disabled="disabled">
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('event.location') }}</label>
          <input v-model="form.location" class="input" :disabled="disabled">
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('event.startsOn') }}</label>
          <input v-model="startsAtInput" type="datetime-local" class="input" :disabled="disabled">
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('event.endsOn') }}</label>
          <input v-model="endsAtInput" type="datetime-local" class="input" :disabled="disabled">
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('event.expectedGuests') }}</label>
          <input
            v-model.number="form.expected_guests"
            type="number"
            min="0"
            step="1"
            class="input"
            :disabled="disabled"
          >
        </div>
      </div>
    </section>

    <section class="bg-white rounded-xl shadow-lg p-4 space-y-4">
      <h2 class="text-lg font-semibold">{{ t('event.organizers') }}</h2>

      <div class="grid gap-4 lg:grid-cols-2">
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-600">{{ t('event.memberOrganizers') }}</label>
          <CommonSelectionListField
            :query="memberOrganizerQuery"
            :options="memberOrganizerOptions"
            :selected-items="selectedMemberOrganizers"
            :placeholder="t('event.memberPlaceholder')"
            :empty-text="t('event.noMatchingMembers')"
            :empty-selection-text="t('event.noMemberOrganizers')"
            :remove-label="t('actions.remove')"
            :disabled="disabled"
            @update:query="memberOrganizerQuery = $event"
            @select="addMemberOrganizer($event)"
            @clear-selection="clearMemberOrganizerSelection"
            @remove="removeMemberOrganizer($event)"
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-600">{{ t('event.subdivisionOrganizers') }}</label>
          <CommonSelectionListField
            :query="subdivisionOrganizerQuery"
            :options="subdivisionOrganizerOptions"
            :selected-items="selectedSubdivisionOrganizers"
            :placeholder="t('event.subdivisionPlaceholder')"
            :empty-text="t('event.noMatchingSubdivisions')"
            :empty-selection-text="t('event.noSubdivisionOrganizers')"
            :remove-label="t('actions.remove')"
            :disabled="disabled"
            @update:query="subdivisionOrganizerQuery = $event"
            @select="addSubdivisionOrganizer($event)"
            @clear-selection="clearSubdivisionOrganizerSelection"
            @remove="removeSubdivisionOrganizer($event)"
          />
        </div>
      </div>
    </section>

    <section class="bg-white rounded-xl shadow-lg p-4 space-y-4">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <h2 class="text-lg font-semibold">{{ t('event.costCentres') }}</h2>
        <p
          class="text-sm font-medium"
          :class="allocationIsValid ? 'text-emerald-600' : 'text-amber-600'"
        >
          {{ t('event.allocationTotal', { value: allocationTotalLabel }) }}
        </p>
      </div>

      <CommonAllocationListField
        :query="costCentreQuery"
        :options="costCentreOptions"
        :items="selectedCostCentreSplits"
        :placeholder="t('event.costCentrePlaceholder')"
        :empty-text="t('event.noMatchingCostCentres')"
        :empty-selection-text="t('event.noCostCentresAssigned')"
        :remove-label="t('actions.remove')"
        :allocation-label="t('event.allocationPercentage')"
        :disabled="disabled"
        @update:query="costCentreQuery = $event"
        @select="addCostCentreSplit($event)"
        @clear-selection="clearCostCentreSelection"
        @remove="removeCostCentreSplit($event)"
        @update:allocation="updateCostCentreAllocation"
      />
    </section>

    <CommonFormActions
      :disabled="disabled"
      :save-disabled="saveDisabled"
      :cancel-label="t('actions.cancel')"
      :submit-label="t('actions.save')"
      :close-label="t('actions.close')"
      @cancel="emit('cancel')"
      @submit="emit('submit')"
    />

    <CommonValidationSummary :errors="validationErrors" :title="t('common.validationBlocked')" />
  </div>
</template>

<script setup lang="ts">
import type { SearchSelectOption } from '~/components/Common/SearchSelect.vue'
import type { AllocationListItem } from '~/components/Common/AllocationListField.vue'
import type { SelectionListItem } from '~/components/Common/SelectionListField.vue'
import { useI18n } from '~/composables/useI18n'
import type { EventCostCentreOption, EventMemberOption, EventSubdivisionOption, SaveEventBody } from '~/types/event'

const props = defineProps<{
  modelValue: SaveEventBody
  members: EventMemberOption[]
  subdivisions: EventSubdivisionOption[]
  costCentres: EventCostCentreOption[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: SaveEventBody): void
  (e: 'submit'): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()

const form = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

function toInputDateTime(value: string) {
  return value ? String(value).slice(0, 16).replace(' ', 'T') : ''
}

function fromInputDateTime(value: string) {
  return value ? `${value.replace('T', ' ')}:00` : ''
}

const startsAtInput = computed({
  get: () => toInputDateTime(form.value.starts_at),
  set: (value: string) => {
    form.value = {
      ...form.value,
      starts_at: fromInputDateTime(value),
    }
  },
})

const endsAtInput = computed({
  get: () => toInputDateTime(form.value.ends_at),
  set: (value: string) => {
    form.value = {
      ...form.value,
      ends_at: fromInputDateTime(value),
    }
  },
})

const disabled = computed(() => Boolean(props.disabled))
const memberOrganizerQuery = ref('')
const subdivisionOrganizerQuery = ref('')
const costCentreQuery = ref('')

const memberOrganizerOptions = computed<SearchSelectOption<EventMemberOption>[]>(() => props.members
  .filter(member => !form.value.member_organizer_ids.includes(member.id))
  .map(member => ({
    key: member.id,
    label: member.full_name,
    value: member,
  })))

const subdivisionOrganizerOptions = computed<SearchSelectOption<EventSubdivisionOption>[]>(() => props.subdivisions
  .filter(subdivision => Boolean(subdivision.is_active) && !form.value.subdivision_organizer_ids.includes(subdivision.id))
  .map(subdivision => ({
    key: subdivision.id,
    label: `${subdivision.code} - ${subdivision.name}`,
    value: subdivision,
    searchText: `${subdivision.code} ${subdivision.name}`,
  })))

const costCentreOptions = computed<SearchSelectOption<EventCostCentreOption>[]>(() => props.costCentres
  .filter(costCentre => Boolean(costCentre.is_active) && !form.value.cost_centre_splits.some(split => split.cost_centre_id === costCentre.id))
  .map(costCentre => ({
    key: costCentre.id,
    label: `${costCentre.code} - ${costCentre.name}`,
    value: costCentre,
    searchText: `${costCentre.code} ${costCentre.name}`,
  })))

function findMember(id: number) {
  return props.members.find(member => member.id === id)
}

function findSubdivision(id: number) {
  return props.subdivisions.find(subdivision => subdivision.id === id)
}

function findCostCentre(id: number) {
  return props.costCentres.find(costCentre => costCentre.id === id)
}

const selectedMemberOrganizers = computed<SelectionListItem[]>(() => form.value.member_organizer_ids.map((id) => {
  const member = findMember(id)
  return {
    id,
    label: member?.full_name ?? String(id),
  }
}))

const selectedSubdivisionOrganizers = computed<SelectionListItem[]>(() => form.value.subdivision_organizer_ids.map((id) => {
  const subdivision = findSubdivision(id)
  return {
    id,
    label: subdivision ? `${subdivision.code} - ${subdivision.name}` : String(id),
    meta: subdivision?.is_active === false ? t('event.inactiveSubdivision') : null,
  }
}))

const selectedCostCentreSplits = computed<AllocationListItem[]>(() => form.value.cost_centre_splits.map((split) => {
  const costCentre = findCostCentre(split.cost_centre_id)
  return {
    id: split.cost_centre_id,
    label: costCentre ? `${costCentre.code} - ${costCentre.name}` : String(split.cost_centre_id),
    meta: costCentre?.is_active === false ? t('event.inactiveCostCentre') : null,
    allocation: Number(split.allocation_percentage).toFixed(2),
  }
}))

const allocationTotal = computed(() => form.value.cost_centre_splits
  .reduce((sum, split) => sum + Number(split.allocation_percentage || 0), 0))
const allocationTotalLabel = computed(() => Number(allocationTotal.value).toFixed(2))
const allocationIsValid = computed(() => Math.abs(allocationTotal.value - 100) <= 0.01)

const validationErrors = computed(() => {
  const errors: string[] = []

  if (!form.value.name.trim()) errors.push(t('event.required.name'))
  if (!form.value.location.trim()) errors.push(t('event.required.location'))
  if (!form.value.starts_at) errors.push(t('event.required.startsOn'))
  if (!form.value.ends_at) errors.push(t('event.required.endsOn'))
  if (form.value.starts_at && form.value.ends_at && form.value.starts_at > form.value.ends_at) {
    errors.push(t('event.required.dateOrder'))
  }

  if (!Number.isInteger(Number(form.value.expected_guests)) || Number(form.value.expected_guests) < 0) {
    errors.push(t('event.required.expectedGuests'))
  }

  if (form.value.member_organizer_ids.length + form.value.subdivision_organizer_ids.length === 0) {
    errors.push(t('event.required.organizers'))
  }

  if (!form.value.cost_centre_splits.length) {
    errors.push(t('event.required.costCentres'))
  }

  if (form.value.cost_centre_splits.some(split => Number(split.allocation_percentage) <= 0)) {
    errors.push(t('event.required.allocationPositive'))
  }

  if (!allocationIsValid.value) {
    errors.push(t('event.required.allocationTotal'))
  }

  return errors
})

const saveDisabled = computed(() => disabled.value || validationErrors.value.length > 0)

function clearMemberOrganizerSelection() {
  memberOrganizerQuery.value = ''
}

function clearSubdivisionOrganizerSelection() {
  subdivisionOrganizerQuery.value = ''
}

function clearCostCentreSelection() {
  costCentreQuery.value = ''
}

function addMemberOrganizer(value: unknown) {
  const member = value as EventMemberOption
  if (!member?.id || form.value.member_organizer_ids.includes(member.id)) return

  form.value = {
    ...form.value,
    member_organizer_ids: [...form.value.member_organizer_ids, member.id],
  }
  memberOrganizerQuery.value = ''
}

function removeMemberOrganizer(value: string | number) {
  const memberId = Number(value)
  form.value = {
    ...form.value,
    member_organizer_ids: form.value.member_organizer_ids.filter(id => id !== memberId),
  }
}

function addSubdivisionOrganizer(value: unknown) {
  const subdivision = value as EventSubdivisionOption
  if (!subdivision?.id || form.value.subdivision_organizer_ids.includes(subdivision.id)) return

  form.value = {
    ...form.value,
    subdivision_organizer_ids: [...form.value.subdivision_organizer_ids, subdivision.id],
  }
  subdivisionOrganizerQuery.value = ''
}

function removeSubdivisionOrganizer(value: string | number) {
  const subdivisionId = Number(value)
  form.value = {
    ...form.value,
    subdivision_organizer_ids: form.value.subdivision_organizer_ids.filter(id => id !== subdivisionId),
  }
}

function buildEvenAllocation(ids: number[]) {
  if (!ids.length) return []

  const base = Math.floor((10000 / ids.length)) / 100
  const entries = ids.map((id, index) => ({
    cost_centre_id: id,
    allocation_percentage: index === ids.length - 1
      ? Number((100 - base * (ids.length - 1)).toFixed(2))
      : Number(base.toFixed(2)),
  }))

  return entries
}

function addCostCentreSplit(value: unknown) {
  const costCentre = value as EventCostCentreOption
  if (!costCentre?.id || form.value.cost_centre_splits.some(split => split.cost_centre_id === costCentre.id)) return

  const ids = [...form.value.cost_centre_splits.map(split => split.cost_centre_id), costCentre.id]
  form.value = {
    ...form.value,
    cost_centre_splits: buildEvenAllocation(ids),
  }
  costCentreQuery.value = ''
}

function removeCostCentreSplit(value: string | number) {
  const costCentreId = Number(value)
  const ids = form.value.cost_centre_splits
    .map(split => split.cost_centre_id)
    .filter(id => id !== costCentreId)

  form.value = {
    ...form.value,
    cost_centre_splits: buildEvenAllocation(ids),
  }
}

function updateCostCentreAllocation(value: string | number, allocation: string) {
  const costCentreId = Number(value)
  const parsed = Number(allocation)
  const nextAllocation = Number.isFinite(parsed) ? Math.max(0, parsed) : 0

  form.value = {
    ...form.value,
    cost_centre_splits: form.value.cost_centre_splits.map((split) => {
      if (split.cost_centre_id !== costCentreId) return split
      return {
        ...split,
        allocation_percentage: nextAllocation,
      }
    }),
  }
}
</script>
