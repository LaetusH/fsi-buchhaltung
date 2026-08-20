<template>
  <p v-if="!data.memberLinked" class="text-sm text-slate-500">{{ t('wiki.embeds.noMemberLink') }}</p>

  <ul v-else-if="data.tasks.length" class="space-y-2">
    <li v-for="task in data.tasks" :key="task.id" class="rounded-lg bg-white px-3 py-2 shadow-sm">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <p class="text-sm font-medium text-slate-900">{{ task.title }}</p>
        <p v-if="task.deadline" class="text-xs text-slate-500">{{ formatDate(task.deadline) }}</p>
      </div>
      <p class="text-xs text-slate-500">
        {{ task.eventName }} · {{ t(task.status === 'in_progress' ? 'event.planning.taskStatus.inProgress' : 'event.planning.taskStatus.open') }}
        <template v-if="task.viaSubdivision"> · {{ task.viaSubdivision }}</template>
      </p>
    </li>
  </ul>

  <p v-else class="text-sm text-slate-500">{{ t('wiki.embeds.empty') }}</p>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import type { WikiEmbedMyOpenTasksData } from '~/types/wiki'

defineProps<{ data: WikiEmbedMyOpenTasksData }>()

const { t } = useI18n()
const { formatDate } = useLocaleFormatters()
</script>
