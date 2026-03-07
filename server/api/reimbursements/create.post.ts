import { defineEventHandler, readMultipartFormData } from 'h3'
import { query, withTransaction } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import type { CreateReimbursementBody } from '~/types/reimbursement'
import { ReceiptStatus } from '~/types/receipt'

interface CreateReimbursementSuccess {
  ok: true
  reimbursementId: number
}

interface CreateReimbursementError {
  ok: false
  error: string
}

type CreateReimbursementResponse = CreateReimbursementSuccess | CreateReimbursementError

const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]

const MAX_SIZE = Number(process.env.MAX_UPLOAD_MB || 5) * 1024 * 1024

function statusFromReimbursement(reimbursement: CreateReimbursementBody): ReceiptStatus {
  if (reimbursement.disbursed_at) return ReceiptStatus.Paid
  if (reimbursement.checked_at) return ReceiptStatus.Open
  return ReceiptStatus.Draft
}

export default defineEventHandler(async (event): Promise<CreateReimbursementResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  const formData = await readMultipartFormData(event)
  if (!formData) return { ok: false, error: 'Invalid form data' }

  const getField = (name: string) =>
    formData.find(f => f.name === name)?.data?.toString()

  const file = formData.find(f => f.type && f.filename)
  if (!file) return { ok: false, error: 'No file uploaded' }

  if (!ALLOWED_MIME.includes(file.type || '')) return { ok: false, error: 'Invalid file type' }
  if (file.data.length > MAX_SIZE) return { ok: false, error: 'File too large' }

  const reimbursementJson = getField('reimbursement')
  if (!reimbursementJson) return { ok: false, error: 'Missing reimbursement data' }

  const reimbursement = JSON.parse(reimbursementJson) as CreateReimbursementBody

  if (!reimbursement.paid_by || !reimbursement.submitted_at || !Array.isArray(reimbursement.positions) || !reimbursement.positions.length) {
    return { ok: false, error: 'Missing required reimbursement fields' }
  }
  if (typeof reimbursement.cash !== 'boolean') {
    return { ok: false, error: 'cash is required and must be boolean' }
  }
  if (!reimbursement.cash) {
    if (!reimbursement.bankname?.trim()) return { ok: false, error: 'bankname is required when cash is false' }
    if (!reimbursement.iban?.trim()) return { ok: false, error: 'iban is required when cash is false' }
  }
  if (reimbursement.positions.some(position => !position.receipt_id)) {
    return { ok: false, error: 'Each reimbursement position requires a receipt id' }
  }

  if (Boolean(reimbursement.checked_by) !== Boolean(reimbursement.checked_at)) {
    return { ok: false, error: 'checked_by and checked_at must both be set or both be empty' }
  }

  if (Boolean(reimbursement.disbursed_by) !== Boolean(reimbursement.disbursed_at)) {
    return { ok: false, error: 'disbursed_by and disbursed_at must both be set or both be empty' }
  }

  const submittedAt = reimbursement.submitted_at
    || new Date().toISOString().slice(0, 19).replace('T', ' ')

  try {
    return await withTransaction(async (conn) => {
      const uniqueReceiptIds = [...new Set(
        reimbursement.positions
          .map(position => Number(position.receipt_id))
          .filter(receiptId => Boolean(receiptId))
      )]

      if (uniqueReceiptIds.length !== reimbursement.positions.length) {
        return { ok: false, error: 'A receipt can only be added once per reimbursement' }
      }

      if (!uniqueReceiptIds.length) {
        return { ok: false, error: 'At least one receipt is required' }
      }

      const conflicts: { receipt_id: number }[] = await query(
        `SELECT receipt_id
         FROM reimbursement_positions
         WHERE receipt_id IN (${uniqueReceiptIds.map(() => '?').join(',')})`,
        uniqueReceiptIds,
        conn
      )

      if (conflicts.length) {
        return { ok: false, error: 'At least one selected receipt is already part of another reimbursement' }
      }

      const reimbursementResult: any = await query(
        `INSERT INTO reimbursements
          (paid_by, bankname, account_holder, iban, bic, advance, cash, submitted_at, checked_at, checked_by, disbursed_at, disbursed_by, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reimbursement.paid_by,
          reimbursement.bankname || null,
          reimbursement.account_holder || null,
          reimbursement.iban || null,
          reimbursement.bic || null,
          reimbursement.advance || 0,
          reimbursement.cash ? 1 : 0,
          submittedAt,
          reimbursement.checked_at || null,
          reimbursement.checked_by || null,
          reimbursement.disbursed_at || null,
          reimbursement.disbursed_by || null,
          current.user.id,
        ],
        conn
      )

      const reimbursementId = Number(reimbursementResult.insertId)

      for (const receiptId of uniqueReceiptIds) {
        await query(
          `INSERT INTO reimbursement_positions
            (reimbursement_id, receipt_id, created_by)
          VALUES (?, ?, ?)`,
          [
            reimbursementId,
            receiptId,
            current.user.id,
          ],
          conn
        )
      }

      const targetStatus = statusFromReimbursement(reimbursement)
      await query(
        `UPDATE receipts
         SET status = ?
         WHERE id IN (${uniqueReceiptIds.map(() => '?').join(',')})`,
        [targetStatus, ...uniqueReceiptIds],
        conn
      )

      const uploadRoot = process.env.UPLOAD_DIR!
      const uploadDir = path.join(uploadRoot, 'reimbursements')
      await fs.mkdir(uploadDir, { recursive: true })

      const ext = path.extname(file.filename!)
      const filename = crypto.randomUUID() + ext
      const filePath = path.join(uploadDir, filename)

      await fs.writeFile(filePath, file.data, { mode: 0o640 })

      const fileResult: any = await query(
        `INSERT INTO files
          (file_path, original_name, mime_type, file_size, uploaded_by)
        VALUES (?, ?, ?, ?, ?)`,
        [
          `/uploads/reimbursements/${filename}`,
          file.filename,
          file.type,
          file.data.length,
          current.user.id,
        ],
        conn
      )

      const fileId = Number(fileResult.insertId)

      await query(
        `INSERT INTO file_attachments
          (file_id, entity_type, entity_id, attached_by)
        VALUES (?, ?, ?, ?)`,
        [
          fileId,
          'reimbursement',
          reimbursementId,
          current.user.id,
        ],
        conn
      )

      return { ok: true, reimbursementId }
    })
  } catch (err: any) {
    return { ok: false, error: `Failed to create reimbursement: ${err}` }
  }
})
