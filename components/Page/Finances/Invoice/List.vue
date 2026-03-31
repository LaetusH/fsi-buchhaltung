<template>
  <Page :headline1="t('invoice.listTitle')" @open-menu="$emit('openMenu')">
    <template #cards>
      <PageFinancesInvoiceListPanel :return-target="returnTarget" />
    </template>
  </Page>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { buildReturnTarget } from '~/composables/useReturnTarget'
import PageFinancesInvoiceListPanel from './ListPanel.vue'

defineEmits<{
  (e: 'openMenu'): void
}>()

const { t } = useI18n()
const returnTarget = buildReturnTarget('InvoiceList')
</script>
