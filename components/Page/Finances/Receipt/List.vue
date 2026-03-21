<template>
  <Page :headline1="t('receipt.listTitle')" @open-menu="$emit('openMenu')">
    <template #cards>
      <PageFinancesReceiptListPanel :return-target="returnTarget" />
    </template>
  </Page>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { buildReturnTarget } from '~/composables/useReturnTarget'
import PageFinancesReceiptListPanel from './ListPanel.vue'

defineEmits<{
  (e: 'openMenu'): void
}>()

const { t } = useI18n()
const returnTarget = buildReturnTarget('ReceiptList')
</script>
