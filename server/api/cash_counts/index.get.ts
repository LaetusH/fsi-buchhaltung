import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import type { CashCountOverview } from '~/types/cashCount'

interface GetCashCountsSuccess {
  ok: true
  cashCounts: CashCountOverview[]
}

interface GetCashCountsError {
  ok: false
  error: string
}

type GetCashCountsResponse = GetCashCountsSuccess | GetCashCountsError

export default defineEventHandler(async (event): Promise<GetCashCountsResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (!current.user.permissions.includes('cash_counts.view')) return { ok: false, error: 'Not authorized' }

  try {
    const rows: any[] = await query(
      `
      SELECT
        cc.id,
        cc.event_name,
        cc.counted_before_at,
        cc.counted_after_at,
        CONCAT(m1.first_name, ' ', m1.last_name) AS counted_by_first_name,
        CONCAT(m2.first_name, ' ', m2.last_name) AS counted_by_second_name,
        CONCAT(m3.first_name, ' ', m3.last_name) AS checked_by_name,
        COUNT(DISTINCT ccp.id) AS register_count,
        IFNULL(SUM(ccp.amount_before), 0) AS total_before_amount,
        IFNULL(SUM(ccp.amount_after), 0) AS total_after_amount,
        IFNULL(SUM(ccp.amount_after - ccp.amount_before), 0) AS total_difference
      FROM cash_counts cc
      LEFT JOIN members m1 ON m1.id = cc.counted_by_first
      LEFT JOIN members m2 ON m2.id = cc.counted_by_second
      LEFT JOIN members m3 ON m3.id = cc.checked_by
      LEFT JOIN cash_count_positions ccp ON ccp.cash_count_id = cc.id
      GROUP BY cc.id
      ORDER BY cc.counted_after_at DESC, cc.id DESC
      `
    )

    return {
      ok: true,
      cashCounts: rows.map(row => ({
        id: Number(row.id),
        event_name: String(row.event_name),
        counted_before_at: String(row.counted_before_at),
        counted_after_at: String(row.counted_after_at),
        counted_by_first_name: String(row.counted_by_first_name || ''),
        counted_by_second_name: String(row.counted_by_second_name || ''),
        checked_by_name: String(row.checked_by_name || ''),
        register_count: Number(row.register_count || 0),
        total_before_amount: Number(row.total_before_amount || 0),
        total_after_amount: Number(row.total_after_amount || 0),
        total_difference: Number(row.total_difference || 0),
      })),
    }
  } catch (err: any) {
    return { ok: false, error: `Failed to load cash counts: ${err}` }
  }
})
