<template>
  <section class="rounded-xl bg-white p-4 shadow-lg">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-lg font-semibold">{{ t('event.planning.timeline') }}</h2>
      <p class="text-sm text-slate-500">{{ t('event.planning.timelineHint') }}</p>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <button
        v-for="filter in kindFilters"
        :key="filter.kind ?? 'all'"
        type="button"
        class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors"
        :class="activeFilter === filter.kind
          ? 'border-slate-300 bg-slate-100 text-slate-800'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
        @click="activeFilter = filter.kind"
      >
        <Icon :name="filter.icon" />
        {{ filter.label }}
      </button>
    </div>

    <template v-if="!items.length">
      <div class="mt-10 flex flex-col items-center gap-3 text-center">
        <p class="font-medium text-slate-700">{{ t('event.planning.noTimelineItems') }}</p>
        <p class="text-sm text-slate-500">{{ t('event.planning.noTimelineItemsHint') }}</p>
        <div class="mt-2 flex gap-2">
          <button type="button" class="btn-secondary text-sm" @click="emit('navigate', 'tasks')">
            {{ t('event.planning.tabs.tasks') }}
          </button>
          <button type="button" class="btn-secondary text-sm" @click="emit('navigate', 'shifts')">
            {{ t('event.planning.tabs.shifts') }}
          </button>
        </div>
      </div>
    </template>

    <template v-else-if="!groupedItems.length">
      <div class="mt-10 flex flex-col items-center gap-2 text-center">
        <p class="text-sm text-slate-500">{{ t('event.planning.noTimelineItemsFiltered') }}</p>
      </div>
    </template>

    <div v-else class="relative mt-6 pl-8">
      <div class="absolute left-3 top-3 bottom-3 w-0.5 bg-slate-200" aria-hidden="true" />

      <div v-for="group in groupedItems" :key="group.dateKey" class="relative mb-6 last:mb-0">
        <div class="absolute -left-8 flex h-6 w-6 items-center justify-center">
          <div
            class="h-4 w-4 rounded-full border-2 border-white ring-1"
            :class="group.isToday
              ? 'bg-orange-500 ring-orange-400'
              : group.isPast
                ? 'bg-slate-300 ring-slate-300'
                : 'bg-slate-500 ring-slate-400'"
          />
        </div>

        <div class="mb-3 flex items-center gap-2">
          <span
            class="text-sm font-semibold"
            :class="group.isToday ? 'text-orange-600' : group.isPast ? 'text-slate-400' : 'text-slate-700'"
          >
            {{ group.dateLabel }}
          </span>
          <span
            v-if="group.isToday"
            class="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700"
          >
            {{ t('event.planning.today') }}
          </span>
        </div>

        <div class="space-y-2">
          <div
            v-for="item in group.items"
            :key="item.id"
            class="rounded-lg border p-3 transition-opacity"
            :class="[
              group.isPast ? 'opacity-50' : '',
              item.kind === 'task' ? 'border-amber-200 bg-amber-50'
                : item.kind === 'shift' ? 'border-sky-200 bg-sky-50'
                  : 'border-orange-200 bg-orange-50',
            ]"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate font-medium text-slate-900">{{ item.title }}</p>
                <p class="mt-0.5 text-xs text-slate-500">{{ itemGroupTimeLabel(item) }}</p>
              </div>
              <div class="flex shrink-0 flex-wrap gap-1.5">
                <span
                  v-if="item.kind === 'task' && item.status"
                  class="rounded-md px-2 py-0.5 text-xs font-semibold"
                  :class="item.status === 'done'
                    ? 'bg-emerald-100 text-emerald-700'
                    : item.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-amber-100 text-amber-700'"
                >
                  {{ t(`event.planning.taskStatus.${item.status === 'in_progress' ? 'inProgress' : item.status}`) }}
                </span>
                <span
                  v-if="item.kind === 'shift' && item.requiredPeople !== undefined"
                  class="rounded-md px-2 py-0.5 text-xs font-semibold"
                  :class="(item.memberCount ?? 0) >= item.requiredPeople
                    ? 'bg-emerald-100 text-emerald-700'
                    : (item.memberCount ?? 0) > 0
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'"
                >
                  {{ item.memberCount ?? 0 }}/{{ item.requiredPeople }}
                </span>
                <span
                  v-if="item.kind === 'task' && item.status !== 'done' && urgencyLabel(item)"
                  class="rounded-md px-2 py-0.5 text-xs font-semibold"
                  :class="isOverdue(item) ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'"
                >
                  {{ urgencyLabel(item) }}
                </span>
                <span class="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                  {{ item.typeLabel }}
                </span>
              </div>
            </div>
            <p v-if="item.meta" class="mt-1.5 truncate text-sm text-slate-500">{{ item.meta }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import type { EventTimelineItem, EventTimelineKind, EventPlanningTabKey } from './types'

const props = defineProps<{
  items: EventTimelineItem[]
}>()

const emit = defineEmits<{
  (e: 'navigate', tab: EventPlanningTabKey): void
}>()

const { t, locale } = useI18n()
const { formatDate } = useLocaleFormatters()

type FilterKind = EventTimelineKind | null

const activeFilter = ref<FilterKind>(null)

const kindFilters: { kind: FilterKind; label: string; icon: string }[] = [
  { kind: null, label: t('common.all'), icon: 'material-symbols:format-list-bulleted-rounded' },
  { kind: 'event', label: t('event.planning.milestones'), icon: 'material-symbols:flag-rounded' },
  { kind: 'task', label: t('event.planning.tasks'), icon: 'material-symbols:task-alt-rounded' },
  { kind: 'shift', label: t('event.planning.shifts'), icon: 'material-symbols:calendar-month-rounded' },
]

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function rawToDateKey(raw: string): string {
  return raw.slice(0, 10)
}

function isOverdue(item: EventTimelineItem): boolean {
  return item.raw < todayDateKey() && item.kind === 'task' && item.status !== 'done'
}

function isDueSoon(item: EventTimelineItem): boolean {
  const daysMs = 72 * 60 * 60 * 1000
  const deadline = new Date(item.raw).getTime()
  const now = Date.now()
  return item.kind === 'task' && item.status !== 'done' && deadline >= now && deadline <= now + daysMs
}

function urgencyLabel(item: EventTimelineItem): string | null {
  if (isOverdue(item)) return t('event.planning.overdue')
  if (isDueSoon(item)) return t('event.planning.dueSoon')
  return null
}

function itemGroupTimeLabel(item: EventTimelineItem): string {
  const hasTime = item.raw.length > 10
  const hasEndTime = item.rawEnd && item.rawEnd.length > 10

  if (!hasTime && !hasEndTime) return t('event.planning.allDay')

  try {
    const fmt = new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' })
    const start = hasTime ? fmt.format(new Date(item.raw)) : null
    const end = hasEndTime ? fmt.format(new Date(item.rawEnd!)) : null

    if (start && end) return `${start} – ${end}`
    return start ?? end ?? t('event.planning.allDay')
  } catch {
    return item.timeLabel
  }
}

interface DayGroup {
  dateKey: string
  dateLabel: string
  isToday: boolean
  isPast: boolean
  items: EventTimelineItem[]
}

const groupedItems = computed<DayGroup[]>(() => {
  const filtered = activeFilter.value
    ? props.items.filter(item => item.kind === activeFilter.value)
    : props.items

  const today = todayDateKey()
  const map = new Map<string, EventTimelineItem[]>()

  for (const item of filtered) {
    const key = rawToDateKey(item.raw)
    const existing = map.get(key) ?? []
    existing.push(item)
    map.set(key, existing)
  }

  const keys = Array.from(map.keys()).sort()

  return keys.map((dateKey) => {
    let dateLabel: string
    try {
      dateLabel = formatDate(dateKey)
    } catch {
      dateLabel = dateKey
    }

    const items = (map.get(dateKey) ?? []).slice().sort((a, b) => new Date(a.raw).getTime() - new Date(b.raw).getTime())

    return {
      dateKey,
      dateLabel,
      isToday: dateKey === today,
      isPast: dateKey < today,
      items,
    }
  })
})
</script>
