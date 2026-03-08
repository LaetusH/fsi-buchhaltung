<template>
  <Page headline1="Auslagenerstattungen" @open-menu="$emit('openMenu')">
    <template #cards>
      <div class="bg-white rounded-xl shadow-lg p-6 space-y-6 col-span-12">
        <div class="flex justify-between items-center gap-3 flex-wrap">
          <h2 class="text-lg font-semibold">Gespeicherte Auslagenerstattungen</h2>

          <div class="flex items-center gap-2 flex-wrap justify-end">
            <CommonGlobalSearchBar v-model="globalSearchInput" :placeholder="'Erstattungen durchsuchen'" />
            <button
              class="btn-primary"
              @click="setPage('ReimbursementCreate', { returnTo: 'ReimbursementList' })"
            >
              ＋ Neue Auslagenerstattung
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-left border-b">
                <th class="py-2">
                  <CommonTableColumnControl
                    label="Eingereicht"
                    filter-type="date"
                    :sort-direction="columnSortDirection('submitted_at')"
                    :is-filter-active="isFilterActive('submitted_at')"
                    :filter="getFilter('submitted_at')"
                    @toggle-sort="toggleSort('submitted_at')"
                    @apply-range-filter="setRangeFilter('submitted_at', $event.min, $event.max)"
                    @reset-filter="resetFilter('submitted_at')"
                  />
                </th>
                <th class="py-2">
                  <CommonTableColumnControl
                    label="Geprueft"
                    filter-type="date"
                    :sort-direction="columnSortDirection('checked_at')"
                    :is-filter-active="isFilterActive('checked_at')"
                    :filter="getFilter('checked_at')"
                    @toggle-sort="toggleSort('checked_at')"
                    @apply-range-filter="setRangeFilter('checked_at', $event.min, $event.max)"
                    @reset-filter="resetFilter('checked_at')"
                  />
                </th>
                <th class="py-2">
                  <CommonTableColumnControl
                    label="Ausgezahlt"
                    filter-type="date"
                    :sort-direction="columnSortDirection('disbursed_at')"
                    :is-filter-active="isFilterActive('disbursed_at')"
                    :filter="getFilter('disbursed_at')"
                    @toggle-sort="toggleSort('disbursed_at')"
                    @apply-range-filter="setRangeFilter('disbursed_at', $event.min, $event.max)"
                    @reset-filter="resetFilter('disbursed_at')"
                  />
                </th>
                <th class="py-2">
                  <CommonTableColumnControl
                    label="Eingereicht von"
                    filter-type="text"
                    :sort-direction="columnSortDirection('member_name')"
                    :is-filter-active="isFilterActive('member_name')"
                    :filter="getFilter('member_name')"
                    :text-options="textOptionsByColumn.member_name"
                    @toggle-sort="toggleSort('member_name')"
                    @apply-text-filter="setTextFilter('member_name', $event)"
                    @reset-filter="resetFilter('member_name')"
                  />
                </th>
                <th class="py-2 text-right">
                  <CommonTableColumnControl
                    label="Anzahl Belege"
                    filter-type="number"
                    :sort-direction="columnSortDirection('receipt_count')"
                    :is-filter-active="isFilterActive('receipt_count')"
                    :filter="getFilter('receipt_count')"
                    @toggle-sort="toggleSort('receipt_count')"
                    @apply-range-filter="setRangeFilter('receipt_count', $event.min, $event.max)"
                    @reset-filter="resetFilter('receipt_count')"
                  />
                </th>
                <th class="py-2 text-right">
                  <CommonTableColumnControl
                    label="Betrag (Brutto)"
                    filter-type="number"
                    :sort-direction="columnSortDirection('total_amount')"
                    :is-filter-active="isFilterActive('total_amount')"
                    :filter="getFilter('total_amount')"
                    @toggle-sort="toggleSort('total_amount')"
                    @apply-range-filter="setRangeFilter('total_amount', $event.min, $event.max)"
                    @reset-filter="resetFilter('total_amount')"
                  />
                </th>
                <th class="py-2 text-center">
                  <CommonTableColumnControl
                    label="Status"
                    filter-type="text"
                    :sort-direction="columnSortDirection('status')"
                    :is-filter-active="isFilterActive('status')"
                    :filter="getFilter('status')"
                    :text-options="textOptionsByColumn.status"
                    @toggle-sort="toggleSort('status')"
                    @apply-text-filter="setTextFilter('status', $event)"
                    @reset-filter="resetFilter('status')"
                  />
                </th>
                <th class="py-2 text-right">Aktionen</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="reimbursement in processedRows"
                :key="reimbursement.id"
                class="border-b last:border-b-0 transition"
              >
                <td class="py-2">
                  {{ formatDate(reimbursement.submitted_at) }}
                </td>

                <td class="py-2">
                  {{ reimbursement.checked_at ? formatDate(reimbursement.checked_at) : '—' }}
                </td>

                <td class="py-2">
                  {{ reimbursement.disbursed_at ? formatDate(reimbursement.disbursed_at) : '—' }}
                </td>

                <td class="py-2">
                  {{ reimbursement.member_name || '—' }}
                </td>

                <td class="py-2 text-right font-medium">
                  {{ reimbursement.receipt_count }}
                </td>

                <td class="py-2 text-right font-medium">
                  {{ formatCurrency(reimbursement.total_amount) }}
                </td>

                <td class="py-2 text-center">
                  <span
                    class="px-3 py-1 rounded-full text-xs font-medium"
                    :class="statusClass(status(reimbursement))"
                  >
                    {{ statusLabels[status(reimbursement)] }}
                  </span>
                </td>

                <td class="py-2 text-right space-x-2">
                  <button
                    class="text-blue-600 hover:underline cursor-pointer"
                    @click="openReimbursement(reimbursement.id)"
                  >
                    Öffnen
                  </button>
                </td>
              </tr>

              <tr v-if="processedRows.length === 0">
                <td colspan="8" class="py-6 text-center text-slate-500">
                  Keine Auslagenerstattungen vorhanden
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
import { useAdvancedTable } from '~/composables/useAdvancedTable'
import { usePage } from '~/composables/usePage'
import { ReimbursementStatus, type ReimbursementOverview } from '~/types/reimbursement'

