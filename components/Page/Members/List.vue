<template>
  <Page @open-menu="$emit('openMenu')">
    <template #cards>
      <PageMembersListPanel />
    </template>
  </Page>
</template>

<script setup lang="ts">
import PageMembersListPanel from './ListPanel.vue'

defineEmits<{
  (e: 'openMenu'): void
}>()
</script>
