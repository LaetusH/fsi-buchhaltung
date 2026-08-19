<template>
  <div
    ref="containerRef"
    class="wiki-article-body"
    v-html="html"
    @click="onClick"
  ></div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { usePage } from '~/composables/usePage'
import { buildReturnTarget } from '~/composables/useReturnTarget'
import type { WikiLinkResolution } from '~/server/utils/wiki/detail'

const props = defineProps<{
  html: string
  links?: WikiLinkResolution
  /** The article being read, so `returnTarget: "self"` on a tool link can come back here. */
  articleId?: number | null
}>()

const { t } = useI18n()
const { setPage } = usePage()

const containerRef = ref<HTMLElement | null>(null)

function hydrateArticleLinks(container: HTMLElement) {
  const anchors = container.querySelectorAll<HTMLAnchorElement>('a[data-wiki-article]')
  for (const anchor of anchors) {
    const path = anchor.getAttribute('data-wiki-article') ?? ''
    const target = props.links?.[path] ?? null
    const label = anchor.getAttribute('data-wiki-label') ?? ''

    if (!target) {
      anchor.classList.add('wiki-link-broken')
      anchor.textContent = `${label || path} (${t('wiki.article.brokenLink')})`
      anchor.removeAttribute('data-wiki-target')
      continue
    }

    anchor.classList.remove('wiki-link-broken')
    anchor.setAttribute('data-wiki-target', String(target.id))
    anchor.setAttribute('title', t('wiki.article.linkTitle'))
    if (!label) anchor.textContent = target.title
  }
}

function hydratePlaceholders(container: HTMLElement) {
  for (const node of container.querySelectorAll<HTMLElement>('[data-wiki-embed]')) {
    if (node.dataset.wikiHydrated) continue
    node.dataset.wikiHydrated = '1'
    node.className = 'wiki-placeholder'
    node.textContent = t('wiki.placeholders.embed', { key: node.getAttribute('data-wiki-embed') ?? '' })
  }

  for (const node of container.querySelectorAll<HTMLElement>('[data-wiki-checklist]')) {
    if (node.dataset.wikiHydrated) continue
    node.dataset.wikiHydrated = '1'
    node.className = 'wiki-placeholder'
    node.textContent = t('wiki.placeholders.checklist', { key: node.getAttribute('data-wiki-checklist') ?? '' })
  }

  for (const node of container.querySelectorAll<HTMLElement>('[data-wiki-tool]')) {
    if (node.dataset.wikiHydrated) continue
    node.dataset.wikiHydrated = '1'
    node.className = 'wiki-placeholder'
    const label = node.getAttribute('data-wiki-label')
    node.textContent = label || t('wiki.placeholders.tool', { page: node.getAttribute('data-wiki-tool') ?? '' })
  }
}

async function hydrate() {
  await nextTick()
  const container = containerRef.value
  if (!container) return
  hydrateArticleLinks(container)
  hydratePlaceholders(container)
}

function onClick(event: MouseEvent) {
  const anchor = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[data-wiki-article]')
  if (!anchor) return

  event.preventDefault()
  const targetId = anchor.getAttribute('data-wiki-target')
  if (!targetId) return

  setPage('WikiArticle', {
    articleId: Number(targetId),
    returnTarget: props.articleId ? buildReturnTarget('WikiArticle', { articleId: props.articleId }) : undefined,
  })
}

onMounted(hydrate)
watch(() => [props.html, props.links], hydrate, { deep: true })
</script>
