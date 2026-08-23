<template>
  <button
    v-if="canView"
    type="button"
    class="btn-secondary inline-flex items-center gap-1.5"
    @click="open"
  >
    <Icon name="material-symbols:history-rounded" class="h-4 w-4" aria-hidden="true" />
    {{ label || t('audit.title') }}
  </button>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { useAuth } from '~/composables/useAuth'
import { usePage } from '~/composables/usePage'
import { buildReturnTarget } from '~/composables/useReturnTarget'

const props = withDefaults(defineProps<{
  /** Table name(s) this list/overview is backed by, e.g. ['receipts'] or ['receipts', 'receipt_positions']. */
  tables: string[]
  label?: string
  /** Set for security-relevant tables (users, roles, permissions, ...) that require audit.viewAll. */
  restricted?: boolean
  /**
   * Extra page meta to restore on return (e.g. { tab: 'glossary' } for a tabbed admin page whose
   * active tab isn't tracked in the shared pageMeta). Falls back to the current pageMeta so
   * record/context info (like an open articleId) survives the round trip by default.
   */
  returnMeta?: Record<string, any>
}>(), {
  label: undefined,
  restricted: false,
  returnMeta: undefined,
})

const { t } = useI18n()
const { hasPermission } = useAuth()
const { currentPage, pageMeta, setPage } = usePage()

const canView = hasPermission('audit.view') && (!props.restricted || hasPermission('audit.viewAll'))

function open() {
  const meta = { ...(pageMeta.value ?? {}), ...(props.returnMeta ?? {}) }
  setPage('AuditLog', {
    tables: props.tables,
    returnTarget: buildReturnTarget(currentPage.value, Object.keys(meta).length ? meta : undefined),
  })
}
</script>
