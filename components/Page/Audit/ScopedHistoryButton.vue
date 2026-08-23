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
    <PageAuditScopedHistory v-if="open" :tables="props.tables" :parent-id="props.parentId" />
  </CommonModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { useAuth } from '~/composables/useAuth'
import PageAuditScopedHistory from './ScopedHistory.vue'

const props = defineProps<{
  tables: string[]
  parentId: number | string
}>()

const { t } = useI18n()
const { hasPermission } = useAuth()
const open = ref(false)

const canView = hasPermission('audit.view')
</script>
