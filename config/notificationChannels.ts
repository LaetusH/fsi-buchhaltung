export type NotificationChannelKey = 'in_app' | 'email' | 'push'

export interface NotificationChannelDefinition {
  key: NotificationChannelKey
  labelKey: string
}

export const NOTIFICATION_CHANNELS: NotificationChannelDefinition[] = [
  { key: 'in_app', labelKey: 'notifications.channels.in_app' },
  { key: 'email', labelKey: 'notifications.channels.email' },
  { key: 'push', labelKey: 'notifications.channels.push' },
]
