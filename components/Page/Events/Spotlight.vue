<template>
  <CommonSpotlight
    :loading="loading"
    :is-empty="!active"
    empty-icon="material-symbols:event-busy-rounded"
    :empty-text="t('event.spotlight.none')"
    :title="active?.name"
  >
    <template #badge>
      <span
        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
        :class="active?.status === 'past' ? 'bg-white/10 text-slate-200' : 'bg-orange-500/20 text-orange-200'"
      >
        <span class="h-1.5 w-1.5 rounded-full" :class="active?.status === 'past' ? 'bg-slate-400' : 'bg-orange-400'" />
        {{ activeLabel }}
      </span>
    </template>

    <template v-if="canToggle" #toggle>
      <div class="inline-flex rounded-lg bg-white/10 p-0.5 text-xs font-medium">
        <button
          type="button"
          class="cursor-pointer rounded-md px-3 py-1.5 transition"
          :class="view === 'upcoming' ? 'bg-white text-slate-900' : 'text-slate-200 hover:text-white'"
          @click="view = 'upcoming'"
        >
          {{ t('event.spotlight.toggleUpcoming') }}
        </button>
        <button
          type="button"
          class="cursor-pointer rounded-md px-3 py-1.5 transition"
          :class="view === 'latest' ? 'bg-white text-slate-900' : 'text-slate-200 hover:text-white'"
          @click="view = 'latest'"
        >
          {{ t('event.spotlight.toggleLatest') }}
        </button>
      </div>
    </template>

    <template #subtitle>
      <p v-if="countdownLabel" class="mt-1 flex items-center gap-1.5 text-sm text-slate-300">
        <Icon name="material-symbols:schedule-rounded" class="text-base text-slate-400" />
        {{ countdownLabel }}
      </p>
    </template>

    <template #action>
      <button
        type="button"
        class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition not-disabled:cursor-pointer not-disabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!active?.canOpen"
        @click="active && $emit('open', active.id)"
      >
        <Icon name="material-symbols:open-in-new-rounded" class="text-base" />
        {{ t('actions.open') }}
      </button>
    </template>

    <template v-if="active">
      <!-- Body -->
      <div class="grid gap-4" :class="active.planning ? 'md:grid-cols-[1fr_1.1fr]' : ''">
        <!-- Event facts -->
        <dl
          class="grid grid-cols-2 gap-x-4 gap-y-3 self-start"
          :class="active.planning ? '' : 'md:grid-cols-4'"
        >
          <div class="col-span-2">
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">{{ t('event.startsOn') }} – {{ t('event.endsOn') }}</dt>
            <dd class="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-slate-800">
              <Icon name="material-symbols:event-rounded" class="shrink-0 text-base text-slate-400" />
              <span>{{ rangeLabel }}</span>
            </dd>
          </div>

          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">{{ t('event.location') }}</dt>
            <dd class="mt-0.5 flex items-center gap-1.5 text-sm text-slate-800">
              <Icon name="material-symbols:location-on-rounded" class="shrink-0 text-base text-slate-400" />
              <span class="truncate">{{ active.location || t('event.planning.locationMissing') }}</span>
            </dd>
          </div>

          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">{{ t('event.expectedGuests') }}</dt>
            <dd class="mt-0.5 flex items-center gap-1.5 text-sm text-slate-800">
              <Icon name="material-symbols:groups-rounded" class="shrink-0 text-base text-slate-400" />
              <span>{{ active.expected_guests != null ? active.expected_guests : t('event.planning.guestsMissing') }}</span>
            </dd>
          </div>

          <div class="col-span-2">
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">{{ t('event.organizers') }}</dt>
            <dd class="mt-1 flex flex-wrap gap-1.5">
              <span
                v-for="org in organizerLabels"
                :key="org"
                class="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
              >{{ org }}</span>
              <span v-if="!organizerLabels.length" class="text-sm text-slate-400">{{ t('event.noOrganizersShort') }}</span>
            </dd>
          </div>

          <div class="col-span-2">
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">{{ t('event.costCentres') }}</dt>
            <dd class="mt-1 flex flex-wrap gap-1.5">
              <span
                v-for="split in active.cost_centre_splits"
                :key="split.cost_centre_id"
                class="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
              >{{ split.code }} · {{ Number(split.allocation_percentage).toFixed(0) }}%</span>
              <span v-if="!active.cost_centre_splits.length" class="text-sm text-slate-400">{{ t('event.noCostCentresShort') }}</span>
            </dd>
          </div>
        </dl>

        <!-- Planning summary (only when the user may view planning details) -->
        <div v-if="active.planning" class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <button
            type="button"
            class="-m-1 block w-[calc(100%+0.5rem)] rounded-lg p-1 text-left transition not-disabled:cursor-pointer not-disabled:hover:bg-slate-100/70 disabled:cursor-default"
            :disabled="!active.canOpen"
            @click="openTab('overview')"
          >
            <span class="flex items-center justify-between gap-3">
              <span class="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <Icon
                  :name="active.status === 'past' ? 'material-symbols:history-rounded' : 'material-symbols:checklist-rtl-rounded'"
                  class="text-base text-orange-500"
                />
                {{ active.status === 'past' ? t('event.spotlight.recap') : t('event.spotlight.planningState') }}
              </span>
              <span class="text-sm font-semibold text-slate-900">{{ active.planning.readiness }}%</span>
            </span>

            <span class="mt-2 block h-2 overflow-hidden rounded-full bg-slate-200">
              <span
                class="block h-full rounded-full transition-all"
                :class="active.status === 'past' ? 'bg-slate-400' : 'bg-orange-500'"
                :style="{ width: `${active.planning.readiness}%` }"
              />
            </span>
            <span class="mt-1 block text-xs text-slate-500">
              {{ active.status === 'past'
                ? t('event.spotlight.recapHint', { pct: active.planning.readiness })
                : t('event.planning.completedPercent', { pct: active.planning.readiness }) }}
            </span>
          </button>

          <div class="mt-3 grid grid-cols-2 gap-2">
            <button
              v-for="tile in summaryTiles"
              :key="tile.label"
              type="button"
              class="rounded-lg bg-white p-2.5 text-left shadow-sm transition not-disabled:cursor-pointer not-disabled:hover:shadow-md disabled:cursor-default"
              :disabled="!active.canOpen"
              @click="openTab(tile.tab)"
            >
              <span class="flex items-center gap-1 text-xs text-slate-500">
                <Icon :name="tile.icon" class="shrink-0 text-sm" :class="tile.variant === 'ok' ? 'text-emerald-500' : tile.variant === 'warning' ? 'text-amber-500' : 'text-slate-400'" />
                <span class="truncate">{{ tile.label }}</span>
              </span>
              <span class="mt-0.5 block text-sm font-semibold text-slate-800">{{ tile.value }}</span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </CommonSpotlight>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import type { GetEventSpotlightResponse } from '~/server/api/events/spotlight.get'
