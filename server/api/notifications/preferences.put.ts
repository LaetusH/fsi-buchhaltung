import { defineEventHandler, readBody } from 'h3'
import { requireAuth } from '~/server/utils/api/guards'
import { withAuditTransaction } from '~/server/utils/db'
import { setPreference } from '~/server/utils/notifications/preferences'
import { NOTIFICATION_TYPE_MAP, type NotificationTypeKey } from '~/config/notificationTypes'
import type { NotificationChannelKey } from '~/config/notificationChannels'

interface PreferenceEntryInput {
  typeKey: NotificationTypeKey
  channel: NotificationChannelKey
  enabled: boolean | null
}

interface SavePreferencesSuccess { ok: true }
interface SavePreferencesError { ok: false, error: string }
export type SaveNotificationPreferencesResponse = SavePreferencesSuccess | SavePreferencesError

const VALID_CHANNELS: NotificationChannelKey[] = ['in_app', 'email', 'push']

export default defineEventHandler(async (event): Promise<SaveNotificationPreferencesResponse> => {
  const current = await requireAuth(event, { touch: false })
  if (!current.ok) return current

  const body = await readBody<{ entries?: PreferenceEntryInput[] }>(event)
  const entries = Array.isArray(body?.entries) ? body.entries : []
  if (!entries.length) return { ok: false, error: 'Keine Änderungen übermittelt' }

  for (const entry of entries) {
    const definition = NOTIFICATION_TYPE_MAP[entry.typeKey]
    if (!definition || !definition.userConfigurable) return { ok: false, error: `Unbekannter oder nicht konfigurierbarer Typ: ${entry.typeKey}` }
    if (!VALID_CHANNELS.includes(entry.channel) || entry.channel === 'in_app') return { ok: false, error: `Ungültiger Kanal: ${entry.channel}` }
  }

  await withAuditTransaction(current.user, async (conn) => {
    for (const entry of entries) {
      await setPreference('user', current.user.id, entry.typeKey, entry.channel, entry.enabled, conn)
    }
  })

  return { ok: true }
})
