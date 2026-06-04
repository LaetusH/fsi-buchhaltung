<template>
  <Page :headline1="t('event.title')" @open-menu="$emit('openMenu')">
    <template #cards>
      <div class="col-span-12 min-w-0">
        <div class="space-y-5">
          <section class="overflow-hidden rounded-xl bg-white shadow-lg">
            <div class="border-b border-slate-200 bg-slate-900 px-5 py-5 text-white">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="flex min-w-0 items-start gap-3">
                  <button
                    type="button"
                    class="mt-1.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
                    :title="t('pages.events')"
                    @click="cancel"
                  >
                    <Icon name="material-symbols:arrow-back-rounded" />
                  </button>
                  <div class="min-w-0">
                    <p class="text-xs font-semibold uppercase tracking-wide text-orange-200">{{ t('event.planning.workspace') }}</p>
                    <h2 class="mt-1 truncate text-2xl font-semibold">{{ eventTitle }}</h2>
                    <div class="mt-3 flex flex-wrap gap-2 text-sm text-slate-200">
                      <span class="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1">
                        <Icon name="material-symbols:event-rounded" class="text-base" />
                        {{ eventRangeLabel }}
                      </span>
                      <span class="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1">
                        <Icon name="material-symbols:location-on-rounded" class="text-base" />
                        {{ form.location || t('event.planning.locationMissing') }}
                      </span>
                      <span class="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1">
                        <Icon name="material-symbols:groups-rounded" class="text-base" />
                        {{ form.expected_guests != null ? t('event.planning.guestCount', { count: Number(form.expected_guests) }) : t('event.planning.guestsMissing') }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="grid min-w-48 gap-2 text-sm">
                  <div class="rounded-lg bg-white/10 px-3 py-2">
                    <p class="text-xs text-slate-300">{{ t('event.planning.readiness') }}</p>
                    <p class="text-lg font-semibold">{{ planningProgress }}%</p>
                    <div class="mt-2 h-2 rounded-full bg-white/15">
                      <div class="h-2 rounded-full bg-orange-400" :style="{ width: `${planningProgress}%` }" />
                    </div>
                    <p v-if="daysToEvent !== null" class="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                      <Icon name="material-symbols:schedule-rounded" class="text-sm text-slate-400" />
                      <template v-if="daysToEvent > 0">{{ t('event.planning.daysUntilEvent', { days: daysToEvent }) }}</template>
                      <template v-else-if="daysToEvent === 0">{{ t('event.planning.eventToday') }}</template>
                      <template v-else>{{ t('event.planning.daysPastEvent', { days: Math.abs(daysToEvent) }) }}</template>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <nav v-if="eventId" class="grid grid-cols-2 gap-2 border-b border-slate-200 bg-slate-200 px-3 py-3 sm:grid-cols-3 lg:grid-cols-6">
              <button
                v-for="tab in planningTabs"
                :key="tab.key"
                type="button"
                class="inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition cursor-pointer"
                :class="activeTab === tab.key ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-white'"
                @click="activeTab = tab.key"
              >
                <Icon :name="tab.icon" class="text-lg" />
                {{ tab.label }}
              </button>
            </nav>
          </section>

          <template v-if="eventId">
            <section v-if="activeTab === 'overview'">
              <div class="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-[1.5fr_1fr]">
                <div class="space-y-4">
                  <div class="rounded-xl bg-white p-4 shadow-lg">
                    <div class="mb-2 flex items-center justify-between gap-3">
                      <div class="flex items-center gap-2">
                        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                          <Icon name="material-symbols:dashboard-rounded" class="text-base" />
                        </span>
                        <h2 class="text-lg font-semibold">{{ t('event.planning.status') }}</h2>
                      </div>
                      <span class="text-xs font-semibold text-slate-500">
                        {{ t('event.planning.statusSummaryDone', { done: planningStatusItems.filter(s => s.variant === 'ok').length, total: planningStatusItems.length }) }}
                      </span>
                    </div>
                    <div class="flex gap-1">
                      <div
                        v-for="item in planningStatusItems"
                        :key="item.label"
                        class="h-1.5 flex-1 rounded-full"
                        :class="{
                          'bg-emerald-400': item.variant === 'ok',
                          'bg-amber-400': item.variant === 'warning',
                          'bg-slate-200': item.variant === 'neutral',
                        }"
                      />
                    </div>
                    <div class="mb-3 mt-1 flex justify-between text-xs text-slate-500">
                      <span>{{ t('event.planning.completedPercent', { pct: planningProgress }) }}</span>
                      <span>{{ t('event.planning.statusSummaryOpen', { count: planningStatusItems.filter(s => s.variant !== 'ok').length }) }}</span>
                    </div>
                    <div class="space-y-0.5">
                      <button
                        v-for="status in planningStatusItems"
                        :key="status.label"
                        type="button"
                        class="-mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 transition hover:bg-slate-50"
                        @click="activeTab = status.tab"
                      >
                        <span class="text-sm text-slate-600">{{ status.label }}</span>
                        <span
                          class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                          :class="{
                            'bg-emerald-100 text-emerald-700': status.variant === 'ok',
                            'bg-amber-100 text-amber-700': status.variant === 'warning',
                            'bg-slate-100 text-slate-500': status.variant === 'neutral',
                          }"
                        >
                          <span
                            class="h-1.5 w-1.5 shrink-0 rounded-full"
                            :class="{
                              'bg-emerald-500': status.variant === 'ok',
                              'bg-amber-500': status.variant === 'warning',
                              'bg-slate-400': status.variant === 'neutral',
                            }"
                          />
                          {{ status.status }}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div class="rounded-xl bg-white p-4 shadow-lg">
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex items-center gap-2">
                        <button type="button" class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-orange-50 text-orange-600 transition hover:bg-orange-100" @click="activeTab = 'timeline'">
                          <Icon name="material-symbols:view-timeline-rounded" class="text-base" />
                        </button>
                        <h2 class="text-lg font-semibold">{{ t('event.planning.timelinePreview') }}</h2>
                      </div>
                      <button type="button" class="cursor-pointer text-sm font-medium text-orange-600 hover:text-orange-700" @click="activeTab = 'timeline'">
                        {{ t('event.planning.openTimeline') }}
                      </button>
                    </div>
                    <div v-if="overviewTimelineItems.length === 0" class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
                      <Icon name="material-symbols:view-timeline-rounded" class="mb-1 text-2xl" />
                      <p>{{ t('event.planning.noTimelineItems') }}</p>
                    </div>
                    <div v-else class="mt-4">
                      <div
                        v-for="(item, index) in overviewTimelineItems.slice(0, 5)"
                        :key="item.id"
                        class="relative flex gap-3 pb-4"
                      >
                        <div
                          v-if="index < Math.min(overviewTimelineItems.length, 5) - 1 || overviewTimelineItems.length > 5"
                          class="absolute bottom-0 left-1.75 top-4 w-0.5 bg-slate-200"
                        />
                        <div
                          class="relative z-10 mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-white"
                          :class="timelineItemDotClass(item)"
                          style="box-shadow: 0 0 0 1px #e2e8f0"
                        />
                        <div class="min-w-0 flex-1">
                          <p class="text-xs font-semibold text-slate-500">{{ item.timeLabel }}</p>
                          <p class="mt-0.5 text-sm font-semibold text-slate-800">{{ item.title }}</p>
                          <p class="text-xs text-slate-500">{{ item.meta }}</p>
                        </div>
                      </div>
                      <div v-if="overviewTimelineItems.length > 5" class="flex items-center gap-3">
                        <div class="flex h-4 w-4 shrink-0 flex-col items-center justify-center gap-0.5">
                          <span class="h-1 w-1 rounded-full bg-slate-300" />
                          <span class="h-1 w-1 rounded-full bg-slate-300" />
                          <span class="h-1 w-1 rounded-full bg-slate-300" />
                        </div>
                        <button
                          type="button"
                          class="cursor-pointer text-xs font-medium text-slate-400 hover:text-slate-600"
                          @click="activeTab = 'timeline'"
                        >
                          {{ t('event.planning.moreTimelineItems', { count: overviewTimelineItems.length - 5 }) }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="space-y-4">
                  <div class="rounded-xl bg-white p-4 shadow-lg">
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex items-center gap-2">
                        <button type="button" class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-orange-50 text-orange-600 transition hover:bg-orange-100" @click="activeTab = 'tasks'">
                          <Icon name="material-symbols:task-alt-rounded" class="text-base" />
                        </button>
                        <h2 class="text-lg font-semibold">{{ t('event.planning.nextTasks') }}</h2>
                      </div>
                      <button type="button" class="cursor-pointer text-sm font-medium text-orange-600 hover:text-orange-700" @click="activeTab = 'tasks'">
                        {{ t('event.planning.viewAllTasks') }}
                      </button>
                    </div>
                    <div v-if="planningTasks.length === 0" class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-400">
                      {{ t('event.planning.noTasksYet') }}
                    </div>
                    <div v-else-if="nextPendingTasks.length === 0" class="mt-4 rounded-lg bg-emerald-50 p-4 text-center text-sm text-emerald-700">
                      <Icon name="material-symbols:check-circle-rounded" class="mb-1 text-xl" />
                      <p>{{ t('event.planning.allTasksDone') }}</p>
                    </div>
                    <div v-else class="mt-4 space-y-3">
                      <label
                        v-for="task in nextPendingTasks"
                        :key="task.id"
                        class="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          class="checkbox mt-1"
                          :checked="false"
                          :disabled="!canEdit"
                          @change="setTaskDone(task.id, ($event.target as HTMLInputElement).checked)"
                        >
                        <span class="min-w-0">
                          <span class="block font-medium text-slate-800">{{ task.title }}</span>
                          <span class="block text-slate-500">{{ task.deadline ? formatMaybeDateTime(task.deadline) : t('event.planning.dateMissing') }} · {{ taskAssigneeSummary(task) }}</span>
                        </span>
                      </label>
                      <button
                        v-if="pendingTasks.length > 3"
                        type="button"
                        class="w-full cursor-pointer rounded-md py-2 text-center text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        @click="activeTab = 'tasks'"
                      >
                        {{ t('event.planning.morePendingTasks', { count: pendingTasks.length - 3 }) }}
                      </button>
                    </div>
                  </div>

                  <div class="rounded-xl bg-white p-4 shadow-lg">
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex items-center gap-2">
                        <button type="button" class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-orange-50 text-orange-600 transition hover:bg-orange-100" @click="activeTab = 'checklists'">
                          <Icon name="material-symbols:checklist-rounded" class="text-base" />
                        </button>
                        <h2 class="text-lg font-semibold">{{ t('event.planning.tabs.checklists') }}</h2>
                      </div>
                      <button type="button" class="cursor-pointer text-sm font-medium text-orange-600 hover:text-orange-700" @click="activeTab = 'checklists'">
                        {{ t('event.planning.openChecklists') }}
                      </button>
                    </div>
                    <div v-if="reusableChecklists.length === 0" class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-400">
                      {{ t('event.planning.noChecklists') }}
                    </div>
                    <div v-else class="mt-4 space-y-3">
                      <div v-for="checklist in sortedChecklists.slice(0, 5)" :key="checklist.id">
                        <div class="flex items-center justify-between gap-2 text-sm">
                          <span class="min-w-0 truncate font-medium text-slate-700">{{ checklist.title }}</span>
                          <span class="shrink-0 text-slate-500">{{ t('event.planning.checklistItemsDone', { done: checklist.items.filter(i => i.done).length, total: checklist.items.length }) }}</span>
                        </div>
                        <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            class="h-1.5 rounded-full bg-emerald-400 transition-all"
                            :style="{ width: checklist.items.length ? `${(checklist.items.filter(i => i.done).length / checklist.items.length) * 100}%` : '0%' }"
                          />
                        </div>
                      </div>
                      <button
                        v-if="reusableChecklists.length > 5"
                        type="button"
                        class="w-full cursor-pointer rounded-md py-2 text-center text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        @click="activeTab = 'checklists'"
                      >
                        {{ t('event.planning.moreChecklists', { count: reusableChecklists.length - 5 }) }}
                      </button>
                    </div>
                  </div>

                  <div class="rounded-xl bg-white p-4 shadow-lg">
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex items-center gap-2">
                        <button type="button" class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-orange-50 text-orange-600 transition hover:bg-orange-100" @click="activeTab = 'shifts'">
                          <Icon name="material-symbols:calendar-month-rounded" class="text-base" />
                        </button>
                        <h2 class="text-lg font-semibold">{{ t('event.planning.tabs.shifts') }}</h2>
                      </div>
                      <button type="button" class="cursor-pointer text-sm font-medium text-orange-600 hover:text-orange-700" @click="activeTab = 'shifts'">
                        {{ t('event.planning.openShifts') }}
                      </button>
                    </div>
                    <div v-if="shiftSlots.length === 0" class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-400">
                      {{ t('event.planning.noShiftsYet') }}
                    </div>
                    <div v-else class="mt-4 space-y-2">
                      <div class="flex items-center justify-between gap-2 text-sm">
                        <span class="text-slate-700">{{ t('event.planning.shiftsStaffed', { staffed: shiftsSummary.fullyStaffed, total: shiftsSummary.total }) }}</span>
                        <span v-if="shiftsSummary.partiallyStaffed > 0" class="shrink-0 text-slate-700">
                          {{ t('event.planning.shiftsPartiallyStaffed', { count: shiftsSummary.partiallyStaffed }) }}
                        </span>
                      </div>
                      <div class="flex h-2 overflow-hidden rounded-full bg-slate-100">
                        <div class="h-full bg-emerald-400 transition-all" :style="{ width: `${(shiftsSummary.fullyStaffed / shiftsSummary.total) * 100}%` }" />
                        <div class="h-full bg-amber-400 transition-all" :style="{ width: `${(shiftsSummary.partiallyStaffed / shiftsSummary.total) * 100}%` }" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <EventTimelinePanel v-else-if="activeTab === 'timeline'" :items="timelineItems" @navigate="activeTab = $event" />

            <EventTasksPanel
              v-else-if="activeTab === 'tasks'"
              v-model:tasks="planningTasks"
              :disabled="!canEdit || taskLoading || taskSaving || !canManageTasks"
              :saving="taskSaving"
              :loading="taskLoading"
              :members="members"
              :subdivisions="subdivisions"
              :current-member-id="currentMemberId"
              @save="saveEventTasks"
            />

            <EventChecklistsPanel
              v-else-if="activeTab === 'checklists'"
              v-model:checklists="reusableChecklists"
              v-model:templates="checklistTemplates"
              :disabled="!canEdit || checklistLoading || checklistSaving || !canManageChecklists"
              @save-checklists="saveEventChecklists"
              @save-templates="saveEventChecklistTemplates"
            />

            <EventShiftsPanel
              v-else-if="activeTab === 'shifts'"
              v-model:slots="shiftSlots"
              v-model:permission-mode="shiftPermissionMode"
              :members="members"
              :current-member-id="currentMemberId"
              :event-start-at="form.starts_at"
              :event-end-at="form.ends_at"
              :disabled="!canUseShiftPlanning"
              :loading="shiftLoading"
              :saving="shiftSaving"
              :can-manage="canManageShifts"
              :can-self-signup="canSelfSignup"
              @save="saveShiftSlots"
              @assign-self="assignCurrentMemberToShift"
              @remove-self="removeCurrentMemberFromShift"
            />

            <EventDetailsPanel
              v-else-if="activeTab === 'details'"
              v-model="form"
              :saved-value="savedFormSnapshot"
              :event-id="eventId"
              :members="members"
              :subdivisions="subdivisions"
              :cost-centres="costCentres"
              :spheres="spheres"
              :disabled="!canEdit"
              :saving="isSaving"
              @save="submit"
              @cancel="cancel"
            />
          </template>

          <EventDetailsPanel
            v-else
            v-model="form"
            :saved-value="null"
            :event-id="null"
            :members="members"
            :subdivisions="subdivisions"
            :cost-centres="costCentres"
            :spheres="spheres"
            :disabled="!canEdit"
            :saving="isSaving"
            @save="submit"
            @cancel="cancel"
          />
        </div>
      </div>
    </template>
  </Page>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import { usePage } from '~/composables/usePage'
import { useReturnTarget } from '~/composables/useReturnTarget'
import { useToast } from '~/composables/useToast'
import { useEventTasks } from '~/composables/useEventTasks'
import { useEventShifts } from '~/composables/useEventShifts'
import { useEventChecklists } from '~/composables/useEventChecklists'
import type { CreateEventResponse } from '~/server/api/events/create.post'
import type { GetEventResponse } from '~/server/api/events/[id].get'
import type { GetEventOptionsResponse } from '~/server/api/events/options.get'
import type {
  EventCostCentreOption,
  EventMemberOption,
  EventSphereOption,
  EventSubdivisionOption,
  SaveEventBody,
} from '~/types/event'
import EventDetailsPanel from './planning/EventDetailsPanel.vue'
import EventChecklistsPanel from './planning/EventChecklistsPanel.vue'
import EventShiftsPanel from './planning/EventShiftsPanel.vue'
import EventTasksPanel from './planning/EventTasksPanel.vue'
import EventTimelinePanel from './planning/EventTimelinePanel.vue'
import type {
  EventPlanningTabKey,
  EventPlanningTask,
  EventPlanningTaskStatus,
  EventTimelineItem,
} from './planning/types'

defineEmits<{ (e: 'openMenu'): void }>()

const { hasPermission } = useAuth()
const { t } = useI18n()
const { formatDate, formatDateTime } = useLocaleFormatters()
const { pageMeta, setPage } = usePage()
const { returnTarget, goToReturnTarget } = useReturnTarget('Events')
const toast = useToast()

const canEdit = computed(() => hasPermission('events.edit'))
const canUseShiftPlanning = computed(() => canEdit.value || hasPermission('events.shifts.signup'))

// ---- Page / routing state ----

const eventId = ref<number | null>(null)
const activeTab = ref<EventPlanningTabKey>(
  (pageMeta.value?.activeTab as EventPlanningTabKey | undefined) ?? 'overview',
)

watch(
  () => pageMeta.value?.activeTab as EventPlanningTabKey | undefined,
  (val) => { if (val) activeTab.value = val },
)
watch(activeTab, () => { window.scrollTo({ top: 0, behavior: 'instant' }) })

// ---- Options ----

const members = ref<EventMemberOption[]>([])
const subdivisions = ref<EventSubdivisionOption[]>([])
const costCentres = ref<EventCostCentreOption[]>([])
const spheres = ref<EventSphereOption[]>([])

// ---- Event form ----

const form = ref<SaveEventBody>({
  name: '',
  starts_at: '',
  ends_at: '',
  location: '',
  expected_guests: null,
  member_organizer_ids: [],
  subdivision_organizer_ids: [],
  cost_centre_splits: [],
})
const savedFormSnapshot = ref<SaveEventBody | null>(null)
const isSaving = ref(false)

function takeSnapshot() {
  savedFormSnapshot.value = JSON.parse(JSON.stringify(form.value))
}

// ---- Planning data (via composables) ----

const eventIdRef = computed(() => eventId.value)

const {
  planningTasks,
  taskLoading,
  taskSaving,
  canManageTasks,
  loadEventTasks,
  saveEventTasks,
  reset: resetTasks,
} = useEventTasks(eventIdRef)

const {
  shiftSlots,
  shiftPermissionMode,
  currentMemberId,
  shiftLoading,
  shiftSaving,
  canManageShifts,
  canSelfSignup,
  loadShiftSlots,
  saveShiftSlots,
  assignCurrentMemberToShift,
  removeCurrentMemberFromShift,
  reset: resetShifts,
} = useEventShifts(eventIdRef)

const {
  reusableChecklists,
  checklistTemplates,
  checklistLoading,
  checklistSaving,
  canManageChecklists,
  loadEventChecklists,
  saveEventChecklists,
  saveEventChecklistTemplates,
  reset: resetChecklists,
} = useEventChecklists(eventIdRef)

// ---- Data loading ----

onMounted(async () => {
  await loadOptions()
  await loadEvent(pageMeta.value?.eventId || null)
})

watch(
  () => pageMeta.value?.eventId as number | null | undefined,
  (newId) => loadEvent(newId ?? null),
)

watch(
  eventId,
  async (id) => {
    if (!id) {
      resetTasks()
      resetShifts()
      resetChecklists()
      return
    }
    await Promise.all([loadShiftSlots(id), loadEventChecklists(id), loadEventTasks(id)])
  },
  { immediate: true },
)

useAppRefresh().onRefresh(loadOptions)

async function loadOptions() {
  const res = await $fetch<GetEventOptionsResponse>('/api/events/options')
  if (!res.ok) return

  members.value = res.members
  subdivisions.value = res.subdivisions
  costCentres.value = res.costCentres
  spheres.value = res.spheres
}

async function loadEvent(id: number | null) {
  eventId.value = id
  if (!id) {
    savedFormSnapshot.value = null
    return
  }

  const res = await $fetch<GetEventResponse>(`/api/events/${id}`)
  if (!res.ok) {
    eventId.value = null
    return
  }

  form.value = {
    name: res.event.name,
    starts_at: res.event.starts_at,
    ends_at: res.event.ends_at,
    location: res.event.location,
    expected_guests: res.event.expected_guests,
    member_organizer_ids: res.event.member_organizers.map(o => o.id),
    subdivision_organizer_ids: res.event.subdivision_organizers.map(o => o.id),
    cost_centre_splits: res.event.cost_centre_splits.map(split => ({
      sphere_id: split.sphere_id,
      cost_centre_id: split.cost_centre_id,
      allocation_percentage: Number(split.allocation_percentage),
    })),
  }

  takeSnapshot()
}

// ---- Actions ----

async function submit() {
  if (isSaving.value) return
  if (!canEdit.value) {
    toast.error(t('common.notAuthorized'))
    return
  }

  try {
    isSaving.value = true
    if (eventId.value) {
      const res = await $fetch(`/api/events/${eventId.value}`, {
        method: 'PUT',
        body: form.value,
      })
      if (!res.ok) throw new Error(res.error || t('event.saved.failedUpdate'))
      takeSnapshot()
      toast.success(t('event.saved.updated'))
      activeTab.value = 'overview'
    }
    else {
      const res = await $fetch<CreateEventResponse>('/api/events/create', {
        method: 'POST',
        body: form.value,
      })
      if (!res.ok) throw new Error(res.error || t('event.saved.failedCreate'))
      toast.success(t('event.saved.created'))
      setPage('EventCreate', { eventId: res.eventId, activeTab: 'details', returnTarget: returnTarget.value })
    }
  }
  catch (err: any) {
    toast.error(err?.message || t('event.saved.failedSave'))
  }
  finally {
    isSaving.value = false
  }
}

function cancel() {
  goToReturnTarget()
}

// ---- Computed display ----

const planningTabs = computed(() => [
  { key: 'overview', label: t('event.planning.tabs.overview'), icon: 'material-symbols:dashboard-rounded' },
  { key: 'timeline', label: t('event.planning.tabs.timeline'), icon: 'material-symbols:view-timeline-rounded' },
  { key: 'tasks', label: t('event.planning.tabs.tasks'), icon: 'material-symbols:task-alt-rounded' },
  { key: 'checklists', label: t('event.planning.tabs.checklists'), icon: 'material-symbols:checklist-rounded' },
  { key: 'shifts', label: t('event.planning.tabs.shifts'), icon: 'material-symbols:calendar-month-rounded' },
  { key: 'details', label: t('event.planning.tabs.details'), icon: 'material-symbols:tune-rounded' },
] satisfies Array<{ key: EventPlanningTabKey, label: string, icon: string }>)

const eventTitle = computed(() => form.value.name.trim() || t('event.planning.untitledEvent'))

const eventRangeLabel = computed(() => {
  if (!form.value.starts_at && !form.value.ends_at) return t('event.planning.dateMissing')
  if (form.value.starts_at && form.value.ends_at) {
    return `${formatMaybeDateTime(form.value.starts_at)} - ${formatMaybeDateTime(form.value.ends_at)}`
  }
  return formatMaybeDateTime(form.value.starts_at || form.value.ends_at)
})

const allocationIsValid = computed(() => {
  const total = form.value.cost_centre_splits.reduce((sum, split) => sum + Number(split.allocation_percentage || 0), 0)
  return Math.abs(total - 100) <= 0.01
})

const daysToEvent = computed(() => {
  if (!form.value.starts_at) return null
  const start = new Date(form.value.starts_at)
  const today = new Date()
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((startDay.getTime() - todayDay.getTime()) / (1000 * 60 * 60 * 24))
})

const pendingTasks = computed(() =>
  planningTasks.value
    .filter(task => task.status !== 'done')
    .sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    }),
)

