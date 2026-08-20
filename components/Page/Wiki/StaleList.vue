<template>
  <div class="space-y-3">
    <p v-if="loading" class="text-sm text-slate-500">{{ t('wiki.loading') }}</p>
    <p v-else-if="!articles.length" class="text-sm text-slate-500">{{ t('wiki.admin.stale.empty') }}</p>

    <ul v-else class="divide-y divide-slate-100">
      <li v-for="entry in articles" :key="entry.id" class="flex flex-wrap items-start gap-2 py-3">
        <div class="min-w-0 flex-1">
          <button type="button" class="cursor-pointer text-left font-medium text-slate-800 hover:underline" @click="open(entry.id)">
            {{ entry.title }}
          </button>
          <p class="text-xs text-slate-500">
            {{ entry.spaceTitle }}
            <span v-if="entry.ownerLabel"> · {{ entry.ownerLabel }}</span>
          </p>
        </div>

        <div class="shrink-0 text-right text-xs">
          <p class="font-medium text-amber-700">{{ t('wiki.admin.stale.dueSince', { date: formatDate(entry.dueAt) }) }}</p>
          <p class="text-slate-400">
            {{ entry.reviewedAt
              ? t('wiki.article.reviewedAt', { date: formatDate(entry.reviewedAt) })
              : t('wiki.admin.stale.neverReviewed') }}
          </p>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import { usePage } from '~/composables/usePage'
import { buildReturnTarget } from '~/composables/useReturnTarget'
import type { PageName } from '~/types/page'
import type { WikiStaleArticle, WikiStaleResponse } from '~/server/api/wiki/stale.get'

const props = defineProps<{
  returnPage?: PageName
  returnMeta?: Record<string, any>
}>()

const { t } = useI18n()
const { formatDate } = useLocaleFormatters()
const { setPage } = usePage()

const articles = ref<WikiStaleArticle[]>([])
const loading = ref(true)

function open(articleId: number) {
  setPage('WikiArticle', {
    articleId,
    returnTarget: buildReturnTarget(props.returnPage ?? 'Wiki', props.returnMeta),
  })
}

async function load() {
  loading.value = true
  try {
    const res = await $fetch<WikiStaleResponse>('/api/wiki/stale')
    articles.value = res.ok ? res.articles : []
  } finally {
    loading.value = false
  }
}

load()
</script>
