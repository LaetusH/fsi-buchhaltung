<template>
  <span ref="rootRef" class="relative inline-block">
    <button
      type="button"
      class="inline-flex cursor-help items-center gap-0.5 text-left font-medium text-teal-700 underline decoration-dotted decoration-2 underline-offset-2"
      :aria-expanded="open"
      @click.stop="toggle"
      @mouseenter="onHover(true)"
      @mouseleave="onHover(false)"
    ><Icon name="material-symbols:info-outline-rounded" class="size-3.5 shrink-0" aria-hidden="true" />{{ label }}</button>

    <span
      v-if="open"
      class="absolute left-0 top-full z-30 mt-1 block w-64 rounded-lg bg-slate-800 p-3 text-left text-xs font-normal text-white shadow-lg sm:w-72"
      @click.stop
      @mouseenter="onHover(true)"
      @mouseleave="onHover(false)"
    >
      <span class="block font-semibold">{{ term?.term || label }}</span>

      <span v-if="loading" class="mt-1 block text-slate-300">{{ t('wiki.glossary.loading') }}</span>
      <span v-else-if="!term" class="mt-1 block text-slate-300">{{ t('wiki.glossary.unknown', { term: label }) }}</span>
      <span v-else class="mt-1 block text-slate-200">{{ term.shortDefinition }}</span>

      <button
        v-if="term?.articleId"
        type="button"
        class="mt-2 block cursor-pointer text-orange-300 hover:underline"
        @click.stop="openArticle"
      >{{ t('wiki.glossary.readMore') }}</button>
    </span>
  </span>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { usePage } from '~/composables/usePage'
import { buildReturnTarget } from '~/composables/useReturnTarget'
import { useWikiGlossary } from '~/composables/useWikiGlossary'
import type { GlossaryTermView } from '~/server/utils/wiki/glossary'

const props = defineProps<{
  termKey: string
  label: string
  articleId?: number | null
  preview?: boolean
}>()

const { t } = useI18n()
const { setPage } = usePage()
const { lookupTerm } = useWikiGlossary()

const rootRef = ref<HTMLElement | null>(null)
const open = ref(false)
const loading = ref(false)
const term = ref<GlossaryTermView | null>(null)
let closeTimer: ReturnType<typeof setTimeout> | null = null

function clearCloseTimer() {
  if (closeTimer === null) return
  clearTimeout(closeTimer)
  closeTimer = null
}

async function ensureTerm() {
  if (term.value || loading.value) return
  loading.value = true
  try {
    term.value = await lookupTerm(props.termKey)
  } finally {
    loading.value = false
  }
}

function toggle() {
  clearCloseTimer()
  open.value = !open.value
  if (open.value) ensureTerm()
}

function onHover(entering: boolean) {
  if (typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches) return
  clearCloseTimer()
  if (entering) {
    open.value = true
    ensureTerm()
  } else {
    closeTimer = setTimeout(() => { open.value = false }, 300)
  }
}

function openArticle() {
  const targetId = term.value?.articleId
  if (!targetId || props.preview) return
  clearCloseTimer()
  open.value = false
  setPage('WikiArticle', {
    articleId: targetId,
    returnTarget: props.articleId ? buildReturnTarget('WikiArticle', { articleId: props.articleId }) : undefined,
  })
}

function onDocumentClick(event: MouseEvent) {
  if (!open.value) return
  if (rootRef.value?.contains(event.target as Node)) return
  clearCloseTimer()
  open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    clearCloseTimer()
    open.value = false
  }
}

watch(() => props.termKey, () => { term.value = null })

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  clearCloseTimer()
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>
