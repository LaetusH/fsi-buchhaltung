import { defineEventHandler, createError } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import { normalizeBigInt } from '~/server/utils/normalize'
import type { FileRow } from '~/types/file'
import { Reimbursement, ReimbursementPosition, ReimbursementRow } from '~/types/reimbursement'
import { ReceiptStatus } from '~/types/receipt'

interface GetReimbursementSuccess {
  ok: true
  reimbursement: Reimbursement
  file: FileRow | null
}

interface GetReimbursementError {
  ok: false
  error: string
}

export type GetReimbursementResponse = GetReimbursementSuccess | GetReimbursementError

export default defineEventHandler(async (event): Promise<GetReimbursementResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  const id = Number(event.context.params?.id)
  if (!id) return { ok: false, error: 'Invalid reimbursement id' }

  try {
    const reimbursementRows: ReimbursementRow[] = await query(
      `
      SELECT 
        r.id,
        r.paid_by,
        r.submitted_at,

        r.bankname,
        r.account_holder,
        r.iban,
        r.bic,
        r.advance,
        r.cash,

        r.checked_by,
        r.checked_at,

        r.disbursed_by,
        r.disbursed_at
      FROM reimbursements r
      WHERE r.id = ?
      LIMIT 1
      `,
      [id]
    )

    if (!reimbursementRows.length) {
      return { ok: false, error: 'Reimbursement not found' }
    }

    const reimbursement = normalizeBigInt(reimbursementRows[0])

    const rows = await query(
      `
      SELECT 
        rp.id,

        rp.receipt_id,
        rec.receipt_date,
        rec.receipt_number,
        rec.description,
        rec.status,
        rec.company_id,
        c.name AS company_name,
        
        rpos.id AS receipt_postion_id,
        rpos.sphere,
        rpos.cost_centre,
        rpos.amount,
        rpos.tax
      FROM reimbursement_positions rp
      JOIN receipts rec ON rec.id = rp.receipt_id
      LEFT JOIN companies c ON c.id = rec.company_id
      LEFT JOIN receipt_positions rpos ON rpos.receipt_id = rec.id
      WHERE reimbursement_id = ?
      ORDER BY rec.receipt_date DESC, rpos.id
      `,
      [id]
    )

    const map = new Map<number, ReimbursementPosition>()

    for (const r of rows) {
      if (!map.has(r.receipt_id)) {
        map.set(r.receipt_id, {
          id: Number(r.reimbursement_position_id),
          receipt: {
            id: Number(r.receipt_id),
            receipt_date: String(r.receipt_date),
            receipt_number: r.receipt_number ?? null,
            description: r.description ?? null,
            status: r.status as ReceiptStatus,
            company_id: r.company_id != null ? Number(r.company_id) : null,
            company_name: r.company_name ?? null,
            positions: []
          }
        })
      }
    
      if (r.receipt_position_id) {
        map.get(r.receipt_id)!.receipt.positions.push({
          id: Number(r.receipt_position_id),
          sphere: Number(r.sphere),
          cost_centre: Number(r.cost_centre),
          amount: Number(r.amount),
          tax: Number(r.tax)
        })
      }
    }

    const positions: ReimbursementPosition[] = Array.from(map.values())

    const fileRows: FileRow[] = await query(
      `
      SELECT f.id, f.file_path, f.original_name, f.mime_type, f.file_size
      FROM file_attachments fa
      JOIN files f ON f.id = fa.file_id
      WHERE fa.entity_type = 'reimbursement'
        AND fa.entity_id = ?
        AND fa.detached_at IS NULL
      LIMIT 1
      `,
      [id]
    )

    return { 
      ok: true, 
      reimbursement: {
        id: Number(reimbursement.id),
        paid_by: Number(reimbursement.paid_by),
        submitted_at: String(reimbursement.submitted_at),
        bankname: reimbursement.bankname ?? null,
        account_holder: reimbursement.account_holder ?? null,
        iban: reimbursement.iban ?? null,
        bic: reimbursement.bic ?? null,
        advance: Number(reimbursement.advance ?? 0),
        cash: Boolean(reimbursement.cash),
        checked_by: reimbursement.checked_by != null ? Number(reimbursement.checked_by) : null,
        checked_at: reimbursement.checked_at ?? null,
        disbursed_by: reimbursement.disbursed_by != null ? Number(reimbursement.disbursed_by) : null,
        disbursed_at: reimbursement.disbursed_at ?? null,
        positions
      },
      file: fileRows.length ? fileRows[0] : null
    }

  } catch (err: any) {
    return { ok: false, error: `An error occurred while fetching a reimbursement: ${err}` }
  }
})