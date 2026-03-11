import { defineEventHandler } from 'h3'
import { PermissionDefinition, PERMISSIONS } from '~/config/permissions'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'

interface DefinitionsSuccess {
  ok: true
  permissions: PermissionDefinition[]
}

interface DefinitionsError {
  ok: false
  error: string
}

type DefinitionsResponse = DefinitionsSuccess | DefinitionsError

export default defineEventHandler(async (event): Promise<DefinitionsResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (!current.user.permissions.includes('permissions.manage')) return { ok: false, error: 'Not authorized' }

  return { ok: true, permissions: PERMISSIONS }
})
