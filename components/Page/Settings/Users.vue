<template>
  <div v-if="hasAccess" class="bg-white rounded-xl shadow-lg p-6 space-y-6 col-span-12">
    <div class="flex justify-between items-center gap-3 flex-wrap">
      <h2 class="text-lg font-semibold">{{ t('settings.users.title') }}</h2>

      <button class="btn-primary" @click="openCreateModal">
        + {{ t('settings.users.newUser') }}
      </button>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="text-left border-b">
            <th class="py-2">{{ t('login.username') }}</th>
            <th class="py-2">{{ t('settings.users.linkedMember') }}</th>
            <th class="py-2 text-right">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" class="border-b last:border-b-0">
            <td class="py-2">{{ user.username }}</td>
            <td class="py-2">{{ user.member_name || t('settings.users.noLinkedMember') }}</td>
            <td class="py-2">
              <div class="flex justify-end gap-3">
                <button class="text-blue-600 hover:underline cursor-pointer" @click="openMemberModal(user)">
                  {{ user.member_id ? t('actions.edit') : t('settings.users.assignMember') }}
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
          <tr v-if="users.length === 0">
            <td colspan="5" class="py-6 text-center text-slate-500">
              {{ t('settings.permissions.noUsers') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div
    v-if="showCreateModal"
    class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
  >
    <div class="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
      <h3 class="text-lg font-semibold">{{ t('settings.users.createTitle') }}</h3>

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

      <label class="inline-flex items-center gap-2 text-sm text-slate-700">
        <input v-model="form.is_active" type="checkbox" class="checkbox">
        {{ t('settings.users.active') }}
      </label>

      <div class="relative z-10 flex justify-end gap-3 bg-white pt-2">
        <button class="btn-secondary" @click="closeCreateModal">
          {{ t('actions.cancel') }}
        </button>

        <button class="btn-primary" :disabled="isCreatingUser" :class="{ 'opacity-50 cursor-not-allowed': isCreatingUser }" @click="createUser">
          {{ t('actions.createNew') }}
        </button>
      </div>
    </div>
  </div>

  <div
    v-if="editingUser"
    class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
  >
    <div class="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
      <h3 class="text-lg font-semibold">{{ t('settings.users.memberTitle', { username: editingUser.username }) }}</h3>

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

      <div class="relative z-10 flex justify-end gap-3 bg-white pt-2">
        <button class="btn-secondary" @click="closeMemberModal">
          {{ t('actions.cancel') }}
        </button>

        <button class="btn-primary" :disabled="isSavingMemberLink" :class="{ 'opacity-50 cursor-not-allowed': isSavingMemberLink }" @click="saveMemberLink">
          {{ t('actions.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SearchSelectOption } from '~/components/Common/SearchSelect.vue'
import { useI18n } from '~/composables/useI18n'
import { useToast } from '~/composables/useToast'
import { useAuth } from '~/composables/useAuth'

interface UserListRow {
  id: number
  username: string
  is_active: number | boolean
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
const { hasPermission } = useAuth()

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
  member_id: null as number | null,
})
const editingMemberId = ref<number | null>(null)
const isCreatingUser = ref(false)
const isSavingMemberLink = ref(false)

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

onMounted(async () => {
  if (!hasAccess.value) return
  await Promise.all([loadUsers(), loadMemberOptions()])
})
</script>
