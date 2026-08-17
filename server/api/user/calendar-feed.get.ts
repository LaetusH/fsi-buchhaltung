import { defineEventHandler } from 'h3'
import { hasCalendarToken } from '~/server/utils/calendarToken'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'

interface GetCalendarFeedSuccess {
  ok: true
  hasToken: boolean
}

interface GetCalendarFeedError {
  ok: false
  error: string
}

export type GetCalendarFeedResponse = GetCalendarFeedSuccess | GetCalendarFeedError

export default defineEventHandler(async (event): Promise<GetCalendarFeedResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  const hasToken = await hasCalendarToken(current.user.id)
  return { ok: true, hasToken }
})
