<template>
  <Page :headline1="t('home.title')" @open-menu="$emit('openMenu')">
    <template #cards>
      <p>{{ t('home.body') }}</p>
    </template>
  </Page>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'

const emit = defineEmits<{
  (e: 'openMenu'): void
}>()

const { t } = useI18n()
</script>
