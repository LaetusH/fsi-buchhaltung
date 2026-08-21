<template>
  <div class="space-y-2">
    <p class="text-2xl font-semibold text-base-900">{{ data.count }}</p>
    <p class="text-sm text-base-600">{{ t('wiki.embeds.pendingMemberChangesSummary', { members: data.memberCount }) }}</p>

    <ul v-if="data.latest.length" class="space-y-1 text-xs text-base-500">
      <li v-for="(change, position) in data.latest" :key="`${change.memberName}-${change.fieldName}-${position}`">
        {{ change.memberName }} · {{ fieldLabel(change.fieldName) }} · {{ formatDateTime(change.requestedAt) }}
      </li>
    </ul>

    <p v-if="!data.count" class="text-sm text-base-500">{{ t('wiki.embeds.empty') }}</p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import { isSelfEditFieldName, type SelfEditFieldName } from '~/config/memberSelfEdit'
import type { WikiEmbedPendingMemberChangesData } from '~/types/wiki'

defineProps<{ data: WikiEmbedPendingMemberChangesData }>()

const { t } = useI18n()
const { formatDateTime } = useLocaleFormatters()

const fieldLabelKeys: Record<SelfEditFieldName, string> = {
  first_name: 'member.firstName',
  last_name: 'member.lastName',
  birthdate: 'member.birthdate',
  phone: 'member.phone',
  email: 'member.email',
  street: 'member.street',
  street_number: 'member.streetNumber',
  postal_code: 'member.postalCode',
  city: 'member.city',
  subject: 'member.subject',
}

function fieldLabel(field: string) {
  return isSelfEditFieldName(field) ? t(fieldLabelKeys[field]) : field
}
</script>
