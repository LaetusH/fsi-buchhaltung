<template>
  <Page headline1="Belege" @open-menu="$emit('openMenu')">
    <template #cards>
      <div class="bg-white rounded-xl shadow-lg p-6 space-y-6 col-span-12">
        <div class="flex justify-between items-center gap-3 flex-wrap">
          <h2 class="text-lg font-semibold">Gespeicherte Belege</h2>

          <div class="flex items-center gap-2 flex-wrap justify-end">
            <CommonGlobalSearchBar v-model="globalSearchInput" :placeholder="'Belege durchsuchen'" />
            <button
              class="btn-primary"
              @click="setPage('ReceiptCreate', { returnTo: 'ReceiptList' })"
            >
              ＋ Neuer Beleg
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-left border-b">
                <th class="py-2">
                  <CommonTableColumnControl
                    label="Belegdatum"
                    filter-type="date"
                    :sort-direction="columnSortDirection('receipt_date')"
                    :is-filter-active="isFilterActive('receipt_date')"
                    :filter="getFilter('receipt_date')"
                    @toggle-sort="toggleSort('receipt_date')"
                    @apply-range-filter="setRangeFilter('receipt_date', $event.min, $event.max)"
                    @reset-filter="resetFilter('receipt_date')"
                  />
                </th>
                <th class="py-2">
                  <CommonTableColumnControl
                    label="Beleg-Nr."
                    filter-type="text"
                    :sort-direction="columnSortDirection('receipt_number')"
                    :is-filter-active="isFilterActive('receipt_number')"
                    :filter="getFilter('receipt_number')"
                    :text-options="textOptionsByColumn.receipt_number"
                    @toggle-sort="toggleSort('receipt_number')"
                    @apply-text-filter="setTextFilter('receipt_number', $event)"
                    @reset-filter="resetFilter('receipt_number')"
                  />
                </th>
                <th class="py-2">
                  <CommonTableColumnControl
                    label="Zahlungsempfaenger"
                    filter-type="text"
                    :sort-direction="columnSortDirection('company_name')"
                    :is-filter-active="isFilterActive('company_name')"
                    :filter="getFilter('company_name')"
                    :text-options="textOptionsByColumn.company_name"
                    @toggle-sort="toggleSort('company_name')"
                    @apply-text-filter="setTextFilter('company_name', $event)"
                    @reset-filter="resetFilter('company_name')"
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
                    label="Zahlungsstatus"
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
                v-for="receipt in processedRows"
                :key="receipt.id"
                class="border-b last:border-b-0 transition"
              >
                <td class="py-2">
                  {{ formatDate(receipt.receipt_date) }}
                </td>

                <td class="py-2">
                  {{ receipt.receipt_number || '—' }}
                </td>

                <td class="py-2">
                  {{ receipt.company_name || '—' }}
                </td>

                <td class="py-2 text-right font-medium">
                  {{ formatCurrency(receipt.total_amount) }}
                </td>

                <td class="py-2 text-center">
                  <span
                    class="px-3 py-1 rounded-full text-xs font-medium"
                    :class="statusClass(receipt.status)"
                  >
                    {{ statusLabels[receipt.status] }}
                  </span>
                </td>

                <td class="py-2 text-right space-x-2">
                  <button
                    class="text-blue-600 hover:underline cursor-pointer"
                    @click="openReceipt(receipt.id)"
                  >
                    Öffnen
                  </button>
                </td>
              </tr>

              <tr v-if="processedRows.length === 0">
                <td colspan="7" class="py-6 text-center text-slate-500">
                  Keine Belege vorhanden
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
import { ReceiptStatus, type ReceiptRow } from '~/types/receipt'

const emit = defineEmits<{
  (e: 'openMenu'): void
  (e: 'editReceipt', id: number): void
}>()

const { setPage } = usePage()

const receipts = ref<ReceiptRow[]>([])
type ReceiptColumnKey = 'receipt_date' | 'receipt_number' | 'company_name' | 'total_amount' | 'status'

const statusLabels: Record<ReceiptStatus, string> = {
  draft: 'ENTWURF',
  open: 'OFFEN',
  paid: 'BEZAHLT',
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
} = useAdvancedTable<ReceiptRow, ReceiptColumnKey>(receipts, [
  {
    key: 'receipt_date',
    filterType: 'date',
    globalSearchable: true,
    getValue: row => row.receipt_date,
  },
  {
    key: 'receipt_number',
    filterType: 'text',
    globalSearchable: true,
    getValue: row => row.receipt_number ?? '-',
  },
  {
    key: 'company_name',
    filterType: 'text',
    globalSearchable: true,
    getValue: row => row.company_name ?? '-',
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
    getValue: row => statusLabels[row.status],
  },
])

onMounted(async () => {
  const res = await $fetch('/api/receipts')
  if (res.ok) receipts.value = res.receipts
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

function statusClass(status: string) {
  switch (status) {
    case ReceiptStatus.Draft:
      return 'bg-slate-300 text-slate-900'
    case ReceiptStatus.Open:
      return 'bg-yellow-300 text-yellow-900'
    case ReceiptStatus.Paid:
      return 'bg-green-300 text-green-900'
    case ReceiptStatus.Cancelled:
      return 'bg-red-300 text-red-900 line-through'
    default:
      return 'bg-gray-100 text-gray-500'
  }
}

function openReceipt(id: number) {
  setPage('ReceiptCreate', {
    receiptId: id,
    returnTo: 'ReceiptList'
  })
}

function columnSortDirection(key: ReceiptColumnKey) {
  return sortKey.value === key ? sortDirection.value : null
}
</script>