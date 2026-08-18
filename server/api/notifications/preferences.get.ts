import { defineEventHandler } from 'h3'
import { requireAuth } from '~/server/utils/api/guards'
import { getNotificationSettings } from '~/server/utils/notifications/settings'
import { getPreferenceMatrix } from '~/server/utils/notifications/preferences'
import type { NotificationPreferenceEntry } from '~/types/notification'

interface GetPreferencesSuccess {
  ok: true
  entries: NotificationPreferenceEntry[]
}
interface GetPreferencesError { ok: false, error: string }
export type GetNotificationPreferencesResponse = GetPreferencesSuccess | GetPreferencesError

export default defineEventHandler(async (event): Promise<GetNotificationPreferencesResponse> => {
  const current = await requireAuth(event)
  if (!current.ok) return current

  const settings = await getNotificationSettings()
  const entries = await getPreferenceMatrix('user', current.user.id, settings)

  return { ok: true, entries }
})
