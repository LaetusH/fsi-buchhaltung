<template>
  <PageSettingsEntityManager
    ref="entityManagerRef"
    :title="t('settings.entities.spheres')"
    :singular-label="t('settings.entities.sphere')"
    :add-label="t('settings.entities.newSphere')"
    :empty-label="t('settings.entities.noSpheres')"
    list-endpoint="/api/spheres"
    save-endpoint="/api/spheres/save"
    activate-endpoint="/api/spheres/activate"
    response-list-key="spheres"
  />
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'

const { t } = useI18n()

const entityManagerRef = ref<{ loadItems: () => Promise<void> } | null>(null)

useAppRefresh().onRefresh(async () => {
  await entityManagerRef.value?.loadItems()
})
</script>
