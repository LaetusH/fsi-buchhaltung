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
import SettingsPermissions from './Permissions.vue'
import SettingsUsers from './Users.vue'
import { useAuth } from '~/composables/useAuth'

const emit = defineEmits<{
  (e: 'openMenu'): void
}>()

type SettingsTab = 'general' | 'spheres' | 'costCentres' | 'positions' | 'users' | 'permissions'

const currentTab = ref<SettingsTab>('general')
const { t } = useI18n()
const { hasPermission } = useAuth()

const tabs = computed(() => {
  const list = [
    { key: 'general', label: t('settings.tabs.general'), show: true },
    { key: 'spheres', label: t('settings.tabs.spheres'), show: hasPermission('settings.spheres.manage') },
    { key: 'costCentres', label: t('settings.tabs.costCentres'), show: hasPermission('settings.cost_centres.manage') },
    { key: 'positions', label: t('settings.tabs.positions'), show: hasPermission('settings.positions.manage') },
    { key: 'users', label: t('settings.tabs.users'), show: hasPermission('users.manage') },
    { key: 'permissions', label: t('settings.tabs.permissions'), show: hasPermission('permissions.manage') },
  ] as const
  return list.filter(tab => tab.show).map(({ show, ...rest }) => rest)
})

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
    case 'users':
      return SettingsUsers
    case 'permissions':
      return SettingsPermissions
    default:
      return SettingsGeneral
  }
})

watch(tabs, (available) => {
  if (!available.find(tab => tab.key === currentTab.value)) {
    currentTab.value = 'general'
  }
}, { immediate: true })
</script>
