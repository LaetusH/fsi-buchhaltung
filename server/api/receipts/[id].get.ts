import { defineEventHandler, createError } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import { normalizeBigInt } from '~/server/utils/normalize'
import type { Receipt, ReceiptPosition, ReceiptRow } from '~/types/receipt'
import type { FileRow } from '~/types/file'

interface GetReceiptSuccess {
  ok: true
  receipt: Receipt
  file: FileRow | null
}

interface GetReceiptError {
  ok: false
  error: string
}

export type GetReceiptResponse = GetReceiptSuccess | GetReceiptError

export default defineEventHandler(async (event): Promise<GetReceiptResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (!current.user.permissions.includes('receipts.view')) return { ok: false, error: 'Not authorized' }

  const id = Number(event.context.params?.id)
  if (!id) {
    return { ok: false, error: 'Invalid receipt id' }
  }

  try {
    const receiptRows: ReceiptRow[] = await query(
      `
      SELECT 
        r.id,
        c.id AS company_id,
        c.name AS company_name,
        r.receipt_date,
        r.receipt_number,
        r.description,
        r.status
      FROM receipts r
      LEFT JOIN companies c ON c.id = r.company_id
      WHERE r.id = ?
      LIMIT 1
      `,
      [id]
    )

    if (!receiptRows.length) {
      return { ok: false, error: 'Receipt not found' }
    }

    const receipt = normalizeBigInt(receiptRows[0])

    const positions: ReceiptPosition[] = await query(
      `
      SELECT id, sphere, cost_centre, amount, tax
      FROM receipt_positions
      WHERE receipt_id = ?
      `,
      [id]
    )

    const fileRows: FileRow[] = await query(
      `
      SELECT f.id, f.file_path, f.original_name, f.mime_type, f.file_size
      FROM file_attachments fa
      JOIN files f ON f.id = fa.file_id
      WHERE fa.entity_type = 'receipt'
        AND fa.entity_id = ?
        AND fa.detached_at IS NULL
      LIMIT 1
      `,
      [id]
    )

    return { 
      ok: true, 
      receipt: normalizeBigInt({
        id: Number(receipt.id),
        receipt_date: receipt.receipt_date,
        receipt_number: receipt.receipt_number,
        company_id: Number(receipt.company_id),
        company_name: receipt.company_name,
        status: receipt.status,
        positions: normalizeBigInt(positions) as ReceiptPosition[],
      }),
      file: fileRows.length ? normalizeBigInt(fileRows[0]) : null
    }

  } catch (err: any) {
    return { ok: false, error: `An error occurred while fetching a receipt: ${err}` }
  }
})
