<template>
  <Page :headline1="t('wiki.title')" @open-menu="$emit('openMenu')">
    <template #header>
      <div class="flex flex-1 flex-wrap justify-end gap-2">
        <button type="button" class="btn-secondary" @click="openGlossary">
          {{ t('wiki.glossary.title') }}
        </button>
        <button v-if="canManage" type="button" class="btn-secondary" @click="setPage('WikiAdmin')">
          {{ t('wiki.admin.title') }}
        </button>
        <button v-if="canEdit" type="button" class="btn-primary" @click="createArticle">
          {{ t('wiki.home.newArticle') }}
        </button>
      </div>
    </template>

    <template #cards>
      <div class="-mx-6 space-y-3 bg-white p-4 shadow-sm col-span-12 sm:mx-0 sm:rounded-xl sm:p-6 sm:shadow-lg">
        <p class="text-sm text-slate-600">{{ t('wiki.subtitle') }}</p>
        <PageWikiSearchPanel :spaces="spaces" @open="openArticle" />
        <p class="text-xs text-slate-400">{{ t('wiki.contentLanguageHint') }}</p>
      </div>

      <div
        v-if="staleCount > 0"
        class="col-span-12 space-y-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span>{{ t('wiki.home.staleBanner', { count: staleCount }) }}</span>
          <button type="button" class="cursor-pointer font-medium hover:underline" @click="staleOpen = !staleOpen">
            {{ staleOpen ? t('wiki.home.staleHide') : t('wiki.home.staleShow') }}
          </button>
        </div>
        <PageWikiStaleList v-if="staleOpen" return-page="Wiki" />
      </div>

      <div
        v-if="visiblePaths.length"
        class="-mx-6 space-y-4 bg-white p-4 shadow-sm col-span-12 sm:mx-0 sm:rounded-xl sm:p-6 sm:shadow-lg"
      >
        <div>
          <h2 class="text-base font-semibold sm:text-lg">
            {{ recommendedPaths.length ? t('wiki.path.recommended') : t('wiki.path.more') }}
          </h2>
          <p class="text-sm text-slate-600">{{ t('wiki.path.recommendedHint') }}</p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <button
            v-for="path in recommendedPaths.length ? recommendedPaths : otherPaths"
            :key="path.id"
            type="button"
            class="cursor-pointer rounded-lg border border-slate-200 p-4 text-left transition hover:bg-slate-50"
            @click="openPath(path.id)"
          >
            <span class="flex items-center gap-2">
              <Icon :name="path.icon" class="shrink-0 text-lg text-slate-500" aria-hidden="true" />
              <span class="min-w-0 flex-1 truncate font-semibold text-slate-900">{{ path.title }}</span>
              <span v-if="!path.isPublished" class="shrink-0 text-xs text-amber-700">{{ t('wiki.admin.paths.draft') }}</span>
            </span>
            <span v-if="path.description" class="mt-1 block text-sm text-slate-600">{{ path.description }}</span>

            <span class="mt-3 block text-xs text-slate-500">
              {{ t('wiki.path.progress', { done: path.doneCount, total: path.totalCount }) }}
            </span>
            <span class="mt-1 block h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <span
                class="block h-full rounded-full bg-orange-500"
                :style="{ width: `${percent(path)}%` }"
              ></span>
            </span>
          </button>
        </div>

        <details v-if="recommendedPaths.length && otherPaths.length" class="text-sm">
          <summary class="cursor-pointer text-slate-600">{{ t('wiki.path.more') }}</summary>
          <ul class="mt-2 space-y-1">
            <li v-for="path in otherPaths" :key="path.id">
              <button type="button" class="cursor-pointer text-left text-orange-700 hover:underline" @click="openPath(path.id)">
                {{ path.title }}
              </button>
            </li>
          </ul>
        </details>
      </div>

      <div class="col-span-12 xl:col-span-8">
        <div class="-mx-6 space-y-4 bg-white p-4 shadow-sm sm:mx-0 sm:rounded-xl sm:p-6 sm:shadow-lg">
          <h2 class="text-base font-semibold sm:text-lg">{{ t('wiki.home.spaces') }}</h2>

          <p v-if="loading" class="text-sm text-slate-500">{{ t('wiki.loading') }}</p>
          <p v-else-if="!spaces.length" class="text-sm text-slate-500">{{ t('wiki.home.noSpaces') }}</p>

          <div v-else class="grid gap-3 sm:grid-cols-2">
            <section
              v-for="space in spaces"
              :key="space.id"
              class="rounded-lg border border-slate-200 p-4"
            >
              <div class="flex items-center gap-2">
                <Icon :name="space.icon" class="h-5 w-5 text-slate-500" aria-hidden="true" />
                <h3 class="min-w-0 flex-1 font-semibold text-slate-900">{{ space.title }}</h3>
                <a
                  :href="`/api/wiki/spaces/${space.id}/export-pdf`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="shrink-0 text-xs text-slate-500 hover:text-slate-800 hover:underline"
                  :title="t('wiki.home.exportSpacePdf')"
                >{{ t('wiki.exportPdf') }}</a>
              </div>
              <p v-if="space.description" class="mt-1 text-sm text-slate-600">{{ space.description }}</p>

              <ul v-if="space.articles.length" class="mt-3 space-y-1 text-sm">
                <li v-for="article in space.articles.slice(0, 5)" :key="article.id">
                  <button
                    type="button"
                    class="cursor-pointer text-left text-orange-700 hover:underline"
                    @click="openArticle(article.id)"
                  >
                    {{ article.title }}
                  </button>
                </li>
              </ul>
              <p v-else class="mt-3 text-sm text-slate-400">{{ t('wiki.home.empty') }}</p>
            </section>
          </div>
        </div>
      </div>

      <div class="col-span-12 space-y-5 xl:col-span-4">
        <section class="-mx-6 bg-white p-4 shadow-sm sm:mx-0 sm:rounded-xl sm:p-6 sm:shadow-lg">
          <h2 class="section-title">{{ t('wiki.home.recentlyUpdated') }}</h2>
          <ul v-if="recentlyUpdated.length" class="space-y-2 text-sm">
            <li v-for="entry in recentlyUpdated" :key="entry.id">
              <button type="button" class="cursor-pointer text-left" @click="openArticle(entry.id)">
                <span class="block font-medium text-slate-800 hover:underline">{{ entry.title }}</span>
                <span class="block text-xs text-slate-500">{{ entry.spaceTitle }} · {{ formatDate(entry.changedAt) }}</span>
              </button>
            </li>
          </ul>
          <p v-else class="text-sm text-slate-400">{{ t('wiki.home.empty') }}</p>
        </section>

        <section v-if="recentlyRead.length" class="-mx-6 bg-white p-4 shadow-sm sm:mx-0 sm:rounded-xl sm:p-6 sm:shadow-lg">
          <h2 class="section-title">{{ t('wiki.home.recentlyRead') }}</h2>
          <ul class="space-y-2 text-sm">
            <li v-for="entry in recentlyRead" :key="entry.id">
              <button type="button" class="cursor-pointer text-left" @click="openArticle(entry.id)">
                <span class="block font-medium text-slate-800 hover:underline">{{ entry.title }}</span>
                <span class="block text-xs text-slate-500">{{ entry.spaceTitle }}</span>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </Page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import { useAuth } from '~/composables/useAuth'
