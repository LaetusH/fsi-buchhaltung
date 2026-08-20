<template>
  <div class="space-y-2">
    <div class="flex flex-wrap items-baseline gap-x-6 gap-y-1">
      <p class="text-2xl font-semibold text-slate-900">{{ formatCurrency(data.total) }}</p>
      <p class="text-sm text-slate-600">{{ t('wiki.embeds.openReimbursementsCount', { count: data.count }) }}</p>
    </div>
    <p v-if="data.uncheckedCount" class="text-sm text-slate-600">
      {{ t('wiki.embeds.openReimbursementsUnchecked', { count: data.uncheckedCount }) }}
    </p>
    <p v-if="data.oldestSubmittedAt" class="text-xs text-slate-500">
      {{ t('wiki.embeds.openReimbursementsOldest', { date: formatDate(data.oldestSubmittedAt) }) }}
    </p>
    <p v-if="!data.count" class="text-sm text-slate-500">{{ t('wiki.embeds.empty') }}</p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import type { WikiEmbedOpenReimbursementsData } from '~/types/wiki'

defineProps<{ data: WikiEmbedOpenReimbursementsData }>()

const { t } = useI18n()
const { formatCurrency, formatDate } = useLocaleFormatters()
</script>
