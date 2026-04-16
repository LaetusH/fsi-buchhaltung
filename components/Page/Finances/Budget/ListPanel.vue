<template>
  <CommonPageTableCard
    :title="t('budget.listTitle')"
    :search-value="globalSearchInput"
    :search-placeholder="t('budget.search')"
    :can-create="canEdit"
    :create-label="`+ ${t('budget.new')}`"
    @update:search-value="globalSearchInput = $event"
    @create="createBudget"
  >
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="text-left border-b">
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('budget.period')"
                filter-type="text"
                :sort-direction="columnSortDirection('period')"
                :is-filter-active="isFilterActive('period')"
                :filter="getFilter('period')"
                :text-options="textOptionsByColumn.period"
                @toggle-sort="toggleSort('period')"
                @apply-text-filter="setTextFilter('period', $event)"
                @reset-filter="resetFilter('period')"
              />
            </th>
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('budget.range')"
                filter-type="date"
                :sort-direction="columnSortDirection('range')"
                :is-filter-active="isFilterActive('range')"
                :filter="getFilter('range')"
                @toggle-sort="toggleSort('range')"
                @apply-range-filter="setRangeFilter('range', $event.min, $event.max)"
                @reset-filter="resetFilter('range')"
              />
            </th>
            <th class="py-2 text-right">
              <CommonTableColumnControl
                :label="t('budget.totalExpenses')"
                filter-type="number"
                :sort-direction="columnSortDirection('expense')"
                :is-filter-active="isFilterActive('expense')"
                :filter="getFilter('expense')"
                @toggle-sort="toggleSort('expense')"
                @apply-range-filter="setRangeFilter('expense', $event.min, $event.max)"
                @reset-filter="resetFilter('expense')"
              />
            </th>
            <th class="py-2 text-right">
              <CommonTableColumnControl
                :label="t('budget.totalIncome')"
                filter-type="number"
                :sort-direction="columnSortDirection('income')"
                :is-filter-active="isFilterActive('income')"
                :filter="getFilter('income')"
                @toggle-sort="toggleSort('income')"
                @apply-range-filter="setRangeFilter('income', $event.min, $event.max)"
                @reset-filter="resetFilter('income')"
              />
            </th>
            <th class="py-2 text-right">
              <CommonTableColumnControl
                :label="t('budget.totalSaldo')"
                filter-type="number"
                :sort-direction="columnSortDirection('saldo')"
                :is-filter-active="isFilterActive('saldo')"
                :filter="getFilter('saldo')"
                @toggle-sort="toggleSort('saldo')"
                @apply-range-filter="setRangeFilter('saldo', $event.min, $event.max)"
                @reset-filter="resetFilter('saldo')"
              />
            </th>
            <th class="py-2 text-right">{{ t('common.actions') }}</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="budget in processedRows"
            :key="budget.id"
            class="border-b last:border-b-0"
          >
            <td class="py-2 font-medium text-slate-900">{{ budgetLabel(budget.year, budget.semester) }}</td>
            <td class="py-2 text-slate-600">{{ formatDate(budget.start_date) }} - {{ formatDate(budget.end_date) }}</td>
            <td class="py-2 text-right">{{ formatCurrency(budget.own_expense_total) }}</td>
            <td class="py-2 text-right">{{ formatCurrency(budget.own_income_total) }}</td>
            <td class="py-2 text-right font-medium" :class="saldoTextClass(budget.own_saldo)">{{ formatCurrency(budget.own_saldo) }}</td>
            <td class="py-2 text-right">
              <button class="text-blue-600 hover:underline cursor-pointer" @click="openBudget(budget.id)">
                {{ t('actions.open') }}
              </button>
            </td>
          </tr>

          <tr v-if="processedRows.length === 0">
            <td colspan="6" class="py-6 text-center text-slate-500">
              {{ t('budget.none') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </CommonPageTableCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAdvancedTable } from '~/composables/useAdvancedTable'
import { useAuth } from '~/composables/useAuth'
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import { usePage } from '~/composables/usePage'
import { buildReturnTarget, cloneReturnTarget } from '~/composables/useReturnTarget'
import type { BudgetListItem, BudgetSemester } from '~/types/budget'
import type { PageTarget } from '~/types/page'

type BudgetColumnKey = 'period' | 'range' | 'expense' | 'income' | 'saldo'

const props = defineProps<{
  returnTarget?: PageTarget | null
}>()

const { setPage } = usePage()
const { hasPermission } = useAuth()
const { t } = useI18n()
const { formatCurrency, formatDate } = useLocaleFormatters()

const canEdit = computed(() => hasPermission('budgets.edit'))
const resolvedReturnTarget = computed(() => cloneReturnTarget(props.returnTarget) ?? buildReturnTarget('BudgetList'))
const budgets = ref<BudgetListItem[]>([])

const {
  sortKey,
  sortDirection,
  textOptionsByColumn,
  globalSearchInput,
  processedRows,
  getFilter,
  isFilterActive,
  toggleSort,
  setTextFilter,
  setRangeFilter,
  resetFilter,
} = useAdvancedTable<BudgetListItem, BudgetColumnKey>(budgets, [
  { key: 'period', filterType: 'text', globalSearchable: true, getValue: row => budgetLabel(row.year, row.semester) },
  { key: 'range', filterType: 'date', globalSearchable: true, getValue: row => row.start_date },
  { key: 'expense', filterType: 'number', getValue: row => row.own_expense_total },
  { key: 'income', filterType: 'number', getValue: row => row.own_income_total },
  { key: 'saldo', filterType: 'number', getValue: row => row.own_saldo },
])

onMounted(async () => {
  const response = await $fetch<{ ok: boolean, budgets?: BudgetListItem[], error?: string }>('/api/finances/budgets')
  if (response.ok && response.budgets) {
    budgets.value = response.budgets
  }
})

function budgetLabel(year: number, semester: BudgetSemester) {
  return `${year} · ${semester === 'summer' ? t('budget.semesters.summer') : t('budget.semesters.winter')}`
}

function saldoTextClass(value: number) {
  if (value > 0) return 'text-green-700'
  if (value < 0) return 'text-red-700'
  return 'text-slate-700'
}

function openBudget(id: number) {
  setPage('BudgetCreate', {
    budgetId: id,
    returnTarget: resolvedReturnTarget.value,
  })
}

function createBudget() {
  setPage('BudgetCreate', {
    returnTarget: resolvedReturnTarget.value,
  })
}

function columnSortDirection(key: BudgetColumnKey) {
  return sortKey.value === key ? sortDirection.value : null
}
</script>