import { usePage } from '~/composables/usePage'
import { buildReturnTarget } from '~/composables/useReturnTarget'
import type { WikiHomeArticle, WikiHomeResponse } from '~/server/api/wiki/home.get'
import type { WikiPathView, WikiTreeSpace } from '~/types/wiki'

defineEmits<{
  (e: 'openMenu'): void
}>()

const { t } = useI18n()
const { hasPermission } = useAuth()
const { formatDate } = useLocaleFormatters()
const { setPage } = usePage()

const spaces = ref<WikiTreeSpace[]>([])
const recentlyUpdated = ref<WikiHomeArticle[]>([])
const recentlyRead = ref<WikiHomeArticle[]>([])
const paths = ref<WikiPathView[]>([])
const staleCount = ref(0)
const staleOpen = ref(false)
const loading = ref(true)
const canEdit = ref(false)
const canManage = computed(() => hasPermission('wiki.manage'))

const recommendedPaths = computed(() => paths.value.filter(path => path.recommended))
const otherPaths = computed(() => paths.value.filter(path => !path.recommended))
const visiblePaths = computed(() => paths.value)

function percent(path: WikiPathView) {
  return path.totalCount ? Math.round((path.doneCount / path.totalCount) * 100) : 0
}

function openPath(pathId: number) {
  setPage('WikiPath', { pathId })
}

function openArticle(articleId: number) {
  setPage('WikiArticle', { articleId })
}

function openGlossary() {
  setPage('WikiGlossary', { returnTarget: buildReturnTarget('Wiki') })
}

function createArticle() {
  setPage('WikiArticleEdit', { returnTarget: buildReturnTarget('Wiki') })
}

async function load() {
  loading.value = true
  try {
    const res = await $fetch<WikiHomeResponse>('/api/wiki/home')
    if (!res.ok) return
    spaces.value = res.spaces
    paths.value = res.paths
    recentlyUpdated.value = res.recentlyUpdated
    recentlyRead.value = res.recentlyRead
    staleCount.value = res.staleCount
    canEdit.value = res.canEditSomewhere
  } finally {
    loading.value = false
  }
}

load()
</script>
