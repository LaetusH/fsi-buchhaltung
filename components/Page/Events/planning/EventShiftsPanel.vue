<template>
  <section class="rounded-xl bg-white p-4 shadow-lg">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">{{ t('event.planning.shifts') }}</h2>
        <p class="text-sm text-slate-500">{{ shiftModeHint }}</p>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-2">
        <div class="inline-flex rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium cursor-pointer"
            :class="permissionMode === 'own' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'"
            :disabled="!canSelfSignup"
            @click="permissionMode = 'own'"
          >
            {{ t('event.planning.ownOnly') }}
          </button>
          <button
            v-if="canManage"
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium cursor-pointer"
            :class="permissionMode === 'manage' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'"
            @click="permissionMode = 'manage'"
          >
            {{ t('event.planning.manageAll') }}
          </button>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium cursor-pointer"
          :class="showUnderstaffedOnly ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
          :disabled="loading"
          @click="showUnderstaffedOnly = !showUnderstaffedOnly"
        >
          <Icon name="material-symbols:warning-rounded" />
          {{ t('event.planning.showUnderstaffedOnly') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium cursor-pointer"
          :class="showMyShiftsOnly ? 'border-sky-300 bg-sky-50 text-sky-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
          :disabled="loading"
          @click="showMyShiftsOnly = !showMyShiftsOnly"
        >
          <Icon name="material-symbols:person-rounded" />
          {{ t('event.planning.showMyShiftsOnly') }}
        </button>
      </div>
    </div>

    <div v-if="permissionMode === 'manage' && canManage" class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div class="grid gap-3 sm:grid-cols-4 sm:items-end lg:grid-cols-3 lg:items-end xl:grid-cols-[minmax(10rem,1fr)_12rem_12rem_6rem_7rem_auto]">
        <div class="sm:col-span-4 lg:col-span-1">
          <label class="text-xs font-medium text-slate-500">{{ t('event.planning.shiftName') }}</label>
          <input v-model="newShift.name" class="input mt-1" :disabled="disabled || saving">
        </div>
        <div class="sm:col-span-2 lg:col-span-1">
          <label class="text-xs font-medium text-slate-500">{{ t('event.planning.startTime') }}</label>
          <CommonDateInput v-model="newShift.startsAt" mode="datetime" class="mt-1" :disabled="disabled || saving" />
        </div>
        <div class="sm:col-span-2 lg:col-span-1">
          <label class="text-xs font-medium text-slate-500">{{ t('event.planning.endTime') }}</label>
          <CommonDateInput v-model="newShift.endsAt" mode="datetime" class="mt-1" :disabled="disabled || saving" />
        </div>
        <div class="sm:col-span-1">
          <label class="text-xs font-medium text-slate-500">{{ t('event.planning.requiredPeople') }}</label>
          <input
            :value="newShift.requiredPeople"
            type="text"
            inputmode="numeric"
            pattern="[1-9][0-9]*"
            class="input mt-1"
            :disabled="disabled || saving"
            @input="newShift.requiredPeople = sanitizeIntegerInput(($event.target as HTMLInputElement).value)"
            @blur="newShift.requiredPeople = String(parseRequiredPeople(newShift.requiredPeople))"
          >
        </div>
        <div class="sm:col-span-1">
          <label class="text-xs font-medium text-slate-500">{{ t('event.planning.splitIntoShifts') }}</label>
          <input
            :value="newShift.consecutiveCount"
            type="text"
            inputmode="numeric"
            pattern="[1-9][0-9]*"
            class="input mt-1"
            :disabled="disabled || saving"
            @input="newShift.consecutiveCount = sanitizeIntegerInput(($event.target as HTMLInputElement).value)"
            @blur="newShift.consecutiveCount = String(parseRequiredPeople(newShift.consecutiveCount))"
          >
        </div>
        <button
          type="button"
          class="btn-primary inline-flex items-center justify-center gap-2 h-9.5 sm:col-span-2 lg:col-span-1 lg:w-full xl:w-auto"
          :disabled="disabled || saving || !newShift.name.trim()"
          @click="addConsecutiveShiftsFromInput"
        >
          <Icon name="material-symbols:add-rounded" />
          {{ t('event.planning.addShift') }}
        </button>
      </div>
    </div>

    <div class="mt-4 space-y-4">
      <div
        v-for="section in timetableSections"
        :key="section.key"
        class="overflow-hidden rounded-lg border border-slate-200"
        :class="section.borderClass"
      >
        <div class="flex items-center justify-between gap-3 px-3 py-2" :class="section.headerClass">
          <div>
            <p class="text-sm font-semibold text-slate-900">{{ section.label }}</p>
            <p class="text-xs text-slate-500">{{ section.description }}</p>
          </div>
        </div>

        <div class="event-shift-scroll overflow-x-auto overscroll-x-none">
          <div class="min-w-full" :style="section.timetableStyle">
            <div class="grid border-y border-slate-200 bg-slate-100 text-xs font-semibold uppercase text-slate-500" :style="section.timetableStyle">
              <span class="sticky left-0 z-20 bg-slate-100 px-3 py-2 shadow-[2px_0_0_rgba(226,232,240,0.9)]">{{ t('event.planning.timeBlock') }}</span>
              <div
                v-for="column in section.columns"
                :key="column.key"
                class="min-w-0 border-l border-slate-200 px-2 py-1.5"
              >
                <button
                  type="button"
                  class="flex w-full gap-2 rounded px-1 py-0.5 text-left hover:bg-white cursor-pointer"
                  :class="column.collapsed ? 'min-h-12 flex-col items-stretch justify-between' : 'items-center justify-between'"
                  :title="column.collapsed ? t('event.planning.expandShiftColumn') : t('event.planning.collapseShiftColumn')"
                  @click="toggleColumn(section.key, column.key)"
                >
                  <span class="min-w-0 w-full">
                    <span class="flex min-w-0 items-center gap-1">
                      <span class="block min-w-0 truncate" :class="column.collapsed ? 'text-[0.7rem] leading-tight' : ''">{{ column.label }}</span>
                      <Icon :name="column.collapsed ? 'material-symbols:unfold-more-rounded' : 'material-symbols:unfold-less-rounded'" class="shrink-0 text-base" />
                    </span>
                    <span class="block truncate text-[0.65rem] normal-case" :class="column.hasUnderstaffed ? 'text-amber-700' : 'text-emerald-700'">
                      {{ t('event.planning.staffedCount', { current: column.assignedPeople, required: column.requiredPeople }) }}
                    </span>
                  </span>
                </button>
              </div>
              <span class="sticky right-0 z-20 bg-slate-100 px-3 py-2 text-right shadow-[-2px_0_0_rgba(226,232,240,0.9)]" aria-hidden="true" />
            </div>

            <div class="divide-y divide-slate-200">
              <div
                v-for="group in section.groups"
                :key="group.key"
                class="grid"
                :class="section.rowClass"
                :style="section.timetableStyle"
              >
                <div class="sticky left-0 z-10 px-3 py-1.5 shadow-[2px_0_0_rgba(226,232,240,0.8)]" :class="section.rowClass">
                  <p class="text-sm font-semibold text-slate-900">{{ group.label }}</p>
                  <p class="text-[0.7rem] text-slate-500">{{ t('event.planning.parallelShiftCount', { count: group.shifts.length }) }}</p>
                </div>

                <div v-for="column in section.columns" :key="column.key" class="min-w-0 space-y-1 border-l border-slate-200 p-1.5">
                  <div
                    v-for="shift in shiftsForColumn(group, column.key)"
                    :key="shift.id"
                    class="rounded-md border border-slate-200 bg-slate-50 p-1.5"
                    :class="shiftStateClass(shift)"
                  >
                    <div v-if="column.collapsed" class="flex items-center justify-between gap-1">
                      <span class="text-[0.7rem] font-bold" :class="staffingClass(shift)">
                        {{ shift.memberIds.length }}/{{ shift.requiredPeople }}
                      </span>
                      <Icon
                        :name="isShiftFullyStaffed(shift) ? 'material-symbols:check-circle-rounded' : 'material-symbols:error-rounded'"
                        class="text-base"
                        :class="staffingIconClass(shift)"
                      />
                    </div>
                    <div v-else class="space-y-1">
                      <div class="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-2">
                        <div class="min-w-0">
                          <input
                            v-if="canManageShift(shift)"
                            :value="shiftNameInputValue(shift)"
                            class="input h-7 py-0.5 text-sm font-medium"
                            @focus="startShiftNameEdit(shift)"
                            @input="setShiftNameDraft(shift.id, ($event.target as HTMLInputElement).value)"
                            @blur="commitShiftName(shift)"
                          >
                          <p v-else class="truncate text-sm font-semibold text-slate-800">{{ shift.name }}</p>
                        </div>

                        <div class="flex items-center gap-0.5 text-sm font-bold" :class="staffingClass(shift)">
                          <span>{{ shift.memberIds.length }}</span>
                          <span class="text-slate-400">/</span>
                          <input
                            v-if="canEditShiftDetails"
                            :value="requiredPeopleInputValue(shift)"
                            type="text"
                            inputmode="numeric"
                            pattern="[1-9][0-9]*"
                            class="input h-7 w-7 px-1 py-0 text-center text-sm font-bold leading-none"
                            @focus="startRequiredPeopleEdit(shift)"
                            @input="setRequiredPeopleDraft(shift.id, ($event.target as HTMLInputElement).value)"
                            @blur="commitRequiredPeople(shift)"
                          >
                          <span v-else>{{ shift.requiredPeople }}</span>
                        </div>

                        <div class="flex items-start justify-end gap-1">
                          <button
                            v-if="permissionMode === 'own'"
                            type="button"
                            class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-sky-200 bg-sky-100 text-sky-700 hover:bg-sky-200 disabled:opacity-60 cursor-pointer"
                            :disabled="disabled || saving || !currentMemberOption"
                            :title="t('event.planning.assignMe')"
                            @click="assignCurrentMember(shift)"
                          >
                            <Icon name="material-symbols:person-add-rounded" />
                          </button>
                          <button
                            v-if="permissionMode === 'manage'"
                            type="button"
                            class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60 cursor-pointer"
                            :disabled="disabled || saving"
                            :title="t('actions.remove')"
                            @click="removeShift(shift.id)"
                          >
                            <Icon name="material-symbols:delete-rounded" />
                          </button>
                        </div>
                      </div>

                      <div class="space-y-1">
                        <div class="flex min-h-6 items-center justify-between gap-2 sm:hidden">
                          <span class="text-[0.7rem] font-medium text-slate-600">
                            {{ t('event.planning.staffedCount', { current: shift.memberIds.length, required: shift.requiredPeople }) }}
                          </span>
                          <button
                            type="button"
                            class="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
                            :title="isMembersExpanded(shift.id) ? t('event.planning.hideAssignedMembers') : t('event.planning.showAssignedMembers')"
                            @click="toggleMembers(shift.id)"
                          >
                            <Icon :name="isMembersExpanded(shift.id) ? 'material-symbols:expand-less-rounded' : 'material-symbols:expand-more-rounded'" />
                          </button>
                        </div>

                        <div class="hidden min-h-6 flex-wrap gap-1 sm:flex">
                          <span v-if="shift.memberIds.length === 0" class="rounded border border-dashed border-slate-300 bg-white px-1.5 py-0.5 text-[0.7rem] font-medium text-slate-500">
                            {{ t('event.planning.unassigned') }}
                          </span>
                          <span
                            v-for="memberId in shift.memberIds"
                            :key="memberId"
                            class="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[0.7rem] font-medium text-slate-700"
                          >
                            {{ memberLabel(memberId) }}
                            <button
                              v-if="canRemoveShiftMember(memberId)"
                              type="button"
                              class="inline-flex h-4 w-4 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                              :disabled="disabled || saving"
                              @click="removeShiftMember(shift.id, memberId)"
                            >
                              <Icon name="material-symbols:close-rounded" class="text-sm" />
                            </button>
                          </span>
                        </div>

                        <div v-if="isMembersExpanded(shift.id)" class="flex min-h-6 flex-wrap gap-1 sm:hidden">
                          <span v-if="shift.memberIds.length === 0" class="rounded border border-dashed border-slate-300 bg-white px-1.5 py-0.5 text-[0.7rem] font-medium text-slate-500">
                            {{ t('event.planning.unassigned') }}
                          </span>
                          <span
                            v-for="memberId in shift.memberIds"
                            :key="memberId"
                            class="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[0.7rem] font-medium text-slate-700"
                          >
                            {{ memberLabel(memberId) }}
                            <button
                              v-if="canRemoveShiftMember(memberId)"
                              type="button"
                              class="inline-flex h-4 w-4 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                              :disabled="disabled || saving"
                              @click="removeShiftMember(shift.id, memberId)"
                            >
                              <Icon name="material-symbols:close-rounded" class="text-sm" />
                            </button>
                          </span>
                        </div>

                        <CommonSearchSelect
                          v-if="permissionMode === 'manage' && !disabled && !saving"
                          class="event-shift-member-select"
                          :model-value="shift.memberQuery"
                          :options="shiftMemberOptions(shift.memberIds)"
                          :placeholder="t('event.planning.addMemberToShift')"
                          :empty-text="t('event.noMatchingMembers')"
                          menu-width="wide"
                          @update:model-value="updateShift(shift.id, { memberQuery: $event })"
                          @select="addShiftMember(shift.id, $event)"
                          @clear-selection="updateShift(shift.id, { memberQuery: '' })"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div class="sticky right-0 z-10 flex justify-end px-3 py-1.5 shadow-[-2px_0_0_rgba(226,232,240,0.8)]" :class="section.rowClass">
                  <button
                    v-if="permissionMode === 'manage'"
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-60 cursor-pointer"
                    :disabled="disabled || saving"
                    :title="t('event.planning.addParallelShift')"
                    @click="addParallelShift(group)"
                  >
                    <Icon name="material-symbols:add-rounded" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="timetableSections.length === 0"
        class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500"
      >
        {{ t('event.planning.noMatchingShifts') }}
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { SearchSelectOption } from '~/components/Common/SearchSelect.vue'
import { useI18n } from '~/composables/useI18n'
import type { EventMemberOption } from '~/types/event'
import type { EventShiftPermissionMode, PlanningShiftSlot } from './types'

type TimetableSectionKey = 'before' | 'during' | 'after'
type ShiftColumn = {
  key: string
  label: string
  firstStartsAt: string
  assignedPeople: number
  requiredPeople: number
  hasUnderstaffed: boolean
  collapsed: boolean
}

const props = defineProps<{
  members: EventMemberOption[]
  currentMemberId: number | null
  eventStartAt?: string
  eventEndAt?: string
  disabled?: boolean
  loading?: boolean
  saving?: boolean
  canManage?: boolean
  canSelfSignup?: boolean
}>()

const emit = defineEmits<{
  (e: 'save', value: PlanningShiftSlot[]): void
  (e: 'assign-self', shiftId: number): void
  (e: 'remove-self', shiftId: number): void
}>()

const slots = defineModel<PlanningShiftSlot[]>('slots', { required: true })
const permissionMode = defineModel<EventShiftPermissionMode>('permissionMode', { required: true })
const { t } = useI18n()

const newShift = reactive({
  name: t('event.planning.newShift'),
  startsAt: '',
  endsAt: '',
  requiredPeople: '1',
  consecutiveCount: '1',
})
const showUnderstaffedOnly = ref(false)
const showMyShiftsOnly = ref(false)
const collapsedColumnKeys = ref(new Set<string>())
const expandedMemberShiftIds = ref(new Set<number>())
const shiftNameDrafts = ref<Record<number, string>>({})
const requiredPeopleDrafts = ref<Record<number, string>>({})
const nextTemporaryShiftId = ref(-1)

const loading = computed(() => Boolean(props.loading))
const saving = computed(() => Boolean(props.saving))
const canManage = computed(() => Boolean(props.canManage))
const canSelfSignup = computed(() => Boolean(props.canSelfSignup))
const shiftModeHint = computed(() => permissionMode.value === 'own'
  ? t('event.planning.shiftSelfSignupHint')
  : t('event.planning.shiftManageHint'))

const currentMemberOption = computed(() => props.currentMemberId
  ? props.members.find(member => member.id === props.currentMemberId) ?? null
  : null)
const normalizedEndsAt = computed(() => {
  const normalizedEnd = normalizeDateTimeInput(newShift.endsAt)
  const normalizedStart = normalizeDateTimeInput(newShift.startsAt) ?? newShift.startsAt
  if (normalizedEnd && normalizedEnd > normalizedStart) return normalizedEnd
  return addMinutes(newShift.startsAt, 60) ?? newShift.startsAt
})
const eventStartAt = computed(() => normalizeDateTimeInput(props.eventStartAt))
const eventEndAt = computed(() => normalizeDateTimeInput(props.eventEndAt))
const visibleDayCount = computed(() => new Set(visibleSlots.value.map(shift => dayKeyForShift(shift))).size)

watch(
  () => [props.eventStartAt, props.eventEndAt] as const,
  () => {
    if (!newShift.startsAt) newShift.startsAt = normalizeDateTimeInput(props.eventStartAt) ?? defaultDateTimeInput('18:00')
    if (!newShift.endsAt) newShift.endsAt = normalizeDateTimeInput(props.eventEndAt) ?? addMinutes(newShift.startsAt, 60) ?? defaultDateTimeInput('19:00')
  },
  { immediate: true },
)

const sortedSlots = computed(() => [...slots.value].sort((left, right) => {
  return left.startsAt.localeCompare(right.startsAt)
    || left.endsAt.localeCompare(right.endsAt)
    || left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
}))
const visibleSlots = computed(() => sortedSlots.value.filter((shift) => {
  if (showUnderstaffedOnly.value && isShiftFullyStaffed(shift)) return false
  if (showMyShiftsOnly.value && (!props.currentMemberId || !shift.memberIds.includes(props.currentMemberId))) return false
  return true
}))
const canEditShiftDetails = computed(() => !props.disabled && !saving.value && canManage.value && permissionMode.value === 'manage')
const timetableSections = computed(() => {
  const baseSectionDefinitions: Array<{
    key: TimetableSectionKey
    label: string
    description: string
    rowClass: string
    headerClass: string
    borderClass: string
  }> = [
    {
      key: 'before',
      label: t('event.planning.timetableSections.before'),
      description: t('event.planning.timetableSections.beforeHint'),
      rowClass: 'bg-orange-50/70',
      headerClass: 'bg-orange-50',
      borderClass: 'border-orange-200',
    },
    {
      key: 'during',
      label: t('event.planning.timetableSections.during'),
      description: t('event.planning.timetableSections.duringHint'),
      rowClass: 'bg-white',
      headerClass: 'bg-slate-50',
      borderClass: 'border-slate-200',
    },
    {
      key: 'after',
      label: t('event.planning.timetableSections.after'),
      description: t('event.planning.timetableSections.afterHint'),
      rowClass: 'bg-orange-50/70',
      headerClass: 'bg-orange-50',
      borderClass: 'border-orange-200',
    },
  ]
  const dayKeys = Array.from(new Set(visibleSlots.value.map(shift => dayKeyForShift(shift)))).sort()
  const sectionDefinitions = dayKeys.flatMap(dayKey => baseSectionDefinitions.map(section => ({
    ...section,
    key: `${dayKey}:${section.key}`,
    sectionKey: section.key,
    dayKey,
    label: visibleDayCount.value > 1 ? `${formatDayLabel(dayKey)} · ${section.label}` : section.label,
  })))

  return sectionDefinitions
    .map((section) => {
      const sectionShifts = visibleSlots.value.filter(shift => dayKeyForShift(shift) === section.dayKey && sectionKeyForShift(shift) === section.sectionKey)
      const columns = buildShiftColumns(section.key, sectionShifts)
      const groups = buildTimeGroups(sectionShifts)
      const columnWidth = columns.map(column => column.collapsed ? '6rem' : 'minmax(15rem, 1fr)').join(' ') || 'minmax(15rem, 1fr)'

      return {
        ...section,
        shifts: sectionShifts,
        columns,
        groups,
        timetableStyle: {
          gridTemplateColumns: `8rem ${columnWidth} 3rem`,
          minWidth: `calc(11rem + ${columns.reduce((total, column) => total + (column.collapsed ? 6 : 15), 0)}rem)`,
        },
      }
    })
    .filter(section => section.shifts.length > 0)
})

function buildShiftColumns(sectionKey: string, shifts: PlanningShiftSlot[]): ShiftColumn[] {
  const columns = new Map<string, ShiftColumn>()

  for (const shift of shifts) {
    const key = normalizeShiftColumnKey(shift.name)
    const existingColumn = columns.get(key)

    if (existingColumn) {
      existingColumn.assignedPeople += shift.memberIds.length
      existingColumn.requiredPeople += shift.requiredPeople
      existingColumn.hasUnderstaffed = existingColumn.hasUnderstaffed || !isShiftFullyStaffed(shift)
      continue
    }

    columns.set(key, {
      key,
      label: shift.name.trim() || t('event.planning.newShift'),
      firstStartsAt: shift.startsAt,
      assignedPeople: shift.memberIds.length,
      requiredPeople: shift.requiredPeople,
      hasUnderstaffed: !isShiftFullyStaffed(shift),
      collapsed: isColumnCollapsed(sectionKey, key),
    })
  }

  return Array.from(columns.values()).sort((left, right) => {
    return left.firstStartsAt.localeCompare(right.firstStartsAt)
      || left.label.localeCompare(right.label, undefined, { sensitivity: 'base' })
  })
}

function buildTimeGroups(shifts: PlanningShiftSlot[]) {
  const groups = new Map<string, PlanningShiftSlot[]>()

  for (const shift of shifts) {
    const key = `${shift.startsAt}-${shift.endsAt}`
    const group = groups.get(key) ?? []
    group.push(shift)
    groups.set(key, group)
  }

  return Array.from(groups.entries()).map(([key, shifts]) => ({
    key,
    startsAt: shifts[0]?.startsAt ?? '',
    endsAt: shifts[0]?.endsAt ?? '',
    label: formatShiftRangeLabel(shifts[0]?.startsAt ?? '', shifts[0]?.endsAt ?? ''),
    shifts,
  }))
}

function normalizeShiftColumnKey(value: string) {
  return (value.trim() || t('event.planning.newShift')).toLocaleLowerCase()
}

function sectionKeyForShift(shift: PlanningShiftSlot): TimetableSectionKey {
  if (eventStartAt.value && shift.endsAt <= eventStartAt.value) return 'before'
  if (eventEndAt.value && shift.startsAt >= eventEndAt.value) return 'after'
  return 'during'
}

function shiftsForColumn(group: { shifts: PlanningShiftSlot[] }, columnKey: string) {
  return group.shifts.filter(shift => normalizeShiftColumnKey(shift.name) === columnKey)
}

function columnStateKey(sectionKey: string, columnKey: string) {
  return `${sectionKey}:${columnKey}`
}

function isColumnCollapsed(sectionKey: string, columnKey: string) {
  return collapsedColumnKeys.value.has(columnStateKey(sectionKey, columnKey))
}

function toggleColumn(sectionKey: string, columnKey: string) {
  const nextKeys = new Set(collapsedColumnKeys.value)
  const stateKey = columnStateKey(sectionKey, columnKey)

  if (nextKeys.has(stateKey)) {
    nextKeys.delete(stateKey)
  } else {
    nextKeys.add(stateKey)
  }

  collapsedColumnKeys.value = nextKeys
}

function isMembersExpanded(shiftId: number) {
  return expandedMemberShiftIds.value.has(shiftId)
}

function toggleMembers(shiftId: number) {
  const nextIds = new Set(expandedMemberShiftIds.value)

  if (nextIds.has(shiftId)) {
    nextIds.delete(shiftId)
  } else {
    nextIds.add(shiftId)
  }

  expandedMemberShiftIds.value = nextIds
}

function memberLabel(memberId: number) {
  return props.members.find(member => member.id === memberId)?.full_name ?? String(memberId)
}

function shiftMemberOptions(selectedIds: number[]): SearchSelectOption<EventMemberOption>[] {
  return props.members
    .filter(member => !selectedIds.includes(member.id))
    .map(member => ({
      key: member.id,
      label: member.full_name,
      value: member,
      searchText: member.full_name,
    }))
}

function persistSlots(nextSlots: PlanningShiftSlot[]) {
  slots.value = nextSlots
  emit('save', nextSlots)
}

function assignCurrentMember(shift: PlanningShiftSlot) {
  if (!currentMemberOption.value) return
  if (permissionMode.value === 'own') {
    emit('assign-self', shift.id)
    return
  }

  addShiftMember(shift.id, currentMemberOption.value)
}

function addShiftMember(shiftId: number, value: unknown) {
  const member = value as EventMemberOption | null
  if (!member?.id) return

  const nextSlots = slots.value.map((shift) => {
    if (shift.id !== shiftId || shift.memberIds.includes(member.id)) return shift
    return { ...shift, memberIds: [...shift.memberIds, member.id], memberQuery: '' }
  })
  persistSlots(nextSlots)
}

function removeShiftMember(shiftId: number, memberId: number) {
  if (permissionMode.value === 'own') {
    if (memberId === props.currentMemberId) emit('remove-self', shiftId)
    return
  }

  const nextSlots = slots.value.map((shift) => {
    if (shift.id !== shiftId) return shift
    return { ...shift, memberIds: shift.memberIds.filter(id => id !== memberId) }
  })
  persistSlots(nextSlots)
}

function canRemoveShiftMember(memberId: number) {
  return permissionMode.value === 'manage' || memberId === props.currentMemberId
}

function addParallelShift(group: { startsAt: string, endsAt: string }) {
  persistSlots([
    ...slots.value,
    createRegularShift(newShift.name.trim() || t('event.planning.newShift'), group.startsAt, group.endsAt, parseRequiredPeople(newShift.requiredPeople)),
  ])
}

function addConsecutiveShiftsFromInput() {
  const count = parseRequiredPeople(newShift.consecutiveCount)
  const startDate = parseDateTimeInput(normalizeDateTimeInput(newShift.startsAt) ?? '')
  const endDate = parseDateTimeInput(normalizedEndsAt.value)
  if (!startDate || !endDate || endDate.getTime() <= startDate.getTime()) return

  const totalMinutes = Math.floor((endDate.getTime() - startDate.getTime()) / 60000)
  const duration = Math.floor(totalMinutes / count)
  if (duration < 1) return

  const requiredPeople = parseRequiredPeople(newShift.requiredPeople)
  const nextShifts: PlanningShiftSlot[] = []

  for (let index = 0; index < count; index += 1) {
    const shiftStart = new Date(startDate.getTime() + (duration * index * 60000))
    const shiftEnd = index === count - 1
      ? endDate
      : new Date(startDate.getTime() + (duration * (index + 1) * 60000))
    const startsAt = formatDateTimeInput(shiftStart)
    const endsAt = formatDateTimeInput(shiftEnd)

    nextShifts.push(createRegularShift(newShift.name.trim(), startsAt, endsAt, requiredPeople))
  }

  if (!nextShifts.length) return

  persistSlots([
    ...slots.value,
    ...nextShifts,
  ])
}

function createRegularShift(name: string, startsAt: string, endsAt: string, requiredPeople: number): PlanningShiftSlot {
  return {
    id: nextTemporaryShiftId.value--,
    name,
    startsAt,
    endsAt,
    requiredPeople: Math.max(Number(requiredPeople) || 1, 1),
    memberIds: [],
    memberQuery: '',
  }
}

function removeShift(shiftId: number) {
  const nextSlots = slots.value.filter(shift => shift.id !== shiftId)
  const nextIds = new Set(expandedMemberShiftIds.value)
  const nextNameDrafts = { ...shiftNameDrafts.value }
  const nextRequiredPeopleDrafts = { ...requiredPeopleDrafts.value }

  nextIds.delete(shiftId)
  delete nextNameDrafts[shiftId]
  delete nextRequiredPeopleDrafts[shiftId]

  expandedMemberShiftIds.value = nextIds
  shiftNameDrafts.value = nextNameDrafts
  requiredPeopleDrafts.value = nextRequiredPeopleDrafts
  persistSlots(nextSlots)
}

function updateShift(shiftId: number, patch: Partial<PlanningShiftSlot>, persist = false) {
  const nextSlots = slots.value.map(shift => shift.id === shiftId ? { ...shift, ...patch } : shift)
  if (persist) {
    persistSlots(nextSlots)
  } else {
    slots.value = nextSlots
  }
}

function shiftNameInputValue(shift: PlanningShiftSlot) {
  return shiftNameDrafts.value[shift.id] ?? shift.name
}

function startShiftNameEdit(shift: PlanningShiftSlot) {
  setShiftNameDraft(shift.id, shift.name)
}

function setShiftNameDraft(shiftId: number, value: string) {
  shiftNameDrafts.value = { ...shiftNameDrafts.value, [shiftId]: value }
}

function commitShiftName(shift: PlanningShiftSlot) {
  const draft = shiftNameDrafts.value[shift.id]
  const nextName = draft?.trim() || t('event.planning.newShift')
  const nextDrafts = { ...shiftNameDrafts.value }

  delete nextDrafts[shift.id]
  shiftNameDrafts.value = nextDrafts
  updateShift(shift.id, { name: nextName }, true)
}

function requiredPeopleInputValue(shift: PlanningShiftSlot) {
  return requiredPeopleDrafts.value[shift.id] ?? String(shift.requiredPeople)
}

function startRequiredPeopleEdit(shift: PlanningShiftSlot) {
  setRequiredPeopleDraft(shift.id, String(shift.requiredPeople))
}

function setRequiredPeopleDraft(shiftId: number, value: string) {
  requiredPeopleDrafts.value = { ...requiredPeopleDrafts.value, [shiftId]: sanitizeIntegerInput(value) }
}

function commitRequiredPeople(shift: PlanningShiftSlot) {
  const nextRequiredPeople = parseRequiredPeople(requiredPeopleDrafts.value[shift.id] ?? String(shift.requiredPeople))
  const nextDrafts = { ...requiredPeopleDrafts.value }

  delete nextDrafts[shift.id]
  requiredPeopleDrafts.value = nextDrafts
  updateShift(shift.id, { requiredPeople: nextRequiredPeople }, true)
}

function canManageShift(_shift: PlanningShiftSlot) {
  return canEditShiftDetails.value
}

function parseRequiredPeople(value: string) {
  const parsed = Number(sanitizeIntegerInput(value))
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function sanitizeIntegerInput(value: string) {
  return value.replace(/\D/g, '')
}

function parseDateTimeInput(value: string) {
  if (!value) return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hours = Number(match[4])
  const minutes = Number(match[5])
  const date = new Date(year, month - 1, day, hours, minutes)
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
    || date.getHours() !== hours
    || date.getMinutes() !== minutes
  ) {
    return null
  }

  return Number.isNaN(date.getTime()) ? null : date
}

function normalizeDateTimeInput(value?: string) {
  if (!value) return null
  const trimmed = value.trim().replace(' ', 'T')
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) return trimmed.slice(0, 16)

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : formatDateTimeInput(parsed)
}

function formatDateTimeInput(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  const hours = String(value.getHours()).padStart(2, '0')
  const minutes = String(value.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function defaultDateTimeInput(time: string) {
  const date = eventStartAt.value?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
  return `${date}T${time}`
}

function addMinutes(value: string, minutes: number) {
  const date = parseDateTimeInput(value)
  if (!date) return null
  return formatDateTimeInput(new Date(date.getTime() + (minutes * 60000)))
}

function dayKeyForShift(shift: PlanningShiftSlot) {
  return shift.startsAt.slice(0, 10) || 'unknown'
}

function formatDayLabel(dayKey: string) {
  if (dayKey === 'unknown') return t('event.planning.dateMissing')
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${dayKey}T00:00`))
}

function formatTimeLabel(value: string) {
  return value.slice(11, 16) || value
}

function formatShiftRangeLabel(startsAt: string, endsAt: string) {
  if (!startsAt || !endsAt) return ''
  if (startsAt.slice(0, 10) === endsAt.slice(0, 10)) {
    return `${formatTimeLabel(startsAt)} - ${formatTimeLabel(endsAt)}`
  }

  return `${formatDayLabel(startsAt.slice(0, 10))} ${formatTimeLabel(startsAt)} - ${formatDayLabel(endsAt.slice(0, 10))} ${formatTimeLabel(endsAt)}`
}

function staffingClass(shift: PlanningShiftSlot) {
  if (isShiftFullyStaffed(shift)) return 'text-emerald-700'
  if (shift.memberIds.length === 0) return 'text-red-700'
  return 'text-amber-700'
}

function staffingIconClass(shift: PlanningShiftSlot) {
  if (isShiftFullyStaffed(shift)) return 'text-emerald-600'
  if (shift.memberIds.length === 0) return 'text-red-600'
  return 'text-amber-600'
}

function shiftStateClass(shift: PlanningShiftSlot) {
  if (isShiftFullyStaffed(shift)) {
    return 'border-l-4 border-l-emerald-500'
  }

  if (shift.memberIds.length === 0) {
    return 'border-l-4 border-l-red-500'
  }

  return 'border-l-4 border-l-amber-500'
}

function isShiftFullyStaffed(shift: PlanningShiftSlot) {
  return shift.memberIds.length >= shift.requiredPeople
}
</script>

<style scoped>
.event-shift-scroll {
  background:
    linear-gradient(to right, rgb(241 245 249) 0, rgb(241 245 249) 8rem, transparent 8rem),
    white;
  scrollbar-width: thin;
  scrollbar-color: rgb(148 163 184) rgb(226 232 240);
}

.event-shift-scroll::-webkit-scrollbar {
  height: 0.75rem;
}

.event-shift-scroll::-webkit-scrollbar-track {
  background: rgb(226 232 240);
}

.event-shift-scroll::-webkit-scrollbar-thumb {
  background: rgb(148 163 184);
  border: 0.2rem solid rgb(226 232 240);
  border-radius: 999px;
}

.event-shift-member-select :deep(input) {
  height: 1.75rem;
  padding-top: 0.125rem;
  padding-bottom: 0.125rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
}
</style>
