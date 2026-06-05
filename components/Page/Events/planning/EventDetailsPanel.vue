<template>
  <div class="space-y-6">
    <section class="space-y-4 rounded-xl bg-white p-4 shadow-lg">
      <h2 class="text-lg font-semibold">{{ t('event.masterData') }}</h2>

      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('event.name') }}</label>
          <input v-model="form.name" class="input" :disabled="disabled">
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('event.location') }}</label>
          <input
            :value="form.location ?? ''"
            class="input"
            :disabled="disabled"
            @input="form.location = ($event.target as HTMLInputElement).value || null"
          >
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('event.startsOn') }}</label>
          <CommonDateInput v-model="startsAtInput" mode="datetime" :disabled="disabled" />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('event.endsOn') }}</label>
          <CommonDateInput v-model="endsAtInput" mode="datetime" :disabled="disabled" />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('event.expectedGuests') }}</label>
          <input
            :value="form.expected_guests ?? ''"
            type="number"
            min="0"
            step="1"
            class="input"
            :disabled="disabled"
            @input="form.expected_guests = ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value)"
          >
        </div>
      </div>
    </section>

    <section class="space-y-4 rounded-xl bg-white p-4 shadow-lg">
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
            @clear-selection="memberOrganizerQuery = ''"
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
            @clear-selection="subdivisionOrganizerQuery = ''"
            @remove="removeSubdivisionOrganizer($event)"
          />
        </div>
      </div>
    </section>

    <section class="space-y-4 rounded-xl bg-white p-4 shadow-lg">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold">{{ t('event.costCentres') }}</h2>
        <p class="text-sm font-medium" :class="allocationIsValid ? 'text-emerald-600' : 'text-amber-600'">
          {{ t('event.allocationTotal', { value: allocationTotalLabel }) }}
        </p>
      </div>

      <div class="space-y-3">
        <CommonSearchSelect
          v-if="!disabled"
          :model-value="costCentreQuery"
          :options="costCentreOptions"
          :placeholder="t('event.costCentrePlaceholder')"
          :empty-text="t('event.noMatchingCostCentres')"
          @update:model-value="costCentreQuery = $event"
          @select="addCostCentreSplit($event)"
          @clear-selection="costCentreQuery = ''"
        />

        <div v-if="selectedCostCentreSplits.length" class="min-h-0 rounded-lg border border-slate-200 bg-slate-50">
          <div class="selection-scroll max-h-[min(38vh,24rem)] overflow-y-auto p-2">
            <div
              v-for="split in selectedCostCentreSplits"
              :key="split.id"
              class="mb-2 rounded-lg border border-slate-200 bg-white px-3 py-3 last:mb-0"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-slate-800">{{ split.label }}</p>
                  <p v-if="split.meta" class="text-xs text-slate-500">{{ split.meta }}</p>
                </div>

                <button
                  v-if="!disabled"
                  type="button"
                  class="shrink-0 cursor-pointer text-sm text-red-500 hover:underline"
                  @click="removeCostCentreSplit(split.id)"
                >
                  {{ t('actions.remove') }}
                </button>
              </div>

              <div class="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div>
                  <label class="text-sm text-slate-600">{{ t('event.sphere') }}</label>
                  <MenuDropdown v-model="openSphereDropdownId" :id="split.id" :disabled="disabled">
                    <template #trigger>
                      <button
                        type="button"
                        class="input mt-1 flex w-full items-center justify-between text-left cursor-pointer"
                        :disabled="disabled"
                      >
                        <span class="truncate">
                          {{ selectedSphereLabel(split.sphere_id) || t('event.spherePlaceholder') }}
                        </span>
                        <Icon v-if="!disabled" name="material-symbols:keyboard-arrow-down-rounded" class="text-lg" />
                      </button>
                    </template>

                    <button
                      v-for="sphere in availableSpheres(split.sphere_id)"
                      :key="sphere.id"
                      type="button"
                      class="flex w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-gray-100"
                      @click="updateCostCentreSphere(split.id, sphere.id)"
                    >
                      {{ sphereOptionLabel(sphere) }}
                    </button>
                  </MenuDropdown>
                </div>

                <div>
                  <label class="text-sm text-slate-600">{{ t('event.allocationPercentage') }}</label>
                  <div class="mt-1 flex items-center gap-2">
                    <input
                      :value="split.allocation"
                      type="number"
                      min="0"
                      step="0.01"
                      class="input w-28 text-right"
                      :disabled="disabled"
                      @input="updateCostCentreAllocation(split.id, ($event.target as HTMLInputElement).value)"
                    >
                    <span class="text-sm text-slate-500">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
          {{ t('event.noCostCentresAssigned') }}
        </div>
      </div>
    </section>

    <div v-if="!disabled" class="grid grid-cols-2 gap-4">
      <button
        v-if="!eventId"
        type="button"
        class="btn-secondary"
        @click="emit('cancel')"
      >
        {{ t('actions.cancel') }}
      </button>
      <button
        v-else
        type="button"
        class="btn-secondary"
        :disabled="!isDirty"
        :class="{ 'opacity-50 cursor-not-allowed': !isDirty }"
        @click="discard"
      >
        {{ t('actions.discard') }}
      </button>

      <span
        v-if="!isDirty && !!eventId && !saving"
        class="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-400"
      >
        <Icon name="material-symbols:check-circle-rounded" class="text-emerald-500" />
        {{ t('actions.saved') }}
      </span>
      <button
        v-else
        type="button"
        class="btn-primary"
        :disabled="saveDisabled"
        :class="{ 'opacity-50 cursor-not-allowed': saveDisabled }"
        @click="emit('save')"
      >
        {{ t('actions.save') }}
      </button>
    </div>

    <CommonValidationSummary :errors="validationErrors" :title="t('common.validationBlocked')" />
  </div>
