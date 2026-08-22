<template>
  <Page :headline1="t('settings.title')" flush-header-with-cards :help-section="currentTab" @open-menu="$emit('openMenu')">
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
import { computed } from 'vue'
import { useI18n } from '~/composables/useI18n'
import SettingsGeneral from './General.vue'
import SettingsAssociation from './Association.vue'
import SettingsSpheres from './Spheres.vue'
import SettingsCostCentres from './CostCentres.vue'
import SettingsSubdivisions from './Subdivisions.vue'
import SettingsPositions from './Positions.vue'
import SettingsPermissions from './Permissions.vue'
import SettingsUsers from './Users.vue'
import SettingsApp from './App.vue'
import SettingsNotifications from './Notifications.vue'
import { useAuth } from '~/composables/useAuth'
import { usePage } from '~/composables/usePage'

defineEmits<{
  (e: 'openMenu'): void
}>()

type SettingsTab = 'general' | 'association' | 'spheres' | 'costCentres' | 'subdivisions' | 'positions' | 'users' | 'permissions' | 'app' | 'notifications'

const currentTab = useState<SettingsTab>('settings-overview-current-tab', () => 'general')
const { t } = useI18n()
const { hasPermission } = useAuth()
const { pageMeta, setPage } = usePage()

const tabs = computed(() => {
  const list = [
    { key: 'general', label: t('settings.tabs.general'), show: true },
    { key: 'association', label: t('settings.tabs.association'), show: hasPermission('settings.association.manage') },
    { key: 'spheres', label: t('settings.tabs.spheres'), show: hasPermission('settings.spheres.manage') },
    { key: 'costCentres', label: t('settings.tabs.costCentres'), show: hasPermission('settings.cost_centres.manage') },
    { key: 'subdivisions', label: t('settings.tabs.subdivisions'), show: hasPermission('settings.subdivisions.manage') },
    { key: 'positions', label: t('settings.tabs.positions'), show: hasPermission('settings.positions.manage') },
    { key: 'users', label: t('settings.tabs.users'), show: hasPermission('users.manage') },
    { key: 'permissions', label: t('settings.tabs.permissions'), show: hasPermission(['permissions.manage', 'settings.viewAs']) },
    { key: 'app', label: t('settings.tabs.app'), show: hasPermission('settings.app.access') },
    { key: 'notifications', label: t('settings.tabs.notifications'), show: hasPermission('settings.notifications.manage') },
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
    case 'app':
      return SettingsApp
    case 'notifications':
      return SettingsNotifications
    default:
      return SettingsGeneral
  }
})

watch([tabs, () => pageMeta.value?.tab, () => pageMeta.value?.resetTabKey], ([available, requestedTab, resetTabKey]) => {
  const requested = requestedTab as SettingsTab | undefined
  if (requested && available.find(tab => tab.key === requested)) {
    currentTab.value = requested
    return
  }

  if (resetTabKey && available[0]?.key) {
    currentTab.value = available[0].key
    return
  }

  if (!available.find(tab => tab.key === currentTab.value)) {
    currentTab.value = 'general'
  }
}, { immediate: true })

watch(currentTab, (tab) => {
  if (pageMeta.value?.tab === tab) return
  setPage('Settings', { tab })
}, { immediate: true })
</script>
