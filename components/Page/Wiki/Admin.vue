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

      <div v-else-if="activeTab === 'stale'" class="col-span-12">
        <div class="-mx-6 space-y-4 bg-white p-4 shadow-sm sm:mx-0 sm:rounded-xl sm:p-6 sm:shadow-lg">
          <div>
            <h2 class="section-title">{{ t('wiki.admin.stale.title') }}</h2>
            <p class="text-sm text-slate-600">{{ t('wiki.admin.stale.hint') }}</p>
          </div>
          <PageWikiStaleList return-page="WikiAdmin" :return-meta="{ tab: 'stale' }" />
        </div>
      </div>

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

const TABS = ['spaces', 'paths', 'glossary', 'pageHelp', 'stale']

const activeTab = ref(TABS.includes(String(pageMeta.value?.tab)) ? String(pageMeta.value?.tab) : 'spaces')

const tabs = computed<TabOverviewItem[]>(() => [
  { key: 'spaces', label: t('wiki.admin.tabs.spaces') },
  { key: 'paths', label: t('wiki.admin.tabs.paths') },
  { key: 'glossary', label: t('wiki.admin.tabs.glossary') },
  { key: 'pageHelp', label: t('wiki.admin.tabs.pageHelp') },
  { key: 'stale', label: t('wiki.admin.tabs.stale') },
])
</script>
