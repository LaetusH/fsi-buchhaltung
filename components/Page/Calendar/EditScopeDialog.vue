<template>
  <CommonModal
    :model-value="modelValue"
    :title="titleText"
    width-class="max-w-md"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="$emit('cancel')"
  >
    <p class="text-sm text-base-600">
      {{ descriptionText }}
    </p>

    <div class="space-y-2">
      <label
        v-for="option in options"
        :key="option.value"
        class="flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition"
        :class="selected === option.value
          ? 'border-accent-400 bg-accent-50 ring-1 ring-accent-200'
          : 'border-base-200 hover:border-base-300 hover:bg-base-50'"
      >
        <input
          v-model="selected"
          type="radio"
          :value="option.value"
          class="mt-0.5 h-4 w-4 shrink-0 border-base-300"
        />
        <span class="min-w-0">
          <span class="block font-medium text-base-800">{{ option.label }}</span>
          <!-- The label alone does not say what happens to the *other* occurrences; this does. -->
          <span class="mt-0.5 block text-xs text-base-500">{{ option.hint }}</span>
        </span>
      </label>
    </div>

    <template #footer>
      <button class="btn-secondary" @click="$emit('cancel')">
        {{ t('actions.cancel') }}
      </button>
      <button
        class="btn-primary"
        :class="mode === 'delete' ? 'bg-danger-500 hover:bg-danger-600' : ''"
        @click="$emit('confirm', selected)"
      >
        {{ confirmText }}
      </button>
    </template>
  </CommonModal>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import type { AppointmentEditScope } from '~/types/appointment'

const props = withDefaults(defineProps<{
  modelValue: boolean
  mode?: 'edit' | 'delete' | 'cancel'
}>(), {
  mode: 'edit',
})

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', scope: AppointmentEditScope): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()

const selected = ref<AppointmentEditScope>('occurrence')

const titleText = computed(() => {
  if (props.mode === 'delete') return t('calendar.editScope.deleteTitle')
  if (props.mode === 'cancel') return t('calendar.editScope.cancelTitle')
  return t('calendar.editScope.editTitle')
})

const descriptionText = computed(() => {
  if (props.mode === 'delete') return t('calendar.editScope.deleteDescription')
  if (props.mode === 'cancel') return t('calendar.editScope.cancelDescription')
  return t('calendar.editScope.description')
})

const confirmText = computed(() => {
  if (props.mode === 'delete') return t('calendar.detail.delete')
  if (props.mode === 'cancel') return t('calendar.detail.cancelAppointment')
  return t('calendar.editScope.confirm')
})

const options = computed(() => ([
  {
    value: 'occurrence' as const,
    label: t('calendar.editScope.occurrence'),
    hint: props.mode === 'delete'
      ? t('calendar.editScope.occurrenceDeleteHint')
      : props.mode === 'cancel'
        ? t('calendar.editScope.occurrenceCancelHint')
        : t('calendar.editScope.occurrenceHint'),
  },
  {
    value: 'following' as const,
    label: t('calendar.editScope.following'),
    hint: props.mode === 'delete'
      ? t('calendar.editScope.followingDeleteHint')
      : props.mode === 'cancel'
        ? t('calendar.editScope.followingCancelHint')
        : t('calendar.editScope.followingHint'),
  },
  {
    value: 'series' as const,
    label: t('calendar.editScope.series'),
    hint: props.mode === 'delete'
      ? t('calendar.editScope.seriesDeleteHint')
      : props.mode === 'cancel'
        ? t('calendar.editScope.seriesCancelHint')
        : t('calendar.editScope.seriesHint'),
  },
]))

watch(() => props.modelValue, (open) => {
  if (open) selected.value = 'occurrence'
})
</script>
