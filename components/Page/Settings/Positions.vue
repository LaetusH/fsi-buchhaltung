<template>
  <PageSettingsEntityManager
    :title="t('settings.entities.positions')"
    :singular-label="t('settings.entities.position')"
    :add-label="t('settings.entities.newPosition')"
    :empty-label="t('settings.entities.noPositions')"
    list-endpoint="/api/positions/manage"
    save-endpoint="/api/positions/save"
    activate-endpoint="/api/positions/activate"
    response-list-key="positions"
    :extra-columns="tableColumns"
    :can-manage="hasAccess"
    :create-item="createItem"
    :map-edit-item="mapEditItem"
    modal-width-class="max-w-3xl"
    :on-error="handleError"
  >
    <template #row-extra="{ item }">
      <td class="py-2 align-top text-slate-600">
        {{ currentMemberSummary(item) }}
      </td>
    </template>

    <template #modal-fields-after-description="{ editingItem }">
      <div class="space-y-4 pt-1">
        <div class="rounded-lg border border-slate-200 p-4 space-y-3 relative z-20">
          <div class="flex items-center justify-between gap-3">
            <h4 class="font-medium text-slate-900">{{ t('settings.positions.manageAssignments') }}</h4>

            <button
              type="button"
              class="btn-primary flex items-center gap-2"
              @click="addAssignment(editingItem)"
            >
              + {{ t('settings.positions.addMember') }}
            </button>
          </div>

          <p v-if="visibleAssignments(editingItem).length === 0" class="text-sm text-slate-500">
            {{ t('settings.positions.noMembersAssigned') }}
          </p>

          <div
            v-else
            ref="assignmentListRef"
            :class="[
              'position-assignment-scroll max-h-104 overflow-y-auto',
              hasAssignmentScrollbar ? 'pr-1' : '',
            ]"
          >
            <div
              v-for="{ assignment, index, state } in visibleAssignments(editingItem)"
              :key="assignmentRowKey(assignment, index)"
              class="relative z-0 rounded-lg border border-slate-200 p-3 space-y-3 not-last:mb-3 focus-within:z-20"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <div class="font-medium text-slate-800">{{ assignmentLabel(assignment) }}</div>

                    <span
                      v-if="state !== 'draft'"
                      :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', assignmentStateClass(state)]"
                    >
                      {{ assignmentStateLabel(state) }}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  class="text-red-500 cursor-pointer p-2 w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center"
                  @click="removeAssignment(index, editingItem)"
                >
                  ✕
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-[3fr_2fr_2fr] gap-2 items-center">
                <CommonSearchSelect
                  class="relative z-10"
                  v-model="assignment.member_query"
                  :options="memberSearchOptions"
                  :selected-label="selectedMemberLabel(assignment)"
                  :placeholder="t('settings.positions.memberPlaceholder')"
                  :empty-text="t('settings.positions.noMembersAvailable')"
                  @select="selectMember(index, $event, editingItem)"
                  @clear-selection="clearMemberSelection(index, editingItem)"
                />

                <input v-model="assignment.since" type="date" class="input">
                <input
                  :value="assignment.until || ''"
                  type="date"
                  class="input"
                  @input="updateUntil(index, $event, editingItem)"
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </PageSettingsEntityManager>
</template>

<script setup lang="ts">
import type { SearchSelectOption } from '~/components/Common/SearchSelect.vue'
import type { EntityManagerColumn, SaveSettingsEntityBody, SettingsEntityRow } from '~/components/Page/Settings/EntityManager.vue'
import { useAuth } from '~/composables/useAuth'
import { useI18n } from '~/composables/useI18n'
import { useToast } from '~/composables/useToast'
import { MemberStatus } from '~/types/member'
import type {
  PositionMemberAssignment,
  PositionMemberOption,
  PositionRow,
  SavePositionAssignmentBody,
  SavePositionBody,
} from '~/types/position'

interface EditablePositionAssignment extends SavePositionAssignmentBody {
  member_query: string
  full_name?: string
  subject_name?: string | null
  status?: MemberStatus
}

interface EditablePosition extends SavePositionBody {
  assignments: EditablePositionAssignment[]
}

type AssignmentState = 'current' | 'upcoming' | 'past' | 'draft'

const { t } = useI18n()
const toast = useToast()
const { hasPermission } = useAuth()

const hasAccess = computed(() => hasPermission('settings.positions.manage'))
const memberOptions = ref<PositionMemberOption[]>([])
const assignmentListRef = ref<HTMLElement | null>(null)
const hasAssignmentScrollbar = ref(false)

