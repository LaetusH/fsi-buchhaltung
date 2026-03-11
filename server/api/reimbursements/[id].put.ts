import { defineEventHandler, readMultipartFormData } from 'h3'
import { query, withTransaction } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import { logChange } from '~/server/utils/changeLogger'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import type { ReimbursementPositionRow, CreateReimbursementBody, ReimbursementRow } from '~/types/reimbursement'
import type { FileAttachment } from '~/types/file'
import { ReceiptStatus } from '~/types/receipt'

interface UpdateReimbursementSuccess {
  ok: true
}

interface UpdateReimbursementError {
  ok: false
  error: string
}

type UpdateReimbursementResponse = UpdateReimbursementSuccess | UpdateReimbursementError

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

type ReimbursementLogField =
  | 'paid_by'
  | 'bankname'
  | 'account_holder'
  | 'iban'
  | 'bic'
  | 'advance'
  | 'cash'
  | 'submitted_at'
  | 'checked_at'
  | 'checked_by'
  | 'disbursed_at'
  | 'disbursed_by'

export default defineEventHandler(async (event): Promise<UpdateReimbursementResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (!current.user.permissions.includes('reimbursements.edit')) return { ok: false, error: 'Not authorized' }

  const reimbursementId = Number(event.context.params?.id)
  if (!reimbursementId) return { ok: false, error: 'Invalid reimbursement id' }

  const formData = await readMultipartFormData(event)
  if (!formData) return { ok: false, error: 'Missing form data' }

  const getField = (name: string) =>
    formData.find(f => f.name === name)?.data?.toString()

  const file = formData.find(f => f.type && f.filename)
  const reimbursementJson = getField('reimbursement')
  const removeExistingFile = getField('removeExistingFile') === 'true'

  if (!reimbursementJson) return { ok: false, error: 'Missing reimbursement data' }
  const updated = JSON.parse(reimbursementJson) as CreateReimbursementBody

  if (!updated.paid_by || !updated.submitted_at || !Array.isArray(updated.positions) || !updated.positions.length) {
    return { ok: false, error: 'Missing required reimbursement fields' }
  }
  if (typeof updated.cash !== 'boolean') {
    return { ok: false, error: 'cash is required and must be boolean' }
  }
  if (!updated.cash) {
    if (!updated.bankname?.trim()) return { ok: false, error: 'bankname is required when cash is false' }
    if (!updated.iban?.trim()) return { ok: false, error: 'iban is required when cash is false' }
  }
  if (updated.positions.some(position => !position.receipt_id)) {
    return { ok: false, error: 'Each reimbursement position requires a receipt id' }
  }

  if (Boolean(updated.checked_by) !== Boolean(updated.checked_at)) {
    return { ok: false, error: 'checked_by and checked_at must both be set or both be empty' }
  }

  if (Boolean(updated.disbursed_by) !== Boolean(updated.disbursed_at)) {
    return { ok: false, error: 'disbursed_by and disbursed_at must both be set or both be empty' }
  }

  try {
    return await withTransaction(async (conn) => {
      const existingRows: ReimbursementRow[] = await query(
        `SELECT * FROM reimbursements WHERE id = ? LIMIT 1`,
        [reimbursementId],
        conn
      )

      if (!existingRows.length) return { ok: false, error: 'Reimbursement not found' }
      const existing = existingRows[0]

      const incomingReceiptIds = updated.positions
        .map(position => Number(position.receipt_id))
        .filter(receiptId => Boolean(receiptId))

      const uniqueIncomingReceiptIds = [...new Set(incomingReceiptIds)]
      if (uniqueIncomingReceiptIds.length !== incomingReceiptIds.length) {
        return { ok: false, error: 'A receipt can only be added once per reimbursement' }
      }

      if (!uniqueIncomingReceiptIds.length) {
        return { ok: false, error: 'At least one receipt is required' }
      }

      const conflicts: { receipt_id: number }[] = await query(
        `SELECT receipt_id
         FROM reimbursement_positions
         WHERE reimbursement_id <> ?
           AND receipt_id IN (${uniqueIncomingReceiptIds.map(() => '?').join(',')})`,
        [reimbursementId, ...uniqueIncomingReceiptIds],
        conn
      )

      if (conflicts.length) {
        return { ok: false, error: 'At least one selected receipt is already part of another reimbursement' }
      }

      const existingAttachment: FileAttachment[] = await query(
        `SELECT id, file_id
         FROM file_attachments
         WHERE entity_type = 'reimbursement' AND entity_id = ? AND detached_at IS NULL`,
        [reimbursementId],
        conn
      )

      const hasExistingFile = existingAttachment.length > 0
      const hasFileAfterSave = Boolean(file) || (hasExistingFile && !removeExistingFile)
      if (!hasFileAfterSave) {
        return { ok: false, error: 'A file is required for reimbursements' }
      }

      const submittedAt = updated.submitted_at
      const normalizedUpdated = {
        ...updated,
        cash: updated.cash ? 1 : 0,
        advance: updated.advance || 0,
        submitted_at: submittedAt,
        checked_at: updated.checked_at || null,
        checked_by: updated.checked_by || null,
        disbursed_at: updated.disbursed_at || null,
        disbursed_by: updated.disbursed_by || null,
      }

      const fields: ReimbursementLogField[] = [
        'paid_by',
        'bankname',
        'account_holder',
        'iban',
        'bic',
        'advance',
        'cash',
        'submitted_at',
        'checked_at',
        'checked_by',
        'disbursed_at',
        'disbursed_by',
      ]

      for (const field of fields) {
        const oldValue = existing[field]
        const newValue = normalizedUpdated[field]

        const hasChanged = field === 'advance'
          ? Number(oldValue ?? 0).toFixed(2) !== Number(newValue ?? 0).toFixed(2)
          : String(oldValue) !== String(newValue)

        if (hasChanged) {
          await logChange({
            entityType: 'reimbursement',
            entityId: reimbursementId,
            subEntityType: null,
            subEntityId: null,
            field,
            oldValue: field === 'advance' ? Number(oldValue ?? 0).toFixed(2) : oldValue,
            newValue: field === 'advance' ? Number(newValue ?? 0).toFixed(2) : newValue,
            userId: current.user.id,
          }, conn)
        }
      }

      await query(
        `UPDATE reimbursements SET
          paid_by = ?,
          bankname = ?,
          account_holder = ?,
          iban = ?,
          bic = ?,
          advance = ?,
          cash = ?,
          submitted_at = ?,
          checked_at = ?,
          checked_by = ?,
          disbursed_at = ?,
          disbursed_by = ?
        WHERE id = ?`,
        [
          normalizedUpdated.paid_by,
          normalizedUpdated.bankname || null,
          normalizedUpdated.account_holder || null,
          normalizedUpdated.iban || null,
          normalizedUpdated.bic || null,
          normalizedUpdated.advance,
          normalizedUpdated.cash,
          normalizedUpdated.submitted_at,
          normalizedUpdated.checked_at,
          normalizedUpdated.checked_by,
          normalizedUpdated.disbursed_at,
          normalizedUpdated.disbursed_by,
          reimbursementId,
        ],
        conn
      )

      const existingPositions: ReimbursementPositionRow[] = await query(
        `SELECT * FROM reimbursement_positions WHERE reimbursement_id = ?`,
        [reimbursementId],
        conn
      )

      const remainingIncomingReceiptIds = [...uniqueIncomingReceiptIds]

      for (const position of existingPositions) {
        const matchIndex = remainingIncomingReceiptIds.indexOf(Number(position.receipt_id))
        if (matchIndex !== -1) {
          remainingIncomingReceiptIds.splice(matchIndex, 1)
          continue
        }

        await logChange({
          entityType: 'reimbursement',
          entityId: reimbursementId,
          subEntityType: 'reimbursement_position',
          subEntityId: position.id,
          field: 'position_removed',
          oldValue: JSON.stringify(position),
          newValue: null,
          userId: current.user.id,
        }, conn)

        await query(
          `DELETE FROM reimbursement_positions WHERE id = ?`,
          [
            position.id,
          ],
          conn
        )
      }

      for (const receiptId of remainingIncomingReceiptIds) {
        const insertResult: any = await query(
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

        await logChange({
          entityType: 'reimbursement',
          entityId: reimbursementId,
          subEntityType: 'reimbursement_position',
          subEntityId: Number(insertResult.insertId),
          field: 'position_added',
          oldValue: null,
          newValue: JSON.stringify({ receipt_id: receiptId }),
          userId: current.user.id,
        }, conn)
      }

      if (removeExistingFile) {
        if (existingAttachment.length) {
          await query(
            `UPDATE file_attachments
             SET detached_at = NOW(), detached_by = ?
             WHERE id = ?`,
            [current.user.id, existingAttachment[0].id],
            conn
          )

          await logChange({
            entityType: 'reimbursement',
            entityId: reimbursementId,
            subEntityType: 'file_attachment',
            subEntityId: existingAttachment[0].id,
            field: 'file_detached',
            oldValue: existingAttachment[0].file_id,
            newValue: null,
            userId: current.user.id,
          }, conn)
        }
      }

      if (file) {
        if (!ALLOWED_MIME.includes(file.type || '')) return { ok: false, error: 'Invalid file type' }
        if (file.data.length > MAX_SIZE) return { ok: false, error: 'File too large' }

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

        const attachmentResult: any = await query(
          `INSERT INTO file_attachments
            (file_id, entity_type, entity_id, attached_by)
           VALUES (?, 'reimbursement', ?, ?)`,
          [
            fileId,
            reimbursementId,
            current.user.id,
          ],
          conn
        )

        await logChange({
          entityType: 'reimbursement',
          entityId: reimbursementId,
          subEntityType: 'file_attachment',
          subEntityId: Number(attachmentResult.insertId),
          field: 'file_attached',
          oldValue: null,
          newValue: fileId,
          userId: current.user.id,
        }, conn)
      }

      const targetStatus = statusFromReimbursement(updated)

      const receiptStatusRows: { id: number, status: ReceiptStatus }[] = await query(
        `SELECT id, status
         FROM receipts
         WHERE id IN (${uniqueIncomingReceiptIds.map(() => '?').join(',')})`,
        uniqueIncomingReceiptIds,
        conn
      )

      for (const row of receiptStatusRows) {
        if (row.status === targetStatus) continue

        await logChange({
          entityType: 'receipt',
          entityId: Number(row.id),
          subEntityType: null,
          subEntityId: null,
          field: 'status',
          oldValue: row.status,
          newValue: targetStatus,
          userId: current.user.id,
        }, conn)
      }

      await query(
        `UPDATE receipts
         SET status = ?
         WHERE id IN (${uniqueIncomingReceiptIds.map(() => '?').join(',')})`,
        [targetStatus, ...uniqueIncomingReceiptIds],
        conn
      )

      return { ok: true }
    })
  } catch (err: any) {
    return { ok: false, error: `Failed to update reimbursement: ${err}` }
  }
})
