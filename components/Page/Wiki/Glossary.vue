<template>
  <Page :headline1="t('wiki.glossary.title')" @open-menu="$emit('openMenu')">
    <template #header>
      <div class="flex flex-1 flex-wrap items-center justify-end gap-2">
        <button type="button" class="btn-secondary" @click="goToReturnTarget()">
          {{ t('wiki.article.backToWiki') }}
        </button>
        <button v-if="canManage" type="button" class="btn-primary" @click="setPage('WikiAdmin', { tab: 'glossary' })">
          {{ t('wiki.glossary.manage') }}
        </button>
      </div>
    </template>

    <template #cards>
      <div class="-mx-6 space-y-4 bg-white p-4 shadow-sm col-span-12 sm:mx-0 sm:rounded-xl sm:p-6 sm:shadow-lg">
        <p class="text-sm text-slate-600">{{ t('wiki.glossary.subtitle') }}</p>

        <div class="field max-w-md">
          <label for="wiki-glossary-search">{{ t('wiki.glossary.search') }}</label>
          <input id="wiki-glossary-search" v-model="search" class="input" type="search" :placeholder="t('wiki.glossary.searchPlaceholder')" />
        </div>

        <p v-if="loading" class="text-sm text-slate-500">{{ t('wiki.loading') }}</p>
        <p v-else-if="!terms.length" class="text-sm text-slate-500">{{ t('wiki.glossary.empty') }}</p>
        <p v-else-if="!filtered.length" class="text-sm text-slate-500">{{ t('wiki.search.empty') }}</p>

        <div v-else class="space-y-5">
          <section v-for="group in groups" :key="group.letter">
            <h2 class="section-title">{{ group.letter }}</h2>
            <dl class="divide-y divide-slate-100">
              <div v-for="term in group.terms" :key="term.id" class="py-3">
                <dt class="flex flex-wrap items-baseline gap-2">
                  <span class="font-semibold text-slate-900">{{ term.term }}</span>
                  <span v-if="term.aliases.length" class="text-xs text-slate-400">
                    {{ t('wiki.glossary.aliasesLabel') }}: {{ term.aliases.join(', ') }}
                  </span>
                </dt>
                <dd class="mt-1 text-sm text-slate-600">
                  {{ term.shortDefinition }}
                  <button
                    v-if="term.articleId"
                    type="button"
                    class="ml-1 cursor-pointer text-orange-700 hover:underline"
                    @click="openArticle(term.articleId)"
                  >{{ term.articleTitle || t('wiki.glossary.readMore') }}</button>
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </template>
  </Page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useI18n } from '~/composables/useI18n'
import { usePage } from '~/composables/usePage'
import { buildReturnTarget, useReturnTarget } from '~/composables/useReturnTarget'
import { useWikiGlossary } from '~/composables/useWikiGlossary'
import type { GlossaryTermView } from '~/server/utils/wiki/glossary'

defineEmits<{
  (e: 'openMenu'): void
}>()

const { t } = useI18n()
const { hasPermission } = useAuth()
const { setPage } = usePage()
const { goToReturnTarget } = useReturnTarget('Wiki')
const { loadGlossary } = useWikiGlossary()

const terms = ref<GlossaryTermView[]>([])
const loading = ref(true)
const search = ref('')

const canManage = computed(() => hasPermission('wiki.manage'))

const filtered = computed(() => {
  const needle = search.value.trim().toLowerCase()
  if (!needle) return terms.value
  return terms.value.filter(term => term.term.toLowerCase().includes(needle)
    || term.shortDefinition.toLowerCase().includes(needle)
    || term.aliases.some(alias => alias.toLowerCase().includes(needle)))
})

const groups = computed(() => {
  const byLetter = new Map<string, GlossaryTermView[]>()
  for (const term of filtered.value) {
    const letter = (term.term.trim()[0] ?? '#').toUpperCase()
    const list = byLetter.get(letter)
    if (list) list.push(term)
    else byLetter.set(letter, [term])
  }
  return [...byLetter.entries()]
    .map(([letter, list]) => ({ letter, terms: list }))
    .sort((a, b) => a.letter.localeCompare(b.letter, 'de'))
})

function openArticle(articleId: number) {
  setPage('WikiArticle', { articleId, returnTarget: buildReturnTarget('WikiGlossary') })
}

async function load() {
  loading.value = true
  try {
    terms.value = await loadGlossary()
  } finally {
    loading.value = false
  }
}

load()
</script>
