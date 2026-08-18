import { query } from '~/server/utils/db'
import { NOTIFICATION_TYPE_MAP, type NotificationTypeKey } from '~/config/notificationTypes'
import { isTypeChannelEnabled, isTypeEnabled } from '~/server/utils/notifications/settings'
import type { NotificationChannelKey } from '~/config/notificationChannels'
import type { NotificationSettings } from '~/types/notification'
import type { ResolvedRecipient, DbConn } from '~/server/utils/notifications/types'

interface PreferenceRow {
  subject_type: 'user' | 'member'
  subject_id: number
  type_key: string
  channel: string
  enabled: number
}

async function loadPreferenceRows(subjectType: 'user' | 'member', subjectId: number, conn?: DbConn): Promise<PreferenceRow[]> {
  return await query<PreferenceRow[]>(
    `SELECT subject_type, subject_id, type_key, channel, enabled
     FROM notification_preferences
     WHERE subject_type = ? AND subject_id = ?`,
    [subjectType, subjectId],
    conn,
  )
}

export async function getEffectiveChannels(
  typeKey: NotificationTypeKey,
  recipient: ResolvedRecipient,
  settings: NotificationSettings,
  conn?: DbConn,
): Promise<NotificationChannelKey[]> {
  const definition = NOTIFICATION_TYPE_MAP[typeKey]
  if (!definition) return []
  if (!isTypeEnabled(settings, typeKey)) return []

  const [userRows, memberRows] = await Promise.all([
    recipient.userId ? loadPreferenceRows('user', recipient.userId, conn) : Promise.resolve([]),
    recipient.memberId ? loadPreferenceRows('member', recipient.memberId, conn) : Promise.resolve([]),
  ])

  const channels: NotificationChannelKey[] = []
  const allChannels: NotificationChannelKey[] = ['in_app', 'email', 'push']

  for (const channel of allChannels) {
    // The association-wide per-type switches win over everything below, including the personal
    // preference: what the settings page switched off must not be delivered by any route.
    if (!isTypeChannelEnabled(settings, typeKey, channel)) continue

    if (channel === 'in_app') {
      if (recipient.userId) channels.push(channel)
      continue
    }

    if (!definition.userConfigurable) {
      if (settings.channels_enabled[channel]) channels.push(channel)
      continue
    }

    const userOverride = userRows.find(row => row.type_key === typeKey && row.channel === channel)
    if (userOverride) {
      if (userOverride.enabled) channels.push(channel)
      continue
    }

    const memberOverride = memberRows.find(row => row.type_key === typeKey && row.channel === channel)
    if (memberOverride) {
      if (memberOverride.enabled) channels.push(channel)
      continue
    }

    if (!settings.channels_enabled[channel]) continue

    if (definition.defaultChannels.includes(channel)) channels.push(channel)
  }

  return channels
}

export async function getPreferenceMatrix(subjectType: 'user' | 'member', subjectId: number, settings: NotificationSettings, conn?: DbConn) {
  const overrides = await loadPreferenceRows(subjectType, subjectId, conn)
  const overrideMap = new Map(overrides.map(row => [`${row.type_key}:${row.channel}`, Boolean(row.enabled)]))

  const entries: Array<{ typeKey: NotificationTypeKey, channel: NotificationChannelKey, effective: boolean, isOverride: boolean, blocked: boolean }> = []

  for (const definition of Object.values(NOTIFICATION_TYPE_MAP)) {
    if (!definition.userConfigurable) continue
    // A type the association switched off entirely offers the user nothing to decide.
    if (!isTypeEnabled(settings, definition.key)) continue

    for (const channel of (['email', 'push'] as NotificationChannelKey[])) {
      const key = `${definition.key}:${channel}`
      const override = overrideMap.get(key)
      const blocked = !isTypeChannelEnabled(settings, definition.key, channel)
      const effective = override !== undefined ? override : (settings.channels_enabled[channel] && definition.defaultChannels.includes(channel))
      entries.push({
        typeKey: definition.key,
        channel,
        effective: blocked ? false : Boolean(effective),
        isOverride: override !== undefined,
        blocked,
      })
    }
  }

  return entries
}

export async function setPreference(
  subjectType: 'user' | 'member',
  subjectId: number,
  typeKey: NotificationTypeKey,
  channel: NotificationChannelKey,
  enabled: boolean | null,
  conn?: DbConn,
) {
  if (enabled === null) {
    await query(
      `DELETE FROM notification_preferences WHERE subject_type = ? AND subject_id = ? AND type_key = ? AND channel = ?`,
      [subjectType, subjectId, typeKey, channel],
      conn,
    )
    return
  }

  await query(
    `INSERT INTO notification_preferences (subject_type, subject_id, type_key, channel, enabled)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)`,
    [subjectType, subjectId, typeKey, channel, enabled ? 1 : 0],
    conn,
  )
}
