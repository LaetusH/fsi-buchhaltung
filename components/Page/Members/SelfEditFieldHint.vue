<template>
  <p v-if="field.pending" class="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-warning-700">
    <span class="inline-flex items-center rounded-full bg-warning-100 px-2 py-0.5 font-medium">
      {{ t('member.myData.pendingBadge') }}
    </span>
    <span>{{ t('member.myData.pendingValue', { value: displayValue }) }}</span>
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '~/composables/useI18n'
import type { SelfEditFieldState } from '~/server/api/members/self/index.get'

const props = defineProps<{
  field: SelfEditFieldState
  resolveValue?: (value: string) => string
}>()

const { t } = useI18n()

const displayValue = computed(() => {
  if (!props.field.pending) return ''
  return props.resolveValue ? props.resolveValue(props.field.pending.new_value) : props.field.pending.new_value
})
</script>