let assignmentListResizeObserver: ResizeObserver | null = null
let assignmentListMutationObserver: MutationObserver | null = null

const tableColumns = computed<EntityManagerColumn[]>(() => [
  {
    key: 'members',
    label: t('settings.positions.members'),
  },
])

const memberOptionsById = computed(() => {
  return new Map(memberOptions.value.map(member => [member.id, member]))
})

const memberSearchOptions = computed<SearchSelectOption<PositionMemberOption>[]>(() => memberOptions.value.map(member => ({
  key: member.id,
  label: member.full_name,
  value: member,
  searchText: `${member.full_name}`.trim(),
})))

function todayValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function statusLabel(status: MemberStatus) {
  if (status === MemberStatus.Active) return t('member.states.active')
  if (status === MemberStatus.Passive) return t('member.states.passive')
  if (status === MemberStatus.Hold) return t('member.states.hold')
  return t('member.states.left')
}

function positionRow(item: SettingsEntityRow) {
  return item as PositionRow
}

function positionBody(editingItem: SaveSettingsEntityBody) {
  return editingItem as EditablePosition
}

function assignmentRowKey(assignment: EditablePositionAssignment, index: number) {
  return assignment.id ? `assignment-${assignment.id}` : `draft-${index}`
}

function createAssignment(assignment?: Partial<PositionMemberAssignment>): EditablePositionAssignment {
  return {
    id: assignment?.id,
    member_id: assignment?.member_id ?? 0,
    since: assignment?.since ?? '',
    until: assignment?.until ?? null,
    member_query: assignment?.full_name ?? '',
    full_name: assignment?.full_name,
  }
}

function createItem(): EditablePosition {
  return {
    code: '',
    name: '',
    description: '',
    assignments: [],
  }
}

function mapEditItem(item: SettingsEntityRow): EditablePosition {
  const position = positionRow(item)
  return {
    id: position.id,
    code: position.code,
    name: position.name,
    description: position.description,
    is_active: position.is_active,
    assignments: (position.assignments ?? [])
      .slice()
      .sort(compareExistingAssignments)
      .map(assignment => createAssignment(assignment)),
  }
}

function compareExistingAssignments(
  left: Partial<PositionMemberAssignment>,
  right: Partial<PositionMemberAssignment>,
) {
  const leftSince = left.since || ''
  const rightSince = right.since || ''

  return rightSince.localeCompare(leftSince)
}

function assignmentLabel(assignment: EditablePositionAssignment) {
  const member = memberOptionsById.value.get(assignment.member_id)
  return member?.full_name || assignment.full_name || assignment.member_query || t('common.notAvailable')
}

function isCurrentAssignment(assignment: EditablePositionAssignment) {
  const today = todayValue()
  return Boolean(assignment.member_id)
    && Boolean(assignment.since)
    && assignment.since <= today
    && (!assignment.until || assignment.until >= today)
}

function isUpcomingAssignment(assignment: EditablePositionAssignment) {
  const today = todayValue()
  return Boolean(assignment.member_id) && Boolean(assignment.since) && assignment.since > today
}

function isPastAssignment(assignment: EditablePositionAssignment) {
  const today = todayValue()
  const until = assignment.until
  return Boolean(assignment.member_id)
    && typeof until === 'string'
    && until.length > 0
    && until < today
}

function assignmentState(assignment: EditablePositionAssignment): AssignmentState {
  if (isCurrentAssignment(assignment)) return 'current'
  if (isUpcomingAssignment(assignment)) return 'upcoming'
  if (isPastAssignment(assignment)) return 'past'
  return 'draft'
}

function assignmentStateLabel(state: AssignmentState) {
  if (state === 'current') return t('settings.positions.currentBadge')
  if (state === 'upcoming') return t('settings.positions.upcomingBadge')
  if (state === 'past') return t('settings.positions.pastBadge')
  return ''
}

function assignmentStateClass(state: AssignmentState) {
  if (state === 'current') return 'bg-emerald-100 text-emerald-800'
  if (state === 'upcoming') return 'bg-amber-100 text-amber-800'
  if (state === 'past') return 'bg-slate-200 text-slate-700'
  return 'bg-slate-100 text-slate-700'
}

function visibleAssignments(editingItem: SaveSettingsEntityBody) {
  return positionBody(editingItem).assignments
    .map((assignment, index) => ({
      assignment,
      index,
      state: assignmentState(assignment),
    }))
}

