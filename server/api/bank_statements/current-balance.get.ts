import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/api/guards'

interface CurrentBalanceSuccess {
  ok: true
  balance: number
}

interface CurrentBalanceError {
  ok: false
  error: string
}

type CurrentBalanceResponse = CurrentBalanceSuccess | CurrentBalanceError

export default defineEventHandler(async (event): Promise<CurrentBalanceResponse> => {
  const current = await requirePermission(event, 'bank_statements.view')
  if (!current.ok) return current

  try {
    const statements = await query(`
      SELECT bs.id,
        IFNULL(SUM(
          CASE bsp.position_type
            WHEN 'receipt' THEN -IFNULL((SELECT SUM(rp.amount) FROM receipt_positions rp WHERE rp.receipt_id = bsp.receipt_id), 0)
            WHEN 'invoice' THEN IFNULL((SELECT SUM(ip.unit_price * ip.quantity) FROM invoice_positions ip WHERE ip.invoice_id = bsp.invoice_id), 0)
            WHEN 'event'   THEN IFNULL(bsp.amount, 0)
          END
        ), 0) AS net
      FROM bank_statements bs
      LEFT JOIN bank_statement_positions bsp ON bsp.bank_statement_id = bs.id
      GROUP BY bs.id
      ORDER BY bs.statement_date ASC, bs.id ASC
    `)

    let balance = 0
    for (const s of statements) balance += Number(s.net)

    return { ok: true, balance }
  } catch (err: any) {
    return { ok: false, error: `Failed to compute current balance: ${err}` }
  }
})
