import { defineEventHandler, readBody, setCookie } from 'h3'
import { query } from '~/server/utils/db'
import { makeToken, createSession, comparePassword } from '~/server/utils/auth'
import { normalizeBigInt } from '~/server/utils/normalize'
import type { UserRole, User } from '~/types/user'

interface LoginBody {
  username: string
  password: string
}

interface UserRow {
  id: number
  username: string
  password_hash: string
  role: UserRole
  is_active: number
}

interface LoginSuccess {
  ok: true
  user: User
}

interface LoginError {
  ok: false
  error: string
}

export type LoginResponse = LoginSuccess | LoginError

export default defineEventHandler(async (event): Promise<LoginResponse> => {
  const body = await readBody<LoginBody>(event)
  if (!body.username || !body.password) return { ok: false, error: 'Missing credentials' }
  const { username, password } = body

  const rows = await query(
    'SELECT id, username, password_hash, role, is_active FROM users WHERE username = ? LIMIT 1', 
    [username]
  ) as UserRow[]

  if (rows.length === 0) return { ok: false, error: 'Invalid username or password'}

  const user = normalizeBigInt(rows[0]) as UserRow

  if (!user.is_active) return { ok: false, error: 'User is inactive' }

  const passwordMatches = await comparePassword(password, user.password_hash)
  if (!passwordMatches) return { ok: false, error: 'Invalid username or password' }

  const token = makeToken()
  await createSession(user.id, token)

  const cookieName = process.env.SESSION_COOKIE_NAME || 'app_session'
  const maxAgeSeconds = parseInt(process.env.SESSION_MAX_AGE_MINUTES || '1440') * 60

  setCookie(event, cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: maxAgeSeconds,
  })

  return {
    ok: true,
    user: { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      is_active: user.is_active === 1
    }
  }
})