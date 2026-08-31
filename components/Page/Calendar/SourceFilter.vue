<template>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
    <div class="flex flex-wrap items-center gap-1.5">
      <span class="text-[11px] font-semibold uppercase tracking-wide text-base-400">
        {{ t('calendar.sources.legend') }}
      </span>

      <button
        v-for="source in sources"
        :key="source.key"
        type="button"
        class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition"
        :class="isSourceActive(source.key)
          ? ''
          : 'border-base-200 bg-white text-base-600 hover:bg-base-50'"
        :style="isSourceActive(source.key) ? activeStyle(source.color) : undefined"
        :aria-pressed="isSourceActive(source.key)"
        @click="toggleSource(source.key)"
      >
        <Icon :name="source.icon" class="text-sm" :class="isSourceActive(source.key) ? '' : 'opacity-60'" />
        {{ source.label }}
      </button>
    </div>

    <template v-if="visibleTypes.length">
      <span class="hidden h-4 w-px bg-base-200 sm:block" />

      <div
        class="flex flex-wrap items-center gap-1.5 transition"
        :class="appointmentsVisible ? '' : 'opacity-50'"
        :title="appointmentsVisible ? undefined : t('calendar.sources.typesDisabled')"
      >
        <span class="text-[11px] font-semibold uppercase tracking-wide text-base-400">
          {{ t('calendar.sources.typesLegend') }}
        </span>

        <button
          v-for="type in visibleTypes"
          :key="`type-${type.id}`"
          type="button"
          class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed"
          :class="isTypeActive(type.id)
            ? ''
            : 'border-base-200 bg-white text-base-600 hover:bg-base-50'"
          :style="isTypeActive(type.id) ? activeStyle(type.color) : undefined"
          :aria-pressed="isTypeActive(type.id)"
          :disabled="!appointmentsVisible"
          @click="toggleType(type.id)"
        >
          <span
            class="h-2 w-2 shrink-0 rounded-full border"
            :style="isTypeActive(type.id)
              ? { backgroundColor: type.color, borderColor: type.color }
              : { borderColor: type.color }"
          />
          {{ type.name }}
        </button>
      </div>
    </template>

    <button
      v-if="isFiltered"
      type="button"
      class="inline-flex cursor-pointer items-center gap-1 rounded-md border border-base-200 px-2.5 py-1.5 text-xs font-medium text-base-500 transition hover:bg-base-50 hover:text-base-700"
      @click="reset"
    >
      <Icon name="material-symbols:filter-alt-off-rounded" class="text-sm" />
      {{ t('calendar.sources.reset') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { CALENDAR_SOURCES, type CalendarSourceFilter } from '~/composables/useCalendarView'
import type { AppointmentTypeRow, CalendarSource } from '~/types/appointment'

const props = defineProps<{
  modelValue: CalendarSourceFilter
  appointmentTypes: AppointmentTypeRow[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: CalendarSourceFilter): void
}>()

const { t } = useI18n()

const SOURCE_STYLE: Record<CalendarSource, { color: string, icon: string }> = {
  appointment: { color: '#3b82f6', icon: 'material-symbols:event-note-rounded' },
  event: { color: '#0ea5e9', icon: 'material-symbols:event-rounded' },
  shift: { color: '#8b5cf6', icon: 'material-symbols:schedule-rounded' },
  task: { color: '#f59e0b', icon: 'material-symbols:flag-rounded' },
}

const sources = computed(() => CALENDAR_SOURCES.map(key => ({
  key,
  label: t(`calendar.sources.${key}`),
  ...SOURCE_STYLE[key],
})))

const visibleTypes = computed(() => props.appointmentTypes)

const appointmentsVisible = computed(() => isSourceActive('appointment'))

const isFiltered = computed(() =>
  props.modelValue.sources.length !== CALENDAR_SOURCES.length || props.modelValue.typeIds !== null)

function activeStyle(color: string) {
  return {
    backgroundColor: `color-mix(in srgb, ${color} 10%, white)`,
    color: `color-mix(in srgb, ${color} 80%, black)`,
  }
}

function isSourceActive(source: CalendarSource) {
  return props.modelValue.sources.includes(source)
}

function isTypeActive(typeId: number) {
  return props.modelValue.typeIds === null || props.modelValue.typeIds.includes(typeId)
}

function toggleSource(source: CalendarSource) {
  const active = isSourceActive(source)
  const next = active
    ? props.modelValue.sources.filter(entry => entry !== source)
    : [...props.modelValue.sources, source]


  if (!next.length) return

  emit('update:modelValue', { ...props.modelValue, sources: next })
}

function toggleType(typeId: number) {
  const allIds = props.appointmentTypes.map(type => type.id)
  const current = props.modelValue.typeIds ?? allIds

  const next = current.includes(typeId)
    ? current.filter(id => id !== typeId)
    : [...current, typeId]

  emit('update:modelValue', {
    ...props.modelValue,
    typeIds: next.length === allIds.length ? null : next,
  })
}

function reset() {
  emit('update:modelValue', { sources: [...CALENDAR_SOURCES], typeIds: null })
}
</script>
