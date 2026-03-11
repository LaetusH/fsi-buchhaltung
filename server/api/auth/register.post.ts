import { defineEventHandler, readBody } from 'h3'
import { query } from '~/server/utils/db'
import { hashPassword } from '~/server/utils/auth'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import type { PermissionKey } from '~/config/permissions'

interface RegisterBody {
  username: string
  password: string
  is_active?: boolean
}

interface RegisterSuccess {
  ok: true
}

interface RegisterError {
  ok: false
  error: string
}

type RegisterResponse = RegisterSuccess | RegisterError

interface MysqlError extends Error {
  code?: string
}

export default defineEventHandler(async (event): Promise<RegisterResponse> => {
  const current = await getCurrentUserFromEvent(event, false)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (!current.user.permissions.includes('users.manage' as PermissionKey)) return { ok: false, error: 'Not authorized' }

  const body = await readBody<RegisterBody>(event)
  if (!body.username || !body.password) return { ok: false, error: 'Missing fields' }
  const { username, password, is_active = true } = body

  const passwordHash = await hashPassword(password)

  try {
    await query(
      `INSERT INTO users (username, password_hash, is_active) VALUES (?, ?, ?)`,
      [username, passwordHash, is_active ? 1 : 0]
    )
  } catch (err: unknown) {
    const error = err as MysqlError

    if (error.code === 'ER_DUP_ENTRY') {
      return { ok: false, error: 'Username already exists' }
    }
    throw err
  }

  return { ok: true }
})