</template>

<script setup lang="ts">
import type { SearchSelectOption } from '~/components/Common/SearchSelect.vue'
import type { SelectionListItem } from '~/components/Common/SelectionListField.vue'
import { useI18n } from '~/composables/useI18n'
import type {
  EventCostCentreOption,
  EventMemberOption,
  EventSphereOption,
  EventSubdivisionOption,
  SaveEventBody,
} from '~/types/event'

const props = defineProps<{
  modelValue: SaveEventBody
  savedValue: SaveEventBody | null
  eventId?: number | null
  members: EventMemberOption[]
  subdivisions: EventSubdivisionOption[]
  costCentres: EventCostCentreOption[]
  spheres: EventSphereOption[]
  disabled?: boolean
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: SaveEventBody): void
  (e: 'save'): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()

const form = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const isDirty = computed(() => {
  if (!props.savedValue) return true
  return JSON.stringify(form.value) !== JSON.stringify(props.savedValue)
})

const startsAtInput = computed({
  get: () => form.value.starts_at,
  set: (value: string | null) => { form.value = { ...form.value, starts_at: value || '' } },
})

const endsAtInput = computed({
  get: () => form.value.ends_at,
  set: (value: string | null) => { form.value = { ...form.value, ends_at: value || '' } },
})

const disabled = computed(() => Boolean(props.disabled))
const memberOrganizerQuery = ref('')
const subdivisionOrganizerQuery = ref('')
const costCentreQuery = ref('')
const openSphereDropdownId = ref<number | null>(null)

const memberOrganizerOptions = computed<SearchSelectOption<EventMemberOption>[]>(() => props.members
  .filter(member => !form.value.member_organizer_ids.includes(member.id))
  .map(member => ({ key: member.id, label: member.full_name, value: member })))

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

const selectedMemberOrganizers = computed<SelectionListItem[]>(() => form.value.member_organizer_ids.map((id) => {
  const member = props.members.find(entry => entry.id === id)
  return { id, label: member?.full_name ?? String(id) }
}))

const selectedSubdivisionOrganizers = computed<SelectionListItem[]>(() => form.value.subdivision_organizer_ids.map((id) => {
  const subdivision = props.subdivisions.find(entry => entry.id === id)
  return {
    id,
    label: subdivision ? `${subdivision.code} - ${subdivision.name}` : String(id),
    meta: subdivision?.is_active === false ? t('event.inactiveSubdivision') : null,
  }
}))

