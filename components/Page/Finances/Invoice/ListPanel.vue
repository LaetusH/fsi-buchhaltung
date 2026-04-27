<template>
  <CommonPageTableCard
    :title="t('invoice.stored')"
    :search-value="globalSearchInput"
    :search-placeholder="t('invoice.search')"
    :can-create="canEdit"
    :create-label="`+ ${t('invoice.new')}`"
    @update:search-value="globalSearchInput = $event"
    @create="createInvoice"
  >
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="text-left border-b">
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('invoice.invoiceDate')"
                filter-type="date"
                :sort-direction="columnSortDirection('invoice_date')"
                :is-filter-active="isFilterActive('invoice_date')"
                :filter="getFilter('invoice_date')"
                @toggle-sort="toggleSort('invoice_date')"
                @apply-range-filter="setRangeFilter('invoice_date', $event.min, $event.max)"
                @reset-filter="resetFilter('invoice_date')"
              />
            </th>
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('invoice.invoiceNumber')"
                filter-type="text"
                :sort-direction="columnSortDirection('invoice_number')"
                :is-filter-active="isFilterActive('invoice_number')"
                :filter="getFilter('invoice_number')"
                :text-options="textOptionsByColumn.invoice_number"
                @toggle-sort="toggleSort('invoice_number')"
                @apply-text-filter="setTextFilter('invoice_number', $event)"
                @reset-filter="resetFilter('invoice_number')"
              />
            </th>
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('invoice.company')"
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
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('invoice.sourceType')"
                filter-type="text"
                :sort-direction="columnSortDirection('source_type')"
                :is-filter-active="isFilterActive('source_type')"
                :filter="getFilter('source_type')"
                :text-options="textOptionsByColumn.source_type"
                @toggle-sort="toggleSort('source_type')"
                @apply-text-filter="setTextFilter('source_type', $event)"
                @reset-filter="resetFilter('source_type')"
              />
            </th>
            <th class="py-2 text-right">
              <CommonTableColumnControl
                :label="t('invoice.total')"
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
                :label="t('invoice.paymentStatus')"
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
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('invoice.paidAt')"
                filter-type="date"
                :sort-direction="columnSortDirection('paid_at')"
                :is-filter-active="isFilterActive('paid_at')"
                :filter="getFilter('paid_at')"
                @toggle-sort="toggleSort('paid_at')"
                @apply-range-filter="setRangeFilter('paid_at', $event.min, $event.max)"
                @reset-filter="resetFilter('paid_at')"
              />
            </th>
            <th class="py-2 text-right">{{ t('common.actions') }}</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="invoice in processedRows" :key="invoice.id" class="border-b last:border-b-0 transition">
            <td class="py-2">{{ formatDate(invoice.invoice_date) }}</td>
            <td class="py-2">{{ invoice.invoice_number }}</td>
            <td class="py-2">{{ invoice.company_name || t('invoice.noCompany') }}</td>
            <td class="py-2">{{ sourceLabels[invoice.source_type] }}</td>
            <td class="py-2 text-right font-medium">{{ formatCurrency(invoice.total_amount) }}</td>
            <td class="py-2 text-center">
              <CommonStatusBadge :label="statusLabels[invoice.status]" :tone="statusTone(invoice.status)" />
            </td>
            <td class="py-2">{{ invoice.paid_at ? formatDate(invoice.paid_at) : '-' }}</td>
            <td class="py-2 text-right">
              <button class="text-blue-600 hover:underline cursor-pointer" @click="openInvoice(invoice.id)">
                {{ t('actions.open') }}
              </button>
            </td>
          </tr>

          <tr v-if="processedRows.length === 0">
            <td colspan="8" class="py-6 text-center text-slate-500">{{ t('invoice.none') }}</td>
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
import { InvoiceSourceType, InvoiceStatus, type InvoiceRow } from '~/types/invoice'

const props = defineProps<{
  returnTarget?: PageTarget | null
}>()

const { t } = useI18n()
const { formatDate, formatCurrency } = useLocaleFormatters()
const { hasPermission } = useAuth()
const { setPage } = usePage()

const invoices = ref<InvoiceRow[]>([])
type InvoiceColumnKey = 'invoice_date' | 'invoice_number' | 'company_name' | 'source_type' | 'total_amount' | 'status' | 'paid_at'
const canEdit = computed(() => hasPermission('invoices.edit'))
const resolvedReturnTarget = computed(() => cloneReturnTarget(props.returnTarget) ?? buildReturnTarget('InvoiceList'))

const statusLabels = computed<Record<InvoiceStatus, string>>(() => ({
  draft: t('invoice.states.draft'),
  open: t('invoice.states.open'),
  paid: t('invoice.states.paid'),
  cancelled: t('invoice.states.cancelled'),
}))

const sourceLabels = computed<Record<InvoiceSourceType, string>>(() => ({
  upload: t('invoice.sources.upload'),
  generated: t('invoice.sources.generated'),
}))

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
} = useAdvancedTable<InvoiceRow, InvoiceColumnKey>(invoices, [
  { key: 'invoice_date', filterType: 'date', globalSearchable: true, getValue: row => row.invoice_date },
  { key: 'invoice_number', filterType: 'text', globalSearchable: true, getValue: row => row.invoice_number },
  { key: 'company_name', filterType: 'text', globalSearchable: true, getValue: row => row.company_name ?? '-' },
  { key: 'source_type', filterType: 'text', globalSearchable: true, getValue: row => sourceLabels.value[row.source_type] },
  { key: 'total_amount', filterType: 'number', getValue: row => row.total_amount },
  { key: 'status', filterType: 'text', globalSearchable: true, getValue: row => statusLabels.value[row.status] },
  { key: 'paid_at', filterType: 'date', globalSearchable: true, getValue: row => row.paid_at ?? '' },
])

onMounted(async () => {
  const res = await $fetch<{ ok: boolean, invoices?: InvoiceRow[], error?: string }>('/api/invoices')
  if (res.ok && res.invoices) invoices.value = res.invoices
})

function statusTone(status: InvoiceStatus) {
  switch (status) {
    case InvoiceStatus.Draft:
      return 'slate'
    case InvoiceStatus.Open:
      return 'yellow'
    case InvoiceStatus.Paid:
      return 'green'
    case InvoiceStatus.Cancelled:
      return 'red'
  }
}

function openInvoice(id: number) {
  setPage('InvoiceCreate', {
    invoiceId: id,
    returnTarget: resolvedReturnTarget.value,
  })
}

function createInvoice() {
  setPage('InvoiceCreate', {
    returnTarget: resolvedReturnTarget.value,
  })
}

function columnSortDirection(key: InvoiceColumnKey) {
  return sortKey.value === key ? sortDirection.value : null
}
</script>
