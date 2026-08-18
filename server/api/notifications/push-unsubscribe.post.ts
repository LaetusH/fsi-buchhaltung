import { defineEventHandler, readBody } from 'h3'
import { requireAuth } from '~/server/utils/api/guards'
import { query } from '~/server/utils/db'

interface PushUnsubscribeSuccess { ok: true }
interface PushUnsubscribeError { ok: false, error: string }
export type PushUnsubscribeResponse = PushUnsubscribeSuccess | PushUnsubscribeError

export default defineEventHandler(async (event): Promise<PushUnsubscribeResponse> => {
  const current = await requireAuth(event, { touch: false })
  if (!current.ok) return current

  const body = await readBody<{ endpoint?: string }>(event)
  const endpoint = String(body?.endpoint || '').trim()
  if (!endpoint) return { ok: false, error: 'Ungültiger Endpunkt' }

  await query(`DELETE FROM notification_push_subscriptions WHERE user_id = ? AND endpoint = ?`, [current.user.id, endpoint])

  return { ok: true }
})
