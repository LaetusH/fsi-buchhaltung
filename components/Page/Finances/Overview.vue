<template>
  <Page :headline1="t('finances.title')" @open-menu="$emit('openMenu')">
    <template #header>
      <div class="flex flex-wrap">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="px-4 py-2 rounded-t-xl text-sm cursor-pointer font-medium transition-colors"
          :class="currentTab === tab.key
            ? 'bg-orange-500 text-white'
            : 'bg-gray-300 text-gray-700 hover:bg-gray-400'"
          @click="currentTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
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
import ReimbursementListPanel from './Reimbursement/ListPanel.vue'
import CashCountListPanel from './CashCount/ListPanel.vue'

type FinancesTab = 'receipts' | 'reimbursements' | 'cashCounts'

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
    { key: 'reimbursements', label: t('pages.reimbursements'), show: hasPermission('reimbursements.view') },
    { key: 'cashCounts', label: t('pages.cashCounts'), show: hasPermission('cash_counts.view') },
  ] as const

  return list.filter(tab => tab.show).map(({ show, ...rest }) => rest)
})

const activeComponent = computed(() => {
  switch (currentTab.value) {
    case 'receipts':
      return ReceiptListPanel
    case 'reimbursements':
      return ReimbursementListPanel
    case 'cashCounts':
      return CashCountListPanel
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
