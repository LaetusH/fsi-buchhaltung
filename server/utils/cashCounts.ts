import type mariadb from 'mariadb'
import type { CreateCashCountBody, CreateCashCountPositionBody } from '~/types/cashCount'
import { query } from '~/server/utils/db'

export function normalizeCashCountAmount(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : NaN
}

export function normalizeCashCountPosition(position: CreateCashCountPositionBody, index: number) {
  return {
    id: position.id ? Number(position.id) : undefined,
    register_number: index + 1,
    amount_before: normalizeCashCountAmount(position.amount_before),
    amount_after: normalizeCashCountAmount(position.amount_after),
    notes: position.notes?.trim() ? position.notes.trim() : null,
  }
}

export function normalizeCashCountBody(body: CreateCashCountBody) {
  return {
    event_id: Number(body.event_id || 0),
    counted_by_first: Number(body.counted_by_first || 0),
    counted_by_second: Number(body.counted_by_second || 0),
    checked_by: Number(body.checked_by || 0),
    counted_before_at: String(body.counted_before_at || ''),
    counted_after_at: String(body.counted_after_at || ''),
    positions: Array.isArray(body.positions) ? body.positions.map(normalizeCashCountPosition) : [],
  }
}

export function validateCashCountBody(body: ReturnType<typeof normalizeCashCountBody>) {
  if (!body.event_id) return 'event_id is required'
  if (!body.counted_by_first || !body.counted_by_second || !body.checked_by) return 'All member references are required'
  if (!body.counted_before_at || !body.counted_after_at) return 'Both timestamps are required'
  if (new Set([body.counted_by_first, body.counted_by_second, body.checked_by]).size !== 3) {
    return 'All three member references must be distinct'
  }
  if (!body.positions.length) return 'At least one register is required'
  if (body.positions.some(position => Number.isNaN(position.amount_before) || Number.isNaN(position.amount_after))) {
    return 'Each position requires amount_before and amount_after'
  }

  const beforeTs = Date.parse(body.counted_before_at)
  const afterTs = Date.parse(body.counted_after_at)
  if (!Number.isFinite(beforeTs) || !Number.isFinite(afterTs)) return 'Invalid timestamps'
  if (afterTs <= beforeTs) return 'counted_after_at must be later than counted_before_at'

  return null
}

export async function validateCashCountRelations(
  body: ReturnType<typeof normalizeCashCountBody>,
  conn: mariadb.PoolConnection,
) {
  const eventRows = await query<{ id: number }[]>(
    `SELECT id
     FROM events
     WHERE id = ?
     LIMIT 1`,
    [body.event_id],
    conn,
  )
  if (!eventRows.length) return 'The selected event does not exist'

  const memberIds = [body.counted_by_first, body.counted_by_second, body.checked_by]
  const memberRows = await query<{ id: number }[]>(
    `SELECT id
     FROM members
     WHERE id IN (${memberIds.map(() => '?').join(',')})`,
    memberIds,
    conn,
  )

  return memberRows.length === memberIds.length
    ? null
    : 'At least one selected member does not exist'
}

export function sameDecimal(left: unknown, right: unknown) {
  return Number(left ?? 0).toFixed(2) === Number(right ?? 0).toFixed(2)
}