const nextPendingTasks = computed(() => pendingTasks.value.slice(0, 3))

const shiftsSummary = computed(() => {
  const total = shiftSlots.value.length
  const fullyStaffed = shiftSlots.value.filter(s => s.memberIds.length >= s.requiredPeople).length
  const partiallyStaffed = shiftSlots.value.filter(s => s.memberIds.length > 0 && s.memberIds.length < s.requiredPeople).length
  return { total, fullyStaffed, partiallyStaffed }
})

const sortedChecklists = computed(() =>
  [...reusableChecklists.value].sort((a, b) => {
    const pctA = a.items.length ? a.items.filter(i => i.done).length / a.items.length : 0
    const pctB = b.items.length ? b.items.filter(i => i.done).length / b.items.length : 0
    return pctA - pctB
  }),
)

type StatusVariant = 'ok' | 'warning' | 'neutral'

const planningStatusItems = computed(() => {
  const organizerCount = form.value.member_organizer_ids.length + form.value.subdivision_organizer_ids.length
  const openTasks = pendingTasks.value.length
  const totalTasks = planningTasks.value.length
  const { total: totalShifts, fullyStaffed } = shiftsSummary.value
  const unstaffedShifts = totalShifts - fullyStaffed
  const totalChecklistItems = reusableChecklists.value.reduce((sum, c) => sum + c.items.length, 0)
  const doneChecklistItems = reusableChecklists.value.reduce((sum, c) => sum + c.items.filter(i => i.done).length, 0)

  return [
    {
      label: t('event.masterData'),
      status: form.value.location?.trim() && form.value.expected_guests != null
        ? t('event.planning.statusText.complete')
        : form.value.location?.trim() || form.value.expected_guests != null
          ? t('event.planning.statusText.partiallySet')
          : t('event.planning.statusText.notSet'),
      variant: (form.value.location?.trim() && form.value.expected_guests != null ? 'ok' : 'neutral') as StatusVariant,
      tab: 'details' as EventPlanningTabKey,
    },
    {
      label: t('event.organizers'),
      status: organizerCount > 0 ? t('event.planning.statusText.assigned', { count: organizerCount }) : t('event.planning.statusText.noneAssigned'),
      variant: (organizerCount > 0 ? 'ok' : 'neutral') as StatusVariant,
      tab: 'details' as EventPlanningTabKey,
    },
    {
      label: t('event.costCentres'),
      status: form.value.cost_centre_splits.length === 0
        ? t('event.planning.statusText.notConfigured')
        : allocationIsValid.value
          ? t('event.planning.statusText.complete')
          : t('event.planning.statusText.incomplete'),
      variant: (form.value.cost_centre_splits.length === 0 ? 'neutral' : allocationIsValid.value ? 'ok' : 'warning') as StatusVariant,
      tab: 'details' as EventPlanningTabKey,
    },
    {
      label: t('event.planning.tabs.tasks'),
      status: totalTasks === 0
        ? t('event.planning.statusText.noneYet')
        : openTasks === 0
          ? t('event.planning.statusText.allDone')
          : t('event.planning.statusText.openCount', { count: openTasks }),
      variant: (totalTasks === 0 ? 'neutral' : openTasks === 0 ? 'ok' : 'warning') as StatusVariant,
      tab: 'tasks' as EventPlanningTabKey,
    },
    {
      label: t('event.planning.tabs.checklists'),
      status: reusableChecklists.value.length === 0
        ? t('event.planning.statusText.noneYet')
        : totalChecklistItems > 0 && doneChecklistItems === totalChecklistItems
          ? t('event.planning.statusText.allDone')
          : t('event.planning.checklistItemsDone', { done: doneChecklistItems, total: totalChecklistItems }),
      variant: (reusableChecklists.value.length === 0 ? 'neutral' : totalChecklistItems > 0 && doneChecklistItems === totalChecklistItems ? 'ok' : 'warning') as StatusVariant,
      tab: 'checklists' as EventPlanningTabKey,
    },
    {
      label: t('event.planning.tabs.shifts'),
      status: totalShifts === 0
        ? t('event.planning.statusText.noneYet')
        : unstaffedShifts === 0
          ? t('event.planning.statusText.allStaffed')
          : t('event.planning.statusText.unstaffedCount', { count: unstaffedShifts }),
      variant: (totalShifts === 0 ? 'neutral' : unstaffedShifts === 0 ? 'ok' : 'warning') as StatusVariant,
      tab: 'shifts' as EventPlanningTabKey,
    },
  ]
})

