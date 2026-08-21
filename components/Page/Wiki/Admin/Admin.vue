<template>
  <Page :headline1="t('wiki.admin.title')" flush-header-with-cards :help-section="activeTab" @open-menu="$emit('openMenu')">
    <template #header="{ headerContainerRef, headlineGroupRef }">
      <CommonTabOverview
        v-model="activeTab"
        :tabs="tabs"
        :header-container-ref="headerContainerRef"
        :headline-group-ref="headlineGroupRef"
      />
    </template>

    <template #cards>
      <PageWikiAdminSpaces v-if="activeTab === 'spaces'" />
      <PageWikiAdminPaths v-else-if="activeTab === 'paths'" />
      <PageWikiAdminGlossary v-else-if="activeTab === 'glossary'" />
      <PageWikiAdminTags v-else-if="activeTab === 'tags'" />

      <CommonCard
        v-else-if="activeTab === 'stale'"
        :title="t('wiki.admin.stale.title')"
        :description="t('wiki.admin.stale.hint')"
      >
        <PageWikiAdminStaleList return-page="WikiAdmin" :return-meta="{ tab: 'stale' }" />
      </CommonCard>

      <PageWikiAdminPageHelp v-else />
    </template>
  </Page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { usePage } from '~/composables/usePage'
import type { TabOverviewItem } from '~/composables/useTabOverviewLayout'

defineEmits<{
  (e: 'openMenu'): void
}>()

const { t } = useI18n()
const { pageMeta } = usePage()

const TABS = ['spaces', 'paths', 'glossary', 'tags', 'pageHelp', 'stale']

const activeTab = ref(TABS.includes(String(pageMeta.value?.tab)) ? String(pageMeta.value?.tab) : 'spaces')

const tabs = computed<TabOverviewItem[]>(() => [
  { key: 'spaces', label: t('wiki.admin.tabs.spaces') },
  { key: 'paths', label: t('wiki.admin.tabs.paths') },
  { key: 'glossary', label: t('wiki.admin.tabs.glossary') },
  { key: 'tags', label: t('wiki.admin.tabs.tags') },
  { key: 'pageHelp', label: t('wiki.admin.tabs.pageHelp') },
  { key: 'stale', label: t('wiki.admin.tabs.stale') },
])
</script>
