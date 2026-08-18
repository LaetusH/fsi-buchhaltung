<template>
  <div class="flex flex-wrap gap-1">
    <button
      v-for="action in FORMAT_ACTIONS"
      :key="action.key"
      type="button"
      class="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-cyan-400 hover:text-cyan-700 cursor-pointer"
      :title="t(action.labelKey)"
      @click="$emit('action', action.key)"
    >
      <Icon :name="action.icon" class="h-4 w-4" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { FORMAT_ACTIONS, type FormatActionKey } from '~/utils/notificationFormatting'

const { t } = useI18n()

defineEmits<{
  (e: 'action', key: FormatActionKey): void
}>()
</script>
