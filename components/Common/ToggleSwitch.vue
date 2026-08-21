<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label"
    :disabled="disabled"
    :class="[
      'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
      modelValue ? 'bg-secondary-600' : 'bg-base-300',
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
    ]"
    @click="toggle"
  >
    <span
      class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
      :class="modelValue ? 'translate-x-5.5' : 'translate-x-0.5'"
    />
  </button>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean
  disabled?: boolean
  /** Accessible name when the switch has no visible <label> tied to it. */
  label?: string
}>(), {
  disabled: false,
  label: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

function toggle() {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>
