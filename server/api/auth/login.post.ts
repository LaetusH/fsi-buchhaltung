import { defineEventHandler, readBody, setCookie } from 'h3'
import { query } from '~/server/utils/db'
import { makeToken, createSession, comparePassword } from '~/server/utils/auth'
import { normalizeBigInt } from '~/server/utils/normalize'
import { getUserPermissions, getUserPositionIds, getUserRoleIds } from '~/server/utils/permissions'
import type { User, UserRow } from '~/types/user'

interface LoginBody {
  username: string
  password: string
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
    'SELECT id, username, password_hash, is_active, must_change_password FROM users WHERE username = ? LIMIT 1',
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
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  })

  const roles = await getUserRoleIds(user.id)
  const positionIds = await getUserPositionIds(user.id)
  const permissions = await getUserPermissions(user.id, roles, positionIds)

  return {
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      roles,
      permissions,
      is_active: user.is_active === 1,
      must_change_password: user.must_change_password === 1
    }
  }
})