const selectedCostCentreSplits = computed(() => form.value.cost_centre_splits.map((split) => {
  const costCentre = props.costCentres.find(entry => entry.id === split.cost_centre_id)
  const sphere = props.spheres.find(entry => entry.id === split.sphere_id)
  const meta = [
    costCentre?.is_active === false ? t('event.inactiveCostCentre') : null,
    sphere?.is_active === false ? t('event.inactiveSphere') : null,
  ].filter(Boolean).join(' | ')

  return {
    id: split.cost_centre_id,
    sphere_id: split.sphere_id,
    label: costCentre ? `${costCentre.code} - ${costCentre.name}` : String(split.cost_centre_id),
    meta: meta || null,
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
  if (!form.value.starts_at) errors.push(t('event.required.startsOn'))
  if (!form.value.ends_at) errors.push(t('event.required.endsOn'))
  if (form.value.starts_at && form.value.ends_at && form.value.starts_at > form.value.ends_at) errors.push(t('event.required.dateOrder'))
  if (!form.value.cost_centre_splits.length) errors.push(t('event.required.costCentres'))
  if (form.value.cost_centre_splits.some(split => !Number.isInteger(Number(split.sphere_id)) || Number(split.sphere_id) <= 0)) errors.push(t('event.required.spheres'))
  if (form.value.cost_centre_splits.some(split => Number(split.allocation_percentage) <= 0)) errors.push(t('event.required.allocationPositive'))
  if (form.value.cost_centre_splits.length > 0 && !allocationIsValid.value) errors.push(t('event.required.allocationTotal'))

  return errors
})

const saveDisabled = computed(() => disabled.value || Boolean(props.saving) || validationErrors.value.length > 0)

function discard() {
  if (!props.savedValue) return
  form.value = JSON.parse(JSON.stringify(props.savedValue))
}

function addMemberOrganizer(value: unknown) {
  const member = value as EventMemberOption
  if (!member?.id || form.value.member_organizer_ids.includes(member.id)) return
  form.value = { ...form.value, member_organizer_ids: [...form.value.member_organizer_ids, member.id] }
  memberOrganizerQuery.value = ''
}

function removeMemberOrganizer(value: string | number) {
  const memberId = Number(value)
  form.value = { ...form.value, member_organizer_ids: form.value.member_organizer_ids.filter(id => id !== memberId) }
}

function addSubdivisionOrganizer(value: unknown) {
  const subdivision = value as EventSubdivisionOption
  if (!subdivision?.id || form.value.subdivision_organizer_ids.includes(subdivision.id)) return
  form.value = { ...form.value, subdivision_organizer_ids: [...form.value.subdivision_organizer_ids, subdivision.id] }
  subdivisionOrganizerQuery.value = ''
}

function removeSubdivisionOrganizer(value: string | number) {
  const subdivisionId = Number(value)
  form.value = { ...form.value, subdivision_organizer_ids: form.value.subdivision_organizer_ids.filter(id => id !== subdivisionId) }
}

function rebalanceCostCentreSplits(splits: SaveEventBody['cost_centre_splits']) {
  if (!splits.length) return []
  const base = Math.floor(10000 / splits.length) / 100

  return splits.map((split, index) => ({
    ...split,
    allocation_percentage: index === splits.length - 1
      ? Number((100 - base * (splits.length - 1)).toFixed(2))
      : Number(base.toFixed(2)),
  }))
}

function addCostCentreSplit(value: unknown) {
  const costCentre = value as EventCostCentreOption
  if (!costCentre?.id || form.value.cost_centre_splits.some(split => split.cost_centre_id === costCentre.id)) return
  form.value = {
    ...form.value,
    cost_centre_splits: rebalanceCostCentreSplits([
      ...form.value.cost_centre_splits,
      { sphere_id: 0, cost_centre_id: costCentre.id, allocation_percentage: 0 },
    ]),
  }
  costCentreQuery.value = ''
}

function removeCostCentreSplit(value: string | number) {
  const costCentreId = Number(value)
  form.value = {
    ...form.value,
    cost_centre_splits: rebalanceCostCentreSplits(
      form.value.cost_centre_splits.filter(split => split.cost_centre_id !== costCentreId),
    ),
  }
}

function updateCostCentreAllocation(value: string | number, allocation: string) {
  const costCentreId = Number(value)
  const parsed = Number(allocation)
  const nextAllocation = Number.isFinite(parsed) ? Math.max(0, parsed) : 0
  form.value = {
    ...form.value,
    cost_centre_splits: form.value.cost_centre_splits.map(split => split.cost_centre_id === costCentreId
      ? { ...split, allocation_percentage: nextAllocation }
      : split),
  }
}

function updateCostCentreSphere(value: string | number, sphereValue: number) {
  const costCentreId = Number(value)
  const sphereId = Number(sphereValue || 0)
  form.value = {
    ...form.value,
    cost_centre_splits: form.value.cost_centre_splits.map(split => split.cost_centre_id === costCentreId
      ? { ...split, sphere_id: Number.isInteger(sphereId) ? sphereId : 0 }
      : split),
  }
  openSphereDropdownId.value = null
}

function availableSpheres(selectedSphereId: number) {
  return props.spheres.filter(sphere => Boolean(sphere.is_active) || sphere.id === selectedSphereId)
}

function sphereOptionLabel(sphere: EventSphereOption) {
  const baseLabel = `${sphere.code} - ${sphere.name}`
  return Boolean(sphere.is_active) ? baseLabel : `${baseLabel} (${t('common.inactive')})`
}

function selectedSphereLabel(sphereId: number) {
  const sphere = props.spheres.find(entry => entry.id === sphereId)
  return sphere ? sphereOptionLabel(sphere) : ''
}
</script>

<style scoped>
.selection-scroll {
  scrollbar-width: auto;
  scrollbar-color: #94a3b8 #e2e8f0;
}

.selection-scroll::-webkit-scrollbar {
  width: 12px;
}

.selection-scroll::-webkit-scrollbar-track {
  background: #e2e8f0;
  border-radius: 9999px;
}

.selection-scroll::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 9999px;
  border: 2px solid #e2e8f0;
}
</style>
