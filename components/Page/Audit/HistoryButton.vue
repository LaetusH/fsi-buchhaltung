<template>
  <button
    v-if="canView"
    type="button"
    class="btn-secondary inline-flex items-center gap-1.5"
    @click="open = true"
  >
    <Icon name="material-symbols:history-rounded" class="h-4 w-4" aria-hidden="true" />
    {{ t('audit.title') }}
  </button>

  <CommonModal v-if="canView" v-model="open" :title="t('audit.title')" width-class="max-w-3xl">
    <PageAuditRecordHistory v-if="open" :table="props.table" :record-id="props.recordId" :include-children="props.includeChildren" />
  </CommonModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { useAuth } from '~/composables/useAuth'
import PageAuditRecordHistory from './RecordHistory.vue'

const props = withDefaults(defineProps<{
  table: string
  recordId: number | string
  /** false to show only this record's own field changes, without auto-including parent-linked child tables. */
  includeChildren?: boolean
}>(), {
  includeChildren: true,
})

const { t } = useI18n()
const { hasPermission } = useAuth()
const open = ref(false)

const canView = hasPermission('audit.view')
</script>
