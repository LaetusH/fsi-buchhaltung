<template>
  <ul v-if="data.events.length" class="space-y-2">
    <li v-for="entry in data.events" :key="entry.id" class="rounded-lg bg-white px-3 py-2 shadow-sm">
      <p class="text-sm font-medium text-slate-900">{{ entry.name }}</p>
      <p class="text-xs text-slate-500">
        {{ formatDateTime(entry.startsAt) }}
        <template v-if="entry.location"> · {{ entry.location }}</template>
      </p>
    </li>
  </ul>
  <p v-else class="text-sm text-slate-500">{{ t('wiki.embeds.empty') }}</p>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import type { WikiEmbedNextEventsData } from '~/types/wiki'

defineProps<{ data: WikiEmbedNextEventsData }>()

const { t } = useI18n()
const { formatDateTime } = useLocaleFormatters()
</script>
