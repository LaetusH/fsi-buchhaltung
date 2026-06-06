<template>
  <CommonPageTableCard
    :title="t('bankStatement.stored')"
    :search-value="globalSearchInput"
    :search-placeholder="t('bankStatement.search')"
    :can-create="canEdit"
    :create-label="`+ ${t('bankStatement.new')}`"
    @update:search-value="globalSearchInput = $event"
    @create="createBankStatement"
  >
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="text-left border-b">
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('bankStatement.statementNumber')"
                filter-type="text"
                :sort-direction="columnSortDirection('statement_number')"
                :is-filter-active="isFilterActive('statement_number')"
                :filter="getFilter('statement_number')"
                :text-options="textOptionsByColumn.statement_number"
                @toggle-sort="toggleSort('statement_number')"
                @apply-text-filter="setTextFilter('statement_number', $event)"
                @reset-filter="resetFilter('statement_number')"
              />
            </th>
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('bankStatement.statementDate')"
                filter-type="date"
                :sort-direction="columnSortDirection('statement_date')"
                :is-filter-active="isFilterActive('statement_date')"
                :filter="getFilter('statement_date')"
                @toggle-sort="toggleSort('statement_date')"
                @apply-range-filter="setRangeFilter('statement_date', $event.min, $event.max)"
                @reset-filter="resetFilter('statement_date')"
              />
            </th>
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('bankStatement.checkedBy')"
                filter-type="text"
                :sort-direction="columnSortDirection('checked_by_name')"
                :is-filter-active="isFilterActive('checked_by_name')"
                :filter="getFilter('checked_by_name')"
                :text-options="textOptionsByColumn.checked_by_name"
                @toggle-sort="toggleSort('checked_by_name')"
                @apply-text-filter="setTextFilter('checked_by_name', $event)"
                @reset-filter="resetFilter('checked_by_name')"
              />
            </th>
            <th class="py-2 text-right">
              <CommonTableColumnControl
                :label="t('bankStatement.positions')"
                filter-type="number"
                :sort-direction="columnSortDirection('position_count')"
                :is-filter-active="isFilterActive('position_count')"
                :filter="getFilter('position_count')"
                @toggle-sort="toggleSort('position_count')"
                @apply-range-filter="setRangeFilter('position_count', $event.min, $event.max)"
                @reset-filter="resetFilter('position_count')"
              />
            </th>
            <th class="py-2 text-right">
              <CommonTableColumnControl
                :label="t('bankStatement.openingBalance')"
                filter-type="number"
                :sort-direction="columnSortDirection('opening_balance')"
                :is-filter-active="isFilterActive('opening_balance')"
                :filter="getFilter('opening_balance')"
                @toggle-sort="toggleSort('opening_balance')"
                @apply-range-filter="setRangeFilter('opening_balance', $event.min, $event.max)"
                @reset-filter="resetFilter('opening_balance')"
              />
            </th>
            <th class="py-2 text-right">
              <CommonTableColumnControl
                :label="t('bankStatement.closingBalance')"
                filter-type="number"
                :sort-direction="columnSortDirection('closing_balance')"
                :is-filter-active="isFilterActive('closing_balance')"
                :filter="getFilter('closing_balance')"
                @toggle-sort="toggleSort('closing_balance')"
                @apply-range-filter="setRangeFilter('closing_balance', $event.min, $event.max)"
                @reset-filter="resetFilter('closing_balance')"
              />
            </th>
            <th class="py-2 text-right">{{ t('common.actions') }}</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="row in processedRows"
            :key="row.id"
            class="border-b last:border-b-0 transition"
          >
            <td class="py-2 font-medium">{{ row.statement_number }}</td>
            <td class="py-2">{{ formatDate(row.statement_date) }}</td>
            <td class="py-2">{{ row.checked_by_name || t('common.notAvailable') }}</td>
            <td class="py-2 text-right">{{ row.position_count }}</td>
            <td class="py-2 text-right font-medium">{{ formatCurrency(row.opening_balance) }}</td>
            <td class="py-2 text-right font-medium">{{ formatCurrency(row.closing_balance) }}</td>
            <td class="py-2 text-right">
              <button class="text-blue-600 hover:underline cursor-pointer" @click="openBankStatement(row.id)">
                {{ t('actions.open') }}
              </button>
            </td>
          </tr>

          <tr v-if="processedRows.length === 0">
            <td colspan="7" class="py-6 text-center text-slate-500">
              {{ t('bankStatement.none') }}
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
import type { PageTarget } from '~/types/page'
import type { BankStatementOverview } from '~/types/bankStatement'

const props = defineProps<{
  returnTarget?: PageTarget | null
}>()

const { setPage } = usePage()
const { t } = useI18n()
const { formatCurrency, formatDate } = useLocaleFormatters()
const { hasPermission } = useAuth()

const canEdit = computed(() => hasPermission('bank_statements.edit'))
const resolvedReturnTarget = computed(() => cloneReturnTarget(props.returnTarget) ?? buildReturnTarget('BankStatementList'))

const bankStatements = ref<BankStatementOverview[]>([])

type BankStatementColumnKey =
  | 'statement_number'
  | 'statement_date'
  | 'checked_by_name'
  | 'position_count'
  | 'opening_balance'
  | 'closing_balance'

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
} = useAdvancedTable<BankStatementOverview, BankStatementColumnKey>(bankStatements, [
  { key: 'statement_number', filterType: 'text', globalSearchable: true, getValue: row => row.statement_number },
  { key: 'statement_date', filterType: 'date', globalSearchable: true, getValue: row => row.statement_date },
  { key: 'checked_by_name', filterType: 'text', globalSearchable: true, getValue: row => row.checked_by_name },
  { key: 'position_count', filterType: 'number', getValue: row => row.position_count },
  { key: 'opening_balance', filterType: 'number', getValue: row => row.opening_balance },
  { key: 'closing_balance', filterType: 'number', getValue: row => row.closing_balance },
])

onMounted(async () => {
  const res = await $fetch('/api/bank_statements')
  if (res.ok) {
    bankStatements.value = res.bankStatements
  }
})

function openBankStatement(id: number) {
  setPage('BankStatementCreate', {
    bankStatementId: id,
    returnTarget: resolvedReturnTarget.value,
  })
}

function createBankStatement() {
  setPage('BankStatementCreate', {
    returnTarget: resolvedReturnTarget.value,
  })
}

function columnSortDirection(key: BankStatementColumnKey) {
  return sortKey.value === key ? sortDirection.value : null
}
</script>