const planningProgress = computed(() => {
  let numerator = 0
  let denominator = 3

  if (form.value.location?.trim()) numerator += 0.5
  if (form.value.expected_guests != null) numerator += 0.5
  if (form.value.member_organizer_ids.length + form.value.subdivision_organizer_ids.length > 0) numerator += 1
  if (allocationIsValid.value) numerator += 1

  const totalTasks = planningTasks.value.length
  if (totalTasks > 0) {
    denominator += 1
    numerator += planningTasks.value.filter(t => t.status === 'done').length / totalTasks
  }

  const totalShifts = shiftSlots.value.length
  if (totalShifts > 0) {
    denominator += 1
    numerator += shiftSlots.value.filter(s => s.memberIds.length >= s.requiredPeople).length / totalShifts
  }

  if (reusableChecklists.value.length > 0) {
    denominator += 1
    const totalItems = reusableChecklists.value.reduce((sum, c) => sum + c.items.length, 0)
    if (totalItems > 0) {
      const doneItems = reusableChecklists.value.reduce((sum, c) => sum + c.items.filter(i => i.done).length, 0)
      numerator += doneItems / totalItems
    }
  }

  return Math.round((numerator / denominator) * 100)
})

const overviewTimelineItems = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return timelineItems.value.filter((item) => {
    if (item.raw.slice(0, 10) < today) return false
    if (item.kind === 'task' && item.status === 'done') return false
    return true
  })
})

