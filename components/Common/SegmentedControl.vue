<template>
  <div class="inline-flex w-full gap-1 rounded-lg bg-base-100 p-1 sm:w-auto" role="group" :aria-label="ariaLabel || undefined">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="flex-1 cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-medium transition sm:flex-none"
      :class="option.value === modelValue
        ? 'bg-white text-base-900 shadow-sm'
        : 'text-base-500 hover:text-base-700'"
      :aria-pressed="option.value === modelValue"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
export interface SegmentedControlOption {
  value: string
  label: string
}

defineProps<{
  modelValue: string
  options: SegmentedControlOption[]
  /** Accessible name for the button group, e.g. the visible field label. */
  ariaLabel?: string
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>
