import { defineEventHandler } from 'h3'
import { query, withTransaction } from '~/server/utils/db'
import { logChange } from '~/server/utils/changeLogger'
import { logFieldChanges } from '~/server/utils/api/audit'
import { requirePermission } from '~/server/utils/api/guards'
import { getNumericRouteParam, readMultipart, toDbBoolean } from '~/server/utils/api/request'
import {
  detachFileAttachment,
  getActiveFileAttachment,
  storeAndAttachUploadedFile,
  validateUploadedFile,
} from '~/server/utils/files'
import type { ReimbursementPositionRow, ReimbursementRow } from '~/types/reimbursement'
import { statusFromReimbursement, validateReimbursementBody } from '~/server/utils/reimbursements'
import { ReceiptStatus } from '~/types/receipt'

interface UpdateReimbursementSuccess {
  ok: true
}

interface UpdateReimbursementError {
  ok: false
  error: string
}

type UpdateReimbursementResponse = UpdateReimbursementSuccess | UpdateReimbursementError

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
  const current = await requirePermission(event, 'reimbursements.edit')
  if (!current.ok) return current

  const reimbursementId = getNumericRouteParam(event)
  if (!reimbursementId) return { ok: false, error: 'Invalid reimbursement id' }

  const multipart = await readMultipart(event)
  if (!multipart) return { ok: false, error: 'Missing form data' }

  const reimbursementJson = multipart.getField('reimbursement')
  const removeExistingFile = multipart.getField('removeExistingFile') === 'true'

  if (!reimbursementJson) return { ok: false, error: 'Missing reimbursement data' }
  const updated = JSON.parse(reimbursementJson)

  const validationError = validateReimbursementBody(updated)
  if (validationError) return { ok: false, error: validationError }

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
        .map((position: any) => Number(position.receipt_id))
        .filter((receiptId: number) => Boolean(receiptId))

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

      const existingAttachment = await getActiveFileAttachment('reimbursement', reimbursementId, conn)
      const hasExistingFile = Boolean(existingAttachment)
      const hasFileAfterSave = Boolean(multipart.file) || (hasExistingFile && !removeExistingFile)
      if (!hasFileAfterSave) {
        return { ok: false, error: 'A file is required for reimbursements' }
      }

      const fileError = validateUploadedFile(multipart.file)
      if (fileError && multipart.file) return { ok: false, error: fileError }

      const normalizedUpdated = {
        ...updated,
        cash: toDbBoolean(updated.cash),
        advance: updated.advance || 0,
        submitted_at: updated.submitted_at,
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

      await logFieldChanges({
        entityType: 'reimbursement',
        entityId: reimbursementId,
        fields,
        previous: existing,
        next: normalizedUpdated,
        userId: current.user.id,
        conn,
        equals: {
          advance: (left, right) => Number(left ?? 0).toFixed(2) === Number(right ?? 0).toFixed(2),
        },
        transformOldValue: {
          advance: (value) => Number(value ?? 0).toFixed(2),
        },
        transformNewValue: {
          advance: (value) => Number(value ?? 0).toFixed(2),
        },
      })

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
          [position.id],
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

      if (removeExistingFile && existingAttachment) {
        await detachFileAttachment(existingAttachment.id, current.user.id, conn)

        await logChange({
          entityType: 'reimbursement',
          entityId: reimbursementId,
          subEntityType: 'file_attachment',
          subEntityId: existingAttachment.id,
          field: 'file_detached',
          oldValue: existingAttachment.file_id,
          newValue: null,
          userId: current.user.id,
        }, conn)
      }

      if (multipart.file) {
        const { fileId, attachmentId } = await storeAndAttachUploadedFile(
          multipart.file,
          'reimbursements',
          'reimbursement',
          reimbursementId,
          current.user.id,
          conn,
        )

        await logChange({
          entityType: 'reimbursement',
          entityId: reimbursementId,
          subEntityType: 'file_attachment',
          subEntityId: Number(attachmentId),
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
