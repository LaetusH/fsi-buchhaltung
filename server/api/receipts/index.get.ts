import { defineEventHandler, createError } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'

export default defineEventHandler(async (event) => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  try {
    const receipts: any[] = await query(
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
      GROUP BY r.id
      ORDER BY r.receipt_date DESC, r.id DESC
      `
    )

    return receipts.map(r => ({
      id: Number(r.id),
      receipt_date: new Date(r.receipt_date),
      receipt_number: r.receipt_number,
      company_name: r.company_name,
      status: r.status,
      total_amount: Number(r.total_amount),
    }))

  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load receipts'
    })
  }
})