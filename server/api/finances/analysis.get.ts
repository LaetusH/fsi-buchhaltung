import { defineEventHandler, getQuery } from 'h3'
import { query } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/api/guards'
import type { FinanceAnalysisCashCountItem, FinanceAnalysisData, FinanceAnalysisReceiptItem } from '~/types/financeAnalysis'
import { ReceiptStatus } from '~/types/receipt'

interface FinanceAnalysisSuccess {
  ok: true
  analysis: FinanceAnalysisData
}

interface FinanceAnalysisError {
  ok: false
  error: string
}

type FinanceAnalysisResponse = FinanceAnalysisSuccess | FinanceAnalysisError

function isDateOnly(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function defaultDateRange() {
  const now = new Date()
  const year = now.getFullYear()
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  }
}

function isReceiptStatus(value: unknown): value is ReceiptStatus {
  return Object.values(ReceiptStatus).includes(value as ReceiptStatus)
}

function getRequestedStatuses(value: unknown) {
  if (Array.isArray(value)) return value.filter(isReceiptStatus)
  if (typeof value === 'string') return [value].filter(isReceiptStatus)
  return []
}

function parsePositiveInteger(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export default defineEventHandler(async (event): Promise<FinanceAnalysisResponse> => {
  const current = await requirePermission(event, ['receipts.view', 'cash_counts.view'], { requireAll: true })
  if (!current.ok) return current

  const queryParams = getQuery(event)
  const fallback = defaultDateRange()
  const startDate = isDateOnly(queryParams.startDate) ? queryParams.startDate : fallback.start
  const endDate = isDateOnly(queryParams.endDate) ? queryParams.endDate : fallback.end
  const selectedStatuses = getRequestedStatuses(queryParams.statuses)
  const costCentreId = parsePositiveInteger(queryParams.costCentreId)

  if (startDate > endDate) {
    return { ok: false, error: 'The start date must be before or equal to the end date.' }
  }

  try {
    const receiptRows: any[] = selectedStatuses.length
      ? await query(
          `
          SELECT
            r.id,
            r.receipt_date,
            r.receipt_number,
            r.status,
            c.name AS company_name,
            IFNULL(SUM(rp.amount), 0) AS total_amount
          FROM receipts r
          LEFT JOIN companies c ON c.id = r.company_id
          LEFT JOIN receipt_positions rp ON rp.receipt_id = r.id
          WHERE r.receipt_date BETWEEN ? AND ?
            AND r.status IN (${selectedStatuses.map(() => '?').join(', ')})
            ${costCentreId ? 'AND rp.cost_centre = ?' : ''}
          GROUP BY r.id
          ORDER BY r.receipt_date DESC, r.id DESC
          `,
          costCentreId
            ? [startDate, endDate, ...selectedStatuses, costCentreId]
            : [startDate, endDate, ...selectedStatuses],
        )
      : []

    const cashCountRows: any[] = costCentreId
      ? []
      : await query(
          `
          SELECT
            cc.id,
            cc.event_name,
            cc.counted_before_at,
            cc.counted_after_at,
            COUNT(DISTINCT ccp.id) AS register_count,
            IFNULL(SUM(ccp.amount_before), 0) AS total_before_amount,
            IFNULL(SUM(ccp.amount_after), 0) AS total_after_amount,
            IFNULL(SUM(ccp.amount_after - ccp.amount_before), 0) AS total_difference
          FROM cash_counts cc
          LEFT JOIN cash_count_positions ccp ON ccp.cash_count_id = cc.id
          WHERE DATE(cc.counted_after_at) BETWEEN ? AND ?
          GROUP BY cc.id
          ORDER BY cc.counted_after_at DESC, cc.id DESC
          `,
          [startDate, endDate],
        )

    const receipts: FinanceAnalysisReceiptItem[] = receiptRows.map(row => ({
      id: Number(row.id),
      receipt_date: String(row.receipt_date),
      receipt_number: row.receipt_number ? String(row.receipt_number) : null,
      company_name: row.company_name ? String(row.company_name) : null,
      status: row.status as ReceiptStatus,
      total_amount: Number(row.total_amount || 0),
    }))

    const cashCounts: FinanceAnalysisCashCountItem[] = cashCountRows.map(row => ({
      id: Number(row.id),
      event_name: String(row.event_name || ''),
      counted_before_at: String(row.counted_before_at),
      counted_after_at: String(row.counted_after_at),
      register_count: Number(row.register_count || 0),
      total_before_amount: Number(row.total_before_amount || 0),
      total_after_amount: Number(row.total_after_amount || 0),
      total_difference: Number(row.total_difference || 0),
    }))

    const receiptSummary = receipts.reduce((summary, receipt) => {
      summary.receipt_total += receipt.total_amount

      switch (receipt.status) {
        case ReceiptStatus.Paid:
          summary.receipt_paid_count += 1
          summary.receipt_paid_total += receipt.total_amount
          break
        case ReceiptStatus.Open:
          summary.receipt_open_count += 1
          summary.receipt_open_total += receipt.total_amount
          break
        case ReceiptStatus.Cancelled:
          summary.receipt_cancelled_count += 1
          summary.receipt_cancelled_total += receipt.total_amount
          break
        case ReceiptStatus.Draft:
        default:
          summary.receipt_draft_count += 1
          summary.receipt_draft_total += receipt.total_amount
          break
      }

      return summary
    }, {
      receipt_total: 0,
      receipt_paid_count: 0,
      receipt_paid_total: 0,
      receipt_open_count: 0,
      receipt_open_total: 0,
      receipt_draft_count: 0,
      receipt_draft_total: 0,
      receipt_cancelled_count: 0,
      receipt_cancelled_total: 0,
    })

    const cashCountSummary = cashCounts.reduce((summary, cashCount) => {
      summary.cash_count_register_total += cashCount.register_count
      summary.cash_count_total_before += cashCount.total_before_amount
      summary.cash_count_total_after += cashCount.total_after_amount
      summary.cash_count_total_difference += cashCount.total_difference
      return summary
    }, {
      cash_count_register_total: 0,
      cash_count_total_before: 0,
      cash_count_total_after: 0,
      cash_count_total_difference: 0,
    })

    return {
      ok: true,
      analysis: {
        summary: {
          start_date: startDate,
          end_date: endDate,
          receipt_count: receipts.length,
          receipt_total: Number(receiptSummary.receipt_total.toFixed(2)),
          receipt_paid_count: receiptSummary.receipt_paid_count,
          receipt_paid_total: Number(receiptSummary.receipt_paid_total.toFixed(2)),
          receipt_open_count: receiptSummary.receipt_open_count,
          receipt_open_total: Number(receiptSummary.receipt_open_total.toFixed(2)),
          receipt_draft_count: receiptSummary.receipt_draft_count,
          receipt_draft_total: Number(receiptSummary.receipt_draft_total.toFixed(2)),
          receipt_cancelled_count: receiptSummary.receipt_cancelled_count,
          receipt_cancelled_total: Number(receiptSummary.receipt_cancelled_total.toFixed(2)),
          cash_count_count: cashCounts.length,
          cash_count_register_total: cashCountSummary.cash_count_register_total,
          cash_count_total_before: Number(cashCountSummary.cash_count_total_before.toFixed(2)),
          cash_count_total_after: Number(cashCountSummary.cash_count_total_after.toFixed(2)),
          cash_count_total_difference: Number(cashCountSummary.cash_count_total_difference.toFixed(2)),
          net_result: Number((cashCountSummary.cash_count_total_difference - receiptSummary.receipt_total).toFixed(2)),
        },
        receipts,
        cashCounts,
      },
    }
  } catch (err: any) {
    return { ok: false, error: `Failed to load finance analysis: ${err}` }
  }
})
