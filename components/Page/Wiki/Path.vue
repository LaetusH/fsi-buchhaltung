<template>
  <Page :headline1="path?.title ?? t('wiki.path.title')" @open-menu="$emit('openMenu')">
    <template #header>
      <div class="flex flex-1 flex-wrap justify-end gap-2">
        <button type="button" class="btn-secondary" @click="goToReturnTarget()">
          {{ t('wiki.article.backToWiki') }}
        </button>
        <button v-if="path?.nextItem" type="button" class="btn-primary" @click="openItem(path.nextItem)">
          {{ path.doneCount ? t('wiki.path.continue') : t('wiki.path.start') }}
        </button>
      </div>
    </template>

    <template #cards>
      <div class="-mx-6 space-y-5 bg-white p-4 shadow-sm col-span-12 sm:mx-0 sm:rounded-xl sm:p-6 sm:shadow-lg">
        <CommonValidationSummary
          v-if="error"
          :errors="[error]"
          :title="t('common.validationBlocked')"
        />

        <p v-if="loading" class="text-sm text-slate-500">{{ t('wiki.loading') }}</p>

        <template v-else-if="path">
          <div class="flex items-start gap-3">
            <Icon :name="path.icon" class="mt-0.5 shrink-0 text-2xl text-slate-500" aria-hidden="true" />
            <div class="min-w-0">
              <p v-if="path.description" class="text-sm text-slate-600">{{ path.description }}</p>
              <p v-if="!path.isPublished" class="mt-1 text-xs text-amber-700">{{ t('wiki.path.unpublished') }}</p>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium text-slate-700">
                {{ t('wiki.path.progress', { done: path.doneCount, total: path.totalCount }) }}
              </span>
              <span v-if="isComplete" class="text-emerald-700">{{ t('wiki.path.completed') }}</span>
            </div>
            <div class="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div class="h-full rounded-full bg-orange-500 transition-all" :style="{ width: `${progressPercent}%` }"></div>
            </div>
          </div>

          <p v-if="!path.items.length" class="text-sm text-slate-500">{{ t('wiki.path.empty') }}</p>

          <ol v-else class="space-y-2">
            <li
              v-for="(item, position) in path.items"
              :key="item.id"
              class="flex flex-wrap items-start gap-3 rounded-lg border p-3"
              :class="item.done ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'"
            >
              <input
                :id="`wiki-path-item-${item.id}`"
                type="checkbox"
                class="checkbox mt-1"
                :checked="item.done"
                @change="toggle(item, ($event.target as HTMLInputElement).checked)"
              />

              <label :for="`wiki-path-item-${item.id}`" class="min-w-0 flex-1 cursor-pointer">
                <span class="block text-xs text-slate-500">
                  {{ t('wiki.path.step', { number: position + 1 }) }} · {{ item.spaceTitle }}
                </span>
                <span class="block font-medium text-slate-900">{{ item.title }}</span>
                <span v-if="item.note" class="mt-0.5 block text-sm text-slate-600">{{ item.note }}</span>
                <span v-else-if="item.summary" class="mt-0.5 block text-sm text-slate-600">{{ item.summary }}</span>
                <span v-if="item.done && item.completedAt" class="mt-0.5 block text-xs text-emerald-700">
                  {{ t('wiki.path.doneAt', { date: formatDate(item.completedAt) }) }}
                </span>
              </label>

              <button type="button" class="btn-secondary shrink-0" @click="openItem(item)">
                {{ t('wiki.checklist.open') }}
              </button>
            </li>
          </ol>
        </template>
      </div>
    </template>
  </Page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import { usePage } from '~/composables/usePage'
import { buildReturnTarget, useReturnTarget } from '~/composables/useReturnTarget'
import { useToast } from '~/composables/useToast'
import type { WikiPathDetailResponse } from '~/server/api/wiki/paths/[id].get'
import type { WikiPathItemView, WikiPathView } from '~/types/wiki'

defineEmits<{
  (e: 'openMenu'): void
}>()

const { t } = useI18n()
const { formatDate } = useLocaleFormatters()
const { pageMeta, setPage } = usePage()
const { goToReturnTarget } = useReturnTarget('Wiki')
const toast = useToast()

const pathId = computed(() => (pageMeta.value?.pathId ? Number(pageMeta.value.pathId) : null))

const path = ref<WikiPathView | null>(null)
const loading = ref(true)
const error = ref('')

const isComplete = computed(() => !!path.value && path.value.totalCount > 0 && path.value.doneCount === path.value.totalCount)
const progressPercent = computed(() => {
  if (!path.value?.totalCount) return 0
  return Math.round((path.value.doneCount / path.value.totalCount) * 100)
})

function openItem(item: WikiPathItemView) {
  setPage('WikiArticle', {
    articleId: item.articleId,
    pathId: pathId.value,
    returnTarget: buildReturnTarget('WikiPath', { pathId: pathId.value }),
  })
}

async function toggle(item: WikiPathItemView, done: boolean) {
  if (pathId.value === null) return

  const res = await $fetch<{ ok: boolean, error?: string }>(`/api/wiki/paths/${pathId.value}/progress`, {
    method: 'POST',
    body: { itemId: item.id, done },
  })

  if (!res.ok) {
    toast.error(res.error ?? t('wiki.errors.saveFailed'))
    await load()
    return
  }

  await load()
  if (isComplete.value) toast.success(t('wiki.path.completedToast'))
}

async function load() {
  if (pathId.value === null) {
    error.value = t('wiki.path.notFound')
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<WikiPathDetailResponse>(`/api/wiki/paths/${pathId.value}`)
    if (!res.ok) {
      error.value = res.error
      path.value = null
      return
    }
    path.value = res.path
  } catch {
    error.value = t('wiki.errors.loadFailed')
  } finally {
    loading.value = false
  }
}

load()
</script>
