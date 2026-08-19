<template>
  <PageHomeWidgetFrame
    :title="t('home.widgets.wiki.title')"
    icon="material-symbols:menu-book-rounded"
    :loading="loading"
    :is-empty="!articles.length"
    empty-icon="material-symbols:menu-book-outline-rounded"
    :empty-text="t('home.widgets.wiki.empty')"
  >
    <template #subtitle>
      <p class="mt-0.5 truncate text-xs text-slate-300">{{ t('home.widgets.wiki.subtitle') }}</p>
    </template>

    <template #action>
      <button
        type="button"
        class="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition cursor-pointer hover:bg-white/20 hover:text-white"
        @click="setPage('Wiki')"
      >
        {{ t('home.widgets.showAll') }}
        <Icon name="material-symbols:arrow-forward-rounded" class="text-sm" />
      </button>
    </template>

    <ul class="flex h-full flex-col gap-2">
      <li v-for="article in articles" :key="article.id">
        <button
          type="button"
          class="w-full cursor-pointer rounded-lg border border-slate-200 p-3 text-left transition hover:bg-slate-50"
          @click="openArticle(article.id)"
        >
          <span class="flex items-center justify-between gap-2">
            <span class="truncate text-xs text-slate-500">{{ article.spaceTitle }}</span>
            <span v-if="article.changedAt" class="shrink-0 text-xs text-slate-400">{{ formatDate(article.changedAt) }}</span>
          </span>
          <span class="mt-0.5 block truncate font-medium text-slate-900">{{ article.title }}</span>
          <span v-if="article.summary" class="mt-0.5 block truncate text-sm text-slate-600">{{ article.summary }}</span>
        </button>
      </li>
    </ul>
  </PageHomeWidgetFrame>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import type { WikiSpotlightResponse } from '~/server/api/wiki/spotlight.get'
import type { WikiHomeArticle } from '~/server/api/wiki/home.get'

const { t } = useI18n()
const { formatDate } = useLocaleFormatters()
const { setPage } = usePage()

const loading = ref(true)
const articles = ref<WikiHomeArticle[]>([])

function openArticle(articleId: number) {
  setPage('WikiArticle', { articleId })
}

async function load() {
  loading.value = true
  try {
    const res = await $fetch<WikiSpotlightResponse>('/api/wiki/spotlight')
    articles.value = res.ok ? res.recentlyPublished : []
  } finally {
    loading.value = false
  }
}

onMounted(load)
useAppRefresh().onRefresh(load)
</script>