const timelineItems = computed<EventTimelineItem[]>(() => {
  const items: EventTimelineItem[] = []

  if (form.value.starts_at) {
    items.push({
      id: 'event-start',
      raw: form.value.starts_at,
      rawEnd: form.value.ends_at || undefined,
      timeLabel: formatMaybeDateTime(form.value.starts_at),
      title: t('event.planning.eventStart'),
      meta: form.value.location || t('event.planning.locationMissing'),
      kind: 'event',
      typeLabel: t('event.planning.eventMilestone'),
    })
  }

  if (form.value.ends_at) {
    items.push({
      id: 'event-end',
      raw: form.value.ends_at,
      timeLabel: formatMaybeDateTime(form.value.ends_at),
      title: t('event.planning.eventEnd'),
      meta: t('event.planning.timetableSections.afterHint'),
      kind: 'event',
      typeLabel: t('event.planning.eventMilestone'),
    })
  }

  planningTasks.value
    .filter(task => task.deadline)
    .forEach((task) => {
      items.push({
        id: `task-${task.id}`,
        raw: task.deadline || '',
        timeLabel: formatMaybeDateTime(task.deadline || ''),
        title: task.title,
        meta: taskAssigneeSummary(task),
        kind: 'task',
        typeLabel: t('event.planning.taskDeadline'),
        status: task.status,
      })
    })

  shiftSlots.value.forEach((shift) => {
    items.push({
      id: `shift-${shift.id}`,
      raw: shift.startsAt || String(shift.id),
      rawEnd: shift.endsAt || undefined,
      timeLabel: `${formatMaybeDateTime(shift.startsAt)} – ${formatMaybeDateTime(shift.endsAt)}`,
      title: shift.name,
      meta: shift.memberIds.length
        ? shift.memberIds.map(memberLabel).join(', ')
        : t('event.planning.unstaffed'),
      kind: 'shift',
      typeLabel: t('event.planning.shift'),
      requiredPeople: shift.requiredPeople,
      memberCount: shift.memberIds.length,
    })
  })

  return items.sort((a, b) => new Date(a.raw).getTime() - new Date(b.raw).getTime())
})

