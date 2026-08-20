<template>
  <li>
    <div
      :class="[
        'flex items-center gap-1 rounded-md',
        canMove && 'cursor-grab active:cursor-grabbing',
        dropMode === 'child' && 'ring-2 ring-orange-300',
        dropMode === 'before' && 'border-t-2 border-orange-400',
        dropMode === 'after' && 'border-b-2 border-orange-400',
      ]"
      :title="canMove ? t('wiki.tree.dragHint') : undefined"
      :draggable="canMove"
      @dragstart="onDragStart"
      @dragover="onDragOver"
      @dragleave="dropMode = null"
      @drop="onDrop"
      @dragend="dropMode = null"
    >
      <button
        v-if="article.children.length"
        type="button"
        class="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
        :aria-label="expanded ? t('wiki.tree.collapse') : t('wiki.tree.expand')"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        <Icon
          :name="expanded ? 'material-symbols:expand-more-rounded' : 'material-symbols:chevron-right-rounded'"
          class="h-4 w-4"
          aria-hidden="true"
        />
      </button>
      <span v-else class="w-5 shrink-0" aria-hidden="true"></span>

      <button
        type="button"
        :class="[
          'min-w-0 flex-1 rounded-md px-2 py-2 text-left transition-colors cursor-pointer',
          isCurrent
            ? 'border-l-2 border-orange-500 bg-orange-50 font-semibold text-orange-700'
            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
        ]"
        :aria-current="isCurrent ? 'page' : undefined"
        @click="$emit('select', { id: article.id, slug: article.slug, spaceSlug })"
      >
        <span class="block truncate">{{ article.title }}</span>
        <span
          v-if="article.status !== 'published'"
          class="mt-0.5 inline-block rounded bg-slate-100 px-1 text-[0.65rem] font-medium uppercase tracking-wide text-slate-500"
        >
          {{ t(`wiki.status.${article.status}`) }}
        </span>
      </button>

      <span v-if="canMove" class="flex shrink-0 items-center">
        <Icon
          name="material-symbols:drag-indicator"
          class="h-4 w-4 text-slate-300"
          :aria-label="t('wiki.tree.dragHint')"
        />
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          :title="t('wiki.tree.moveUp')"
          :aria-label="t('wiki.tree.moveUp')"
          @click="$emit('nudge', { id: article.id, direction: -1 })"
        >
          <Icon name="material-symbols:keyboard-arrow-up-rounded" class="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          :title="t('wiki.tree.moveDown')"
          :aria-label="t('wiki.tree.moveDown')"
          @click="$emit('nudge', { id: article.id, direction: 1 })"
        >
          <Icon name="material-symbols:keyboard-arrow-down-rounded" class="h-4 w-4" aria-hidden="true" />
        </button>
      </span>
    </div>

    <ul v-if="expanded && article.children.length" class="ml-3 space-y-0.5 border-l border-slate-100 pl-1">
      <PageWikiTreeSidebarNode
        v-for="child in article.children"
        :key="child.id"
        :article="child"
        :space-slug="spaceSlug"
        :current-article-id="currentArticleId"
        :depth="depth + 1"
        :editable="editable"
        @select="$emit('select', $event)"
        @move="$emit('move', $event)"
        @nudge="$emit('nudge', $event)"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '~/composables/useI18n'
import type { WikiTreeArticle } from '~/types/wiki'

const props = defineProps<{
  article: WikiTreeArticle
  spaceSlug: string
  currentArticleId?: number | null
  depth: number
  editable?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', article: { id: number, slug: string, spaceSlug: string }): void
  (e: 'move', payload: { dragId: number, targetId: number, mode: 'before' | 'after' | 'child' }): void
  (e: 'nudge', payload: { id: number, direction: -1 | 1 }): void
}>()

const { t } = useI18n()

const isCurrent = computed(() => props.currentArticleId === props.article.id)
const canMove = computed(() => Boolean(props.editable) && props.article.accessLevel !== 'read')

const dropMode = ref<'before' | 'after' | 'child' | null>(null)

function containsCurrent(nodes: WikiTreeArticle[]): boolean {
  if (!props.currentArticleId) return false
  return nodes.some(node => node.id === props.currentArticleId || containsCurrent(node.children))
}

const expanded = ref(props.depth === 0 || containsCurrent(props.article.children))

watch(
  () => props.currentArticleId,
  () => {
    if (containsCurrent(props.article.children)) expanded.value = true
  },
)

function onDragStart(event: DragEvent) {
  if (!canMove.value) return
  event.dataTransfer?.setData('text/plain', String(props.article.id))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function resolveMode(event: DragEvent) {
  const target = event.currentTarget as HTMLElement
  const bounds = target.getBoundingClientRect()
  const offset = (event.clientY - bounds.top) / bounds.height
  if (offset < 0.25) return 'before' as const
  if (offset > 0.75) return 'after' as const
  return 'child' as const
}

function onDragOver(event: DragEvent) {
  if (!canMove.value) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  dropMode.value = resolveMode(event)
}

function onDrop(event: DragEvent) {
  if (!canMove.value) return
  event.preventDefault()
  event.stopPropagation()

  const mode = dropMode.value ?? resolveMode(event)
  dropMode.value = null

  const dragId = Number(event.dataTransfer?.getData('text/plain'))
  if (!Number.isInteger(dragId) || dragId <= 0 || dragId === props.article.id) return

  emit('move', { dragId, targetId: props.article.id, mode })
}
</script>
