<template>
  <Page :headline1="article?.title || t('wiki.title')" @open-menu="$emit('openMenu')">
    <template #header>
      <div class="flex flex-1 flex-wrap items-center justify-end gap-2">
        <button type="button" class="btn-secondary xl:hidden" @click="treeOpen = true">
          {{ t('wiki.tree.open') }}
        </button>
        <button type="button" class="btn-secondary" @click="goBack">
          {{ hasExplicitReturn ? t('wiki.article.back') : t('wiki.article.backToWiki') }}
        </button>
        <button
          v-if="article && canEdit"
          type="button"
          class="btn-secondary"
          @click="createSubarticle"
        >
          {{ t('wiki.article.newSubarticle') }}
        </button>
        <button
          v-if="article && canEdit"
          type="button"
          class="btn-primary"
          @click="editArticle"
        >
          {{ t('wiki.article.edit') }}
        </button>
      </div>
    </template>

    <template #cards>
      <aside class="hidden xl:col-span-3 xl:block">
        <div class="rounded-xl bg-white p-4 shadow-lg">
          <h2 class="section-title">{{ t('wiki.tree.title') }}</h2>
          <PageWikiTreeSidebar
            :spaces="spaces"
            :current-article-id="article?.id ?? null"
            :editable="canEdit"
            @select="openArticle"
            @reorder="saveOrder"
          />
        </div>
      </aside>

      <div class="col-span-12 space-y-5 xl:col-span-9">
        <div v-if="loading" class="rounded-xl bg-white p-6 text-slate-500 shadow-lg">
          {{ t('wiki.loading') }}
        </div>

        <CommonValidationSummary v-else-if="error" :errors="[error]" :title="t('wiki.article.notFoundTitle')" />

        <template v-else-if="article">
          <div
            v-if="path && currentStep"
            class="-mx-6 space-y-3 bg-white p-4 shadow-sm sm:mx-0 sm:rounded-xl sm:p-6 sm:shadow-lg"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex min-w-0 items-center gap-2">
                <Icon :name="path.icon" class="shrink-0 text-lg text-slate-500" aria-hidden="true" />
                <button type="button" class="cursor-pointer truncate font-semibold text-slate-900 hover:underline" @click="openPath">
                  {{ path.title }}
                </button>
              </div>
              <span class="text-xs text-slate-500">
                {{ t('wiki.path.stepOf', { number: currentIndex + 1, total: path.items.length }) }}
              </span>
            </div>

            <div class="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div class="h-full rounded-full bg-orange-500 transition-all" :style="{ width: `${pathPercent}%` }"></div>
            </div>

            <p v-if="currentStep.note" class="text-sm text-slate-600">{{ currentStep.note }}</p>
          </div>

          <div class="-mx-6 space-y-4 bg-white p-4 shadow-sm sm:mx-0 sm:rounded-xl sm:p-6 sm:shadow-lg">
            <nav class="flex flex-wrap items-center gap-1 text-xs text-slate-500">
              <template v-for="(crumb, position) in article.breadcrumbs" :key="`${crumb.type}-${crumb.id}`">
                <span v-if="position > 0" aria-hidden="true">/</span>
                <button
                  v-if="crumb.type === 'article'"
                  type="button"
                  class="cursor-pointer hover:text-slate-800"
                  @click="openArticleById(crumb.id!)"
                >
                  {{ crumb.title }}
                </button>
                <span v-else>{{ crumb.title }}</span>
              </template>
            </nav>

            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <h2 class="text-xl font-bold text-slate-900">{{ article.title }}</h2>
                <p v-if="article.summary" class="mt-1 text-sm text-slate-600">{{ article.summary }}</p>
              </div>
              <CommonStatusBadge
                v-if="article.status !== 'published'"
                :label="t(`wiki.status.${article.status}`)"
                tone="slate"
              />
            </div>

            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span v-if="ownerLabel">{{ t('wiki.article.owner') }}: {{ ownerLabel }}</span>
              <span v-if="article.publishedAt">{{ t('wiki.article.updatedAt', { date: formatDate(article.publishedAt) }) }}</span>
              <span v-if="article.reviewedAt">{{ t('wiki.article.reviewedAt', { date: formatDate(article.reviewedAt) }) }}</span>
              <span v-for="tag in article.tags" :key="tag.id" class="rounded-md bg-slate-100 px-2 py-0.5">{{ tag.label }}</span>
            </div>

            <p v-if="article.isStale" class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {{ t('wiki.article.stale') }}
            </p>
            <p v-if="article.hasDraft && canEdit" class="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">
              {{ t('wiki.article.hasDraft') }}
            </p>
          </div>

          <div
            v-if="article.headings.length > 1"
            class="-mx-6 bg-white p-4 shadow-sm sm:mx-0 sm:rounded-xl sm:p-6 sm:shadow-lg xl:hidden"
          >
            <h3 class="section-title">{{ t('wiki.article.toc') }}</h3>
            <PageWikiTableOfContents :headings="article.headings" />
          </div>

          <div class="grid grid-cols-12 gap-5">
            <div class="col-span-12 xl:col-span-8">
              <div class="-mx-6 bg-white p-4 shadow-sm sm:mx-0 sm:rounded-xl sm:p-6 sm:shadow-lg">
                <p v-if="article.status !== 'published'" class="mb-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                  {{ t('wiki.article.notPublished') }}
                </p>

                <PageWikiArticleBody
                  v-if="article.contentHtml"
                  :html="article.contentHtml"
                  :links="article.links"
                  :article-id="article.id"
                  :checklists="article.checklists"
                />
                <p v-else class="text-sm text-slate-500">{{ t('wiki.article.emptyContent') }}</p>
              </div>
            </div>

            <div class="col-span-12 space-y-5 xl:col-span-4">
              <div
                v-if="article.headings.length > 1"
                class="hidden rounded-xl bg-white p-6 shadow-lg xl:block"
              >
                <h3 class="section-title">{{ t('wiki.article.toc') }}</h3>
                <PageWikiTableOfContents :headings="article.headings" />
              </div>

              <div v-if="article.children.length" class="-mx-6 bg-white p-4 shadow-sm sm:mx-0 sm:rounded-xl sm:p-6 sm:shadow-lg">
                <h3 class="section-title">{{ t('wiki.article.subarticles') }}</h3>
                <ul class="space-y-1 text-sm">
                  <li v-for="child in article.children" :key="child.id">
                    <button type="button" class="cursor-pointer text-left text-orange-700 hover:underline" @click="openArticleById(child.id)">
                      {{ child.title }}
                    </button>
                  </li>
                </ul>
              </div>

              <div v-if="article.attachments.length" class="-mx-6 bg-white p-4 shadow-sm sm:mx-0 sm:rounded-xl sm:p-6 sm:shadow-lg">
                <h3 class="section-title">{{ t('wiki.article.attachments') }}</h3>
                <ul class="space-y-1 text-sm">
                  <li v-for="attachment in article.attachments" :key="attachment.attachmentId">
                    <a
                      :href="`/api/files/${attachment.fileId}`"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-orange-700 hover:underline"
                    >{{ attachment.name }}</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div v-if="path && currentStep" class="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              class="btn-secondary min-w-0 max-w-[45%]"
              :disabled="savingStep"
              @click="goToStep(-1)"
            >
              <span class="block truncate">← {{ prevStep ? prevStep.title : t('wiki.path.prevStep') }}</span>
            </button>

            <button
              type="button"
              class="text-sm cursor-pointer"
              :class="currentStep.done ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'"
              :disabled="savingStep"
              @click="setStepDone(currentStep, !currentStep.done)"
            >
              <Icon
                :name="currentStep.done ? 'material-symbols:check-circle-rounded' : 'material-symbols:circle-outline'"
                class="mr-1 align-text-bottom text-base"
              />
              {{ currentStep.done ? t('wiki.path.stepDone') : t('wiki.path.markDone') }}
            </button>

            <button type="button" class="btn-primary" :disabled="savingStep" @click="goToStep(1)">
              {{ nextStep ? t('wiki.path.nextStep') : t('wiki.path.finish') }} →
            </button>
          </div>

          <div v-else-if="article.prev || article.next" class="flex flex-wrap justify-between gap-3">
            <button
              v-if="article.prev"
              type="button"
              class="btn-secondary"
              @click="openArticleById(article.prev.id)"
            >
              ← {{ article.prev.title }}
            </button>
            <span v-else></span>
            <button
              v-if="article.next"
              type="button"
              class="btn-secondary"
              @click="openArticleById(article.next.id)"
            >
              {{ article.next.title }} →
            </button>
          </div>
        </template>
      </div>
    </template>
  </Page>

  <CommonModal v-model="treeOpen" :title="t('wiki.tree.title')" width-class="max-w-lg">
    <PageWikiTreeSidebar :spaces="spaces" :current-article-id="article?.id ?? null" @select="openFromDrawer" />
  </CommonModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import { usePage } from '~/composables/usePage'
