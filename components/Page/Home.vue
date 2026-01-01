<template>
  <Page headline1="Home" @open-menu="$emit('openMenu')">
    <template #cards>
      <p>Text</p>
    </template>
  </Page>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'openMenu'): void
}>()
</script>