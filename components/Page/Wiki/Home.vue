<template>
  <Page :headline1="t('wiki.title')" @open-menu="$emit('openMenu')">
    <template #header>
      <div class="flex flex-1 flex-wrap justify-end gap-2">
        <button v-if="canManage" type="button" class="btn-secondary" @click="spaceModalOpen = true">
          {{ t('wiki.space.create') }}
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
        class="col-span-12 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800"
      >
        {{ t('wiki.home.staleBanner', { count: staleCount }) }}
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
                <h3 class="font-semibold text-slate-900">{{ space.title }}</h3>
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

  <PageWikiSpaceCreateModal v-model="spaceModalOpen" @created="load" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import { useAuth } from '~/composables/useAuth'
import { usePage } from '~/composables/usePage'
import { buildReturnTarget } from '~/composables/useReturnTarget'
import type { WikiHomeArticle, WikiHomeResponse } from '~/server/api/wiki/home.get'
import type { WikiTreeSpace } from '~/types/wiki'

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
const staleCount = ref(0)
const loading = ref(true)
const canEdit = ref(false)
const spaceModalOpen = ref(false)

const canManage = computed(() => hasPermission('wiki.manage'))

function openArticle(articleId: number) {
  setPage('WikiArticle', { articleId })
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
