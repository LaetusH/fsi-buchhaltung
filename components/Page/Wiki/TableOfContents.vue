<template>
  <ul class="space-y-0.5 text-sm">
    <li
      v-for="heading in headings"
      :key="heading.id"
      :style="{ paddingLeft: `${(heading.level - 1) * 0.75}rem` }"
    >
      <button
        type="button"
        class="wiki-toc-link"
        :class="{ 'wiki-toc-link-active': heading.id === activeId }"
        :aria-current="heading.id === activeId ? 'true' : undefined"
        @click="scrollTo(heading.id)"
      >
        {{ heading.title }}
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { WikiHeading } from '~/server/utils/wiki/render'

const props = defineProps<{
  headings: WikiHeading[]
}>()

const activeId = ref('')

let observer: IntersectionObserver | null = null

function disconnect() {
  observer?.disconnect()
  observer = null
}

function observeHeadings() {
  disconnect()
  if (!import.meta.client || typeof IntersectionObserver === 'undefined') return

  const visible = new Set<string>()

  observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target.id)
        else visible.delete(entry.target.id)
      }

      const first = props.headings.find(heading => visible.has(heading.id))
      if (first) activeId.value = first.id
    },
    { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
  )

  for (const heading of props.headings) {
    const element = document.getElementById(heading.id)
    if (element) observer.observe(element)
  }
}

function scrollTo(id: string) {
  if (!import.meta.client) return
  activeId.value = id
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

watch(
  () => props.headings,
  async () => {
    activeId.value = props.headings[0]?.id ?? ''
    await nextTick()
    observeHeadings()
  },
  { immediate: true, deep: true },
)

onBeforeUnmount(disconnect)
</script>
