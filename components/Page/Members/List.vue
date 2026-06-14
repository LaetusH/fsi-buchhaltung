<template>
  <Page :headline1="t('member.listTitle')" @open-menu="$emit('openMenu')">
    <template #cards>
      <PageMembersListPanel />
    </template>
  </Page>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import PageMembersListPanel from './ListPanel.vue'

defineEmits<{
  (e: 'openMenu'): void
}>()

const { t } = useI18n()
</script>
