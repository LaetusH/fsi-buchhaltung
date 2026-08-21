<template>
  <div class="space-y-3">
    <p v-if="data.associationName" class="text-sm font-medium text-base-900">
      {{ data.associationName }}
      <a v-if="data.email" :href="`mailto:${data.email}`" class="ml-1 text-sm font-normal text-accent-700 hover:underline">{{ data.email }}</a>
    </p>

    <ul v-if="data.positions.length" class="space-y-2">
      <li v-for="position in data.positions" :key="position.id" class="rounded-lg bg-white px-3 py-2 shadow-sm">
        <p class="text-sm font-medium text-base-900">{{ position.name }}</p>
        <p class="text-xs text-base-500">
          {{ position.holders.length ? position.holders.join(', ') : t('wiki.embeds.associationContactVacant') }}
        </p>
      </li>
    </ul>

    <div v-if="data.members.length">
      <p class="text-xs uppercase tracking-wide text-base-400">{{ t('wiki.embeds.associationContactMembers') }}</p>
      <p class="text-sm text-base-800">{{ data.members.join(', ') }}</p>
    </div>

    <p v-if="!data.positions.length && !data.members.length" class="text-sm text-base-500">
      {{ t('wiki.embeds.empty') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import type { WikiEmbedAssociationContactData } from '~/types/wiki'

defineProps<{ data: WikiEmbedAssociationContactData }>()

const { t } = useI18n()
</script>
