import { defineEventHandler, getQuery } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { query } from '~/server/utils/db'
import type { NotificationOutboxItem } from '~/types/notification'

interface GetOutboxSuccess { ok: true, items: NotificationOutboxItem[] }
interface GetOutboxError { ok: false, error: string }
export type GetNotificationOutboxResponse = GetOutboxSuccess | GetOutboxError

export default defineEventHandler(async (event): Promise<GetNotificationOutboxResponse> => {
  const current = await requirePermission(event, 'notifications.view')
  if (!current.ok) return current

  const q = getQuery(event)
  const limit = Math.min(Math.max(Number(q.limit) || 100, 1), 500)

  const rows = await query<Array<{
    id: number
    type_key: string
    subject_override: string | null
    status: string
    scheduled_for: string
    created_at: string
    created_by_username: string | null
    sent: number
    failed: number
    pending: number
    skipped: number
  }>>(
    `SELECT n.id, n.type_key, n.subject_override, n.status, n.scheduled_for, n.created_at, u.username AS created_by_username,
            COALESCE(SUM(nd.status = 'sent'), 0) AS sent,
            COALESCE(SUM(nd.status = 'failed'), 0) AS failed,
            COALESCE(SUM(nd.status = 'pending'), 0) AS pending,
            COALESCE(SUM(nd.status = 'skipped'), 0) AS skipped
     FROM notifications n
     LEFT JOIN users u ON u.id = n.created_by
     LEFT JOIN notification_deliveries nd ON nd.notification_id = n.id
     GROUP BY n.id
     ORDER BY n.scheduled_for DESC, n.id DESC
     LIMIT ?`,
    [limit],
  )

  return {
    ok: true,
    items: rows.map(row => ({
      id: row.id,
      typeKey: row.type_key as NotificationOutboxItem['typeKey'],
      subject: row.subject_override || '',
      status: row.status as NotificationOutboxItem['status'],
      scheduledFor: row.scheduled_for,
      createdAt: row.created_at,
      createdByUsername: row.created_by_username,
      counts: { sent: Number(row.sent), failed: Number(row.failed), pending: Number(row.pending), skipped: Number(row.skipped) },
    })),
  }
})
