import type { PermissionKey } from '~/config/permissions'
import { implied } from '~/config/permissions'
import type { User } from '~/types/user'

export interface ViewAsSimulation {
  roleIds: number[]
  positionIds: number[]
  roleNames: string[]
  positionNames: string[]
  customPermissions: PermissionKey[]
  permissions: PermissionKey[]
}

interface ViewAsSelectionInput {
  roles: Array<{ id: number, name: string, permissions: string[] }>
  positions: Array<{ id: number, name: string, permissions: string[] }>
  customPermissions?: PermissionKey[]
}

const STORAGE_KEY = 'fsi_view_as_simulation'

export function expandPermissions(keys: string[]): PermissionKey[] {
  const validated = new Set<string>(keys)

  let grew = true
  while (grew) {
    grew = false
    for (const key of Array.from(validated)) {
      const impliedKeys = implied[key as PermissionKey]
      if (!impliedKeys) continue
      for (const impliedKey of impliedKeys) {
        if (validated.has(impliedKey)) continue
        validated.add(impliedKey)
        grew = true
      }
    }
  }

  return Array.from(validated) as PermissionKey[]
}

export const useViewAsSimulation = () => {
  const simulation = useState<ViewAsSimulation | null>('view_as_simulation', () => null)
  const isActive = computed(() => !!simulation.value)

  function persist() {
    if (!import.meta.client) return
    try {
      if (simulation.value) localStorage.setItem(STORAGE_KEY, JSON.stringify(simulation.value))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // localStorage unavailable (private mode, etc.) — simulation still works for this session
    }
  }

  function realPermissions(): Set<PermissionKey> {
    const user = useState<User | null>('auth_user', () => null)
    return new Set(user.value?.permissions ?? [])
  }

  function start(selection: ViewAsSelectionInput) {
    const permissionSet = new Set<string>()
    selection.roles.forEach(r => r.permissions.forEach(p => permissionSet.add(p)))
    selection.positions.forEach(p => p.permissions.forEach(pk => permissionSet.add(pk)))
    ;(selection.customPermissions ?? []).forEach(p => permissionSet.add(p))

    const allowed = realPermissions()
    const permissions = expandPermissions(Array.from(permissionSet)).filter(p => allowed.has(p))
    const customPermissions = (selection.customPermissions ?? []).filter(p => allowed.has(p))

    simulation.value = {
      roleIds: selection.roles.map(r => r.id),
      positionIds: selection.positions.map(p => p.id),
      roleNames: selection.roles.map(r => r.name),
      positionNames: selection.positions.map(p => p.name),
      customPermissions,
      permissions,
    }
    persist()
  }

  function stop() {
    simulation.value = null
    persist()
  }

  function restore() {
    if (!import.meta.client || simulation.value) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as ViewAsSimulation
      // Re-clamp in case the real user's own permissions shrank since this was persisted.
      const allowed = realPermissions()
      simulation.value = {
        ...parsed,
        customPermissions: (parsed.customPermissions ?? []).filter(p => allowed.has(p)),
        permissions: (parsed.permissions ?? []).filter(p => allowed.has(p)),
      }
    } catch {
      // ignore malformed/inaccessible storage
    }
  }

  return { simulation, isActive, start, stop, restore }
}
