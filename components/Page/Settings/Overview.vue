<template>
  <Page headline1="Einstellungen" @open-menu="$emit('openMenu')">
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
import { ref, computed } from 'vue'

import SettingsSpheres from './Spheres.vue'
import SettingsCostCentres from './CostCentres.vue'

const emit = defineEmits<{
  (e: 'openMenu'): void
}>()

type SettingsTab = 'spheres' | 'costCentres'

const currentTab = ref<SettingsTab>('spheres')

const tabs = [
  { key: 'spheres', label: 'Sphären' },
  { key: 'costCentres', label: 'Kostenstellen' },
] as const

const activeComponent = computed(() => {
  switch (currentTab.value) {
    case 'spheres':
      return SettingsSpheres
    case 'costCentres':
      return SettingsCostCentres
    default:
      return SettingsSpheres
  }
})
</script>