import { defineEventHandler, createError } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import { ReceiptRow, ReceiptStatus } from '~/types/receipt'

interface GetReceiptsSuccess {
  ok: true
  receipts: ReceiptRow[]
}

interface GetReceiptsError {
  ok: false
  error: string
}

type GetReceiptsResponse = GetReceiptsSuccess | GetReceiptsError

export default defineEventHandler(async (event): Promise<GetReceiptsResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  try {
    const receipts: any[] = await query(
      `
      SELECT
        r.id,
        r.receipt_date,
        r.receipt_number,
        r.status,
        c.name AS company_name,
        c.id AS company_id,
        r.description,
        IFNULL(SUM(rp.amount), 0) AS total_amount
      FROM receipts r
      LEFT JOIN companies c ON c.id = r.company_id
      LEFT JOIN receipt_positions rp ON rp.receipt_id = r.id
      GROUP BY r.id
      ORDER BY r.receipt_date DESC, r.id DESC
      `
    )

    return { ok: true, receipts: receipts.map(r => ({
      id: Number(r.id),
      receipt_date: String(r.receipt_date),
      receipt_number: String(r.receipt_number),
      company_name: String(r.company_name),
      company_id: Number(r.company_id),
      status: r.status as ReceiptStatus,
      description: String(r.description),
      total_amount: Number(r.total_amount),
    }))}

  } catch (err: any) {
    return { ok: false, error: `Failed to load receipts: ${err}` }
  }
})