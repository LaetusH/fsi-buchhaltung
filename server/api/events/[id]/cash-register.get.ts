import { defineEventHandler, getRouterParam } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { cashRegisterQuery, isCashRegisterConnected } from '~/server/utils/cashRegisterDb'

export interface CashRegisterOverviewItem {
  id: number
  name: string
  quantity: number
  amount: number
}

export interface CashRegisterHourlyEntry {
  hour: string
  revenue: number
  quantity: number
}

export interface CashRegisterOverview {
  regular: {
    items: CashRegisterOverviewItem[]
    totalRevenue: number
    totalQuantity: number
  }
  fachschaft: {
    items: CashRegisterOverviewItem[]
    totalWorth: number
    totalQuantity: number
  }
  payments: {
    count: number
    amount: number
    revenue: number
  }
  hourly: CashRegisterHourlyEntry[]
}

export type EventCashRegisterResponse =
  | { ok: true, connected: false }
  | { ok: true, connected: true, linked: false }
  | { ok: true, connected: true, linked: true, overview: CashRegisterOverview }
  | { ok: false, error: string }

// Builds a continuous hour-by-hour series from the first to the last sale of
// the event, so events of any length chart correctly including quiet hours.
function fillHourlyGaps(rows: Array<{ hour_start: string, revenue: unknown, quantity: unknown }>): CashRegisterHourlyEntry[] {
  if (!rows.length) return []

  const byHour = new Map(rows.map(row => [row.hour_start, row]))
  const toTime = (value: string) => new Date(value.replace(' ', 'T') + 'Z').getTime()
  const toKey = (time: number) => new Date(time).toISOString().slice(0, 19).replace('T', ' ')

  const firstTime = toTime(rows[0]!.hour_start)
  const lastTime = toTime(rows[rows.length - 1]!.hour_start)
  const hourMs = 60 * 60 * 1000

  const result: CashRegisterHourlyEntry[] = []
  for (let time = firstTime; time <= lastTime; time += hourMs) {
    const row = byHour.get(toKey(time))
    result.push({
      hour: toKey(time),
      revenue: Number(row?.revenue ?? 0),
      quantity: Number(row?.quantity ?? 0),
    })
  }

  return result
}

export default defineEventHandler(async (event): Promise<EventCashRegisterResponse> => {
  const current = await requirePermission(event, 'cash_register.manage')
  if (!current.ok) return current

  const accountingEventId = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(accountingEventId) || accountingEventId <= 0) {
    return { ok: false, error: 'Invalid event id' }
  }

  if (!isCashRegisterConnected()) {
    return { ok: true, connected: false }
  }

  const eventRows = await cashRegisterQuery<Array<{ id: number }>>(
    `SELECT id
     FROM events
     WHERE accounting_event_id = ?
     LIMIT 1`,
    [accountingEventId],
  )

  if (!eventRows[0]) {
    return { ok: true, connected: true, linked: false }
  }

  const cashRegisterEventId = Number(eventRows[0].id)

  const regularRows = await cashRegisterQuery<Array<{ id: number, name: string, quantity: unknown, amount: unknown }>>(`
    SELECT
      i.id,
      i.name,
      SUM(oi.quantity) AS quantity,
      SUM(oi.quantity * (i.price + IFNULL(i.deposit, 0))) AS amount
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN items i ON oi.item_id = i.id
    WHERE o.fachschaft = 0
      AND o.event_id = ?
    GROUP BY i.id
    ORDER BY i.name ASC
  `, [cashRegisterEventId])

  const fachschaftRows = await cashRegisterQuery<Array<{ id: number, name: string, quantity: unknown, amount: unknown }>>(`
    SELECT
      i.id,
      i.name,
      SUM(oi.quantity) AS quantity,
      SUM(oi.quantity * (i.price + IFNULL(i.deposit, 0))) AS amount
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN items i ON oi.item_id = i.id
    WHERE o.fachschaft = 1
      AND o.event_id = ?
    GROUP BY i.id
    ORDER BY i.name ASC
  `, [cashRegisterEventId])

  const paymentRows = await cashRegisterQuery<Array<{ count: unknown }>>(`
    SELECT COUNT(*) AS count
    FROM fachschaft_payments
    WHERE event_id = ?
  `, [cashRegisterEventId])

  const settingRows = await cashRegisterQuery<Array<{ setting_value: string | null }>>(`
    SELECT setting_value
    FROM app_settings
    WHERE setting_key = 'fachschaft_payment_amount'
    LIMIT 1
  `, [])

  const hourlyRows = await cashRegisterQuery<Array<{ hour_start: string, revenue: unknown, quantity: unknown }>>(`
    SELECT
      DATE_FORMAT(o.created_at, '%Y-%m-%d %H:00:00') AS hour_start,
      SUM(oi.quantity * (i.price + IFNULL(i.deposit, 0))) AS revenue,
      SUM(oi.quantity) AS quantity
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN items i ON oi.item_id = i.id
    WHERE o.fachschaft = 0
      AND o.event_id = ?
    GROUP BY hour_start
    ORDER BY hour_start ASC
  `, [cashRegisterEventId])

  const toItem = (row: { id: number, name: string, quantity: unknown, amount: unknown }): CashRegisterOverviewItem => ({
    id: Number(row.id),
    name: String(row.name),
    quantity: Number(row.quantity ?? 0),
    amount: Number(row.amount ?? 0),
  })

  const regularItems = regularRows.map(toItem)
  const fachschaftItems = fachschaftRows.map(toItem)

  const parsedAmount = Number(settingRows[0]?.setting_value)
  const paymentAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 10
  const paymentCount = Number(paymentRows[0]?.count ?? 0)

  return {
    ok: true,
    connected: true,
    linked: true,
    overview: {
      regular: {
        items: regularItems,
        totalRevenue: regularItems.reduce((sum, item) => sum + item.amount, 0),
        totalQuantity: regularItems.reduce((sum, item) => sum + item.quantity, 0),
      },
      fachschaft: {
        items: fachschaftItems,
        totalWorth: fachschaftItems.reduce((sum, item) => sum + item.amount, 0),
        totalQuantity: fachschaftItems.reduce((sum, item) => sum + item.quantity, 0),
      },
      payments: {
        count: paymentCount,
        amount: paymentAmount,
        revenue: paymentCount * paymentAmount,
      },
      hourly: fillHourlyGaps(hourlyRows),
    },
  }
})
