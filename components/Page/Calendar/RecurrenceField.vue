<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="field">
        <label>{{ t('calendar.recurrence.label') }}</label>
        <MenuDropdown v-model="openFreqDropdown" :id="0" :disabled="disabled">
          <template #trigger="{ styling }">
            <button type="button" :class="[styling, disabled ? '' : 'cursor-pointer']" :disabled="disabled">
              <span>{{ freqLabel }}</span>
              <Icon name="material-symbols:keyboard-arrow-down-rounded" class="text-lg" />
            </button>
          </template>

          <template #default="{ styling }">
            <button type="button" :class="styling" @click="setFreq(''); openFreqDropdown = null">{{ t('calendar.recurrence.none') }}</button>
            <button type="button" :class="styling" @click="setFreq('daily'); openFreqDropdown = null">{{ t('calendar.recurrence.daily') }}</button>
            <button type="button" :class="styling" @click="setFreq('weekly'); openFreqDropdown = null">{{ t('calendar.recurrence.weekly') }}</button>
            <button type="button" :class="styling" @click="setFreq('monthly'); openFreqDropdown = null">{{ t('calendar.recurrence.monthly') }}</button>
          </template>
        </MenuDropdown>
      </div>

      <div v-if="modelValue.recurrence_freq" class="field">
        <label>{{ t('calendar.recurrence.interval') }}</label>
        <div class="flex items-center gap-2">
          <span class="text-sm text-base-500">{{ t('calendar.recurrence.every') }}</span>
          <input
            :value="modelValue.recurrence_interval"
            type="number"
            min="1"
            max="52"
            class="input w-20"
            :disabled="disabled"
            @input="patch({ recurrence_interval: clampInterval(($event.target as HTMLInputElement).value) })"
          />
          <span class="text-sm text-base-500">{{ intervalUnit }}</span>
        </div>
      </div>
    </div>

    <div v-if="modelValue.recurrence_freq === 'weekly'" class="field">
      <label>
        {{ t('calendar.recurrence.weekdays') }}
        <span class="text-danger-500" :title="t('calendar.form.required')" aria-hidden="true">*</span>
      </label>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="(key, index) in WEEKDAY_KEYS"
          :key="key"
          type="button"
          class="h-9 w-11 cursor-pointer rounded-lg border text-xs font-semibold transition"
          :class="selectedWeekdays.includes(index)
            ? 'border-transparent bg-accent-500 text-white'
            : 'border-base-200 bg-white text-base-600 hover:bg-base-50'"
          :disabled="disabled"
          :aria-pressed="selectedWeekdays.includes(index)"
          :title="t(`calendar.weekdaysLong.${key}`)"
          @click="toggleWeekday(index)"
        >
          {{ t(`calendar.weekdays.${key}`) }}
        </button>
      </div>
      <p v-if="!selectedWeekdays.length" class="mt-1 text-xs text-danger-600">
        {{ t('calendar.validation.weekdays') }}
      </p>
    </div>

    <div v-if="modelValue.recurrence_freq === 'monthly'" class="field">
      <label>{{ t('calendar.recurrence.monthlyMode') }}</label>
      <MenuDropdown v-model="openMonthlyModeDropdown" :id="0" :disabled="disabled">
        <template #trigger="{ styling }">
          <button type="button" :class="[styling, disabled ? '' : 'cursor-pointer']" :disabled="disabled">
            <span>{{ monthlyModeLabel }}</span>
            <Icon name="material-symbols:keyboard-arrow-down-rounded" class="text-lg" />
          </button>
        </template>

        <template #default="{ styling }">
          <button
            type="button"
            :class="styling"
            @click="patch({ recurrence_monthly_mode: 'day_of_month' }); openMonthlyModeDropdown = null"
          >
            {{ t('calendar.recurrence.dayOfMonth') }}
          </button>
          <button
            type="button"
            :class="styling"
            @click="patch({ recurrence_monthly_mode: 'weekday_of_month' }); openMonthlyModeDropdown = null"
          >
            {{ t('calendar.recurrence.weekdayOfMonth') }}
          </button>
        </template>
      </MenuDropdown>
    </div>

    <div v-if="modelValue.recurrence_freq" class="field">
      <label>{{ t('calendar.recurrence.end') }}</label>
      <div class="space-y-1.5">
        <label
          class="flex min-h-9 items-center gap-2 rounded-lg px-2 py-1 text-sm text-base-700 transition"
          :class="[
            disabled ? '' : 'cursor-pointer hover:bg-base-50',
            endMode === 'never' ? 'bg-base-50' : '',
          ]"
        >
          <input
            type="radio"
            :checked="endMode === 'never'"
            :disabled="disabled"
            class="h-4 w-4"
            @change="setEndMode('never')"
          />
          {{ t('calendar.recurrence.endNever') }}
        </label>

        <label
          class="flex min-h-9 flex-wrap items-center gap-2 rounded-lg px-2 py-1 text-sm text-base-700 transition"
          :class="[
            disabled ? '' : 'cursor-pointer hover:bg-base-50',
            endMode === 'until' ? 'bg-base-50' : '',
          ]"
        >
          <span class="flex items-center gap-2">
            <input
              type="radio"
              :checked="endMode === 'until'"
              :disabled="disabled"
              class="h-4 w-4"
              @change="setEndMode('until')"
            />
            {{ t('calendar.recurrence.endOn') }}
          </span>
          <CommonDateInput
            v-if="endMode === 'until'"
            :model-value="modelValue.recurrence_until"
            mode="date"
            :empty-value="null"
            :disabled="disabled"
            class="w-40"
            @update:model-value="patch({ recurrence_until: $event })"
          />
        </label>

        <label
          class="flex min-h-9 flex-wrap items-center gap-2 rounded-lg px-2 py-1 text-sm text-base-700 transition"
          :class="[
            disabled ? '' : 'cursor-pointer hover:bg-base-50',
            endMode === 'count' ? 'bg-base-50' : '',
          ]"
        >
          <span class="flex items-center gap-2">
            <input
              type="radio"
              :checked="endMode === 'count'"
              :disabled="disabled"
              class="h-4 w-4"
              @change="setEndMode('count')"
            />
            {{ t('calendar.recurrence.endAfter') }}
          </span>
          <template v-if="endMode === 'count'">
            <input
              :value="modelValue.recurrence_count ?? 10"
              type="number"
              min="1"
              max="500"
              class="input w-24"
              :disabled="disabled"
              @input="patch({ recurrence_count: clampCount(($event.target as HTMLInputElement).value) })"
            />
            <span class="text-sm text-base-500">{{ t('calendar.recurrence.occurrences') }}</span>
          </template>
        </label>
      </div>
    </div>

    <p
      v-if="modelValue.recurrence_freq"
      class="flex items-start gap-2 rounded-lg border border-accent-100 bg-accent-50 px-3 py-2 text-sm font-medium text-accent-800"
    >
      <Icon name="material-symbols:repeat-rounded" class="mt-0.5 shrink-0 text-base text-accent-500" />
      <span>{{ summary }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { WEEKDAY_KEYS } from '~/composables/useCalendarView'
import type { RecurrenceFreq, RecurrenceMonthlyMode } from '~/types/appointment'

export interface RecurrenceValue {
  recurrence_freq: RecurrenceFreq | null
  recurrence_interval: number
  recurrence_weekdays: string | null
  recurrence_monthly_mode: RecurrenceMonthlyMode | null
  recurrence_until: string | null
  recurrence_count: number | null
}

const props = defineProps<{
  modelValue: RecurrenceValue
  startsAt: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: RecurrenceValue): void
}>()

