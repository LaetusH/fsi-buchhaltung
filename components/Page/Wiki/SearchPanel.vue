<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-2">
      <input
        v-model="term"
        type="search"
        class="input sm:max-w-xs"
        :placeholder="t('wiki.search.placeholder')"
        @keyup.enter="run"
      />
      <MenuDropdown v-model="openDropdown" id="space" wrapper-class="relative w-full sm:max-w-xs">
        <template #trigger="{ styling }">
          <button type="button" :class="[styling, 'cursor-pointer']">
            <span class="truncate">{{ spaceLabel }}</span>
            <Icon name="material-symbols:keyboard-arrow-down-rounded" class="text-lg" />
          </button>
        </template>
        <template #default="{ styling }">
          <button type="button" :class="styling" @click="selectSpace(0)">{{ t('wiki.search.allSpaces') }}</button>
          <button
            v-for="space in spaces"
            :key="space.id"
            type="button"
            :class="styling"
            @click="selectSpace(space.id)"
          >
            {{ space.title }}
          </button>
        </template>
      </MenuDropdown>
      <button type="button" class="btn-primary h-9.5" @click="run">{{ t('wiki.search.submit') }}</button>
    </div>

    <p v-if="term.trim().length === 1" class="text-sm text-slate-500">{{ t('wiki.search.hint') }}</p>
    <p v-else-if="searching" class="text-sm text-slate-500">{{ t('wiki.loading') }}</p>
    <p v-else-if="searched && !hits.length" class="text-sm text-slate-500">{{ t('wiki.search.empty') }}</p>

    <ul v-if="hits.length" class="space-y-2">
      <li v-for="hit in hits" :key="hit.id">
        <button
          type="button"
          class="w-full cursor-pointer rounded-lg border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50"
          @click="$emit('open', hit.id)"
        >
          <span class="block text-xs text-slate-500">{{ hit.spaceTitle }}</span>
          <span class="block font-semibold text-slate-900">{{ hit.title }}</span>
          <span v-if="hit.snippet" class="mt-1 block text-sm text-slate-600">{{ hit.snippet }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '~/composables/useI18n'
import type { WikiSearchResponse } from '~/server/api/wiki/search.get'
import type { WikiSearchHit, WikiTreeSpace } from '~/types/wiki'

const props = defineProps<{
  spaces: WikiTreeSpace[]
}>()

defineEmits<{
  (e: 'open', articleId: number): void
}>()

const { t } = useI18n()

const term = ref('')
const spaceId = ref(0)
const hits = ref<WikiSearchHit[]>([])
const searching = ref(false)
const searched = ref(false)
const openDropdown = ref<string | null>(null)

const spaceLabel = computed(() => props.spaces.find(space => space.id === spaceId.value)?.title ?? t('wiki.search.allSpaces'))

function selectSpace(id: number) {
  spaceId.value = id
  openDropdown.value = null
}

let debounce: ReturnType<typeof setTimeout> | null = null

async function run() {
  if (term.value.trim().length < 2) {
    hits.value = []
    searched.value = false
    return
  }

  searching.value = true
  try {
    const res = await $fetch<WikiSearchResponse>('/api/wiki/search', {
      query: { q: term.value.trim(), spaceId: spaceId.value || undefined },
    })
    hits.value = res.ok ? res.hits : []
  } finally {
    searching.value = false
    searched.value = true
  }
}

watch([term, spaceId], () => {
  if (debounce) clearTimeout(debounce)
  debounce = setTimeout(run, 300)
})
</script>
