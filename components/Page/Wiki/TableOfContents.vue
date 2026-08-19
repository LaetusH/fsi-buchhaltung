<template>
  <ul class="space-y-1 text-sm">
    <li
      v-for="heading in headings"
      :key="heading.id"
      :style="{ paddingLeft: `${(heading.level - 1) * 0.75}rem` }"
    >
      <button
        type="button"
        class="cursor-pointer text-left text-slate-600 hover:text-orange-700"
        @click="scrollTo(heading.id)"
      >
        {{ heading.title }}
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { WikiHeading } from '~/server/utils/wiki/render'

defineProps<{
  headings: WikiHeading[]
}>()

function scrollTo(id: string) {
  if (!import.meta.client) return
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>
