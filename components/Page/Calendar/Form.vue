<template>
  <div class="space-y-8">
    <section class="space-y-4">
      <header>
        <h3 class="text-sm font-semibold uppercase tracking-wide text-base-400">{{ t('calendar.form.sectionBasics') }}</h3>
        <p class="mt-0.5 text-xs text-base-400">{{ t('calendar.form.sectionBasicsHint') }}</p>
      </header>

      <div class="field">
        <label for="appointment-title">
          {{ t('calendar.form.titleLabel') }}
          <span class="text-danger-500" :title="t('calendar.form.required')" aria-hidden="true">*</span>
        </label>
        <input
          id="appointment-title"
          v-model="titleValue"
          class="input"
          required
          :placeholder="t('calendar.form.titlePlaceholder')"
          :disabled="disabled"
        />
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="field">
          <label>{{ t('calendar.form.type') }}</label>
          <CommonSearchSelect
            v-model="typeQuery"
            :options="typeOptions"
            :placeholder="t('calendar.form.typePlaceholder')"
            :empty-text="t('calendar.form.typeEmpty')"
            :disabled="disabled"
            @select="onTypeSelected"
          />
        </div>

        <div class="field">
          <label for="appointment-location">{{ t('calendar.form.location') }}</label>
          <input
            id="appointment-location"
            v-model="locationValue"
            class="input"
            :placeholder="t('calendar.form.locationPlaceholder')"
            :disabled="disabled"
          />
        </div>
      </div>

      <div class="rounded-xl border border-base-200 p-3 sm:p-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="field">
            <label>{{ t('calendar.form.start') }}</label>
            <CommonDateInput
              :model-value="modelValue.starts_at"
              :mode="modelValue.all_day ? 'date' : 'datetime'"
              :empty-value="''"
              :disabled="disabled"
              @update:model-value="onStartChanged($event)"
            />
          </div>

          <div class="field">
            <label>{{ t('calendar.form.end') }}</label>
            <CommonDateInput
              :model-value="modelValue.ends_at"
              :mode="modelValue.all_day ? 'date' : 'datetime'"
              :empty-value="''"
              :disabled="disabled"
              @update:model-value="patch({ ends_at: $event ?? '' })"
            />
          </div>
        </div>

        <!-- The toggle carries its own visible label; a stacked field label above a bare switch
             reads as a second, unrelated control. -->
        <div class="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-base-100 pt-3">
          <label
            class="flex items-center gap-3 text-sm text-base-700"
            :class="disabled ? '' : 'cursor-pointer'"
          >
            <CommonToggleSwitch
              v-model="allDayValue"
              :label="t('calendar.form.allDay')"
              :disabled="disabled"
            />
            {{ t('calendar.form.allDay') }}
          </label>

          <!-- Immediate feedback on what was just typed, instead of waiting for a save to fail. -->
          <p v-if="rangeInvalid" class="flex items-center gap-1 text-xs font-medium text-danger-600">
            <Icon name="material-symbols:error-outline-rounded" class="text-sm" />
            {{ t('calendar.form.rangeHint') }}
          </p>
          <p v-else-if="durationLabel" class="text-xs text-base-500">
            {{ t('calendar.form.durationHint', { duration: durationLabel }) }}
          </p>
        </div>
      </div>

      <div class="field">
        <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
          <label for="appointment-agenda" class="mb-0">{{ t('calendar.form.agenda') }}</label>
          <CommonTextFormatToolbar v-if="!disabled" @action="applyFormat" />
        </div>
        <textarea
          id="appointment-agenda"
          ref="agendaRef"
          v-model="agendaText"
          rows="8"
          class="input resize-y"
          :disabled="disabled"
        ></textarea>
        <p class="mt-1 text-xs text-base-400">{{ t('calendar.form.agendaHint') }}</p>
      </div>
    </section>

    <!-- The three sections below belong to the series as a whole; a single-occurrence edit hides
         them rather than showing controls that the server would reject. -->
    <template v-if="scope !== 'occurrence'">
      <section class="space-y-4 border-t border-base-200 pt-6">
        <header>
          <h3 class="text-sm font-semibold uppercase tracking-wide text-base-400">{{ t('calendar.form.sectionRecurrence') }}</h3>
          <p class="mt-0.5 text-xs text-base-400">{{ t('calendar.form.sectionRecurrenceHint') }}</p>
        </header>
        <PageCalendarRecurrenceField
          v-model="recurrenceValue"
          :starts-at="modelValue.starts_at"
          :disabled="disabled"
        />
      </section>

      <section class="space-y-4 border-t border-base-200 pt-6">
        <header>
          <h3 class="text-sm font-semibold uppercase tracking-wide text-base-400">{{ t('calendar.form.sectionVisibility') }}</h3>
          <p class="mt-0.5 text-xs text-base-400">{{ t('calendar.form.sectionVisibilityHint') }}</p>
        </header>
        <PageCalendarVisibilityField
          v-model="visibilityValue"
          :members="members"
          :subdivisions="subdivisions"
          :can-manage="canManage"
          :disabled="disabled"
        />
      </section>

      <section class="space-y-4 border-t border-base-200 pt-6">
        <header>
          <h3 class="text-sm font-semibold uppercase tracking-wide text-base-400">{{ t('calendar.form.sectionNotifications') }}</h3>
          <p class="mt-0.5 text-xs text-base-400">{{ t('calendar.form.sectionNotificationsHint') }}</p>
        </header>
        <PageCalendarNotificationField
          v-model="notificationValue"
          :disabled="disabled"
        />
      </section>
    </template>

    <p v-else class="flex items-start gap-2 rounded-lg bg-base-50 px-3 py-2 text-sm text-base-600">
      <Icon name="material-symbols:info-outline-rounded" class="mt-0.5 shrink-0 text-base text-base-400" />
      <span>{{ t('calendar.form.occurrenceHint') }}</span>
    </p>

    <p v-if="scope === 'following'" class="flex items-start gap-2 rounded-lg bg-base-50 px-3 py-2 text-sm text-base-600">
      <Icon name="material-symbols:info-outline-rounded" class="mt-0.5 shrink-0 text-base text-base-400" />
      <span>{{ t('calendar.form.followingHint') }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { useTextFormatting } from '~/composables/useTextFormatting'
import type { SearchSelectOption } from '~/components/Common/SearchSelect.vue'
import type { RecurrenceValue } from '~/components/Page/Calendar/RecurrenceField.vue'
import type { VisibilityValue } from '~/components/Page/Calendar/VisibilityField.vue'
import type { NotificationValue } from '~/components/Page/Calendar/NotificationField.vue'
import type { AppointmentEditScope, AppointmentTypeRow, SaveAppointmentBody } from '~/types/appointment'
import type { AppointmentMemberOption, AppointmentSubdivisionOption } from '~/server/api/appointments/options.get'

export type AppointmentFormValue = Omit<SaveAppointmentBody, 'scope' | 'occurrenceDate'>

const props = defineProps<{
  modelValue: AppointmentFormValue
  members: AppointmentMemberOption[]
  subdivisions: AppointmentSubdivisionOption[]
  appointmentTypes: AppointmentTypeRow[]
  canManage: boolean
  scope: AppointmentEditScope
  disabled?: boolean
  existingTypeId?: number | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: AppointmentFormValue): void
}>()

