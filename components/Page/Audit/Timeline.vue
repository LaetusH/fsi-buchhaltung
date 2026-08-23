<template>
  <div class="space-y-6">
    <div v-if="loading && !groups.length" class="flex items-center justify-center p-10 text-base-400">
      <Icon name="material-symbols:progress-activity" class="animate-spin text-2xl" aria-hidden="true" />
    </div>

    <div v-else-if="!groups.length" class="flex flex-col items-center gap-2 py-12 text-center">
      <Icon name="material-symbols:history-rounded" class="h-10 w-10 text-base-300" aria-hidden="true" />
      <p class="text-sm text-base-500">{{ filtered ? t('audit.emptyFiltered') : t('audit.empty') }}</p>
      <button v-if="filtered" type="button" class="text-sm font-medium text-secondary-700 hover:underline cursor-pointer" @click="$emit('resetFilters')">
        {{ t('audit.resetFilters') }}
      </button>
    </div>

    <div v-else v-for="day in days" :key="day.key" class="space-y-2">
      <h3 class="text-xs font-semibold text-base-500 uppercase tracking-wide">{{ day.label }}</h3>
      <div class="overflow-hidden rounded-xl border border-base-200">
        <div
          v-for="group in day.groups"
          :key="group.key"
          class="border-t border-base-100 first:border-t-0"
        >
          <button
            type="button"
            class="flex w-full items-center gap-3 p-3 text-left transition hover:bg-base-50 cursor-pointer sm:p-4"
            @click="toggle(group.key)"
          >
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" :class="toneClass(groupTone(group))">
              <Icon :name="toneIcon(groupTone(group))" class="h-4 w-4" aria-hidden="true" />
            </span>

            <span class="min-w-0 flex-1">
              <span class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span class="min-w-0 truncate text-sm font-medium text-base-900">
                  {{ actorLabel(group) }}
                  <span class="font-normal text-base-500">{{ groupSummary(group) }}</span>
                </span>
                <span class="shrink-0 text-xs text-base-400">{{ formatDateTime(group.changedAt) }}</span>
              </span>
            </span>

            <span v-if="group.entries.length > 1 || totalFieldCount(group) > 0" class="shrink-0 rounded-md bg-base-100 px-1.5 py-0.5 text-[11px] font-medium text-base-600">
              {{ group.entries.length > 1 ? group.entries.length : totalFieldCount(group) }}
            </span>

            <Icon
              name="material-symbols:chevron-right-rounded"
              class="h-5 w-5 shrink-0 text-base-400 transition-transform"
              :class="expanded.includes(group.key) ? 'rotate-90' : ''"
              aria-hidden="true"
            />
          </button>

          <div v-if="expanded.includes(group.key)" class="space-y-3 border-t border-base-100 bg-base-50/60 px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
            <div v-for="entry in group.entries" :key="entry.id" class="rounded-lg bg-white p-3 shadow-sm">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-sm font-medium text-base-800">
                  {{ t(entry.entityLabelKey) }}
                  <span v-if="entry.description">"{{ entry.description }}"</span>
                  <span class="ml-1 text-xs font-normal text-base-500">{{ t(`audit.operations.${entry.operation}`) }}</span>
                </p>
              </div>

              <div v-if="entry.operation === 'delete'" class="mt-2">
                <button
                  v-if="entry.deletedSnapshot && Object.keys(entry.deletedSnapshot).length"
                  type="button"
                  class="text-xs font-medium text-secondary-700 hover:underline cursor-pointer"
                  @click="toggleSnapshot(entry.id)"
                >
                  {{ t('audit.deletedSnapshotToggle') }}
                </button>
                <dl v-if="snapshotExpanded.includes(entry.id)" class="mt-2 space-y-1">
                  <div v-for="[column, value] in Object.entries(entry.deletedSnapshot || {})" :key="column" class="grid grid-cols-[minmax(0,10rem)_1fr] gap-2 text-xs">
                    <dt class="text-base-500">{{ fieldLabel(entry.table, column) }}</dt>
                    <dd class="break-words text-base-700">{{ displayValue(value) }}</dd>
                  </div>
                </dl>
              </div>

              <dl v-else-if="entry.fields.length" class="mt-2 space-y-1.5">
                <div v-for="field in entry.fields" :key="field.column" class="grid grid-cols-1 gap-x-2 gap-y-0.5 text-xs sm:grid-cols-[minmax(0,10rem)_1fr]">
                  <dt class="text-base-500">{{ field.labelKey ? t(field.labelKey) : field.fallbackLabel }}</dt>
                  <dd class="break-words text-base-700">
                    <span v-if="field.redacted" class="italic text-base-400">{{ t('audit.redacted') }}</span>
                    <template v-else>
                      <span v-if="field.before !== null" class="text-base-400 line-through decoration-base-300">{{ fieldDisplay(field, 'before') }}</span>
                      <Icon v-if="field.before !== null" name="material-symbols:arrow-right-alt-rounded" class="mx-1 inline h-3.5 w-3.5 text-base-300" aria-hidden="true" />
                      <span class="font-medium">{{ fieldDisplay(field, 'after') }}</span>
                    </template>
                  </dd>
                </div>
              </dl>

              <div class="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-base-100 pt-2">
                <span class="text-[11px] text-base-400">{{ t('audit.recordLabel', { table: entry.table, id: String(Object.values(entry.primaryKey)[0] ?? '') }) }}</span>
                <button
                  v-if="entry.openPage && !hideOpenPage"
                  type="button"
                  class="inline-flex items-center gap-0.5 text-[11px] font-medium text-secondary-700 hover:underline cursor-pointer"
                  @click="openRecord(entry)"
                >
                  {{ t('audit.showRecord') }}
                  <Icon name="material-symbols:open-in-new-rounded" class="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="hasMore" class="flex justify-center pt-2">
      <button type="button" class="btn-secondary" :disabled="loadingMore" @click="$emit('loadMore')">
        <Icon v-if="loadingMore" name="material-symbols:progress-activity" class="mr-1.5 inline h-4 w-4 animate-spin" aria-hidden="true" />
        {{ t('audit.loadMore') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import { usePage } from '~/composables/usePage'
import { useReturnTarget } from '~/composables/useReturnTarget'
import type { AuditEntry, AuditGroup } from '~/types/audit'

const props = withDefaults(defineProps<{
  groups: AuditGroup[]
  loading?: boolean
  loadingMore?: boolean
  hasMore?: boolean
  filtered?: boolean
  /** Page this timeline is shown on, used to build a return target for "open record" links. */
  returnPage?: string
  /**
   * Hides "open record" links entirely. Used inside a record's own history panel, where the link
   * would navigate to the very page it's already shown on (usually behind a modal).
   */
  hideOpenPage?: boolean
}>(), {
  loading: false,
  loadingMore: false,
  hasMore: false,
  filtered: false,
  returnPage: undefined,
  hideOpenPage: false,
})

defineEmits<{
  (e: 'loadMore'): void
  (e: 'resetFilters'): void
}>()

const { t } = useI18n()
const { formatDate, formatDateTime, formatCurrency } = useLocaleFormatters()
const { setPage } = usePage()
const { returnTarget } = useReturnTarget((props.returnPage as any) ?? 'AuditLog')

const expanded = ref<string[]>([])
const snapshotExpanded = ref<number[]>([])

function toggle(key: string) {
  expanded.value = expanded.value.includes(key) ? expanded.value.filter(k => k !== key) : [...expanded.value, key]
}

function toggleSnapshot(id: number) {
  snapshotExpanded.value = snapshotExpanded.value.includes(id) ? snapshotExpanded.value.filter(i => i !== id) : [...snapshotExpanded.value, id]
}

function totalFieldCount(group: AuditGroup) {
  return group.entries.reduce((sum, entry) => sum + entry.fields.length, 0)
}

function groupTone(group: AuditGroup): 'insert' | 'update' | 'delete' {
  const ops = new Set(group.entries.map(e => e.operation))
  if (ops.size === 1) return group.entries[0]!.operation
  return 'update'
}

function toneClass(tone: 'insert' | 'update' | 'delete') {
  if (tone === 'insert') return 'bg-secondary-100 text-secondary-700'
  if (tone === 'delete') return 'bg-danger-100 text-danger-700'
  return 'bg-cyan-100 text-cyan-700'
}

function toneIcon(tone: 'insert' | 'update' | 'delete') {
  if (tone === 'insert') return 'material-symbols:add-circle-rounded'
  if (tone === 'delete') return 'material-symbols:delete-rounded'
  return 'material-symbols:edit-rounded'
}

function actorLabel(group: AuditGroup) {
  return group.changedBy.displayName || group.changedBy.username || t('audit.systemActor')
}

function groupSummary(group: AuditGroup) {
  const first = group.entries[0]
  if (!first) return ''
  const entityLabel = t(first.entityLabelKey)
  const opLabel = t(`audit.operations.${groupTone(group)}`)
  const suffix = first.description ? ` "${first.description}"` : ''
  const more = group.entries.length > 1 ? ` (+${group.entries.length - 1})` : ''
  return `– ${entityLabel}${suffix} ${opLabel}${more}`
}

function fieldLabel(table: string, column: string) {
  const key = `audit.fields.${table}.${column}`
  const translated = t(key)
  if (translated !== key) return translated
  const common = t(`audit.fields.common.${column}`)
  if (common !== `audit.fields.common.${column}`) return common
  return column.replace(/_/g, ' ')
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? '✓' : '✗'
  return String(value)
}

function fieldDisplay(field: AuditEntry['fields'][number], which: 'before' | 'after') {
  const raw = which === 'before' ? field.before : field.after
  const label = which === 'before' ? field.beforeLabel : field.afterLabel
  if (raw === null || raw === undefined) return '—'
  if (field.kind === 'reference') {
    // Show both the human-readable name and the raw id where a name was actually resolved, so an
    // auditor can always cross-reference the exact database row even if the label looks ambiguous.
    if (label && label !== `#${raw}`) return `${label} (#${raw})`
    return label ?? `#${raw}`
  }
  if (field.kind === 'money') return formatCurrency(Number(raw))
  if (field.kind === 'date') return formatDate(String(raw))
  if (field.kind === 'datetime') return formatDateTime(String(raw))
  if (field.kind === 'bool') return raw ? '✓' : '✗'
  if (field.kind === 'json') return typeof raw === 'string' ? raw.slice(0, 200) : JSON.stringify(raw).slice(0, 200)
  const text = String(raw)
  return text.length > 160 ? `${text.slice(0, 160)}…` : text
}

function openRecord(entry: AuditEntry) {
  if (!entry.openPage) return
  setPage(entry.openPage.page as any, { ...entry.openPage.meta, returnTarget: returnTarget.value })
}

const days = computed(() => {
  const byDay = new Map<string, AuditGroup[]>()
  for (const group of props.groups) {
    const key = group.changedAt.slice(0, 10)
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key)!.push(group)
  }
  return Array.from(byDay.entries()).map(([key, groups]) => ({
    key,
    label: formatDate(key),
    groups,
  }))
})
</script>