import type { EventSpotlight } from '~/types/event'
import type { EventPlanningTabKey } from './planning/types'

const emit = defineEmits<{ (e: 'open', eventId: number, tab?: EventPlanningTabKey): void }>()

const { t } = useI18n()
const { formatDate, formatDateTime } = useLocaleFormatters()

type SpotlightView = 'upcoming' | 'latest'

const loading = ref(true)
const upcoming = ref<EventSpotlight | null>(null)
const latest = ref<EventSpotlight | null>(null)
const view = ref<SpotlightView>('upcoming')

const canToggle = computed(() => Boolean(upcoming.value && latest.value))

const active = computed<EventSpotlight | null>(() => {
  if (view.value === 'latest' && latest.value) return latest.value
  return upcoming.value ?? latest.value
})

const activeLabel = computed(() => {
  if (!active.value) return ''
  if (active.value.status === 'ongoing') return t('event.spotlight.ongoingLabel')
  if (active.value.status === 'past') return t('event.spotlight.latestLabel')
  return t('event.spotlight.upcomingLabel')
})

const countdownLabel = computed(() => {
  const days = active.value?.daysToStart
  if (days == null) return ''
  if (days > 0) return t('event.planning.daysUntilEvent', { days })
  if (days === 0) return t('event.planning.eventToday')
  return t('event.planning.daysPastEvent', { days: Math.abs(days) })
})