const { t } = useI18n()
const { formatDate } = useLocaleFormatters()

const WEEKDAY_CODES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

const selectedWeekdays = computed(() => (props.modelValue.recurrence_weekdays ?? '')
  .split(',')
  .map(code => WEEKDAY_CODES.indexOf(code.trim().toUpperCase()))
  .filter(index => index >= 0))

function deriveEndMode(value: RecurrenceValue): 'never' | 'until' | 'count' {
  if (value.recurrence_until) return 'until'
  if (value.recurrence_count != null) return 'count'
  return 'never'
}

const endMode = ref<'never' | 'until' | 'count'>(deriveEndMode(props.modelValue))

const openFreqDropdown = ref<number | null>(null)
const openMonthlyModeDropdown = ref<number | null>(null)

const freqLabel = computed(() => {
  if (props.modelValue.recurrence_freq === 'daily') return t('calendar.recurrence.daily')
  if (props.modelValue.recurrence_freq === 'weekly') return t('calendar.recurrence.weekly')
  if (props.modelValue.recurrence_freq === 'monthly') return t('calendar.recurrence.monthly')
  return t('calendar.recurrence.none')
})

const monthlyModeLabel = computed(() => props.modelValue.recurrence_monthly_mode === 'weekday_of_month'
  ? t('calendar.recurrence.weekdayOfMonth')
  : t('calendar.recurrence.dayOfMonth'))

