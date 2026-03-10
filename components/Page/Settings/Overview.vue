<template>
  <Page :headline1="t('settings.title')" @open-menu="$emit('openMenu')">
    <template #header>
      <div class="flex">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="currentTab = tab.key"
          class="px-4 py-2 rounded-t-xl text-sm cursor-pointer font-medium transition-colors"
          :class="currentTab === tab.key
            ? 'bg-orange-500 text-white'
            : 'bg-gray-300 text-gray-700 hover:bg-gray-400'"
        >
          {{ tab.label }}
        </button>
      </div>
    </template>

    <template #cards>
      <component :is="activeComponent" />
    </template>
  </Page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '~/composables/useI18n'
import SettingsGeneral from './General.vue'
import SettingsSpheres from './Spheres.vue'
import SettingsCostCentres from './CostCentres.vue'
import SettingsPositions from './Positions.vue'

const emit = defineEmits<{
  (e: 'openMenu'): void
}>()

type SettingsTab = 'general' | 'spheres' | 'costCentres' | 'positions'

const currentTab = ref<SettingsTab>('general')
const { t } = useI18n()

const tabs = computed(() => [
  { key: 'general', label: t('settings.tabs.general') },
  { key: 'spheres', label: t('settings.tabs.spheres') },
  { key: 'costCentres', label: t('settings.tabs.costCentres') },
  { key: 'positions', label: t('settings.tabs.positions') },
] as const)

const activeComponent = computed(() => {
  switch (currentTab.value) {
    case 'general':
      return SettingsGeneral
    case 'spheres':
      return SettingsSpheres
    case 'costCentres':
      return SettingsCostCentres
    case 'positions':
      return SettingsPositions
    default:
      return SettingsGeneral
  }
})
</script>
