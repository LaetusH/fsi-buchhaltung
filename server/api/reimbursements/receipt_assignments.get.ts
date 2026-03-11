import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'

interface ReceiptAssignment {
  receipt_id: number
  reimbursement_id: number
}

interface GetAssignmentsSuccess {
  ok: true
  assignments: ReceiptAssignment[]
}

interface GetAssignmentsError {
  ok: false
  error: string
}

type GetAssignmentsResponse = GetAssignmentsSuccess | GetAssignmentsError

export default defineEventHandler(async (event): Promise<GetAssignmentsResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (!current.user.permissions.includes('reimbursements.view')) return { ok: false, error: 'Not authorized' }

  try {
    const rows: any[] = await query(
      `
      SELECT receipt_id, reimbursement_id
      FROM reimbursement_positions
      `
    )

    return {
      ok: true,
      assignments: rows.map(row => ({
        receipt_id: Number(row.receipt_id),
        reimbursement_id: Number(row.reimbursement_id),
      }))
    }
  } catch (err: any) {
    return { ok: false, error: `Failed to load reimbursement receipt assignments: ${err}` }
  }
})
