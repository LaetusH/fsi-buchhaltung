import { defineEventHandler } from 'h3'
import { query, withTransaction } from '~/server/utils/db'
import { logChange } from '~/server/utils/changeLogger'
import { logFieldChanges } from '~/server/utils/api/audit'
import { requirePermission } from '~/server/utils/api/guards'
import { getNumericRouteParam, readMultipart } from '~/server/utils/api/request'
import {
  detachFileAttachment,
  getActiveFileAttachment,
  storeAndAttachUploadedFile,
  validateUploadedFile,
} from '~/server/utils/files'
import { receiptRequiresFile, validateReceiptPayload } from '~/server/utils/receipts'
import { validateSphereSelection } from '~/server/utils/spheres'
import { ReceiptPosition, ReceiptRow } from '~/types/receipt'

interface UpdateReceiptSuccess {
  ok: true
}

interface UpdateReceiptError {
  ok: false
  error: string
}

type UpdateReceiptResponse = UpdateReceiptSuccess | UpdateReceiptError

export default defineEventHandler(async (event): Promise<UpdateReceiptResponse> => {
  const current = await requirePermission(event, 'receipts.edit')
  if (!current.ok) return current

  const receiptId = getNumericRouteParam(event)
  if (!receiptId) return { ok: false, error: 'Invalid receipt id' }

  const multipart = await readMultipart(event)
  if (!multipart) return { ok: false, error: 'Missing form data' }

  const receiptJson = multipart.getField('receipt')
  const removeExistingFile = multipart.getField('removeExistingFile') === 'true'

  if (!receiptJson) return { ok: false, error: 'Missing receipt' }

  const updated = JSON.parse(receiptJson)
  const validationError = validateReceiptPayload(updated)
  if (validationError) return { ok: false, error: validationError }

  try {
    return await withTransaction(async (conn) => {
      const existingRows: ReceiptRow[] = await query(
        `SELECT * FROM receipts WHERE id = ? LIMIT 1`,
        [receiptId],
        conn
      )

      if (!existingRows.length) return { ok: false, error: 'No matching receipts in database' }
      const existing = existingRows[0]

      const existingAttachment = await getActiveFileAttachment('receipt', receiptId, conn)
      const hasExistingFile = Boolean(existingAttachment)
      const hasFileAfterSave = Boolean(multipart.file) || (hasExistingFile && !removeExistingFile)

      if (receiptRequiresFile(updated.status) && !hasFileAfterSave) {
        return { ok: false, error: 'A file is required for open or paid receipts' }
      }

      const fileError = validateUploadedFile(multipart.file)
      if (fileError && multipart.file) return { ok: false, error: fileError }

      const receiptFields = ['receipt_date', 'receipt_number', 'status', 'company_id', 'description'] as const
      await logFieldChanges({
        entityType: 'receipt',
        entityId: receiptId,
        fields: receiptFields,
        previous: existing,
        next: updated,
        userId: current.user.id,
        conn,
      })

      await query(
        `UPDATE receipts SET
          company_id = ?,
          receipt_date = ?,
          receipt_number = ?,
          description = ?,
          status = ?
        WHERE id = ?`,
        [
          updated.company_id || null,
          updated.receipt_date,
          updated.receipt_number || null,
          updated.description || null,
          updated.status,
          receiptId,
        ],
        conn
      )

      const existingPositions: ReceiptPosition[] = await query(
        `SELECT * FROM receipt_positions WHERE receipt_id = ?`,
        [receiptId],
        conn
      )

      const sphereValidationError = await validateSphereSelection(
        updated.positions.map((position: any) => ({
          itemId: position.id ? Number(position.id) : null,
          sphereId: Number(position.sphere),
        })),
        existingPositions.map(position => ({
          itemId: Number(position.id),
          sphereId: Number(position.sphere),
        })),
        conn,
      )
      if (sphereValidationError) return { ok: false, error: sphereValidationError }

      const existingMap = new Map(existingPositions.map(position => [position.id, position]))
      const incomingMap = new Map(
        updated.positions
          .filter((position: any) => position.id)
          .map((position: any) => [position.id, position])
      )

      for (const existingPosition of existingPositions) {
        if (!incomingMap.has(existingPosition.id)) {
          await logChange({
            entityType: 'receipt',
            entityId: receiptId,
            subEntityType: 'receipt_position',
            subEntityId: existingPosition.id,
            field: 'position_removed',
            oldValue: JSON.stringify(existingPosition),
            newValue: null,
            userId: current.user.id,
          }, conn)

          await query(`DELETE FROM receipt_positions WHERE id = ?`, [existingPosition.id], conn)
        }
      }

      const positionFields = ['sphere', 'cost_centre', 'amount', 'tax'] as const
      for (const incoming of updated.positions) {
        if (!incoming.id) continue

        const existingPosition = existingMap.get(incoming.id)
        if (!existingPosition) continue

        await logFieldChanges({
          entityType: 'receipt',
          entityId: receiptId,
          subEntityType: 'receipt_position',
          subEntityId: incoming.id,
          fields: positionFields,
          previous: existingPosition,
          next: incoming,
          userId: current.user.id,
          conn,
        })

        await query(
          `UPDATE receipt_positions
          SET sphere = ?, cost_centre = ?, amount = ?, tax = ?
          WHERE id = ?`,
          [
            incoming.sphere,
            incoming.cost_centre,
            incoming.amount,
            incoming.tax ?? 19,
            incoming.id,
          ],
          conn
        )
      }

      for (const incoming of updated.positions) {
        if (incoming.id) continue

        const result: any = await query(
          `INSERT INTO receipt_positions
          (receipt_id, sphere, cost_centre, amount, tax, created_by)
          VALUES (?, ?, ?, ?, ?, ?)`,
          [
            receiptId,
            incoming.sphere,
            incoming.cost_centre,
            incoming.amount,
            incoming.tax ?? 19,
            current.user.id,
          ],
          conn
        )

        await logChange({
          entityType: 'receipt',
          entityId: receiptId,
          subEntityType: 'receipt_position',
          subEntityId: Number(result.insertId),
          field: 'position_added',
          oldValue: null,
          newValue: JSON.stringify(incoming),
          userId: current.user.id,
        }, conn)
      }

      if (removeExistingFile && existingAttachment) {
        await detachFileAttachment(existingAttachment.id, current.user.id, conn)

        await logChange({
          entityType: 'receipt',
          entityId: receiptId,
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
          'receipts',
          'receipt',
          receiptId,
          current.user.id,
          conn,
        )

        await logChange({
          entityType: 'receipt',
          entityId: receiptId,
          subEntityType: 'file_attachment',
          subEntityId: attachmentId,
          field: 'file_attached',
          oldValue: null,
          newValue: fileId,
          userId: current.user.id,
        }, conn)
      }

      return { ok: true }
    })
  } catch (err) {
    return { ok: false, error: `An error occured during the update of the receipt: ${err}` }
  }
})