const rangeLabel = computed(() => {
  const event = active.value
  if (!event) return ''
  if (event.starts_at && event.ends_at) {
    const sameDay = event.starts_at.slice(0, 10) === event.ends_at.slice(0, 10)
    return sameDay
      ? `${formatDateTime(event.starts_at)} – ${formatTime(event.ends_at)}`
      : `${formatDateTime(event.starts_at)} – ${formatDateTime(event.ends_at)}`
  }
  return formatDateTime(event.starts_at || event.ends_at)
})

const organizerLabels = computed(() => {
  const event = active.value
  if (!event) return []
  return [
    ...event.subdivision_organizers.map(o => `${o.code} - ${o.name}`),
    ...event.member_organizers.map(o => o.full_name),
  ]
})

type TileVariant = 'ok' | 'warning' | 'neutral'
interface SummaryTile { label: string; value: string; icon: string; variant: TileVariant; tab: EventPlanningTabKey }

const summaryTiles = computed<SummaryTile[]>(() => {
  const event = active.value
  if (!event?.planning) return []
  const { tasks, shifts, checklists, details } = event.planning

  const masterComplete = details.locationSet && details.guestsSet
  const masterTile: SummaryTile = {
    label: t('event.masterData'),
    value: masterComplete
      ? t('event.planning.statusText.complete')
      : details.locationSet || details.guestsSet
        ? t('event.planning.statusText.partiallySet')
        : t('event.planning.statusText.notSet'),
    icon: 'material-symbols:info-outline-rounded',
    variant: masterComplete ? 'ok' : details.locationSet || details.guestsSet ? 'warning' : 'neutral',
    tab: 'details',
  }

  const tasksTile: SummaryTile = {
    label: t('event.planning.tabs.tasks'),
    value: tasks.total === 0
      ? t('event.planning.statusText.noneYet')
      : t('event.spotlight.tasksDone', { done: tasks.done, total: tasks.total }),
    icon: 'material-symbols:task-alt-rounded',
    variant: tasks.total === 0 ? 'neutral' : tasks.open === 0 ? 'ok' : 'warning',
    tab: 'tasks',
  }

  const shiftsTile: SummaryTile = {
    label: t('event.planning.tabs.shifts'),
    value: shifts.total === 0
      ? t('event.planning.statusText.noneYet')
      : t('event.planning.staffedCount', { current: shifts.fullyStaffed, required: shifts.total }),
    icon: 'material-symbols:calendar-month-rounded',
    variant: shifts.total === 0 ? 'neutral' : shifts.unstaffed === 0 ? 'ok' : 'warning',
    tab: 'shifts',
  }

  const checklistsTile: SummaryTile = {
    label: t('event.planning.tabs.checklists'),
    value: checklists.totalItems === 0
      ? t('event.planning.statusText.noneYet')
      : t('event.planning.checklistItemsDone', { done: checklists.doneItems, total: checklists.totalItems }),
    icon: 'material-symbols:checklist-rounded',
    variant: checklists.totalItems === 0 ? 'neutral' : checklists.doneItems === checklists.totalItems ? 'ok' : 'warning',
    tab: 'checklists',
  }

  return [masterTile, tasksTile, shiftsTile, checklistsTile]
})

function openTab(tab: EventPlanningTabKey) {
  if (active.value?.canOpen) emit('open', active.value.id, tab)
}

function formatTime(value?: string | null) {
  if (!value) return ''
  const full = formatDateTime(value)
  const date = formatDate(value)
  // Strip the leading date portion to keep just the time when on the same day.
  return full.startsWith(date) ? full.slice(date.length).trim().replace(/^[,·\s]+/, '') : full
}

async function load() {
  loading.value = true
  try {
    const res = await $fetch<GetEventSpotlightResponse>('/api/events/spotlight')
    if (res.ok) {
      upcoming.value = res.upcoming
      latest.value = res.latest
      view.value = res.upcoming ? 'upcoming' : 'latest'
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)
useAppRefresh().onRefresh(load)
</script>
