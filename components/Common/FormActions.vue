<template>
  <div v-if="!disabled" class="grid grid-cols-2 gap-4">
    <button type="button" class="btn-secondary" @click="$emit('cancel')">
      {{ cancelLabel }}
    </button>

    <button
      type="button"
      class="btn-primary"
      :disabled="saveDisabled"
      :class="{ 'opacity-50 cursor-not-allowed': saveDisabled }"
      @click="$emit('submit')"
    >
      {{ submitLabel }}
    </button>
  </div>

  <div v-else class="grid">
    <button type="button" class="btn-secondary col-span-12" @click="$emit('cancel')">
      {{ closeLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  disabled?: boolean
  saveDisabled?: boolean
  cancelLabel?: string
  submitLabel?: string
  closeLabel?: string
}>(), {
  disabled: false,
  saveDisabled: false,
  cancelLabel: 'Cancel',
  submitLabel: 'Save',
  closeLabel: 'Close',
})

defineEmits<{
  (e: 'cancel'): void
  (e: 'submit'): void
}>()
</script>