const emit = defineEmits<{
  (e: 'openMenu'): void
}>()

const { setPage } = usePage()

const reimbursements = ref<ReimbursementOverview[]>([])
type ReimbursementColumnKey =
  | 'submitted_at'
  | 'checked_at'
  | 'disbursed_at'
  | 'member_name'
  | 'receipt_count'
  | 'total_amount'
  | 'status'

const statusLabels: Record<ReimbursementStatus, string> = {
  submitted: 'EINGEREICHT',
  checked: 'GEPRÜFT',
  disbursed: 'AUSGEZAHLT',
  cancelled: 'STORNIERT',
}

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
} = useAdvancedTable<ReimbursementOverview, ReimbursementColumnKey>(reimbursements, [
  {
    key: 'submitted_at',
    filterType: 'date',
    globalSearchable: true,
    getValue: row => row.submitted_at,
  },
  {
    key: 'checked_at',
    filterType: 'date',
    globalSearchable: true,
    getValue: row => row.checked_at,
  },
  {
    key: 'disbursed_at',
    filterType: 'date',
    globalSearchable: true,
    getValue: row => row.disbursed_at,
  },
  {
    key: 'member_name',
    filterType: 'text',
    globalSearchable: true,
    getValue: row => row.member_name,
  },
  {
    key: 'receipt_count',
    filterType: 'number',
    getValue: row => row.receipt_count,
  },
  {
    key: 'total_amount',
    filterType: 'number',
    getValue: row => row.total_amount,
  },
  {
    key: 'status',
    filterType: 'text',
    globalSearchable: true,
    getValue: row => statusLabels[status(row)],
  },
])

onMounted(async () => {
  const res = await $fetch('/api/reimbursements')
  if (res.ok) reimbursements.value = res.reimbursements
})

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function status(reimbursement: ReimbursementOverview): ReimbursementStatus {
  if (reimbursement.disbursed_at) return ReimbursementStatus.Disbursed
  if (reimbursement.checked_at) return ReimbursementStatus.Checked
  if (reimbursement.submitted_at) return ReimbursementStatus.Submitted
  return ReimbursementStatus.Cancelled
}

function statusClass(status: string) {
  switch (status) {
    case ReimbursementStatus.Submitted:
      return 'bg-slate-300 text-slate-900'
    case ReimbursementStatus.Checked:
      return 'bg-yellow-300 text-yellow-900'
    case ReimbursementStatus.Disbursed:
      return 'bg-green-300 text-green-900'
    case ReimbursementStatus.Cancelled:
      return 'bg-red-300 text-red-900 line-through'
    default:
      return 'bg-gray-100 text-gray-500'
  }
}

function openReimbursement(id: number) {
  setPage('ReimbursementCreate', {
    reimbursementId: id,
    returnTo: 'ReimbursementList'
  })
}

function columnSortDirection(key: ReimbursementColumnKey) {
  return sortKey.value === key ? sortDirection.value : null
}
</script>