import { buildReturnTarget, useReturnTarget } from '~/composables/useReturnTarget'
import { useToast } from '~/composables/useToast'
import type { WikiReorderItem } from './TreeSidebar.vue'
import type { WikiArticleDetailPayload, WikiArticleDetailResult } from '~/server/utils/wiki/detail'
import type { WikiTreeResponse } from '~/server/api/wiki/tree.get'
import type { WikiPathDetailResponse } from '~/server/api/wiki/paths/[id].get'
import type { WikiPathItemView, WikiPathView, WikiTreeSpace } from '~/types/wiki'

defineEmits<{
  (e: 'openMenu'): void
}>()

const { t } = useI18n()
const { formatDate } = useLocaleFormatters()
const { pageMeta, setPage } = usePage()
const toast = useToast()
const { goToReturnTarget } = useReturnTarget('Wiki')

const hasExplicitReturn = computed(() => Boolean(pageMeta.value?.returnTarget))

const article = ref<WikiArticleDetailPayload | null>(null)
const spaces = ref<WikiTreeSpace[]>([])
const loading = ref(true)
const error = ref('')
const treeOpen = ref(false)

const pathId = computed(() => (pageMeta.value?.pathId ? Number(pageMeta.value.pathId) : null))
const path = ref<WikiPathView | null>(null)
const savingStep = ref(false)

