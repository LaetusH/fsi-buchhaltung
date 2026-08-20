<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-1">
      <button type="button" class="wiki-toolbar-btn" :title="t('wiki.editor.toolbar.bold')" @click="wrap('**', '**')">
        <Icon name="material-symbols:format-bold-rounded" class="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" class="wiki-toolbar-btn" :title="t('wiki.editor.toolbar.italic')" @click="wrap('*', '*')">
        <Icon name="material-symbols:format-italic-rounded" class="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" class="wiki-toolbar-btn" :title="t('wiki.editor.toolbar.heading')" @click="prefixLine('## ')">
        <Icon name="material-symbols:format-h2-rounded" class="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" class="wiki-toolbar-btn" :title="t('wiki.editor.toolbar.list')" @click="prefixLine('- ')">
        <Icon name="material-symbols:format-list-bulleted-rounded" class="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" class="wiki-toolbar-btn" :title="t('wiki.editor.toolbar.numberedList')" @click="prefixLine('1. ')">
        <Icon name="material-symbols:format-list-numbered-rounded" class="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" class="wiki-toolbar-btn" :title="t('wiki.editor.toolbar.link')" @click="wrap('[', '](https://)')">
        <Icon name="material-symbols:link-rounded" class="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" class="wiki-toolbar-btn" :title="t('wiki.editor.toolbar.code')" @click="wrap('`', '`')">
        <Icon name="material-symbols:code-rounded" class="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" class="wiki-toolbar-btn" :title="t('wiki.editor.toolbar.table')" @click="insertBlock(TABLE_SNIPPET)">
        <Icon name="material-symbols:table-rounded" class="h-4 w-4" aria-hidden="true" />
      </button>

      <span class="mx-1 h-5 w-px bg-slate-200" aria-hidden="true"></span>

      <button type="button" class="wiki-toolbar-btn" @click="insertBlock(':::hinweis\n\n:::')">{{ t('wiki.editor.toolbar.hint') }}</button>
      <button type="button" class="wiki-toolbar-btn" @click="insertBlock(':::warnung\n\n:::')">{{ t('wiki.editor.toolbar.warning') }}</button>
      <button type="button" class="wiki-toolbar-btn" @click="insertBlock(':::tipp\n\n:::')">{{ t('wiki.editor.toolbar.tip') }}</button>

      <span class="mx-1 h-5 w-px bg-slate-200" aria-hidden="true"></span>

      <MenuDropdown v-model="openInsertMenu" id="insert" wrapper-class="relative w-auto">
        <template #trigger="{ styling }">
          <button type="button" :class="[styling, 'w-auto cursor-pointer py-1 text-xs']">
            <span>{{ t('wiki.editor.toolbar.insert') }}</span>
            <Icon name="material-symbols:keyboard-arrow-down-rounded" class="text-lg" />
          </button>
        </template>

        <template #default="{ styling }">
          <div class="px-3 py-1 text-xs font-semibold text-slate-500">{{ t('wiki.editor.toolbar.insertTool') }}</div>
          <button
            v-for="page in toolPages"
            :key="`tool:${page}`"
            type="button"
            :class="styling"
            @click="chooseInsert(`tool:${page}`)"
          >
            {{ pageLabel(page) }}
          </button>
          <div class="px-3 py-1 text-xs font-semibold text-slate-500">{{ t('wiki.editor.toolbar.insertEmbed') }}</div>
          <button
            v-for="embed in embeds"
            :key="`embed:${embed.key}`"
            type="button"
            :class="styling"
            @click="chooseInsert(`embed:${embed.key}`)"
          >
            {{ t(embed.labelKey) }}
            <span v-if="embed.argsSchema" class="ml-1 text-xs text-slate-400">
              {{ Object.keys(embed.argsSchema).join(', ') }}
            </span>
          </button>
          <div class="px-3 py-1 text-xs font-semibold text-slate-500">{{ t('wiki.editor.toolbar.insertChecklist') }}</div>
          <p v-if="!checklists.length" class="px-3 py-1 text-xs text-slate-400">
            {{ t('wiki.editor.toolbar.noChecklists') }}
          </p>
          <button
            v-for="checklist in checklists"
            :key="`checklist:${checklist.keySlug}`"
            type="button"
            :class="styling"
            @click="chooseInsert(`checklist:${checklist.keySlug}`)"
          >
            {{ checklist.title }}
            <span class="ml-1 text-xs text-slate-400">{{ checklist.keySlug }}</span>
          </button>
        </template>
      </MenuDropdown>
    </div>

    <div class="flex gap-2 xl:hidden">
      <button
        type="button"
        :class="mobileView === 'editor' ? 'btn-primary' : 'btn-secondary'"
        @click="mobileView = 'editor'"
      >{{ t('wiki.editor.showEditor') }}</button>
      <button
        type="button"
        :class="mobileView === 'preview' ? 'btn-primary' : 'btn-secondary'"
        @click="mobileView = 'preview'"
      >{{ t('wiki.editor.showPreview') }}</button>
    </div>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div class="flex flex-col" :class="mobileView === 'preview' ? 'hidden xl:flex' : ''">
        <label class="section-title" :for="textareaId">{{ t('wiki.editor.markdown') }}</label>
        <textarea
          :id="textareaId"
          ref="textareaRef"
          :value="modelValue"
          class="input min-h-104 flex-1 font-mono text-xs leading-relaxed"
          spellcheck="false"
          @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
      </div>

      <div class="flex flex-col" :class="mobileView === 'editor' ? 'hidden xl:flex' : ''">
        <p class="section-title">{{ t('wiki.editor.preview') }}</p>
        <div class="min-h-104 flex-1 overflow-y-auto rounded-lg border border-slate-200 p-3">
          <CommonValidationSummary
            v-if="previewError"
            :errors="[previewError]"
            :title="t('common.validationBlocked')"
          />
          <PageWikiArticleBody v-else-if="previewHtml" :html="previewHtml" :checklists="checklists" preview />
          <p v-else class="text-sm text-slate-400">{{ t('wiki.editor.previewEmpty') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { PAGES } from '~/config/pages'
import { WIKI_EMBEDS } from '~/config/wikiEmbeds'
import { useAuth } from '~/composables/useAuth'
import type { PreviewResponse } from '~/server/api/wiki/preview.post'
import type { WikiChecklistView } from '~/types/wiki'

const props = withDefaults(defineProps<{
  modelValue: string
  checklists?: WikiChecklistView[]
}>(), {
  checklists: () => [],
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const { t } = useI18n()
const { hasPermission } = useAuth()

const TABLE_SNIPPET = '| Spalte | Spalte |\n| --- | --- |\n| Wert | Wert |'

const textareaId = useId()
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const mobileView = ref<'editor' | 'preview'>('editor')
const openInsertMenu = ref<string | null>(null)
const previewHtml = ref('')
const previewError = ref('')
const embeds = WIKI_EMBEDS
const checklists = computed(() => props.checklists)

const toolPages = Object.entries(PAGES)
  .filter(([, page]) => !page.permissions.length || hasPermission(page.permissions))
  .map(([name]) => name)
  .sort()

function pageLabel(name: string) {
  const page = PAGES[name]
  return page ? `${t(page.labelKey)} (${name})` : name
}

function replaceSelection(build: (selected: string) => { text: string, cursor?: number }) {
  const textarea = textareaRef.value
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = props.modelValue.slice(start, end)
  const { text, cursor } = build(selected)

  const next = props.modelValue.slice(0, start) + text + props.modelValue.slice(end)
  emit('update:modelValue', next)

  requestAnimationFrame(() => {
    textarea.focus()
    const position = start + (cursor ?? text.length)
    textarea.setSelectionRange(position, position)
  })
}

function wrap(before: string, after: string) {
  replaceSelection(selected => ({ text: `${before}${selected}${after}`, cursor: before.length + selected.length }))
}

function prefixLine(prefix: string) {
  replaceSelection(selected => ({ text: `${prefix}${selected}` }))
}

function insertBlock(snippet: string) {
  replaceSelection(selected => ({ text: `${selected ? `${selected}\n\n` : ''}${snippet}\n` }))
}

function chooseInsert(value: string) {
  openInsertMenu.value = null

  const [kind, key = ''] = value.split(':')
  if (kind === 'checklist') {
    insertBlock(`:::checklist{id="${key}"}`)
    return
  }
  if (kind === 'tool') {
    const page = PAGES[key]
    insertBlock(`:::tool{page="${key}" meta='{"returnTarget":"self"}' label="${page ? t(page.labelKey) : key}"}`)
    return
  }

  insertBlock(`:::embed{widget="${key}"}`)
}

let previewTimer: ReturnType<typeof setTimeout> | null = null

async function refreshPreview() {
  if (!props.modelValue.trim()) {
    previewHtml.value = ''
    previewError.value = ''
    return
  }

  const res = await $fetch<PreviewResponse>('/api/wiki/preview', {
    method: 'POST',
    body: { markdown: props.modelValue, knownChecklists: props.checklists.map(entry => entry.keySlug) },
  })

  if (res.ok) {
    previewHtml.value = res.html
    previewError.value = ''
  } else {
    previewError.value = res.error
  }
}

watch(
  () => [props.modelValue, props.checklists.map(entry => entry.keySlug).join(',')],
  () => {
    if (previewTimer) clearTimeout(previewTimer)
    previewTimer = setTimeout(refreshPreview, 400)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (previewTimer) clearTimeout(previewTimer)
})
</script>
