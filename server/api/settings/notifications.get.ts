import { defineEventHandler } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { getNotificationSettings } from '~/server/utils/notifications/settings'
import type { NotificationSettings } from '~/types/notification'

interface GetNotificationSettingsSuccess { ok: true, settings: NotificationSettings, smtpConfigured: boolean, pushConfigured: boolean }
interface GetNotificationSettingsError { ok: false, error: string }
export type GetNotificationSettingsResponse = GetNotificationSettingsSuccess | GetNotificationSettingsError

export default defineEventHandler(async (event): Promise<GetNotificationSettingsResponse> => {
  const current = await requirePermission(event, 'settings.notifications.manage')
  if (!current.ok) return current

  const settings = await getNotificationSettings()
  return {
    ok: true,
    settings,
    smtpConfigured: Boolean(process.env.SMTP_HOST),
    pushConfigured: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  }
})
