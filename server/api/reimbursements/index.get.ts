import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import type { ReimbursementOverview } from '~/types/reimbursement'

interface GetReimbursementsSuccess {
  ok: true
  reimbursements: ReimbursementOverview[]
}

interface GetReimbursementsError {
  ok: false
  error: string
}

type GetReimbursementResponse = GetReimbursementsSuccess | GetReimbursementsError

export default defineEventHandler(async (event): Promise<GetReimbursementResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (!current.user.permissions.includes('reimbursements.view')) return { ok: false, error: 'Not authorized' }

  try {
    const rows: ReimbursementOverview[] = await query(
      `
      SELECT
        r.id,
        r.paid_by,
        CONCAT(m.first_name, ' ', m.last_name) AS member_name,
        r.submitted_at,
        r.checked_at,
        r.disbursed_at,
        COUNT(DISTINCT rp.receipt_id) AS receipt_count,
        IFNULL(SUM(pos.amount), 0) AS total_amount
      FROM reimbursements r
      LEFT JOIN members m ON m.id = r.paid_by
      LEFT JOIN reimbursement_positions rp ON rp.reimbursement_id = r.id
      LEFT JOIN receipts rec ON rec.id = rp.receipt_id
      LEFT JOIN receipt_positions pos ON pos.receipt_id = rec.id
      GROUP BY r.id
      ORDER BY r.submitted_at DESC, r.id DESC
      `
    )

    return { ok: true, reimbursements: rows.map(r => ({
      id: Number(r.id),
      paid_by: Number(r.paid_by),
      member_name: String(r.member_name),
      submitted_at: String(r.submitted_at),
      checked_at: r.checked_at ? String(r.checked_at) : null,
      disbursed_at: r.disbursed_at ? String(r.disbursed_at) : null,
      receipt_count: Number(r.receipt_count),
      total_amount: Number(r.total_amount),
    }))}
    
  } catch (err: any) {
    return { ok: false, error: `Failed to load receipts: ${err}` }
  }
})
