import { defineEventHandler, getCookie, setCookie } from 'h3'
import { deleteSessionByToken } from '~/server/utils/auth'

interface LogoutResponse {
  ok: boolean
}

export default defineEventHandler(async (event): Promise<LogoutResponse> => {
  const cookieName = process.env.SESSION_COOKIE_NAME || 'app_session'
  const token = getCookie(event, cookieName)
  if (token) {
    await deleteSessionByToken(token)
    setCookie(event, cookieName, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0
    })
    return { ok: true }
  }

  return { ok: false }
})