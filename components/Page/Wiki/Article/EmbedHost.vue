<template>
  <div class="my-4 rounded-xl border border-base-200 bg-base-50/70 p-4">
    <p class="flex items-center gap-2 text-sm font-semibold text-base-800">
      <Icon :name="icon" class="text-lg text-base-400" aria-hidden="true" />
      {{ title }}
    </p>

    <div class="mt-3">
      <p v-if="!definition" class="text-sm text-base-500">
        {{ t('wiki.embeds.unknown', { key: embedKey }) }}
      </p>
      <p v-else-if="loading" class="text-sm text-base-400">{{ t('wiki.embeds.loading') }}</p>
      <p v-else-if="!result || !result.visible" class="text-sm text-base-500">{{ t('wiki.embeds.hidden') }}</p>
      <p v-else-if="result.error || !result.data" class="text-sm text-base-500">
        {{ result.error || t('wiki.embeds.failed') }}
      </p>
      <component :is="component" v-else-if="component" :data="result.data" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { WIKI_EMBEDS_BY_KEY } from '~/config/wikiEmbeds'
import type { WikiEmbedResult } from '~/types/wiki'
import AssociationContact from './Embeds/AssociationContact.vue'
import BudgetStatus from './Embeds/BudgetStatus.vue'
import CashPosition from './Embeds/CashPosition.vue'
import MyOpenTasks from './Embeds/MyOpenTasks.vue'
import MyShifts from './Embeds/MyShifts.vue'
import NextEvents from './Embeds/NextEvents.vue'
import OpenReimbursements from './Embeds/OpenReimbursements.vue'
import PendingMemberChanges from './Embeds/PendingMemberChanges.vue'

const props = defineProps<{
  embedKey: string
  result?: WikiEmbedResult | null
  loading?: boolean
}>()

const { t } = useI18n()

// Every widget in `config/wikiEmbeds.ts` needs an entry here — the registry stays the source of truth.
const COMPONENTS: Record<string, Component> = {
  'open-reimbursements': OpenReimbursements,
  'budget-status': BudgetStatus,
  'cash-position': CashPosition,
  'next-events': NextEvents,
  'my-shifts': MyShifts,
  'my-open-tasks': MyOpenTasks,
  'association-contact': AssociationContact,
  'pending-member-changes': PendingMemberChanges,
}

const ICONS: Record<string, string> = {
  'open-reimbursements': 'material-symbols:receipt-long-rounded',
  'budget-status': 'material-symbols:donut-small-rounded',
  'cash-position': 'material-symbols:account-balance-rounded',
  'next-events': 'material-symbols:event-rounded',
  'my-shifts': 'material-symbols:schedule-rounded',
  'my-open-tasks': 'material-symbols:task-alt-rounded',
  'association-contact': 'material-symbols:contacts-rounded',
  'pending-member-changes': 'material-symbols:manage-accounts-rounded',
}

const definition = computed(() => WIKI_EMBEDS_BY_KEY[props.embedKey] ?? null)
const component = computed(() => COMPONENTS[props.embedKey] ?? null)
const icon = computed(() => ICONS[props.embedKey] ?? 'material-symbols:widgets-rounded')
const title = computed(() => (definition.value ? t(definition.value.labelKey) : props.embedKey))
</script>
