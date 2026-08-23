<template>
  <button
    v-if="canView"
    type="button"
    class="btn-secondary inline-flex items-center gap-1.5"
    aria-haspopup="dialog"
    :title="modalTitle"
    @click="open = true"
  >
    <Icon name="material-symbols:history-rounded" class="h-4 w-4" aria-hidden="true" />
    {{ label || t('audit.title') }}
  </button>

  <CommonModal v-if="canView" v-model="open" width-class="max-w-3xl">
    <template #title>
      <div>
        <h3 class="text-lg font-semibold text-base-900">{{ modalTitle }}</h3>
        <p class="mt-0.5 text-sm text-base-500">{{ t('audit.subtitle') }}</p>
      </div>
    </template>

    <PageAuditRecordHistory v-if="open" :table="props.table" :record-id="props.recordId" :include-children="props.includeChildren" />
  </CommonModal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { useAuth } from '~/composables/useAuth'
import PageAuditRecordHistory from './RecordHistory.vue'

const props = withDefaults(defineProps<{
  table: string
  recordId: number | string
  /** false to show only this record's own field changes, without auto-including parent-linked child tables. */
  includeChildren?: boolean
  /** Overrides the button caption. */
  label?: string
  /**
   * Section/record name appended to the modal heading. Set it whenever a page shows more than one
   * history button, so the open dialog says which part of the record it is showing.
   */
  context?: string
}>(), {
  includeChildren: true,
  label: undefined,
  context: undefined,
})

const { t } = useI18n()
const { hasPermission } = useAuth()
const open = ref(false)

const canView = hasPermission('audit.view')

const modalTitle = computed(() => (props.context ? `${t('audit.title')} – ${props.context}` : props.label || t('audit.title')))
</script>
