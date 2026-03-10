<template>
  <PageSettingsEntityManager
    :title="t('settings.entities.costCentres')"
    :singular-label="t('settings.entities.costCentre')"
    :add-label="t('settings.entities.newCostCentre')"
    :empty-label="t('settings.entities.noCostCentres')"
    list-endpoint="/api/cost_centres"
    save-endpoint="/api/cost_centres/save"
    activate-endpoint="/api/cost_centres/activate"
    response-list-key="costCentres"
  />
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'

const { t } = useI18n()
</script>
