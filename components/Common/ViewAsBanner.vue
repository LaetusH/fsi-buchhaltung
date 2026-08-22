<template>
  <div v-if="isActive" class="flex items-center justify-between gap-4 bg-warning-100 text-warning-900 border-b border-warning-300 px-4 py-2 text-sm">
    <span class="truncate">{{ t('settings.viewAs.bannerLabel', { selection: selectionLabel }) }}</span>
    <button class="btn-secondary shrink-0" @click="handleExit">
      {{ t('settings.viewAs.bannerExit') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppRefresh } from '~/composables/useAppRefresh'
import { useI18n } from '~/composables/useI18n'
import { useViewAsSimulation } from '~/composables/useViewAsSimulation'

const { t } = useI18n()
const { simulation, isActive, stop } = useViewAsSimulation()
const { refreshCurrentPage } = useAppRefresh()

function handleExit() {
  stop()
  refreshCurrentPage()
}

const selectionLabel = computed(() => {
  const names = [...(simulation.value?.roleNames ?? []), ...(simulation.value?.positionNames ?? [])]
  const customCount = simulation.value?.customPermissions.length ?? 0
  if (customCount) names.push(t('settings.viewAs.customPermissionsCount', { count: customCount }))
  return names.join(', ')
})
</script>
