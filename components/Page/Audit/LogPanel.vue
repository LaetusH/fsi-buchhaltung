<template>
  <CommonPageTableCard
    :title="t('audit.title')"
    :search-value="search"
    :search-placeholder="t('audit.searchPlaceholder')"
    @update:search-value="search = $event"
  >
    <template #actions>
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex gap-1 rounded-lg bg-base-100 p-1">
          <button
            v-for="range in quickRanges"
            :key="range.key"
            type="button"
            class="rounded-md px-2.5 py-1 text-xs font-medium transition cursor-pointer"
            :class="quickRange === range.key ? 'bg-white text-base-900 shadow-sm' : 'text-base-500 hover:text-base-700'"
            @click="quickRange = range.key"
          >
            {{ range.label }}
          </button>
        </div>

        <select v-model="domainFilterValue" class="input w-auto text-sm">
          <option value="">{{ t('audit.filters.allDomains') }}</option>
          <option v-for="d in filterOptions?.domains" :key="d.key" :value="d.key">{{ t(`audit.domains.${d.key}`) }}</option>
        </select>

        <select v-model="tableFilterValue" class="input w-auto text-sm">
          <option value="">{{ t('audit.filters.allTables') }}</option>
          <optgroup v-for="d in filterOptions?.domains" :key="d.key" :label="t(`audit.domains.${d.key}`)">
            <option v-for="tbl in tablesForDomain(d.key)" :key="tbl.table" :value="tbl.table">{{ t(tbl.labelKey) }}</option>
          </optgroup>
        </select>

        <select v-model="operationFilterValue" class="input w-auto text-sm">
          <option value="">{{ t('audit.filters.allOperations') }}</option>
          <option value="insert">{{ t('audit.operations.insert') }}</option>
          <option value="update">{{ t('audit.operations.update') }}</option>
          <option value="delete">{{ t('audit.operations.delete') }}</option>
        </select>

        <select v-model="actorFilterValue" class="input w-auto text-sm">
          <option value="">{{ t('audit.filters.allActors') }}</option>
          <option v-for="a in filterOptions?.actors" :key="a.id ?? 'system'" :value="a.id ?? 'system'">
            {{ a.username || t('audit.systemActor') }}
          </option>
        </select>
      </div>
    </template>

    <div v-if="presetLabel" class="mb-3 flex items-center gap-2 text-xs text-base-600">
      <span class="inline-flex items-center gap-1.5 rounded-md bg-base-100 px-2 py-1 font-medium">
        {{ t('audit.filters.presetTables', { tables: presetLabel }) }}
        <button type="button" class="cursor-pointer text-base-400 hover:text-base-700" @click="clearPreset">
          <Icon name="material-symbols:close-rounded" class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </span>
    </div>

    <PageAuditTimeline
      :groups="groups"
      :loading="loading"
      :loading-more="loadingMore"
      :has-more="hasMore"
      :filtered="isFiltered"
      return-page="AuditLog"
      @load-more="loadMore"
      @reset-filters="resetFilters"
    />
  </CommonPageTableCard>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { usePage } from '~/composables/usePage'
import { useAuditLog } from '~/composables/useAuditLog'
import type { AuditFilterOptions } from '~/types/audit'
import type { GetAuditFiltersResponse } from '~/server/api/audit/filters.get'

const { t } = useI18n()
const { pageMeta } = usePage()
const {
  groups, loading, loadingMore, hasMore,
  search, quickRange, domainFilter, tableFilter, operationFilter, userFilter,
  load, loadMore,
} = useAuditLog()

const filterOptions = ref<AuditFilterOptions | null>(null)

const presetTables = ref<string[]>(Array.isArray(pageMeta.value?.tables) ? [...pageMeta.value.tables] : [])
if (presetTables.value.length) {
  tableFilter.value = [...presetTables.value]
  quickRange.value = 'all'
}

const presetLabel = computed(() => {
  if (!presetTables.value.length) return ''
  const options = filterOptions.value?.tables ?? []
  return presetTables.value
    .map(table => t(options.find(o => o.table === table)?.labelKey ?? '') || table)
    .join(', ')
})

function clearPreset() {
  presetTables.value = []
  tableFilter.value = []
}

const quickRanges = computed(() => [
  { key: 'today' as const, label: t('audit.quickRange.today') },
  { key: '7d' as const, label: t('audit.quickRange.7d') },
  { key: '30d' as const, label: t('audit.quickRange.30d') },
  { key: 'all' as const, label: t('audit.quickRange.all') },
])

function tablesForDomain(domain: string) {
  return (filterOptions.value?.tables ?? []).filter(t => t.domain === domain)
}

const domainFilterValue = computed({
  get: () => domainFilter.value[0] ?? '',
  set: (value: string) => { domainFilter.value = value ? [value] : [] },
})

const tableFilterValue = computed({
  get: () => tableFilter.value.length === 1 ? tableFilter.value[0]! : '',
  set: (value: string) => {
    presetTables.value = []
    tableFilter.value = value ? [value] : []
  },
})

const operationFilterValue = computed({
  get: () => operationFilter.value[0] ?? '',
  set: (value: string) => { operationFilter.value = value ? [value] : [] },
})

const actorFilterValue = computed({
  get: () => userFilter.value === undefined ? '' : String(userFilter.value),
  // The native <select> always round-trips through Vue's option-value matching, but the "system"
  // option's bound value is the literal string 'system' (not a number) — Number('system') is NaN,
  // which made the system filter silently no-op (buildAuditFilterClauses treats a falsy userId as
  // "no filter"). Keep it as the 'system' sentinel instead of coercing it to a number.
  set: (value: string | number) => {
    userFilter.value = value === '' ? undefined : value === 'system' ? 'system' : Number(value)
  },
})

const isFiltered = computed(() => Boolean(
  search.value.trim() || domainFilter.value.length || tableFilter.value.length
  || operationFilter.value.length || userFilter.value !== undefined || quickRange.value !== '30d',
))

function resetFilters() {
  search.value = ''
  domainFilter.value = []
  tableFilter.value = []
  operationFilter.value = []
  userFilter.value = undefined
  quickRange.value = '30d'
  presetTables.value = []
}

watch([search, quickRange, domainFilter, tableFilter, operationFilter, userFilter], () => load(), { deep: true })

onMounted(async () => {
  load()
  const res = await $fetch<GetAuditFiltersResponse>('/api/audit/filters')
  if (res.ok) filterOptions.value = res
})
</script>