function timelineItemDotClass(item: EventTimelineItem): string {
  if (item.kind === 'task') return 'bg-orange-400'
  if (item.kind === 'shift') {
    if (item.memberCount !== undefined && item.requiredPeople !== undefined)
      return item.memberCount >= item.requiredPeople ? 'bg-emerald-400' : 'bg-amber-400'
    return 'bg-amber-400'
  }
  return 'bg-slate-300'
}

function formatMaybeDateTime(value: string) {
  if (!value) return t('common.notAvailable')
  try {
    if (value.length <= 10) return formatDate(value)
    return formatDateTime(value)
  }
  catch {
    return value
  }
}

function memberLabel(memberId: number) {
  return members.value.find(m => m.id === memberId)?.full_name ?? String(memberId)
}

function subdivisionLabel(subdivisionId: number) {
  const sub = subdivisions.value.find(s => s.id === subdivisionId)
  return sub ? `${sub.code} - ${sub.name}` : String(subdivisionId)
}

function taskAssigneeSummary(task: EventPlanningTask) {
  const labels = [...task.memberIds.map(memberLabel), ...task.subdivisionIds.map(subdivisionLabel)]
  return labels.length ? labels.join(', ') : t('event.planning.unassigned')
}

function setTaskDone(taskId: number, done: boolean) {
  const next = planningTasks.value.map(task =>
    task.id === taskId ? { ...task, status: (done ? 'done' : 'open') as EventPlanningTaskStatus } : task,
  )
  planningTasks.value = next
  saveEventTasks(next)
}
</script>
