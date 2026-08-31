<template>
  <div class="space-y-4">
    <div
      v-for="toggle in toggles"
      :key="toggle.key"
      class="flex items-start justify-between gap-4"
    >
      <div class="min-w-0">
        <p class="text-sm font-medium text-base-800">{{ toggle.label }}</p>
        <p class="text-xs text-base-500">{{ toggle.hint }}</p>
      </div>
      <CommonToggleSwitch
        :model-value="modelValue[toggle.key]"
        :label="toggle.label"
        :disabled="disabled"
        @update:model-value="patch({ [toggle.key]: $event })"
      />
    </div>

    <div v-if="modelValue.notify_reminder" class="field">
      <label>{{ t('calendar.notifications.leadTimes') }}</label>

      <div class="flex flex-wrap items-center gap-2">
        <span
          v-for="(lead, index) in leadMinutes"
          :key="`${lead}-${index}`"
          class="inline-flex items-center gap-1.5 rounded-full bg-base-100 px-2.5 py-1 text-xs font-medium text-base-700"
        >
          {{ formatLead(lead) }}
          <button
            v-if="!disabled"
            type="button"
            class="cursor-pointer text-base-400 transition hover:text-danger-500"
            :aria-label="t('calendar.notifications.remove')"
            @click="removeLead(index)"
          >
            <Icon name="material-symbols:close-rounded" class="text-sm" />
          </button>
        </span>

        <span v-if="!leadMinutes.length" class="text-xs text-base-500">
          {{ t('calendar.notifications.useGlobal') }}
        </span>
      </div>

      <div v-if="!disabled" class="mt-2 flex items-center gap-2">
        <input
          v-model="newLead"
          type="number"
          min="1"
          max="43200"
          class="input w-32"
          :placeholder="t('calendar.notifications.leadPlaceholder')"
          @keydown.enter.prevent="addLead"
        />
        <button type="button" class="btn-secondary" :disabled="!canAddLead" @click="addLead">
          {{ t('calendar.notifications.add') }}
        </button>
      </div>

      <p class="mt-1 text-xs text-base-500">{{ t('calendar.notifications.reminderHint') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'

export interface NotificationValue {
  notify_on_create: boolean
  notify_on_change: boolean
  notify_reminder: boolean
  /** Comma-separated minutes; empty means "use the association-wide lead times". */
  reminder_lead_minutes: string | null
}

const props = defineProps<{
  modelValue: NotificationValue
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: NotificationValue): void
}>()

const { t } = useI18n()

/** The server rejects more than five entries and anything above 30 days. */
const MAX_LEAD_ENTRIES = 5
const MAX_LEAD_MINUTES = 43200

const newLead = ref('')

const toggles = computed(() => ([
  { key: 'notify_on_create' as const, label: t('calendar.notifications.onCreate'), hint: t('calendar.notifications.onCreateHint') },
  { key: 'notify_on_change' as const, label: t('calendar.notifications.onChange'), hint: t('calendar.notifications.onChangeHint') },
  { key: 'notify_reminder' as const, label: t('calendar.notifications.reminder'), hint: t('calendar.notifications.reminderHint') },
]))

const leadMinutes = computed(() => (props.modelValue.reminder_lead_minutes ?? '')
  .split(',')
  .map(part => Number(part.trim()))
  .filter(minutes => Number.isInteger(minutes) && minutes > 0))

const canAddLead = computed(() => {
  const value = Math.trunc(Number(newLead.value))
  return Number.isInteger(value)
    && value > 0
    && value <= MAX_LEAD_MINUTES
    && leadMinutes.value.length < MAX_LEAD_ENTRIES
    && !leadMinutes.value.includes(value)
})

function patch(changes: Partial<NotificationValue>) {
  emit('update:modelValue', { ...props.modelValue, ...changes })
}

function writeLeads(minutes: number[]) {
  // Descending, so the earliest reminder is listed first — that is the order they fire in.
  const sorted = Array.from(new Set(minutes)).sort((a, b) => b - a)
  patch({ reminder_lead_minutes: sorted.length ? sorted.join(',') : null })
}

function addLead() {
  if (!canAddLead.value) return
  writeLeads([...leadMinutes.value, Math.trunc(Number(newLead.value))])
  newLead.value = ''
}

function removeLead(index: number) {
  writeLeads(leadMinutes.value.filter((_, entry) => entry !== index))
}

function formatLead(minutes: number) {
  if (minutes % 1440 === 0) return t('calendar.notifications.days', { count: minutes / 1440 })
  if (minutes % 60 === 0) return t('calendar.notifications.hours', { count: minutes / 60 })
  return t('calendar.notifications.minutes', { count: minutes })
}
</script>