const { t } = useI18n()

const agendaRef = ref<HTMLTextAreaElement | null>(null)

function patch(changes: Partial<AppointmentFormValue>) {
  emit('update:modelValue', { ...props.modelValue, ...changes })
}

const titleValue = computed({
  get: () => props.modelValue.title,
  set: (value: string) => patch({ title: value }),
})

const locationValue = computed({
  get: () => props.modelValue.location ?? '',
  set: (value: string) => patch({ location: value || null }),
})

const allDayValue = computed({
  get: () => props.modelValue.all_day,
  set: (value: boolean) => patch({ all_day: value }),
})

const agendaText = computed({
  get: () => props.modelValue.agenda ?? '',
  set: (value: string) => patch({ agenda: value || null }),
})

const { apply: applyFormat } = useTextFormatting(agendaText, agendaRef)

const rangeInvalid = computed(() => {
  const start = parseWallClockValue(props.modelValue.starts_at)
  const end = parseWallClockValue(props.modelValue.ends_at)
  return Boolean(start && end && end.getTime() < start.getTime())
})

const durationLabel = computed(() => {
  const start = parseWallClockValue(props.modelValue.starts_at)
  const end = parseWallClockValue(props.modelValue.ends_at)
  if (!start || !end || end.getTime() < start.getTime()) return ''

  if (props.modelValue.all_day) {
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
    return t('calendar.notifications.days', { count: days })
  }

  const minutes = Math.round((end.getTime() - start.getTime()) / 60000)
  if (minutes <= 0) return ''

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return [
    hours ? t('calendar.notifications.hours', { count: hours }) : '',
    rest ? t('calendar.notifications.minutes', { count: rest }) : '',
  ].filter(Boolean).join(' ')
})

