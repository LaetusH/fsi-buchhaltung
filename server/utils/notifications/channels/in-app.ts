import type { NotificationChannel } from '~/server/utils/notifications/types'

export const inAppChannel: NotificationChannel = {
  key: 'in_app',
  isConfigured: () => true,
  addressFor: recipient => (recipient.userId ? String(recipient.userId) : null),
  async send() {
    // The delivery row itself is the notification — nothing to dispatch.
  },
}
