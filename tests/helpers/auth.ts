import type { H3Event } from 'h3'
import { createSession, makeToken } from '~/server/utils/auth'
import type { PermissionKey } from '~/config/permissions'
import { createUser } from './fixtures'

/** An H3 event carrying the given session cookie — enough for every guard in the app. */
export function eventWithToken(token: string | null): H3Event {
  const cookieName = process.env.SESSION_COOKIE_NAME || 'app_session'

  return {
    node: {
      req: { headers: token ? { cookie: `${cookieName}=${token}` } : {} },
      res: { setHeader() {}, getHeader() { return undefined }, headersSent: false },
    },
  } as unknown as H3Event
}

export interface SignedInUser {
  id: number
  username: string
  password: string
  token: string
  event: H3Event
}

/** Creates a user with the given permissions and an active session for them. */
export async function signIn(options: {
  permissions?: PermissionKey[]
  username?: string
  isActive?: boolean
  mustChangePassword?: boolean
} = {}): Promise<SignedInUser> {
  const user = await createUser(options)
  const token = makeToken()
  await createSession(user.id, token)

  return { ...user, token, event: eventWithToken(token) }
}

/** An event with no session cookie at all — the anonymous caller. */
export function anonymousEvent(): H3Event {
  return eventWithToken(null)
}
