<template>
  <PageSettingsEntityManager
    :title="t('settings.entities.positions')"
    :singular-label="t('settings.entities.position')"
    :add-label="t('settings.entities.newPosition')"
    :empty-label="t('settings.entities.noPositions')"
    list-endpoint="/api/positions"
    save-endpoint="/api/positions/save"
    activate-endpoint="/api/positions/activate"
    response-list-key="positions"
  />
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'

const { t } = useI18n()
</script>
