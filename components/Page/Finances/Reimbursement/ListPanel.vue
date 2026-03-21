<template>
  <CommonPageTableCard
    :title="t('reimbursement.stored')"
    :search-value="globalSearchInput"
    :search-placeholder="t('reimbursement.search')"
    :can-create="canEdit"
    :create-label="`+ ${t('reimbursement.new')}`"
    @update:search-value="globalSearchInput = $event"
    @create="createReimbursement"
  >
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="text-left border-b">
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('reimbursement.submitted')"
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
                :label="t('reimbursement.checked')"
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
                :label="t('reimbursement.disbursed')"
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
                :label="t('reimbursement.submittedBy')"
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
                :label="t('reimbursement.receiptCount')"
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
                :label="t('receipt.grossAmount')"
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
                :label="t('member.status')"
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
            <th class="py-2 text-right">{{ t('common.actions') }}</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="reimbursement in processedRows"
            :key="reimbursement.id"
            class="border-b last:border-b-0 transition"
          >
            <td class="py-2">{{ formatDate(reimbursement.submitted_at) }}</td>
            <td class="py-2">{{ reimbursement.checked_at ? formatDate(reimbursement.checked_at) : t('common.notAvailable') }}</td>
            <td class="py-2">{{ reimbursement.disbursed_at ? formatDate(reimbursement.disbursed_at) : t('common.notAvailable') }}</td>
            <td class="py-2">{{ reimbursement.member_name || t('common.notAvailable') }}</td>
            <td class="py-2 text-right font-medium">{{ reimbursement.receipt_count }}</td>
            <td class="py-2 text-right font-medium">{{ formatCurrency(reimbursement.total_amount) }}</td>
            <td class="py-2 text-center">
              <CommonStatusBadge :label="statusLabels[status(reimbursement)]" :tone="statusTone(status(reimbursement))" />
            </td>
            <td class="py-2 text-right space-x-2">
              <button class="text-blue-600 hover:underline cursor-pointer" @click="openReimbursement(reimbursement.id)">
                {{ t('actions.open') }}
              </button>
            </td>
          </tr>

          <tr v-if="processedRows.length === 0">
            <td colspan="8" class="py-6 text-center text-slate-500">
              {{ t('reimbursement.none') }}
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
import { ReimbursementStatus, type ReimbursementOverview } from '~/types/reimbursement'

const props = defineProps<{
  returnTarget?: PageTarget | null
}>()

const { setPage } = usePage()
const { t } = useI18n()
const { formatDate, formatCurrency } = useLocaleFormatters()
const { hasPermission } = useAuth()

const canEdit = computed(() => hasPermission('reimbursements.edit'))
const resolvedReturnTarget = computed(() => cloneReturnTarget(props.returnTarget) ?? buildReturnTarget('ReimbursementList'))

const reimbursements = ref<ReimbursementOverview[]>([])
type ReimbursementColumnKey = 'submitted_at' | 'checked_at' | 'disbursed_at' | 'member_name' | 'receipt_count' | 'total_amount' | 'status'

const statusLabels = computed<Record<ReimbursementStatus, string>>(() => ({
  submitted: t('reimbursement.states.submitted'),
  checked: t('reimbursement.states.checked'),
  disbursed: t('reimbursement.states.disbursed'),
  cancelled: t('reimbursement.states.cancelled'),
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
} = useAdvancedTable<ReimbursementOverview, ReimbursementColumnKey>(reimbursements, [
  { key: 'submitted_at', filterType: 'date', globalSearchable: true, getValue: row => row.submitted_at },
  { key: 'checked_at', filterType: 'date', globalSearchable: true, getValue: row => row.checked_at },
  { key: 'disbursed_at', filterType: 'date', globalSearchable: true, getValue: row => row.disbursed_at },
  { key: 'member_name', filterType: 'text', globalSearchable: true, getValue: row => row.member_name },
  { key: 'receipt_count', filterType: 'number', getValue: row => row.receipt_count },
  { key: 'total_amount', filterType: 'number', getValue: row => row.total_amount },
  { key: 'status', filterType: 'text', globalSearchable: true, getValue: row => statusLabels.value[status(row)] },
])

onMounted(async () => {
  const res = await $fetch('/api/reimbursements')
  if (res.ok) {
    reimbursements.value = res.reimbursements
  } else {
    console.log(res.error)
  }
})

function status(reimbursement: ReimbursementOverview): ReimbursementStatus {
  if (reimbursement.disbursed_at) return ReimbursementStatus.Disbursed
  if (reimbursement.checked_at) return ReimbursementStatus.Checked
  if (reimbursement.submitted_at) return ReimbursementStatus.Submitted
  return ReimbursementStatus.Cancelled
}

function statusTone(statusValue: ReimbursementStatus) {
  switch (statusValue) {
    case ReimbursementStatus.Submitted:
      return 'slate'
    case ReimbursementStatus.Checked:
      return 'yellow'
    case ReimbursementStatus.Disbursed:
      return 'green'
    case ReimbursementStatus.Cancelled:
      return 'red'
    default:
      return 'gray'
  }
}

function openReimbursement(id: number) {
  setPage('ReimbursementCreate', {
    reimbursementId: id,
    returnTarget: resolvedReturnTarget.value,
  })
}

function createReimbursement() {
  setPage('ReimbursementCreate', {
    returnTarget: resolvedReturnTarget.value,
  })
}

function columnSortDirection(key: ReimbursementColumnKey) {
  return sortKey.value === key ? sortDirection.value : null
}
</script>
