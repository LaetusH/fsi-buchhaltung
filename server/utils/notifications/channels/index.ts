import type { NotificationChannelKey } from '~/config/notificationChannels'
import type { NotificationChannel } from '~/server/utils/notifications/types'
import { inAppChannel } from '~/server/utils/notifications/channels/in-app'
import { emailChannel } from '~/server/utils/notifications/channels/email'
import { pushChannel } from '~/server/utils/notifications/channels/push'

export const CHANNELS: Record<NotificationChannelKey, NotificationChannel> = {
  in_app: inAppChannel,
  email: emailChannel,
  push: pushChannel,
}
