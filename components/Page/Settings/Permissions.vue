<template>
  <div v-if="hasAccess" class="contents">
    <div class="bg-white rounded-xl shadow-lg p-6 space-y-8 col-span-12">
      <h2 class="text-lg font-semibold">{{ t('settings.permissions.title') }}</h2>

      <section class="rounded-xl border border-slate-300 p-4 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">{{ t('settings.permissions.rolesTitle') }}</h3>
          <button class="btn-primary" @click="openRoleEditor()">
            + {{ t('settings.permissions.newRole') }}
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-left border-b">
                <th class="py-2">{{ t('common.code') }}</th>
                <th class="py-2">{{ t('common.name') }}</th>
                <th class="py-2">{{ t('settings.permissions.defaultRole') }}</th>
                <th class="py-2">{{ t('common.description') }}</th>
                <th class="py-2 text-right">{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="role in roles" :key="role.id" class="border-b last:border-b-0">
                <td class="py-2">{{ role.code }}</td>
                <td class="py-2">{{ role.name }}</td>
                <td class="py-2">{{ role.is_default ? t('common.yes') : t('common.no') }}</td>
                <td class="py-2 text-slate-600">{{ role.description || '-' }}</td>
                <td class="py-2 text-right space-x-2">
                  <button class="text-blue-600 hover:underline cursor-pointer" @click="openRoleEditor(role)">
                    {{ t('actions.edit') }}
                  </button>
                  <button class="text-orange-600 hover:underline cursor-pointer" @click="openRolePermissions(role)">
                    {{ t('settings.permissions.editPermissions') }}
                  </button>
                </td>
              </tr>
              <tr v-if="roles.length === 0">
                <td colspan="5" class="py-6 text-center text-slate-500">
                  {{ t('settings.permissions.noRoles') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="rounded-xl border border-slate-300 p-4 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">{{ t('settings.permissions.positionsTitle') }}</h3>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-left border-b">
                <th class="py-2">{{ t('common.code') }}</th>
                <th class="py-2">{{ t('common.name') }}</th>
                <th class="py-2 text-right">{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="position in positions" :key="position.id" class="border-b last:border-b-0">
                <td class="py-2">{{ position.code }}</td>
                <td class="py-2">{{ position.name }}</td>
                <td class="py-2 text-right">
                  <button class="text-orange-600 hover:underline cursor-pointer" @click="openPositionPermissions(position)">
                    {{ t('settings.permissions.editPermissions') }}
                  </button>
                </td>
              </tr>
              <tr v-if="positions.length === 0">
                <td colspan="3" class="py-6 text-center text-slate-500">
                  {{ t('settings.permissions.noPositions') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="rounded-xl border border-slate-300 p-4 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">{{ t('settings.permissions.usersTitle') }}</h3>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-left border-b">
                <th class="py-2">{{ t('settings.permissions.username') }}</th>
                <th class="py-2">{{ t('settings.permissions.roles') }}</th>
                <th class="py-2 text-right">{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id" class="border-b last:border-b-0">
                <td class="py-2">{{ user.username }}</td>
                <td class="py-2">{{ roles.filter(role => user.roles.includes(role.id)).map(role => role.name).join(', ') || '-' }}</td>
                <td class="py-2 text-right">
                  <button class="text-orange-600 hover:underline cursor-pointer" @click="openUserAccess(user)">
                    {{ t('settings.permissions.editAccess') }}
                  </button>
                </td>
              </tr>
              <tr v-if="users.length === 0">
                <td colspan="3" class="py-6 text-center text-slate-500">
                  {{ t('settings.permissions.noUsers') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <div v-if="showRoleModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl w-full max-w-lg p-6 space-y-4">
        <h3 class="text-lg font-semibold">
          {{ roleForm.isNew ? t('settings.permissions.newRole') : t('settings.permissions.editRole') }}
        </h3>

        <div class="space-y-3">
          <div class="field">
            <label>{{ t('common.code') }}</label>
            <input v-model="roleForm.code" class="input" />
          </div>
          <div class="field">
            <label>{{ t('common.name') }}</label>
            <input v-model="roleForm.name" class="input" />
          </div>
          <div class="field">
            <label>{{ t('common.description') }}</label>
            <textarea v-model="roleForm.description" rows="3" class="input resize-none" />
          </div>
          <div class="flex gap-4">
            <label class="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input v-model="roleForm.is_active" type="checkbox" class="checkbox" />
              {{ t('settings.permissions.roleActive') }}
            </label>
            <label class="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input v-model="roleForm.is_default" type="checkbox" class="checkbox" />
              {{ t('settings.permissions.defaultRole') }}
            </label>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <button class="btn-secondary" @click="closeRoleModal">{{ t('actions.cancel') }}</button>
          <button class="btn-primary" @click="saveRole">{{ t('actions.save') }}</button>
        </div>
      </div>
    </div>

    <div v-if="permissionModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl w-full max-w-2xl p-6 space-y-4">
        <h3 class="text-lg font-semibold">
          {{ t('settings.permissions.permissionsFor', { name: permissionModal.title }) }}
        </h3>

        <div class="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div
            v-for="group in permissionGroups"
            :key="group.categoryKey"
            class="border rounded-lg p-4"
          >
            <h4 class="font-semibold mb-2">{{ group.categoryLabel }}</h4>
            <div class="grid md:grid-cols-2 gap-2">
              <label v-for="perm in group.permissions" :key="perm.key" class="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  class="checkbox"
                  :value="perm.key"
                  v-model="permissionModal.selected"
                />
                <span>{{ t(perm.labelKey) }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <button class="btn-secondary" @click="permissionModal = null">{{ t('actions.cancel') }}</button>
          <button class="btn-primary" @click="savePermissionModal">{{ t('actions.save') }}</button>
        </div>
      </div>
    </div>

    <div v-if="userModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl w-full max-w-2xl p-6 space-y-4">
        <h3 class="text-lg font-semibold">
          {{ t('settings.permissions.accessFor', { name: userModal.username }) }}
        </h3>

        <div class="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div class="border rounded-lg p-4">
            <h4 class="font-semibold mb-2">{{ t('settings.permissions.roles') }}</h4>
            <div class="grid md:grid-cols-2 gap-2">
              <label v-for="role in roles" :key="role.id" class="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" class="checkbox" :value="role.id" v-model="userModal.roles" />
                <span>{{ role.name }} ({{ role.code }})</span>
              </label>
            </div>
          </div>

          <div
            v-for="group in permissionGroups"
            :key="group.categoryKey"
            class="border rounded-lg p-4"
          >
            <h4 class="font-semibold mb-2">{{ group.categoryLabel }}</h4>
            <div class="grid md:grid-cols-2 gap-2">
              <label v-for="perm in group.permissions" :key="perm.key" class="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  class="checkbox"
                  :value="perm.key"
                  v-model="userModal.permissions"
                />
                <span>{{ t(perm.labelKey) }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <button class="btn-secondary" @click="userModal = null">{{ t('actions.cancel') }}</button>
          <button class="btn-primary" @click="saveUserAccess">{{ t('actions.save') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { useToast } from '~/composables/useToast'
import type { PermissionDefinition } from '~/config/permissions'

interface RoleRow {
  id: number
  code: string
  name: string
  is_active: boolean
  is_default: boolean
  description: string | null
  permissions: string[]
}

interface PositionRow {
  id: number
  code: string
  name: string
  is_active: boolean
  permissions: string[]
}

interface UserRow {
  id: number
  username: string
  is_active: boolean
  roles: number[]
  permissions: string[]
}

const { t } = useI18n()
const toast = useToast()

const permissions = ref<PermissionDefinition[]>([])
const roles = ref<RoleRow[]>([])
const positions = ref<PositionRow[]>([])
const users = ref<UserRow[]>([])
const hasAccess = ref(true)

const showRoleModal = ref(false)
const roleForm = ref({
  id: null as number | null,
  code: '',
  name: '',
  description: '',
  is_active: true,
  is_default: false,
  isNew: true,
})

const permissionModal = ref<null | {
  type: 'role' | 'position'
  title: string
  roleId?: number
  positionId?: number
  selected: string[]
}>(null)

const userModal = ref<null | {
  id: number
  username: string
  roles: number[]
  permissions: string[]
}>(null)

const permissionGroups = computed(() => {
  const map = new Map<string, PermissionDefinition[]>()
  for (const perm of permissions.value) {
    if (!map.has(perm.categoryKey)) map.set(perm.categoryKey, [])
    map.get(perm.categoryKey)!.push(perm)
  }
  return Array.from(map.entries()).map(([categoryKey, perms]) => ({
    categoryKey,
    categoryLabel: t(categoryKey),
    permissions: perms,
  }))
})

async function loadDefinitions() {
  const res = await $fetch('/api/permissions/definitions')
  if (res.ok) {
    permissions.value = res.permissions
  } else console.log(res.error)
}

async function loadRoles() {
  const res = await $fetch('/api/permissions/roles')
  if (res.ok) {
    roles.value = res.roles
  } else console.log(res.error)
}

async function loadPositions() {
  const res = await $fetch('/api/permissions/positions')
  if (res.ok) {
    positions.value = res.positions
  } else console.log(res.error)
}

async function loadUsers() {
  const res = await $fetch('/api/permissions/users')
  if (res.ok) {
    users.value = res.users
  } else console.log(res.error)
}

function openRoleEditor(role?: RoleRow) {
  if (role) {
    roleForm.value = {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description || '',
      is_active: role.is_active,
      is_default: role.is_default,
      isNew: false,
    }
  } else {
    roleForm.value = {
      id: null,
      code: '',
      name: '',
      description: '',
      is_active: true,
      is_default: false,
      isNew: true,
    }
  }
  showRoleModal.value = true
}

function closeRoleModal() {
  showRoleModal.value = false
}

async function saveRole() {
  const payload = {
    id: roleForm.value.id,
    code: roleForm.value.code,
    name: roleForm.value.name,
    description: roleForm.value.description || null,
    is_active: roleForm.value.is_active,
    is_default: roleForm.value.is_default,
  }
  const res = await $fetch('/api/permissions/roles.save', {
    method: 'POST',
    body: payload,
  })
  if (!res.ok) {
    toast.error(`${t('settings.permissions.saveFailed')}: ${res.error}`)
    return
  }
  showRoleModal.value = false
  await loadRoles()
}

function openRolePermissions(role: RoleRow) {
  permissionModal.value = {
    type: 'role',
    title: `${role.name} (${role.code})`,
    roleId: role.id,
    selected: [...role.permissions],
  }
}

function openPositionPermissions(position: PositionRow) {
  permissionModal.value = {
    type: 'position',
    title: `${position.name} (${position.code})`,
    positionId: position.id,
    selected: [...position.permissions],
  }
}

async function savePermissionModal() {
  if (!permissionModal.value) return
  const modal = permissionModal.value
  const payload = { permissions: modal.selected }
  const endpoint = modal.type === 'role'
    ? '/api/permissions/roles.set_permissions'
    : '/api/permissions/positions.set_permissions'

  const body = modal.type === 'role'
    ? { ...payload, role_id: modal.roleId }
    : { ...payload, position_id: modal.positionId }

  const res = await $fetch(endpoint, {
    method: 'POST',
    body,
  })
  if (!res.ok) {
    toast.error(`${t('settings.permissions.saveFailed')}: ${res.error}`)
    return
  }
  permissionModal.value = null
  await Promise.all([loadRoles(), loadPositions()])
}

function openUserAccess(user: UserRow) {
  userModal.value = {
    id: user.id,
    username: user.username,
    roles: [...user.roles],
    permissions: [...user.permissions],
  }
}

async function saveUserAccess() {
  if (!userModal.value) return
  const payload = {
    user_id: userModal.value.id,
    roles: userModal.value.roles,
    permissions: userModal.value.permissions,
  }
  const res = await $fetch<{ ok: boolean, error?: string }>('/api/permissions/users.update', {
    method: 'POST',
    body: payload,
  })
  if (!res.ok) {
    toast.error(`${t('settings.permissions.saveFailed')}: ${res.error}`)
    return
  }
  userModal.value = null
  await loadUsers()
}

onMounted(async () => {
  await Promise.all([loadDefinitions(), loadRoles(), loadPositions(), loadUsers()])
})
</script>
