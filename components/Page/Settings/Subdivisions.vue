<template>
  <div v-if="hasAccess" class="bg-white rounded-b-xl rounded-tl-xl shadow-lg p-6 space-y-6 col-span-12">
    <div class="flex justify-between items-center gap-3 flex-wrap">
      <h2 class="text-lg font-semibold">{{ t('settings.entities.subdivisions') }}</h2>

      <button class="btn-primary" @click="addItem">
        + {{ t('settings.entities.newSubdivision') }}
      </button>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="text-left border-b">
            <th class="py-2">{{ t('common.code') }}</th>
            <th class="py-2">{{ t('common.name') }}</th>
            <th class="py-2">{{ t('settings.subdivisions.members') }}</th>
            <th class="py-2">{{ t('common.count') }}</th>
            <th class="py-2 text-right">{{ t('common.actions') }}</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="item in items"
            :key="item.id"
            class="border-b last:border-b-0"
          >
            <td class="py-2 align-top">{{ item.code }}</td>
            <td class="py-2 align-top">{{ item.name }}</td>
            <td class="py-2 align-top text-slate-600">{{ memberSummary(item) }}</td>
            <td class="py-2 align-top font-medium text-slate-800">{{ item.members.length }}</td>

            <td class="py-2 text-right space-x-2 align-top">
              <button class="text-blue-600 hover:underline cursor-pointer" @click="editItem(item)">
                {{ t('actions.edit') }}
              </button>

              <button
                class="hover:underline cursor-pointer"
                :class="item.is_active ? 'text-red-500' : 'text-gray-500'"
                @click="toggleActive(item)"
              >
                {{ item.is_active ? t('actions.deactivate') : t('actions.activate') }}
              </button>
            </td>
          </tr>

          <tr v-if="items.length === 0">
            <td colspan="5" class="py-6 text-center text-slate-500">
              {{ t('settings.entities.noSubdivisions') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div
    v-if="showModal"
    class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
  >
    <div class="bg-white rounded-xl w-full max-w-2xl max-h-[min(90vh,52rem)] p-6 flex flex-col overflow-visible">
      <h3 class="text-lg font-semibold">
        {{ isNewItem ? t('settings.entities.newItem', { label: t('settings.entities.subdivision') }) : t('settings.entities.editItem', { label: t('settings.entities.subdivision') }) }}
      </h3>

      <div class="grid md:grid-cols-2 gap-4 min-h-0 flex-1 pt-4">
        <div class="field">
          <label>{{ t('common.code') }}</label>
          <input v-model="editingItem!.code" class="input">
        </div>

        <div class="field">
          <label>{{ t('common.name') }}</label>
          <input v-model="editingItem!.name" class="input">
        </div>

        <div class="field md:col-span-2">
          <label>{{ t('common.description') }}</label>
          <textarea
            v-model="editingItem!.description"
            rows="3"
            class="input resize-none"
          />
        </div>

        <div class="field md:col-span-2 min-h-0 flex flex-col relative z-20">
          <label>{{ t('settings.subdivisions.members') }}</label>
          <CommonSelectionListField
            :query="memberQuery"
            :options="memberSearchOptions"
            :selected-items="selectedMemberItems"
            :placeholder="t('settings.subdivisions.memberPlaceholder')"
            :empty-text="t('settings.subdivisions.noMembersAvailable')"
            :empty-selection-text="t('settings.subdivisions.noMembersAssigned')"
            :remove-label="t('actions.remove')"
            @update:query="memberQuery = $event"
            @select="selectMember"
            @clear-selection="memberQuery = ''"
            @remove="removeMember"
          />
        </div>
      </div>

      <div class="relative z-10 flex justify-end gap-3 bg-white pt-4">
        <button class="btn-secondary" @click="closeModal">
          {{ t('actions.cancel') }}
        </button>

        <button class="btn-primary" @click="saveItem">
          {{ t('actions.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SearchSelectOption } from '~/components/Common/SearchSelect.vue'
import type { SelectionListItem } from '~/components/Common/SelectionListField.vue'
import { useAuth } from '~/composables/useAuth'
import { useI18n } from '~/composables/useI18n'
import { useToast } from '~/composables/useToast'
import { MemberStatus } from '~/types/member'
import type { SaveSubdivisionBody, SubdivisionMemberOption, SubdivisionRow } from '~/types/subdivision'

interface EditableSubdivision extends SaveSubdivisionBody {
  member_ids: number[]
}

const { t } = useI18n()
const toast = useToast()
const { hasPermission } = useAuth()

const hasAccess = computed(() => hasPermission('settings.subdivisions.manage'))
const items = ref<SubdivisionRow[]>([])
const memberOptions = ref<SubdivisionMemberOption[]>([])
const showModal = ref(false)
const editingItem = ref<EditableSubdivision | null>(null)
const isNewItem = ref(false)
const memberQuery = ref('')

const memberOptionsById = computed(() => {
  return new Map(memberOptions.value.map(member => [member.id, member]))
})

const selectedMemberItems = computed<SelectionListItem[]>(() => {
  return (editingItem.value?.member_ids ?? [])
    .map(memberId => memberOptionsById.value.get(memberId))
    .filter((member): member is SubdivisionMemberOption => Boolean(member))
    .map(member => ({
      id: member.id,
      label: member.full_name,
      meta: member.subject_name || statusLabel(member.status),
    }))
})

const memberSearchOptions = computed<SearchSelectOption<number>[]>(() => {
  const selectedIds = new Set(editingItem.value?.member_ids ?? [])

  return memberOptions.value
    .filter(member => !selectedIds.has(member.id))
    .map(member => ({
      key: member.id,
      label: member.full_name,
      value: member.id,
      searchText: `${member.full_name} ${member.subject_name || ''} ${statusLabel(member.status)}`.trim(),
    }))
})

function statusLabel(status: MemberStatus) {
  if (status === MemberStatus.Active) return t('member.states.active')
  if (status === MemberStatus.Passive) return t('member.states.passive')
  if (status === MemberStatus.Hold) return t('member.states.hold')
  return t('member.states.left')
}

function memberSummary(item: SubdivisionRow) {
  if (!item.members.length) return t('settings.subdivisions.noMembersAssigned')

  const labels = item.members.map(member => member.full_name)
  if (labels.length <= 3) return labels.join(', ')
  return `${labels.slice(0, 3).join(', ')} +${labels.length - 3}`
}

async function loadItems() {
  try {
    const res = await $fetch<{ ok: boolean, subdivisions?: SubdivisionRow[], error?: string }>('/api/subdivisions')
    if (!res.ok) {
      toast.error(res.error || t('settings.subdivisions.loadFailed'))
      return
    }

    items.value = res.subdivisions ?? []
  } catch (error) {
    console.error(error)
    toast.error(t('settings.subdivisions.loadFailed'))
  }
}

async function loadMemberOptions() {
  try {
    const res = await $fetch<{ ok: boolean, members?: SubdivisionMemberOption[], error?: string }>('/api/subdivisions/member-options')
    if (!res.ok) {
      toast.error(res.error || t('settings.subdivisions.loadFailed'))
      return
    }

    memberOptions.value = res.members ?? []
  } catch (error) {
    console.error(error)
    toast.error(t('settings.subdivisions.loadFailed'))
  }
}

function addItem() {
  editingItem.value = {
    code: '',
    name: '',
    description: '',
    member_ids: [],
  }
  memberQuery.value = ''
  isNewItem.value = true
  showModal.value = true
}

function editItem(item: SubdivisionRow) {
  editingItem.value = {
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description ?? '',
    is_active: item.is_active,
    member_ids: item.members.map(member => member.id),
  }
  memberQuery.value = ''
  isNewItem.value = false
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingItem.value = null
  memberQuery.value = ''
}

function selectMember(value: unknown) {
  if (!editingItem.value) return

  const memberId = Number(value)
  if (!Number.isInteger(memberId) || memberId <= 0) return
  if (editingItem.value.member_ids.includes(memberId)) return

  editingItem.value.member_ids.push(memberId)
  memberQuery.value = ''
}

function removeMember(value: string | number) {
  if (!editingItem.value) return

  const memberId = Number(value)
  editingItem.value.member_ids = editingItem.value.member_ids.filter(id => id !== memberId)
}

async function saveItem() {
  if (!editingItem.value) return

  try {
    const res = await $fetch<{ ok: boolean, error?: string }>('/api/subdivisions/save', {
      method: 'POST',
      body: editingItem.value,
    })

    if (!res.ok) {
      toast.error(res.error || t('settings.subdivisions.saveFailed'))
      return
    }

    closeModal()
    await loadItems()
  } catch (error) {
    console.error(error)
    toast.error(t('settings.subdivisions.saveFailed'))
  }
}

async function toggleActive(item: SubdivisionRow) {
  try {
    const res = await $fetch<{ ok: boolean, error?: string }>('/api/subdivisions/activate', {
      method: 'POST',
      body: { id: item.id, is_active: !item.is_active },
    })

    if (!res.ok) {
      toast.error(res.error || t('settings.subdivisions.updateFailed'))
      return
    }

    await loadItems()
  } catch (error) {
    console.error(error)
    toast.error(t('settings.subdivisions.updateFailed'))
  }
}

onMounted(async () => {
  if (!hasAccess.value) return
  await Promise.all([loadItems(), loadMemberOptions()])
})
</script>