const currentIndex = computed(() => {
  if (!path.value || !article.value) return -1
  return path.value.items.findIndex(item => item.articleId === article.value!.id)
})
const currentStep = computed(() => (currentIndex.value >= 0 ? path.value!.items[currentIndex.value] : null))
const prevStep = computed(() => (currentIndex.value > 0 ? path.value!.items[currentIndex.value - 1] : null))
const nextStep = computed(() => {
  if (!path.value || currentIndex.value < 0) return null
  return path.value.items[currentIndex.value + 1] ?? null
})
const pathPercent = computed(() => {
  if (!path.value?.totalCount) return 0
  return Math.round((path.value.doneCount / path.value.totalCount) * 100)
})

const canEdit = computed(() => article.value?.accessLevel === 'write' || article.value?.accessLevel === 'admin')

const ownerLabel = computed(() => {
  const owner = article.value?.owner
  if (!owner) return ''
  return [owner.position_name, owner.subdivision_name].filter(Boolean).join(' · ')
})

async function loadTree() {
  const res = await $fetch<WikiTreeResponse>('/api/wiki/tree', { query: { includeDrafts: '1' } })
  spaces.value = res.ok ? res.spaces : []
}

async function loadArticle() {
  loading.value = true
  error.value = ''

  const articleId = Number(pageMeta.value?.articleId ?? 0)
  const slug = String(pageMeta.value?.slug ?? '')

  try {
    const res = articleId
      ? await $fetch<WikiArticleDetailResult>(`/api/wiki/articles/${articleId}`)
      : slug
        ? await $fetch<WikiArticleDetailResult>('/api/wiki/articles/by-slug', { query: { slug } })
        : { ok: false as const, error: t('wiki.article.notFound') }

    if (!res.ok) {
      article.value = null
      error.value = res.error
      return
    }

    article.value = res.article
  } catch (err: any) {
    article.value = null
    error.value = String(err)
  } finally {
    loading.value = false
  }
}

