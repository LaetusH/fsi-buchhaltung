<template>
  <p v-if="!data.memberLinked" class="text-sm text-slate-500">{{ t('wiki.embeds.noMemberLink') }}</p>

  <ul v-else-if="data.shifts.length" class="space-y-2">
    <li v-for="shift in data.shifts" :key="shift.id" class="rounded-lg bg-white px-3 py-2 shadow-sm">
      <p class="text-sm font-medium text-slate-900">{{ shift.name }}</p>
      <p class="text-xs text-slate-500">
        {{ shift.eventName }} · {{ formatDateTime(shift.startsAt) }} – {{ formatDateTime(shift.endsAt) }}
      </p>
    </li>
  </ul>

  <p v-else class="text-sm text-slate-500">{{ t('wiki.embeds.empty') }}</p>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import type { WikiEmbedMyShiftsData } from '~/types/wiki'

defineProps<{ data: WikiEmbedMyShiftsData }>()

const { t } = useI18n()
const { formatDateTime } = useLocaleFormatters()
</script>
