<template>
  <Page @open-menu="$emit('openMenu')">
    <template #cards>
      <PageEventsListPanel :return-target="returnTarget" />
    </template>
  </Page>
</template>

<script setup lang="ts">
import { buildReturnTarget } from '~/composables/useReturnTarget'
import PageEventsListPanel from './ListPanel.vue'

defineEmits<{
  (e: 'openMenu'): void
}>()

const returnTarget = buildReturnTarget('Events')
</script>