function openArticleById(articleId: number) {
  treeOpen.value = false
  setPage('WikiArticle', { articleId })
}

function openArticle(target: { id: number, slug: string, spaceSlug: string }) {
  setPage('WikiArticle', { articleId: target.id, slug: `${target.spaceSlug}/${target.slug}` })
}

function openFromDrawer(target: { id: number, slug: string, spaceSlug: string }) {
  treeOpen.value = false
  openArticle(target)
}

function goBack() {
  goToReturnTarget()
}

async function loadPath() {
  if (pathId.value === null) {
    path.value = null
    return
  }

  const res = await $fetch<WikiPathDetailResponse>(`/api/wiki/paths/${pathId.value}`)
  path.value = res.ok ? res.path : null
}

async function setStepDone(step: WikiPathItemView, done: boolean) {
  if (pathId.value === null) return false

  savingStep.value = true
  try {
    const res = await $fetch<{ ok: boolean, error?: string }>(`/api/wiki/paths/${pathId.value}/progress`, {
      method: 'POST',
      body: { itemId: step.id, done },
    })

    if (!res.ok) {
      toast.error(res.error ?? t('wiki.errors.saveFailed'))
      return false
    }

    await loadPath()
    return true
  } finally {
    savingStep.value = false
  }
}

async function goToStep(direction: -1 | 1) {
  const step = currentStep.value
  if (!step || pathId.value === null) return

  if (direction === 1 && !step.done && !await setStepDone(step, true)) return

  const target = direction === 1 ? nextStep.value : prevStep.value

  if (!target) {
    if (direction === 1) {
      const complete = path.value && path.value.doneCount === path.value.totalCount
      if (complete) toast.success(t('wiki.path.completedToast'))
    }
    setPage('WikiPath', { pathId: pathId.value })
    return
  }

  setPage('WikiArticle', {
    articleId: target.articleId,
    pathId: pathId.value,
    returnTarget: buildReturnTarget('WikiPath', { pathId: pathId.value }),
  })
}

function openPath() {
  if (pathId.value !== null) setPage('WikiPath', { pathId: pathId.value })
}

async function saveOrder(items: WikiReorderItem[]) {
  const res = await $fetch<{ ok: boolean, error?: string }>('/api/wiki/articles/reorder', {
    method: 'POST',
    body: { items },
  })

  if (!res.ok) {
    toast.error(res.error ?? t('wiki.errors.saveFailed'))
    return
  }

  toast.success(t('wiki.tree.reorderedToast'))
  await loadTree()
}

function createSubarticle() {
  if (!article.value) return
  setPage('WikiArticleEdit', {
    spaceId: article.value.spaceId,
    parentId: article.value.id,
    returnTarget: buildReturnTarget('WikiArticle', { articleId: article.value.id }),
  })
}

function editArticle() {
  if (!article.value) return
  setPage('WikiArticleEdit', {
    articleId: article.value.id,
    returnTarget: buildReturnTarget('WikiArticle', { articleId: article.value.id }),
  })
}

watch(
  () => [pageMeta.value?.articleId, pageMeta.value?.slug],
  () => { loadArticle() },
  { immediate: true },
)

watch(pathId, () => { loadPath() }, { immediate: true })

loadTree()
</script>
