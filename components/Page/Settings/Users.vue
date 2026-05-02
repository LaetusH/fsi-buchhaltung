<template>
  <CommonPageTableCard
    v-if="hasAccess"
    :title="t('settings.users.title')"
    :search-value="globalSearchInput"
    :can-create="true"
    :create-label="`+ ${t('settings.users.newUser')}`"
    @update:search-value="globalSearchInput = $event"
    @create="openCreateModal"
  >
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="text-left border-b">
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('login.username')"
                :sort-direction="columnSortDirection('username')"
                :filterable="false"
                @toggle-sort="toggleSort('username')"
              />
            </th>
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('settings.users.linkedMember')"
                :sort-direction="columnSortDirection('member')"
                :filterable="false"
                @toggle-sort="toggleSort('member')"
              />
            </th>
            <th class="py-2 text-right">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in processedRows" :key="user.id" class="border-b last:border-b-0">
            <td class="py-2">
              <div class="flex flex-col gap-1">
                <span>{{ user.username }}</span>
                <span
                  v-if="user.must_change_password"
                  class="w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                >
                  {{ t('settings.users.passwordChangeRequired') }}
                </span>
              </div>
            </td>
            <td class="py-2">{{ user.member_name || t('settings.users.noLinkedMember') }}</td>
            <td class="py-2">
              <div class="flex justify-end gap-3">
                <button class="text-blue-600 hover:underline cursor-pointer" @click="openMemberModal(user)">
                  {{ user.member_id ? t('actions.edit') : t('settings.users.assignMember') }}
                </button>

                <button
                  v-if="!user.must_change_password"
                  class="text-amber-700 hover:underline cursor-pointer"
                  @click="requirePasswordChange(user)"
                >
                  {{ t('settings.users.requirePasswordChange') }}
                </button>

                <button
                  class="hover:underline cursor-pointer"
                  :class="user.is_active ? 'text-red-500' : 'text-gray-500'"
                  @click="toggleUserActive(user)"
                >
                  {{ user.is_active ? t('actions.deactivate') : t('actions.activate') }}
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="processedRows.length === 0">
            <td colspan="3" class="py-6 text-center text-slate-500">
              {{ t('settings.permissions.noUsers') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </CommonPageTableCard>

  <CommonModal
    v-model="showCreateModal"
    :title="t('settings.users.createTitle')"
    footer-class="relative z-10 mt-4 flex justify-end gap-3 bg-white pt-2"
    @close="closeCreateModal"
  >
    <div class="grid gap-4">
      <div class="field">
        <label>{{ t('login.username') }}</label>
        <input
          v-model="form.username"
          class="input"
          name="settings-user-username"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          data-lpignore="true"
        >
      </div>

      <div class="field">
        <label>{{ t('login.password') }}</label>
        <input
          v-model="form.password"
          type="password"
          class="input"
          name="settings-user-password"
          autocomplete="new-password"
          autocapitalize="off"
          spellcheck="false"
          data-lpignore="true"
        >
      </div>

      <div class="field relative z-20">
        <label>{{ t('settings.users.linkedMember') }}</label>
        <CommonSearchSelect
          v-model="createMemberQuery"
          :options="createMemberOptions"
          :selected-label="selectedCreateMemberLabel"
          :placeholder="t('settings.users.memberPlaceholder')"
          :empty-text="t('settings.users.noAvailableMembers')"
          @select="selectCreateMember"
          @clear-selection="form.member_id = null"
        />
      </div>
    </div>

    <div class="flex gap-3">
      <label class="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
        <input v-model="form.is_active" type="checkbox" class="checkbox">
        {{ t('settings.users.active') }}
      </label>

      <label class="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
        <input v-model="form.must_change_password" type="checkbox" class="checkbox">
        {{ t('settings.users.mustChangePassword') }}
      </label>
    </div>

    <template #footer>
      <button class="btn-secondary" @click="closeCreateModal">
        {{ t('actions.cancel') }}
      </button>

      <button class="btn-primary" :disabled="isCreatingUser" :class="{ 'opacity-50 cursor-not-allowed': isCreatingUser }" @click="createUser">
        {{ t('actions.createNew') }}
      </button>
    </template>
  </CommonModal>

  <CommonModal
    v-if="editingUser"
    :model-value="!!editingUser"
    :title="t('settings.users.memberTitle', { username: editingUser.username })"
    footer-class="relative z-10 mt-4 flex justify-end gap-3 bg-white pt-2"
    @update:model-value="!$event && closeMemberModal()"
    @close="closeMemberModal"
  >
    <div class="field relative z-20">
      <label>{{ t('settings.users.linkedMember') }}</label>
      <CommonSearchSelect
        v-model="editMemberQuery"
        :options="editMemberOptions"
        :selected-label="selectedEditMemberLabel"
        :placeholder="t('settings.users.memberPlaceholder')"
        :empty-text="t('settings.users.noAvailableMembers')"
        @select="selectEditMember"
        @clear-selection="editingMemberId = null"
      />
    </div>

    <template #footer>
      <button class="btn-secondary" @click="closeMemberModal">
        {{ t('actions.cancel') }}
      </button>

      <button class="btn-primary" :disabled="isSavingMemberLink" :class="{ 'opacity-50 cursor-not-allowed': isSavingMemberLink }" @click="saveMemberLink">
        {{ t('actions.save') }}
      </button>
    </template>
  </CommonModal>
</template>

<script setup lang="ts">
import type { SearchSelectOption } from '~/components/Common/SearchSelect.vue'
import { useAdvancedTable } from '~/composables/useAdvancedTable'
import { useI18n } from '~/composables/useI18n'
import { useToast } from '~/composables/useToast'
import { useAuth } from '~/composables/useAuth'

interface UserListRow {
  id: number
  username: string
  is_active: number | boolean
  must_change_password: number | boolean
  member_id: number | null
  member_name: string | null
}

interface MemberOptionRow {
  id: number
  full_name: string
  account: number | null
  account_username: string | null
}

const { t } = useI18n()
const toast = useToast()
const { hasPermission, user: currentUser, fetchSession } = useAuth()

const hasAccess = computed(() => hasPermission('users.manage'))
const users = ref<UserListRow[]>([])
const memberOptions = ref<MemberOptionRow[]>([])
const showCreateModal = ref(false)
const editingUser = ref<UserListRow | null>(null)
const createMemberQuery = ref('')
const editMemberQuery = ref('')
const form = ref({
  username: '',
  password: '',
  is_active: true,
  must_change_password: true,
  member_id: null as number | null,
})
const editingMemberId = ref<number | null>(null)
const isCreatingUser = ref(false)
const isSavingMemberLink = ref(false)
type UserColumnKey = 'username' | 'member'

const {
  sortKey,
  sortDirection,
  globalSearchInput,
  processedRows,
  toggleSort,
} = useAdvancedTable<UserListRow, UserColumnKey>(users, [
  { key: 'username', filterable: false, globalSearchable: true, getValue: user => user.username },
  { key: 'member', filterable: false, globalSearchable: true, getValue: user => user.member_name || t('settings.users.noLinkedMember') },
])

function columnSortDirection(key: UserColumnKey) {
  return sortKey.value === key ? sortDirection.value : null
}

const createMemberOptions = computed<SearchSelectOption<MemberOptionRow>[]>(() => memberOptions.value
  .filter(member => member.account === null)
  .map(member => ({
    key: member.id,
    label: member.full_name,
    value: member,
  })))
const editMemberOptions = computed<SearchSelectOption<MemberOptionRow>[]>(() => {
  const userId = editingUser.value?.id ?? null
  return memberOptions.value
    .filter(member => member.account === null || member.account === userId)
    .map(member => ({
      key: member.id,
      label: member.full_name,
      value: member,
    }))
})
const selectedCreateMemberLabel = computed(() => {
  const selected = memberOptions.value.find(member => member.id === form.value.member_id)
  return selected?.full_name || ''
})
const selectedEditMemberLabel = computed(() => {
  const selected = memberOptions.value.find(member => member.id === editingMemberId.value)
  return selected?.full_name || ''
})

function resetForm() {
  form.value = {
    username: '',
    password: '',
    is_active: true,
    must_change_password: true,
    member_id: null,
  }
  createMemberQuery.value = ''
}

function openCreateModal() {
  resetForm()
  showCreateModal.value = true
}

function closeCreateModal() {
  showCreateModal.value = false
  resetForm()
}

function openMemberModal(user: UserListRow) {
  editingUser.value = { ...user }
  editingMemberId.value = user.member_id
  editMemberQuery.value = user.member_name || ''
}

function closeMemberModal() {
  editingUser.value = null
  editingMemberId.value = null
  editMemberQuery.value = ''
}

function selectCreateMember(value: unknown) {
  const member = value as MemberOptionRow
  form.value.member_id = member.id
  createMemberQuery.value = member.full_name
}

function selectEditMember(value: unknown) {
  const member = value as MemberOptionRow
  editingMemberId.value = member.id
  editMemberQuery.value = member.full_name
}

async function loadUsers() {
  const res = await $fetch<{ ok: boolean, users?: UserListRow[], error?: string }>('/api/auth/users')
  if (res.ok && res.users) users.value = res.users
}

async function loadMemberOptions() {
  const res = await $fetch<{ ok: boolean, members?: MemberOptionRow[], error?: string }>('/api/auth/member-options')
  if (res.ok && res.members) memberOptions.value = res.members
}

async function createUser() {
  if (isCreatingUser.value) return

  const payload = {
    username: form.value.username.trim(),
    password: form.value.password,
    is_active: form.value.is_active,
    must_change_password: form.value.must_change_password,
    member_id: form.value.member_id,
  }

  if (!payload.username || !payload.password) {
    toast.error(t('settings.users.missingFields'))
    return
  }

  try {
    isCreatingUser.value = true
    const res = await $fetch<{ ok: boolean, error?: string }>('/api/auth/register', {
      method: 'POST',
      body: payload,
    })

    if (!res.ok) {
      if (res.error === 'Username already exists') {
        toast.error(t('settings.users.usernameExists'))
        return
      }
      if (res.error === 'Member already linked to another user') {
        toast.error(t('settings.users.memberAlreadyLinked'))
        return
      }
      if (res.error === 'Member not found') {
        toast.error(t('settings.users.memberNotFound'))
        return
      }
      toast.error(`${t('settings.users.createFailed')}: ${res.error}`)
      return
    }

    toast.success(t('settings.users.created'))
    closeCreateModal()
    await Promise.all([loadUsers(), loadMemberOptions()])
  } finally {
    isCreatingUser.value = false
  }
}

async function saveMemberLink() {
  if (!editingUser.value || isSavingMemberLink.value) return

  try {
    isSavingMemberLink.value = true
    const res = await $fetch<{ ok: boolean, error?: string }>('/api/auth/link-member', {
      method: 'POST',
      body: {
        user_id: editingUser.value.id,
        member_id: editingMemberId.value,
      },
    })

    if (!res.ok) {
      if (res.error === 'Member already linked to another user') {
        toast.error(t('settings.users.memberAlreadyLinked'))
        return
      }
      if (res.error === 'Member not found') {
        toast.error(t('settings.users.memberNotFound'))
        return
      }
      toast.error(`${t('settings.users.memberSaveFailed')}: ${res.error}`)
      return
    }

    toast.success(t('settings.users.memberSaved'))
    closeMemberModal()
    await Promise.all([loadUsers(), loadMemberOptions()])
  } finally {
    isSavingMemberLink.value = false
  }
}

async function toggleUserActive(user: UserListRow) {
  const res = await $fetch<{ ok: boolean, error?: string }>('/api/auth/activate', {
    method: 'POST',
    body: {
      id: user.id,
      is_active: !Boolean(user.is_active),
    },
  })

  if (!res.ok) {
    toast.error(`${t('settings.users.activationFailed')}: ${res.error}`)
    return
  }

  await loadUsers()
}

async function requirePasswordChange(user: UserListRow) {
  const res = await $fetch<{ ok: boolean, error?: string }>('/api/auth/require-password-change', {
    method: 'POST',
    body: {
      user_id: user.id,
    },
  })

  if (!res.ok) {
    toast.error(`${t('settings.users.requirePasswordChangeFailed')}: ${res.error}`)
    return
  }

  toast.success(t('settings.users.requirePasswordChangeSaved'))
  if (currentUser.value?.id === user.id) {
    await fetchSession()
    return
  }
  await loadUsers()
}

onMounted(async () => {
  if (!hasAccess.value) return
  await loadSupportData()
})

useAppRefresh().onRefresh(async () => {
  if (!hasAccess.value) return
  await loadSupportData()
})

async function loadSupportData() {
  await Promise.all([loadUsers(), loadMemberOptions()])
}
</script>
