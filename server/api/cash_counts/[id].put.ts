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
import {
  normalizeCashCountBody,
  sameDecimal,
  validateCashCountBody,
} from '~/server/utils/cashCounts'
import type { CashCountPositionRow, CashCountRow } from '~/types/cashCount'

interface UpdateCashCountSuccess {
  ok: true
}

interface UpdateCashCountError {
  ok: false
  error: string
}

type UpdateCashCountResponse = UpdateCashCountSuccess | UpdateCashCountError

type CashCountLogField =
  | 'event_name'
  | 'counted_by_first'
  | 'counted_by_second'
  | 'checked_by'
  | 'counted_before_at'
  | 'counted_after_at'

export default defineEventHandler(async (event): Promise<UpdateCashCountResponse> => {
  const current = await requirePermission(event, 'cash_counts.edit')
  if (!current.ok) return current

  const cashCountId = getNumericRouteParam(event)
  if (!cashCountId) return { ok: false, error: 'Invalid cash count id' }

  const multipart = await readMultipart(event)
  if (!multipart) return { ok: false, error: 'Missing form data' }

  const cashCountJson = multipart.getField('cashCount')
  const removeExistingFile = multipart.getField('removeExistingFile') === 'true'

  if (!cashCountJson) return { ok: false, error: 'Missing cash count data' }

  const updated = normalizeCashCountBody(JSON.parse(cashCountJson))
  const validationError = validateCashCountBody(updated)
  if (validationError) return { ok: false, error: validationError }

  try {
    return await withTransaction(async (conn) => {
      const existingRows: CashCountRow[] = await query(
        `SELECT * FROM cash_counts WHERE id = ? LIMIT 1`,
        [cashCountId],
        conn
      )

      if (!existingRows.length) return { ok: false, error: 'Cash count not found' }
      const existing = existingRows[0]

      const fields: CashCountLogField[] = [
        'event_name',
        'counted_by_first',
        'counted_by_second',
        'checked_by',
        'counted_before_at',
        'counted_after_at',
      ]

      await logFieldChanges({
        entityType: 'cash_count',
        entityId: cashCountId,
        fields,
        previous: existing,
        next: updated,
        userId: current.user.id,
        conn,
      })

      await query(
        `UPDATE cash_counts SET
          event_name = ?,
          counted_by_first = ?,
          counted_by_second = ?,
          checked_by = ?,
          counted_before_at = ?,
          counted_after_at = ?
        WHERE id = ?`,
        [
          updated.event_name,
          updated.counted_by_first,
          updated.counted_by_second,
          updated.checked_by,
          updated.counted_before_at,
          updated.counted_after_at,
          cashCountId,
        ],
        conn
      )

      const existingPositions: CashCountPositionRow[] = await query(
        `SELECT * FROM cash_count_positions WHERE cash_count_id = ? ORDER BY register_number ASC, id ASC`,
        [cashCountId],
        conn
      )

      const existingMap = new Map(existingPositions.map(position => [Number(position.id), position]))
      const incomingMap = new Map(
        updated.positions
          .filter(position => position.id)
          .map(position => [Number(position.id), position])
      )

      for (const existingPosition of existingPositions) {
        if (incomingMap.has(Number(existingPosition.id))) continue

        await logChange({
          entityType: 'cash_count',
          entityId: cashCountId,
          subEntityType: 'cash_count_position',
          subEntityId: Number(existingPosition.id),
          field: 'position_removed',
          oldValue: JSON.stringify(existingPosition),
          newValue: null,
          userId: current.user.id,
        }, conn)

        await query(
          `DELETE FROM cash_count_positions WHERE id = ?`,
          [existingPosition.id],
          conn
        )
      }

      for (const position of updated.positions) {
        if (!position.id) continue
        const existingPosition = existingMap.get(Number(position.id))
        if (!existingPosition) continue

        if (Number(existingPosition.register_number) !== Number(position.register_number)) {
          await logChange({
            entityType: 'cash_count',
            entityId: cashCountId,
            subEntityType: 'cash_count_position',
            subEntityId: Number(position.id),
            field: 'register_number',
            oldValue: existingPosition.register_number,
            newValue: position.register_number,
            userId: current.user.id,
          }, conn)
        }

        if (!sameDecimal(existingPosition.amount_before, position.amount_before)) {
          await logChange({
            entityType: 'cash_count',
            entityId: cashCountId,
            subEntityType: 'cash_count_position',
            subEntityId: Number(position.id),
            field: 'amount_before',
            oldValue: Number(existingPosition.amount_before).toFixed(2),
            newValue: Number(position.amount_before).toFixed(2),
            userId: current.user.id,
          }, conn)
        }

        if (!sameDecimal(existingPosition.amount_after, position.amount_after)) {
          await logChange({
            entityType: 'cash_count',
            entityId: cashCountId,
            subEntityType: 'cash_count_position',
            subEntityId: Number(position.id),
            field: 'amount_after',
            oldValue: Number(existingPosition.amount_after).toFixed(2),
            newValue: Number(position.amount_after).toFixed(2),
            userId: current.user.id,
          }, conn)
        }

        if (String(existingPosition.notes ?? '') !== String(position.notes ?? '')) {
          await logChange({
            entityType: 'cash_count',
            entityId: cashCountId,
            subEntityType: 'cash_count_position',
            subEntityId: Number(position.id),
            field: 'notes',
            oldValue: existingPosition.notes,
            newValue: position.notes,
            userId: current.user.id,
          }, conn)
        }

        await query(
          `UPDATE cash_count_positions
           SET register_number = ?, amount_before = ?, amount_after = ?, notes = ?
           WHERE id = ?`,
          [
            position.register_number,
            position.amount_before,
            position.amount_after,
            position.notes,
            position.id,
          ],
          conn
        )
      }

      for (const position of updated.positions) {
        if (position.id) continue

        const insertResult: any = await query(
          `INSERT INTO cash_count_positions
            (cash_count_id, register_number, amount_before, amount_after, notes, created_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            cashCountId,
            position.register_number,
            position.amount_before,
            position.amount_after,
            position.notes,
            current.user.id,
          ],
          conn
        )

        await logChange({
          entityType: 'cash_count',
          entityId: cashCountId,
          subEntityType: 'cash_count_position',
          subEntityId: Number(insertResult.insertId),
          field: 'position_added',
          oldValue: null,
          newValue: JSON.stringify(position),
          userId: current.user.id,
        }, conn)
      }

      const existingAttachment = await getActiveFileAttachment('cash_count', cashCountId, conn)
      const hasExistingFile = Boolean(existingAttachment)
      const hasFileAfterSave = Boolean(multipart.file) || (hasExistingFile && !removeExistingFile)
      if (!hasFileAfterSave) {
        return { ok: false, error: 'A file is required for cash counts' }
      }

      const fileError = validateUploadedFile(multipart.file)
      if (fileError && multipart.file) return { ok: false, error: fileError }

      if (removeExistingFile && existingAttachment) {
        await detachFileAttachment(existingAttachment.id, current.user.id, conn)

        await logChange({
          entityType: 'cash_count',
          entityId: cashCountId,
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
          'cash_counts',
          'cash_count',
          cashCountId,
          current.user.id,
          conn,
        )

        await logChange({
          entityType: 'cash_count',
          entityId: cashCountId,
          subEntityType: 'file_attachment',
          subEntityId: Number(attachmentId),
          field: 'file_attached',
          oldValue: null,
          newValue: fileId,
          userId: current.user.id,
        }, conn)
      }

      return { ok: true }
    })
  } catch (err: any) {
    return { ok: false, error: `Failed to update cash count: ${err}` }
  }
})
