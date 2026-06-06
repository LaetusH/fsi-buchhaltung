<template>
  <Page :headline1="t('bankStatement.listTitle')" @open-menu="$emit('openMenu')">
    <template #cards>
      <PageFinancesBankStatementListPanel :return-target="returnTarget" />
    </template>
  </Page>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { buildReturnTarget } from '~/composables/useReturnTarget'
import PageFinancesBankStatementListPanel from './ListPanel.vue'

defineEmits<{
  (e: 'openMenu'): void
}>()

const { t } = useI18n()
const returnTarget = buildReturnTarget('BankStatementList')
</script>
