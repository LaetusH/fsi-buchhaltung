<template>
  <Page :headline1="t('cashCount.listTitle')" @open-menu="$emit('openMenu')">
    <template #cards>
      <div class="bg-white rounded-xl shadow-lg p-6 space-y-6 col-span-12">
        <div class="flex justify-between items-center gap-3 flex-wrap">
          <h2 class="text-lg font-semibold">{{ t('cashCount.stored') }}</h2>

          <div class="flex items-center gap-2 flex-wrap justify-end">
            <CommonGlobalSearchBar v-model="globalSearchInput" :placeholder="t('cashCount.search')" />
            <button
              v-if="canEdit"
              class="btn-primary"
              @click="setPage('CashCountCreate', { returnTo: 'CashCountList' })"
            >
              + {{ t('cashCount.new') }}
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-left border-b">
                <th class="py-2">
                  <CommonTableColumnControl
                    :label="t('cashCount.countedBeforeAt')"
                    filter-type="date"
                    :sort-direction="columnSortDirection('counted_before_at')"
                    :is-filter-active="isFilterActive('counted_before_at')"
                    :filter="getFilter('counted_before_at')"
                    @toggle-sort="toggleSort('counted_before_at')"
                    @apply-range-filter="setRangeFilter('counted_before_at', $event.min, $event.max)"
                    @reset-filter="resetFilter('counted_before_at')"
                  />
                </th>
                <th class="py-2">
                  <CommonTableColumnControl
                    :label="t('cashCount.countedAfterAt')"
                    filter-type="date"
                    :sort-direction="columnSortDirection('counted_after_at')"
                    :is-filter-active="isFilterActive('counted_after_at')"
                    :filter="getFilter('counted_after_at')"
                    @toggle-sort="toggleSort('counted_after_at')"
                    @apply-range-filter="setRangeFilter('counted_after_at', $event.min, $event.max)"
                    @reset-filter="resetFilter('counted_after_at')"
                  />
                </th>
                <th class="py-2">
                  <CommonTableColumnControl
                    :label="t('cashCount.event')"
                    filter-type="text"
                    :sort-direction="columnSortDirection('event_name')"
                    :is-filter-active="isFilterActive('event_name')"
                    :filter="getFilter('event_name')"
                    :text-options="textOptionsByColumn.event_name"
                    @toggle-sort="toggleSort('event_name')"
                    @apply-text-filter="setTextFilter('event_name', $event)"
                    @reset-filter="resetFilter('event_name')"
                  />
                </th>
                <th class="py-2">
                  <CommonTableColumnControl
                    :label="t('cashCount.counters')"
                    filter-type="text"
                    :sort-direction="columnSortDirection('counters_label')"
                    :is-filter-active="isFilterActive('counters_label')"
                    :filter="getFilter('counters_label')"
                    :text-options="textOptionsByColumn.counters_label"
                    @toggle-sort="toggleSort('counters_label')"
                    @apply-text-filter="setTextFilter('counters_label', $event)"
                    @reset-filter="resetFilter('counters_label')"
                  />
                </th>
                <th class="py-2">
                  <CommonTableColumnControl
                    :label="t('cashCount.checkedBy')"
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
                    :label="t('cashCount.registerCount')"
                    filter-type="number"
                    :sort-direction="columnSortDirection('register_count')"
                    :is-filter-active="isFilterActive('register_count')"
                    :filter="getFilter('register_count')"
                    @toggle-sort="toggleSort('register_count')"
                    @apply-range-filter="setRangeFilter('register_count', $event.min, $event.max)"
                    @reset-filter="resetFilter('register_count')"
                  />
                </th>
                <th class="py-2 text-right">
                  <CommonTableColumnControl
                    :label="t('cashCount.totalDifference')"
                    filter-type="number"
                    :sort-direction="columnSortDirection('total_difference')"
                    :is-filter-active="isFilterActive('total_difference')"
                    :filter="getFilter('total_difference')"
                    @toggle-sort="toggleSort('total_difference')"
                    @apply-range-filter="setRangeFilter('total_difference', $event.min, $event.max)"
                    @reset-filter="resetFilter('total_difference')"
                  />
                </th>
                <th class="py-2 text-right">{{ t('common.actions') }}</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="cashCount in processedRows"
                :key="cashCount.id"
                class="border-b last:border-b-0 transition"
              >
                <td class="py-2">{{ formatDateTime(cashCount.counted_before_at) }}</td>
                <td class="py-2">{{ formatDateTime(cashCount.counted_after_at) }}</td>
                <td class="py-2">{{ cashCount.event_name }}</td>
                <td class="py-2">{{ cashCount.counters_label }}</td>
                <td class="py-2">{{ cashCount.checked_by_name || t('common.notAvailable') }}</td>
                <td class="py-2 text-right font-medium">{{ cashCount.register_count }}</td>
                <td class="py-2 text-right font-medium">{{ formatCurrency(cashCount.total_difference) }}</td>
                <td class="py-2 text-right">
                  <button class="text-blue-600 hover:underline cursor-pointer" @click="openCashCount(cashCount.id)">
                    {{ t('actions.open') }}
                  </button>
                </td>
              </tr>

              <tr v-if="processedRows.length === 0">
                <td colspan="8" class="py-6 text-center text-slate-500">
                  {{ t('cashCount.none') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </Page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAdvancedTable } from '~/composables/useAdvancedTable'
import { useI18n } from '~/composables/useI18n'
import { usePage } from '~/composables/usePage'
import { useAuth } from '~/composables/useAuth'
import type { CashCountOverview } from '~/types/cashCount'

type CashCountListRow = CashCountOverview & {
  counters_label: string
}

const emit = defineEmits<{
  (e: 'openMenu'): void
}>()

const { setPage } = usePage()
const { locale, t } = useI18n()
const { hasPermission } = useAuth()

const canEdit = computed(() => hasPermission('cash_counts.edit'))

const cashCounts = ref<CashCountListRow[]>([])
type CashCountColumnKey =
  | 'counted_before_at'
  | 'counted_after_at'
  | 'event_name'
  | 'counters_label'
  | 'checked_by_name'
  | 'register_count'
  | 'total_difference'

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
} = useAdvancedTable<CashCountListRow, CashCountColumnKey>(cashCounts, [
  { key: 'counted_before_at', filterType: 'date', globalSearchable: true, getValue: row => row.counted_before_at },
  { key: 'counted_after_at', filterType: 'date', globalSearchable: true, getValue: row => row.counted_after_at },
  { key: 'event_name', filterType: 'text', globalSearchable: true, getValue: row => row.event_name },
  { key: 'counters_label', filterType: 'text', globalSearchable: true, getValue: row => row.counters_label },
  { key: 'checked_by_name', filterType: 'text', globalSearchable: true, getValue: row => row.checked_by_name },
  { key: 'register_count', filterType: 'number', getValue: row => row.register_count },
  { key: 'total_difference', filterType: 'number', getValue: row => row.total_difference },
])

onMounted(async () => {
  const res = await $fetch('/api/cash_counts')
  if (res.ok) {
    cashCounts.value = res.cashCounts.map((entry: CashCountOverview) => ({
      ...entry,
      counters_label: [entry.counted_by_first_name, entry.counted_by_second_name].filter(Boolean).join(' / '),
    }))
  } else {
    console.log(res.error)
  }
})

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(locale.value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function openCashCount(id: number) {
  setPage('CashCountCreate', { cashCountId: id, returnTo: 'CashCountList' })
}

function columnSortDirection(key: CashCountColumnKey) {
  return sortKey.value === key ? sortDirection.value : null
}
</script>
