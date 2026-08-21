<template>
  <div class="space-y-3">
    <p class="text-xs text-base-500">
      {{ t('wiki.embeds.budgetStatusPeriod', { year: data.year }) }}
      <template v-if="data.costCentre"> · {{ data.costCentre.code }} {{ data.costCentre.name }}</template>
    </p>

    <p v-if="!data.budgetCount" class="text-sm text-base-500">
      {{ t('wiki.embeds.budgetStatusMissing', { year: data.year }) }}
    </p>

    <div v-else class="space-y-3">
      <div v-for="row in rows" :key="row.label" class="space-y-1">
        <div class="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span class="font-medium text-base-700">{{ row.label }}</span>
          <span class="text-base-600">
            {{ formatCurrency(row.actual) }} / {{ formatCurrency(row.planned) }}
            <span class="ml-1 text-xs text-base-500">({{ row.percent }}%)</span>
          </span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-base-200">
          <div
            class="h-full rounded-full transition-all"
            :class="row.overrun ? 'bg-danger-500' : row.tone"
            :style="{ width: `${Math.min(row.percent, 100)}%` }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import type { WikiEmbedBudgetStatusData } from '~/types/wiki'

const props = defineProps<{ data: WikiEmbedBudgetStatusData }>()

const { t } = useI18n()
const { formatCurrency } = useLocaleFormatters()

function percentOf(actual: number, planned: number) {
  if (!planned) return actual ? 100 : 0
  return Math.round((actual / planned) * 100)
}

const rows = computed(() => [
  {
    label: t('wiki.embeds.budgetStatusExpense'),
    planned: props.data.plannedExpense,
    actual: props.data.actualExpense,
    percent: percentOf(props.data.actualExpense, props.data.plannedExpense),
    overrun: props.data.plannedExpense > 0 && props.data.actualExpense > props.data.plannedExpense,
    tone: 'bg-accent-500',
  },
  {
    label: t('wiki.embeds.budgetStatusIncome'),
    planned: props.data.plannedIncome,
    actual: props.data.actualIncome,
    percent: percentOf(props.data.actualIncome, props.data.plannedIncome),
    overrun: false,
    tone: 'bg-success-500',
  },
])
</script>
