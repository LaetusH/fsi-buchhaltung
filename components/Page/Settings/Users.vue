<template>
  <div v-if="hasAccess" class="bg-white rounded-b-xl rounded-tl-xl shadow-lg p-6 space-y-6 col-span-12">
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
            <th class="py-2">{{ t('settings.users.active') }}</th>
            <th class="py-2">{{ t('settings.users.createdAt') }}</th>
            <th class="py-2 text-right">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" class="border-b last:border-b-0">
            <td class="py-2">{{ user.username }}</td>
            <td class="py-2">{{ user.member_name || t('settings.users.noLinkedMember') }}</td>
            <td class="py-2">{{ user.is_active ? t('common.yes') : t('common.no') }}</td>
            <td class="py-2">{{ formatDate(user.created_at) }}</td>
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
          />
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
          />
        </div>

        <div class="field">
          <label>{{ t('settings.users.linkedMember') }}</label>
          <MenuDropdown v-model="openCreateMemberDropdown" :id="0" class="w-full">
            <template #trigger="{ styling }">
              <input
                v-model="createMemberQuery"
                :class="styling"
                :placeholder="t('settings.users.memberPlaceholder')"
                @input="onCreateMemberInput"
              />
            </template>

            <template #default="{ styling }">
              <button type="button" :class="styling" @click="clearCreateMember">
                {{ t('settings.users.noLinkedMember') }}
              </button>

              <div class="border-t"></div>

              <button
                v-for="member in filteredCreateMembers"
                :key="member.id"
                type="button"
                :class="styling"
                @click="selectCreateMember(member)"
              >
                {{ member.full_name }}
              </button>

              <div v-if="filteredCreateMembers.length === 0" class="px-3 py-2 text-sm text-gray-500">
                {{ t('settings.users.noAvailableMembers') }}
              </div>
            </template>
          </MenuDropdown>
        </div>
      </div>

      <label class="inline-flex items-center gap-2 text-sm text-slate-700">
        <input v-model="form.is_active" type="checkbox" class="h-4 w-4" />
        {{ t('settings.users.active') }}
      </label>

      <div class="flex justify-end gap-3 pt-2">
        <button class="btn-secondary" @click="closeCreateModal">
          {{ t('actions.cancel') }}
        </button>

        <button class="btn-primary" @click="createUser">
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

      <div class="field">
        <label>{{ t('settings.users.linkedMember') }}</label>
        <MenuDropdown v-model="openEditMemberDropdown" :id="1" class="w-full">
          <template #trigger="{ styling }">
            <input
              v-model="editMemberQuery"
              :class="styling"
              :placeholder="t('settings.users.memberPlaceholder')"
              @input="onEditMemberInput"
            />
          </template>

          <template #default="{ styling }">
            <button type="button" :class="styling" @click="clearEditMember">
              {{ t('settings.users.noLinkedMember') }}
            </button>

            <div class="border-t"></div>

            <button
              v-for="member in filteredEditMembers"
              :key="member.id"
              type="button"
              :class="styling"
              @click="selectEditMember(member)"
            >
              {{ member.full_name }}
            </button>

            <div v-if="filteredEditMembers.length === 0" class="px-3 py-2 text-sm text-gray-500">
              {{ t('settings.users.noAvailableMembers') }}
            </div>
          </template>
        </MenuDropdown>
      </div>

      <div class="flex justify-end gap-3 pt-2">
        <button class="btn-secondary" @click="closeMemberModal">
          {{ t('actions.cancel') }}
        </button>

        <button class="btn-primary" @click="saveMemberLink">
          {{ t('actions.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { useAuth } from '~/composables/useAuth'

interface UserListRow {
  id: number
  username: string
  is_active: number | boolean
  created_at: string
  member_id: number | null
  member_name: string | null
}

interface MemberOptionRow {
  id: number
  full_name: string
  account: number | null
  account_username: string | null
}

const { locale, t } = useI18n()
const { hasPermission } = useAuth()

const hasAccess = computed(() => hasPermission('users.manage'))
const users = ref<UserListRow[]>([])
const memberOptions = ref<MemberOptionRow[]>([])
const showCreateModal = ref(false)
const editingUser = ref<UserListRow | null>(null)
const openCreateMemberDropdown = ref<number | null>(null)
const openEditMemberDropdown = ref<number | null>(null)
const createMemberQuery = ref('')
const editMemberQuery = ref('')
const form = ref({
  username: '',
  password: '',
  is_active: true,
  member_id: null as number | null,
})
const editingMemberId = ref<number | null>(null)

const filteredCreateMembers = computed(() => {
  const query = createMemberQuery.value.trim().toLowerCase()
  return memberOptions.value.filter((member) => {
    if (member.account !== null) return false
    return !query || member.full_name.toLowerCase().includes(query)
  })
})

const filteredEditMembers = computed(() => {
  const query = editMemberQuery.value.trim().toLowerCase()
  const userId = editingUser.value?.id ?? null

  return memberOptions.value.filter((member) => {
    if (member.account !== null && member.account !== userId) return false
    return !query || member.full_name.toLowerCase().includes(query)
  })
})

function resetForm() {
  form.value = {
    username: '',
    password: '',
    is_active: true,
    member_id: null,
  }
  createMemberQuery.value = ''
  openCreateMemberDropdown.value = null
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
  openEditMemberDropdown.value = null
}

function closeMemberModal() {
  editingUser.value = null
  editingMemberId.value = null
  editMemberQuery.value = ''
  openEditMemberDropdown.value = null
}

function onCreateMemberInput() {
  form.value.member_id = null
  openCreateMemberDropdown.value = 0
}

function onEditMemberInput() {
  editingMemberId.value = null
  openEditMemberDropdown.value = 1
}

function selectCreateMember(member: MemberOptionRow) {
  form.value.member_id = member.id
  createMemberQuery.value = member.full_name
  openCreateMemberDropdown.value = null
}

function selectEditMember(member: MemberOptionRow) {
  editingMemberId.value = member.id
  editMemberQuery.value = member.full_name
  openEditMemberDropdown.value = null
}

function clearCreateMember() {
  form.value.member_id = null
  createMemberQuery.value = ''
  openCreateMemberDropdown.value = null
}

function clearEditMember() {
  editingMemberId.value = null
  editMemberQuery.value = ''
  openEditMemberDropdown.value = null
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
  const payload = {
    username: form.value.username.trim(),
    password: form.value.password,
    is_active: form.value.is_active,
    member_id: form.value.member_id,
  }

  if (!payload.username || !payload.password) {
    alert(t('settings.users.missingFields'))
    return
  }

  const res = await $fetch<{ ok: boolean, error?: string }>('/api/auth/register', {
    method: 'POST',
    body: payload,
  })

  if (!res.ok) {
    if (res.error === 'Username already exists') {
      alert(t('settings.users.usernameExists'))
      return
    }
    if (res.error === 'Member already linked to another user') {
      alert(t('settings.users.memberAlreadyLinked'))
      return
    }
    if (res.error === 'Member not found') {
      alert(t('settings.users.memberNotFound'))
      return
    }
    alert(`${t('settings.users.createFailed')}: ${res.error}`)
    return
  }

  alert(t('settings.users.created'))
  closeCreateModal()
  await Promise.all([loadUsers(), loadMemberOptions()])
}

async function saveMemberLink() {
  if (!editingUser.value) return

  const res = await $fetch<{ ok: boolean, error?: string }>('/api/auth/link-member', {
    method: 'POST',
    body: {
      user_id: editingUser.value.id,
      member_id: editingMemberId.value,
    },
  })

  if (!res.ok) {
    if (res.error === 'Member already linked to another user') {
      alert(t('settings.users.memberAlreadyLinked'))
      return
    }
    if (res.error === 'Member not found') {
      alert(t('settings.users.memberNotFound'))
      return
    }
    alert(`${t('settings.users.memberSaveFailed')}: ${res.error}`)
    return
  }

  alert(t('settings.users.memberSaved'))
  closeMemberModal()
  await Promise.all([loadUsers(), loadMemberOptions()])
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
    alert(`${t('settings.users.activationFailed')}: ${res.error}`)
    return
  }

  await loadUsers()
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(locale.value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

onMounted(async () => {
  if (!hasAccess.value) return
  await Promise.all([loadUsers(), loadMemberOptions()])
})
</script>
