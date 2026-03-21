<template>
  <Page :headline1="t('reimbursement.listTitle')" @open-menu="$emit('openMenu')">
    <template #cards>
      <PageFinancesReimbursementListPanel :return-target="returnTarget" />
    </template>
  </Page>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { buildReturnTarget } from '~/composables/useReturnTarget'
import PageFinancesReimbursementListPanel from './ListPanel.vue'

defineEmits<{
  (e: 'openMenu'): void
}>()

const { t } = useI18n()
const returnTarget = buildReturnTarget('ReimbursementList')
</script>