function currentAssignmentsForItem(item: SettingsEntityRow) {
  return (positionRow(item).assignments ?? [])
    .map(assignment => createAssignment(assignment))
    .filter(isCurrentAssignment)
}

function currentMemberSummary(item: SettingsEntityRow) {
  const assignments = currentAssignmentsForItem(item)
  if (!assignments.length) return t('settings.positions.noCurrentMembers')

  const labels = assignments.map(assignment => assignmentLabel(assignment))
  if (labels.length <= 3) return labels.join(', ')
  return `${labels.slice(0, 3).join(', ')} +${labels.length - 3}`
}

function selectedMemberLabel(assignment: EditablePositionAssignment) {
  if (!assignment.member_id) return ''
  return assignmentLabel(assignment)
}

function addAssignment(editingItem: SaveSettingsEntityBody) {
  positionBody(editingItem).assignments.unshift(createAssignment())
}

function removeAssignment(index: number, editingItem: SaveSettingsEntityBody) {
  positionBody(editingItem).assignments.splice(index, 1)
}

function selectMember(index: number, value: unknown, editingItem: SaveSettingsEntityBody) {
  const assignment = positionBody(editingItem).assignments[index]
  if (!assignment) return

  const member = value as PositionMemberOption
  assignment.member_id = member.id
  assignment.member_query = member.full_name
  assignment.full_name = member.full_name
}

function clearMemberSelection(index: number, editingItem: SaveSettingsEntityBody) {
  const assignment = positionBody(editingItem).assignments[index]
  if (!assignment) return

  assignment.member_id = 0
  assignment.full_name = undefined
}

function updateUntil(index: number, event: Event, editingItem: SaveSettingsEntityBody) {
  const assignment = positionBody(editingItem).assignments[index]
  if (!assignment) return

  const value = (event.target as HTMLInputElement).value
  assignment.until = value || null
}

async function loadMemberOptions() {
  try {
    const res = await $fetch<{ ok: boolean, members?: PositionMemberOption[], error?: string }>('/api/positions/member-options')
    if (!res.ok) {
      toast.error(res.error || t('settings.positions.loadFailed'))
      return
    }

    memberOptions.value = res.members ?? []
  } catch (error) {
    console.error(error)
    toast.error(t('settings.positions.loadFailed'))
  }
}

function handleError({ phase, message, error }: { phase: 'load' | 'save' | 'toggle', message?: string, error?: unknown }) {
  if (error) console.error(error)

  if (phase === 'load') {
    toast.error(message || t('settings.positions.loadFailed'))
    return
  }

  if (phase === 'save') {
    toast.error(message || t('settings.positions.saveFailed'))
    return
  }

  toast.error(message || t('settings.positions.updateFailed'))
}

function updateAssignmentListOverflow() {
  const element = assignmentListRef.value
  if (!element) {
    hasAssignmentScrollbar.value = false
    return
  }

  hasAssignmentScrollbar.value = element.scrollHeight > element.clientHeight + 1
}

function cleanupAssignmentListObservers() {
  assignmentListResizeObserver?.disconnect()
  assignmentListMutationObserver?.disconnect()
  assignmentListResizeObserver = null
  assignmentListMutationObserver = null
}

watch(assignmentListRef, async (element) => {
  cleanupAssignmentListObservers()

  if (!element) {
    hasAssignmentScrollbar.value = false
    return
  }

  await nextTick()
  updateAssignmentListOverflow()

  assignmentListResizeObserver = new ResizeObserver(() => {
    updateAssignmentListOverflow()
  })
  assignmentListResizeObserver.observe(element)

  assignmentListMutationObserver = new MutationObserver(() => {
    updateAssignmentListOverflow()
  })
  assignmentListMutationObserver.observe(element, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
  })
})

onMounted(async () => {
  if (!hasAccess.value) return
  await loadMemberOptions()
})

onBeforeUnmount(() => {
  cleanupAssignmentListObservers()
})
</script>

<style scoped>
.position-assignment-scroll {
  scrollbar-width: auto;
  scrollbar-color: #bbc8da #ffffff;
}

.position-assignment-scroll::-webkit-scrollbar {
  width: 12px;
}

.position-assignment-scroll::-webkit-scrollbar-track {
  background: #e2e8f0;
  border-radius: 9999px;
}

.position-assignment-scroll::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 9999px;
  border: 2px solid #e2e8f0;
}
</style>
