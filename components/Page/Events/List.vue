<template>
  <Page :headline1="t('event.listTitle')" @open-menu="$emit('openMenu')">
    <template #cards>
      <PageEventsListPanel :return-target="returnTarget" />
    </template>
  </Page>
</template>

<script setup lang="ts">
import { buildReturnTarget } from '~/composables/useReturnTarget'
import { useI18n } from '~/composables/useI18n'
import PageEventsListPanel from './ListPanel.vue'

defineEmits<{
  (e: 'openMenu'): void
}>()

const { t } = useI18n()
const returnTarget = buildReturnTarget('Events')
</script>
