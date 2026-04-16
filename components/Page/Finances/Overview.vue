<template>
  <Page :headline1="t('finances.title')" flush-header-with-cards @open-menu="$emit('openMenu')">
    <template #header="{ headerContainerRef, headlineGroupRef }">
      <CommonTabOverview
        v-model="currentTab"
        :tabs="tabs"
        :header-container-ref="headerContainerRef"
        :headline-group-ref="headlineGroupRef"
      />
    </template>

    <template #cards>
      <component
        :is="activeComponent"
        :return-target="activeReturnTarget"
      />
    </template>
  </Page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useI18n } from '~/composables/useI18n'
import { usePage } from '~/composables/usePage'
import { buildReturnTarget } from '~/composables/useReturnTarget'
import ReceiptListPanel from './Receipt/ListPanel.vue'
import InvoiceListPanel from './Invoice/ListPanel.vue'
import ReimbursementListPanel from './Reimbursement/ListPanel.vue'
import CashCountListPanel from './CashCount/ListPanel.vue'
import BudgetListPanel from './Budget/ListPanel.vue'

type FinancesTab = 'receipts' | 'invoices' | 'reimbursements' | 'cashCounts' | 'budgets'

defineEmits<{
  (e: 'openMenu'): void
}>()

const { t } = useI18n()
const { hasPermission } = useAuth()
const { pageMeta } = usePage()

const currentTab = ref<FinancesTab>('receipts')

const tabs = computed(() => {
  const list = [
    { key: 'receipts', label: t('pages.receipts'), show: hasPermission('receipts.view') },
    { key: 'invoices', label: t('pages.invoices'), show: hasPermission('invoices.view') },
    { key: 'reimbursements', label: t('pages.reimbursements'), show: hasPermission('reimbursements.view') },
    { key: 'cashCounts', label: t('pages.cashCounts'), show: hasPermission('cash_counts.view') },
    { key: 'budgets', label: t('pages.budgets'), show: hasPermission('budgets.view') },
  ] as const

  return list.filter(tab => tab.show).map(({ show, ...rest }) => rest)
})

const activeComponent = computed(() => {
  switch (currentTab.value) {
    case 'receipts':
      return ReceiptListPanel
    case 'invoices':
      return InvoiceListPanel
    case 'reimbursements':
      return ReimbursementListPanel
    case 'cashCounts':
      return CashCountListPanel
    case 'budgets':
      return BudgetListPanel
    default:
      return ReceiptListPanel
  }
})

const activeReturnTarget = computed(() => buildReturnTarget('Finances', { tab: currentTab.value }))

watch([tabs, () => pageMeta.value?.tab], ([availableTabs, requestedTab]) => {
  const requested = requestedTab as FinancesTab | undefined
  if (requested && availableTabs.find(tab => tab.key === requested)) {
    currentTab.value = requested
    return
  }

  if (!availableTabs.find(tab => tab.key === currentTab.value) && availableTabs.length > 0) {
    if (availableTabs[0]?.key) currentTab.value = availableTabs[0].key
  }
}, { immediate: true })
</script>
