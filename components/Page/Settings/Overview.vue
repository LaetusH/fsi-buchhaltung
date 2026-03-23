<template>
  <Page :headline1="t('settings.title')" flush-header-with-cards @open-menu="$emit('openMenu')">
    <template #header="{ headerContainerRef, headlineGroupRef }">
      <CommonTabOverview
        v-model="currentTab"
        :tabs="tabs"
        :header-container-ref="headerContainerRef"
        :headline-group-ref="headlineGroupRef"
      />
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
import SettingsAssociation from './Association.vue'
import SettingsSpheres from './Spheres.vue'
import SettingsCostCentres from './CostCentres.vue'
import SettingsSubdivisions from './Subdivisions.vue'
import SettingsPositions from './Positions.vue'
import SettingsPermissions from './Permissions.vue'
import SettingsUsers from './Users.vue'
import { useAuth } from '~/composables/useAuth'

defineEmits<{
  (e: 'openMenu'): void
}>()

type SettingsTab = 'general' | 'association' | 'spheres' | 'costCentres' | 'subdivisions' | 'positions' | 'users' | 'permissions'

const currentTab = ref<SettingsTab>('general')
const { t } = useI18n()
const { hasPermission } = useAuth()

const tabs = computed(() => {
  const list = [
    { key: 'general', label: t('settings.tabs.general'), show: true },
    { key: 'association', label: t('settings.tabs.association'), show: hasPermission('settings.association.manage') },
    { key: 'spheres', label: t('settings.tabs.spheres'), show: hasPermission('settings.spheres.manage') },
    { key: 'costCentres', label: t('settings.tabs.costCentres'), show: hasPermission('settings.cost_centres.manage') },
    { key: 'subdivisions', label: t('settings.tabs.subdivisions'), show: hasPermission('settings.subdivisions.manage') },
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
    case 'association':
      return SettingsAssociation
    case 'costCentres':
      return SettingsCostCentres
    case 'subdivisions':
      return SettingsSubdivisions
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
