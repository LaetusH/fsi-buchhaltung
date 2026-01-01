import { getCookie } from 'h3'
import { getSessionByToken, touchSession, inactivityMinutes, deleteSessionByToken } from './auth'
import { normalizeBigInt } from '~/server/utils/normalize'
import type { User } from '~/types/user'

interface SessionSuccess {
  ok: true
  user: User
}

interface SessionError {
  ok: false
  error: string
}

export type SessionResponse = SessionError | SessionSuccess

export async function getCurrentUserFromEvent(event: any, touch: boolean): Promise<SessionResponse> {
  const cookieName = process.env.SESSION_COOKIE_NAME || 'app_session'
  const token = getCookie(event, cookieName)

  if (!token) return { ok: false, error: "missing token" }

  const session = normalizeBigInt(await getSessionByToken(token))
  if (!session) return { ok: false, error: "error on getting session" }

  const now = new Date()
  if (session.expires_at && new Date(session.expires_at + 'Z') < now) {
    return { ok: false, error: "session expired" }
  }

  const lastActive = new Date(session.last_active_at + 'Z')
  const inactivityLimit = new Date(lastActive.getTime() + inactivityMinutes * 60 * 1000)

  if (inactivityLimit < now) {
    await deleteSessionByToken(token)
    return { ok: false, error: "user has been inactive for too long" }
  }
  
  if (touch) await touchSession(token)

  return {
    ok: true,
    user: {
      id: session.user_id,
      username: session.username,
      role: session.role,
      is_active: session.is_active === 1 || session.is_active === '1'
    }
  }
}