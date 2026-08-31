<template>
  <div class="space-y-4">
    <div class="space-y-2">
      <label
        v-for="option in options"
        :key="option.value"
        class="flex items-start gap-3 rounded-xl border p-3 text-sm transition"
        :class="[
          isSelected(option.value) ? 'border-accent-400 bg-accent-50' : 'border-base-200',
          option.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-base-50',
        ]"
      >
        <input
          type="radio"
          class="mt-0.5 h-4 w-4"
          :checked="isSelected(option.value)"
          :disabled="option.disabled || disabled"
          @change="selectMode(option.value)"
        />
        <span>
          <span class="block font-medium text-base-800">{{ option.label }}</span>
          <span v-if="option.hint" class="block text-xs text-base-500">{{ option.hint }}</span>
        </span>
      </label>
    </div>

    <template v-if="mode === 'restricted'">
      <div class="field">
        <label>{{ t('calendar.visibility.subdivisionsLabel') }}</label>
        <CommonSelectionListField
          :query="subdivisionQuery"
          :options="subdivisionOptions"
          :selected-items="selectedSubdivisions"
          :placeholder="t('calendar.visibility.pickSubdivision')"
          :empty-text="t('calendar.visibility.noSubdivisionsAvailable')"
          :empty-selection-text="t('calendar.visibility.noSubdivisionsSelected')"
          :remove-label="t('calendar.visibility.remove')"
          :disabled="disabled"
          @update:query="subdivisionQuery = $event"
          @select="addSubdivision"
          @remove="removeSubdivision"
        />
      </div>

      <div class="field">
        <label>{{ t('calendar.visibility.invitedLabel') }}</label>
        <CommonSelectionListField
          :query="memberQuery"
          :options="memberOptions"
          :selected-items="selectedMembers"
          :placeholder="t('calendar.visibility.pickMember')"
          :empty-text="t('calendar.visibility.noMembersAvailable')"
          :empty-selection-text="t('calendar.visibility.noMembersSelected')"
          :remove-label="t('calendar.visibility.remove')"
          :disabled="disabled"
          @update:query="memberQuery = $event"
          @select="addMember"
          @remove="removeMember"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import type { SearchSelectOption } from '~/components/Common/SearchSelect.vue'
import type { SelectionListItem } from '~/components/Common/SelectionListField.vue'
import type { AppointmentMemberOption, AppointmentSubdivisionOption } from '~/server/api/appointments/options.get'

export interface VisibilityValue {
  subdivision_ids: number[]
  member_ids: number[]
  /** Not derived from the lists — see the note on `SaveAppointmentBody.restricted`. */
  restricted: boolean
}

const props = defineProps<{
  modelValue: VisibilityValue
  members: AppointmentMemberOption[]
  subdivisions: AppointmentSubdivisionOption[]
  /** Only `calendar.manage` may address the whole association. */
  canManage: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: VisibilityValue): void
}>()

const { t } = useI18n()

const subdivisionQuery = ref('')
const memberQuery = ref('')

const mode = ref<'association' | 'restricted'>(props.modelValue.restricted ? 'restricted' : 'association')

const options = computed(() => ([
  {
    value: 'association' as const,
    label: t('calendar.visibility.association'),
    hint: props.canManage ? '' : t('calendar.visibility.associationHint'),
    disabled: !props.canManage,
  },
  {
    value: 'restricted' as const,
    label: t('calendar.visibility.restricted'),
    hint: t('calendar.visibility.restrictedHint'),
    disabled: false,
  },
]))

function isSelected(value: 'association' | 'restricted') {
  return mode.value === value
}

function selectMode(value: 'association' | 'restricted') {
  mode.value = value
  patch(value === 'association' ? { subdivision_ids: [], member_ids: [] } : {})
}

// Already-selected entries drop out of the picker so the same one cannot be added twice.
const subdivisionOptions = computed<SearchSelectOption[]>(() => props.subdivisions
  .filter(subdivision => subdivision.is_active && !props.modelValue.subdivision_ids.includes(subdivision.id))
  .map(subdivision => ({ key: String(subdivision.id), label: `${subdivision.code} – ${subdivision.name}`, value: String(subdivision.id) })))

const memberOptions = computed<SearchSelectOption[]>(() => props.members
  .filter(member => !props.modelValue.member_ids.includes(member.id))
  .map(member => ({ key: String(member.id), label: member.full_name, value: String(member.id) })))

const selectedSubdivisions = computed<SelectionListItem[]>(() => props.modelValue.subdivision_ids.map((id) => {
  const subdivision = props.subdivisions.find(entry => entry.id === id)
  return { id, label: subdivision ? `${subdivision.code} – ${subdivision.name}` : `#${id}` }
}))

const selectedMembers = computed<SelectionListItem[]>(() => props.modelValue.member_ids.map((id) => {
  const member = props.members.find(entry => entry.id === id)
  return { id, label: member?.full_name ?? `#${id}` }
}))

function patch(changes: Partial<VisibilityValue>) {
  emit('update:modelValue', { ...props.modelValue, restricted: mode.value === 'restricted', ...changes })
}

function addSubdivision(value: unknown) {
  const id = Number(value)
  if (!Number.isFinite(id) || props.modelValue.subdivision_ids.includes(id)) return
  subdivisionQuery.value = ''
  patch({ subdivision_ids: [...props.modelValue.subdivision_ids, id] })
}

function removeSubdivision(id: string | number) {
  patch({ subdivision_ids: props.modelValue.subdivision_ids.filter(entry => entry !== Number(id)) })
}

function addMember(value: unknown) {
  const id = Number(value)
  if (!Number.isFinite(id) || props.modelValue.member_ids.includes(id)) return
  memberQuery.value = ''
  patch({ member_ids: [...props.modelValue.member_ids, id] })
}

function removeMember(id: string | number) {
  patch({ member_ids: props.modelValue.member_ids.filter(entry => entry !== Number(id)) })
}
</script>