const recurrenceValue = computed<RecurrenceValue>({
  get: () => ({
    recurrence_freq: props.modelValue.recurrence_freq,
    recurrence_interval: props.modelValue.recurrence_interval,
    recurrence_weekdays: props.modelValue.recurrence_weekdays,
    recurrence_monthly_mode: props.modelValue.recurrence_monthly_mode,
    recurrence_until: props.modelValue.recurrence_until,
    recurrence_count: props.modelValue.recurrence_count,
  }),
  set: value => patch(value),
})

const visibilityValue = computed<VisibilityValue>({
  get: () => ({
    subdivision_ids: props.modelValue.subdivision_ids,
    member_ids: props.modelValue.member_ids,
    restricted: props.modelValue.restricted ?? true,
  }),
  set: value => patch(value),
})

const notificationValue = computed<NotificationValue>({
  get: () => ({
    notify_on_create: props.modelValue.notify_on_create,
    notify_on_change: props.modelValue.notify_on_change,
    notify_reminder: props.modelValue.notify_reminder,
    reminder_lead_minutes: props.modelValue.reminder_lead_minutes,
  }),
  set: value => patch(value),
})

const selectableTypes = computed(() => props.appointmentTypes.filter(type =>
  type.is_active || type.id === props.existingTypeId))

const typeOptions = computed<SearchSelectOption[]>(() => ([
  { key: 'none', label: t('calendar.form.noType'), value: '' },
  ...selectableTypes.value.map(type => ({
    key: String(type.id),
    label: type.is_active ? type.name : t('calendar.form.inactiveType', { name: type.name }),
    value: String(type.id),
  })),
]))

const selectedTypeLabel = computed(() => {
  if (props.modelValue.type_id == null) return ''
  const type = props.appointmentTypes.find(entry => entry.id === props.modelValue.type_id)
  if (!type) return ''
  return type.is_active ? type.name : t('calendar.form.inactiveType', { name: type.name })
})

const typeQuery = ref(selectedTypeLabel.value)
watch(selectedTypeLabel, (label) => { typeQuery.value = label })

function onTypeSelected(value: unknown) {
  const id = Number(value)
  const nextTypeId = value === '' || !Number.isFinite(id) || id <= 0 ? null : id
  patch({ type_id: nextTypeId })
  if (nextTypeId === null) typeQuery.value = ''
}

function onStartChanged(value: string | null) {
  const nextStart = value ?? ''
  const previousStart = parseWallClockValue(props.modelValue.starts_at)
  const previousEnd = parseWallClockValue(props.modelValue.ends_at)
  const parsedNext = parseWallClockValue(nextStart)

  if (!parsedNext || !previousStart || !previousEnd || previousEnd <= previousStart) {
    patch({ starts_at: nextStart })
    return
  }

  const shifted = new Date(parsedNext.getTime() + (previousEnd.getTime() - previousStart.getTime()))
  patch({ starts_at: nextStart, ends_at: formatWallClockValue(shifted, props.modelValue.all_day) })
}

function parseWallClockValue(value: string): Date | null {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (!match) return null
  return new Date(Date.UTC(
    Number(match[1]), Number(match[2]) - 1, Number(match[3]),
    Number(match[4] ?? '0'), Number(match[5] ?? '0'), Number(match[6] ?? '0'),
  ))
}

function formatWallClockValue(date: Date, allDay: boolean): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  const day = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
  if (allDay) return day
  return `${day} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:00`
}
</script>
