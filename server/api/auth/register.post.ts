import { defineEventHandler, readBody } from 'h3'
import { withTransaction } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/api/guards'
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
  const current = await requirePermission(event, 'users.manage', { touch: false })
  if (!current.ok) return current

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