const intervalUnit = computed(() => {
  if (props.modelValue.recurrence_freq === 'daily') return t('calendar.recurrence.unitDaily')
  if (props.modelValue.recurrence_freq === 'weekly') return t('calendar.recurrence.unitWeekly')
  return t('calendar.recurrence.unitMonthly')
})

const startWeekdayIndex = computed(() => {
  const date = parseStart()
  return date ? (date.getUTCDay() + 6) % 7 : 0
})

function parseStart(): Date | null {
  const match = String(props.startsAt || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
}

function patch(changes: Partial<RecurrenceValue>) {
  emit('update:modelValue', { ...props.modelValue, ...changes })
}

function clampInterval(value: string) {
  return Math.min(52, Math.max(1, Math.trunc(Number(value) || 1)))
}

function clampCount(value: string) {
  return Math.min(500, Math.max(1, Math.trunc(Number(value) || 1)))
}

function setFreq(value: string) {
  const freq = (value || null) as RecurrenceFreq | null

  if (!freq) {
    endMode.value = 'never'
    patch({
      recurrence_freq: null,
      recurrence_interval: 1,
      recurrence_weekdays: null,
      recurrence_monthly_mode: null,
      recurrence_until: null,
      recurrence_count: null,
    })
    return
  }

  patch({
    recurrence_freq: freq,
    recurrence_weekdays: freq === 'weekly'
      ? (props.modelValue.recurrence_weekdays || WEEKDAY_CODES[startWeekdayIndex.value] || 'MO')
      : null,
    recurrence_monthly_mode: freq === 'monthly'
      ? (props.modelValue.recurrence_monthly_mode ?? 'day_of_month')
      : null,
  })
}

function toggleWeekday(index: number) {
  const next = selectedWeekdays.value.includes(index)
    ? selectedWeekdays.value.filter(entry => entry !== index)
    : [...selectedWeekdays.value, index]

  patch({
    recurrence_weekdays: next.sort((a, b) => a - b).map(entry => WEEKDAY_CODES[entry]).join(',') || null,
  })
}

function setEndMode(mode: 'never' | 'until' | 'count') {
  endMode.value = mode
  if (mode === 'never') return patch({ recurrence_until: null, recurrence_count: null })
  if (mode === 'until') return patch({ recurrence_until: props.startsAt.slice(0, 10), recurrence_count: null })
  patch({ recurrence_count: 10, recurrence_until: null })
}

const summary = computed(() => {
  const value = props.modelValue
  if (!value.recurrence_freq) return ''

  const interval = Math.max(1, value.recurrence_interval || 1)
  const repeated = interval > 1
  let base = ''

  if (value.recurrence_freq === 'daily') {
    base = repeated
      ? t('calendar.recurrence.summaryDailyEvery', { interval })
      : t('calendar.recurrence.summaryDaily')
  } else if (value.recurrence_freq === 'weekly') {
    const weekdays = (selectedWeekdays.value.length ? selectedWeekdays.value : [startWeekdayIndex.value])
      .map(index => t(`calendar.weekdaysLong.${WEEKDAY_KEYS[index]}`))
      .join(', ')
    base = repeated
      ? t('calendar.recurrence.summaryWeeklyEvery', { interval, weekdays })
      : t('calendar.recurrence.summaryWeekly', { weekdays })
  } else {
    const start = parseStart()
    const mode = value.recurrence_monthly_mode === 'weekday_of_month'
      ? t('calendar.recurrence.summaryModeWeekdayOfMonth', {
        nth: start ? Math.ceil(start.getUTCDate() / 7) : 1,
        weekday: t(`calendar.weekdaysLong.${WEEKDAY_KEYS[startWeekdayIndex.value]}`),
      })
      : t('calendar.recurrence.summaryModeDayOfMonth', { day: start ? start.getUTCDate() : 1 })

    base = repeated
      ? t('calendar.recurrence.summaryMonthlyEvery', { interval, mode })
      : t('calendar.recurrence.summaryMonthly', { mode })
  }

  if (value.recurrence_until) return base + t('calendar.recurrence.summaryUntil', { date: formatDate(value.recurrence_until) })
  if (value.recurrence_count != null) return base + t('calendar.recurrence.summaryCount', { count: value.recurrence_count })
  return base + t('calendar.recurrence.summaryOpenEnded')
})
</script>
