import { defineEventHandler } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { getNumericRouteParam } from '~/server/utils/api/request'
import { withAuditTransaction } from '~/server/utils/db'
import { cancelNotification } from '~/server/utils/notifications/enqueue'

interface CancelSuccess { ok: true }
interface CancelError { ok: false, error: string }
export type CancelNotificationResponse = CancelSuccess | CancelError

export default defineEventHandler(async (event): Promise<CancelNotificationResponse> => {
  const current = await requirePermission(event, 'notifications.send')
  if (!current.ok) return current

  const id = getNumericRouteParam(event)
  if (!id) return { ok: false, error: 'Invalid id' }

  return await withAuditTransaction(current.user, async conn => cancelNotification(id, conn))
})
