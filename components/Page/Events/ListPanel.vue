<template>
  <PageEventsSpotlight @open="openEvent" />

  <CommonPageTableCard
    :title="t('event.stored')"
    :search-value="globalSearchInput"
    :search-placeholder="t('event.search')"
    :can-create="canEdit"
    :create-label="`+ ${t('event.new')}`"
    @update:search-value="globalSearchInput = $event"
    @create="createEvent"
  >
    <!-- Desktop table -->
    <div class="hidden overflow-x-auto xl:block">
      <table class="w-full min-w-5xl text-sm border-collapse">
        <thead>
          <tr class="text-left border-b">
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('event.name')"
                filter-type="text"
                :sort-direction="columnSortDirection('name')"
                :is-filter-active="isFilterActive('name')"
                :filter="getFilter('name')"
                :text-options="textOptionsByColumn.name"
                @toggle-sort="toggleSort('name')"
                @apply-text-filter="setTextFilter('name', $event)"
                @reset-filter="resetFilter('name')"
              />
            </th>
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('event.startsOn')"
                filter-type="date"
                :sort-direction="columnSortDirection('starts_at')"
                :is-filter-active="isFilterActive('starts_at')"
                :filter="getFilter('starts_at')"
                @toggle-sort="toggleSort('starts_at')"
                @apply-range-filter="setRangeFilter('starts_at', $event.min, $event.max)"
                @reset-filter="resetFilter('starts_at')"
              />
            </th>
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('event.endsOn')"
                filter-type="date"
                :sort-direction="columnSortDirection('ends_at')"
                :is-filter-active="isFilterActive('ends_at')"
                :filter="getFilter('ends_at')"
                @toggle-sort="toggleSort('ends_at')"
                @apply-range-filter="setRangeFilter('ends_at', $event.min, $event.max)"
                @reset-filter="resetFilter('ends_at')"
              />
            </th>
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('event.location')"
                filter-type="text"
                :sort-direction="columnSortDirection('location')"
                :is-filter-active="isFilterActive('location')"
                :filter="getFilter('location')"
                :text-options="textOptionsByColumn.location"
                @toggle-sort="toggleSort('location')"
                @apply-text-filter="setTextFilter('location', $event)"
                @reset-filter="resetFilter('location')"
              />
            </th>
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('event.expectedGuests')"
                filter-type="number"
                :sort-direction="columnSortDirection('expected_guests')"
                :is-filter-active="isFilterActive('expected_guests')"
                :filter="getFilter('expected_guests')"
                @toggle-sort="toggleSort('expected_guests')"
                @apply-range-filter="setRangeFilter('expected_guests', $event.min, $event.max)"
                @reset-filter="resetFilter('expected_guests')"
              />
            </th>
            <th class="py-2">{{ t('event.organizers') }}</th>
            <th class="py-2">{{ t('event.costCentres') }}</th>
            <th class="py-2 text-right">{{ t('common.actions') }}</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="entry in processedRows"
            :key="entry.id"
            class="border-b last:border-b-0 transition"
          >
            <td class="py-2 font-medium">{{ entry.name }}</td>
            <td class="py-2">{{ formatLocalDateTime(entry.starts_at) }}</td>
            <td class="py-2">{{ formatLocalDateTime(entry.ends_at) }}</td>
            <td class="py-2">{{ entry.location }}</td>
            <td class="py-2">{{ entry.expected_guests }}</td>
            <td class="py-2">{{ organizerSummary(entry) }}</td>
            <td class="py-2">{{ costCentreSummary(entry) }}</td>
            <td class="py-2 text-right">
              <button
                class="text-blue-600 not-disabled:hover:underline disabled:opacity-40 disabled:cursor-not-allowed not-disabled:cursor-pointer"
                :disabled="!canOpenEvent(entry.id)"
                @click="openEvent(entry.id)"
              >
                {{ t('actions.open') }}
              </button>
            </td>
          </tr>

          <tr v-if="processedRows.length === 0">
            <td colspan="8" class="py-6 text-center text-slate-500">
              {{ t('event.none') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Compact card list (mobile + medium screens) -->
    <ul class="grid gap-3 sm:grid-cols-2 xl:hidden">
      <li
        v-for="entry in processedRows"
        :key="entry.id"
        class="rounded-xl border border-slate-200 p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate font-semibold text-slate-800">{{ entry.name }}</p>
            <p class="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              <Icon name="material-symbols:event-rounded" class="shrink-0 text-sm text-slate-400" />
              {{ formatLocalDateTime(entry.starts_at) }}
            </p>
          </div>
          <button
            class="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 transition not-disabled:cursor-pointer not-disabled:hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!canOpenEvent(entry.id)"
            @click="openEvent(entry.id)"
          >
            <Icon name="material-symbols:open-in-new-rounded" class="text-sm" />
            {{ t('actions.open') }}
          </button>
        </div>

        <dl class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
          <div class="col-span-2">
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">{{ t('event.endsOn') }}</dt>
            <dd class="text-slate-700">{{ formatLocalDateTime(entry.ends_at) }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">{{ t('event.location') }}</dt>
            <dd class="truncate text-slate-700">{{ entry.location || t('common.notAvailable') }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">{{ t('event.expectedGuests') }}</dt>
            <dd class="text-slate-700">{{ entry.expected_guests != null ? entry.expected_guests : t('common.notAvailable') }}</dd>
          </div>
          <div class="col-span-2">
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">{{ t('event.organizers') }}</dt>
            <dd class="text-slate-700">{{ organizerSummary(entry) }}</dd>
          </div>
          <div class="col-span-2">
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">{{ t('event.costCentres') }}</dt>
            <dd class="text-slate-700">{{ costCentreSummary(entry) }}</dd>
          </div>
        </dl>
      </li>

      <li v-if="processedRows.length === 0" class="py-6 text-center text-slate-500 sm:col-span-2">
        {{ t('event.none') }}
      </li>
    </ul>
  </CommonPageTableCard>
</template>

<script setup lang="ts">
import type { PageTarget } from '~/types/page'
import { useAdvancedTable } from '~/composables/useAdvancedTable'
import { useAuth } from '~/composables/useAuth'
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import { usePage } from '~/composables/usePage'
import { buildReturnTarget, cloneReturnTarget } from '~/composables/useReturnTarget'
import type { Event } from '~/types/event'
import type { EventPlanningTabKey } from './planning/types'

type EventColumnKey = 'name' | 'starts_at' | 'ends_at' | 'location' | 'expected_guests' | 'organizers' | 'cost_centres'

const props = defineProps<{
  returnTarget?: PageTarget | null
}>()

const { setPage } = usePage()
const { hasPermission } = useAuth()
const { t } = useI18n()
const { formatLocalDateTime } = useLocaleFormatters()

const canEdit = computed(() => hasPermission('events.edit'))
const resolvedReturnTarget = computed(() => cloneReturnTarget(props.returnTarget) ?? buildReturnTarget('Events'))

const events = ref<Event[]>([])
const canOpenAll = ref(true)
const organizerEventIds = ref(new Set<number>())

function canOpenEvent(eventId: number) {
  return canOpenAll.value || organizerEventIds.value.has(eventId)
}

const {
  sortKey,
  sortDirection,
  textOptionsByColumn,
  globalSearchInput,
  processedRows,
  getFilter,
  isFilterActive,
  toggleSort,
  setTextFilter,
  setRangeFilter,
  resetFilter,
} = useAdvancedTable<Event, EventColumnKey>(events, [
  { key: 'name', filterType: 'text', globalSearchable: true, getValue: row => row.name },
  { key: 'starts_at', filterType: 'date', globalSearchable: true, getValue: row => row.starts_at },
  { key: 'ends_at', filterType: 'date', globalSearchable: true, getValue: row => row.ends_at },
  { key: 'location', filterType: 'text', globalSearchable: true, getValue: row => row.location },
  { key: 'expected_guests', filterType: 'number', getValue: row => row.expected_guests },
  { key: 'organizers', filterType: 'text', globalSearchable: true, getValue: row => organizerSummary(row) },
  { key: 'cost_centres', filterType: 'text', globalSearchable: true, getValue: row => costCentreSummary(row) },
])

onMounted(async () => {
  const res = await $fetch('/api/events')
  if (res.ok) {
    events.value = res.events
    canOpenAll.value = res.canOpenAll
    organizerEventIds.value = new Set(res.organizerEventIds)
  }
})

function organizerSummary(entry: Event) {
  const subdivisions = entry.subdivision_organizers.map(organizer => `${organizer.code} - ${organizer.name}`)
  const members = entry.member_organizers.map(organizer => organizer.full_name)
  const labels = [...subdivisions, ...members]

  if (!labels.length) return t('event.noOrganizersShort')
  if (labels.length <= 2) return labels.join(', ')

  return [
    ...labels.slice(0, 2),
    `+ ${labels.length - 2}`,
  ].join(', ')
}

function costCentreSummary(entry: Event) {
  if (!entry.cost_centre_splits.length) return t('event.noCostCentresShort')

  if (entry.cost_centre_splits.length === 1) {
    const split = entry.cost_centre_splits[0]
    return split
      ? `${split.code} - ${split.name} (${Number(split.allocation_percentage).toFixed(2)}%)`
      : t('event.noCostCentresShort')
  }

  const sortedSplits = [...entry.cost_centre_splits].sort((left, right) => {
    return Number(right.allocation_percentage) - Number(left.allocation_percentage)
      || left.code.localeCompare(right.code, undefined, { sensitivity: 'base' })
  })

  const labels = sortedSplits
    .slice(0, 2)
    .map(split => `${split.code} (${Number(split.allocation_percentage).toFixed(2)}%)`)

  if (sortedSplits.length <= 2) return labels.join(', ')

  return [
    ...labels,
    `+ ${sortedSplits.length - 2}`,
  ].join(', ')
}

function openEvent(id: number, activeTab?: EventPlanningTabKey) {
  setPage('EventCreate', {
    eventId: id,
    ...(activeTab ? { activeTab } : {}),
    returnTarget: resolvedReturnTarget.value,
  })
}

function createEvent() {
  setPage('EventCreate', {
    returnTarget: resolvedReturnTarget.value,
  })
}

function columnSortDirection(key: EventColumnKey) {
  return sortKey.value === key ? sortDirection.value : null
}
</script>
