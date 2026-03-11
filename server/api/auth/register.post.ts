import { defineEventHandler, readBody } from 'h3'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import type { PermissionKey } from '~/config/permissions'
import { withTransaction } from '~/server/utils/db'
import {
  assignMemberToUser,
  createUserAccount,
  DuplicateUsernameError,
  MemberAlreadyLinkedError,
  MemberNotFoundError,
} from '~/server/utils/userAccounts'

interface RegisterBody {
  username: string
  password: string
  is_active?: boolean
  member_id?: number | null
}

interface RegisterSuccess {
  ok: true
}

interface RegisterError {
  ok: false
  error: string
}

type RegisterResponse = RegisterSuccess | RegisterError

export default defineEventHandler(async (event): Promise<RegisterResponse> => {
  const current = await getCurrentUserFromEvent(event, false)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (!current.user.permissions.includes('users.manage' as PermissionKey)) return { ok: false, error: 'Not authorized' }

  const body = await readBody<RegisterBody>(event)
  if (!body.username || !body.password) return { ok: false, error: 'Missing fields' }

  try {
    await withTransaction(async (conn) => {
      const userId = await createUserAccount(body, conn)
      if (body.member_id !== undefined) {
        await assignMemberToUser(userId, body.member_id ?? null, current.user.id, conn)
      }
    })
  } catch (err: any) {
    if (err instanceof DuplicateUsernameError) {
      return { ok: false, error: 'Username already exists' }
    }
    if (err instanceof MemberAlreadyLinkedError) {
      return { ok: false, error: 'Member already linked to another user' }
    }
    if (err instanceof MemberNotFoundError) {
      return { ok: false, error: 'Member not found' }
    }
    return { ok: false, error: err.code }
  }

  return { ok: true }
})
