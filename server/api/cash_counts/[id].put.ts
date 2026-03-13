import { defineEventHandler, readMultipartFormData } from 'h3'
import { query, withTransaction } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import { logChange } from '~/server/utils/changeLogger'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import type { FileAttachment } from '~/types/file'
import type { CashCountPositionRow, CashCountRow, CreateCashCountBody, CreateCashCountPositionBody } from '~/types/cashCount'

interface UpdateCashCountSuccess {
  ok: true
}

interface UpdateCashCountError {
  ok: false
  error: string
}

type UpdateCashCountResponse = UpdateCashCountSuccess | UpdateCashCountError

const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]

const MAX_SIZE = Number(process.env.MAX_UPLOAD_MB || 5) * 1024 * 1024

type CashCountLogField =
  | 'event_name'
  | 'counted_by_first'
  | 'counted_by_second'
  | 'checked_by'
  | 'counted_before_at'
  | 'counted_after_at'

function normalizeAmount(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : NaN
}

function normalizePosition(position: CreateCashCountPositionBody, index: number) {
  return {
    id: position.id ? Number(position.id) : undefined,
    register_number: index + 1,
    amount_before: normalizeAmount(position.amount_before),
    amount_after: normalizeAmount(position.amount_after),
    notes: position.notes?.trim() ? position.notes.trim() : null,
  }
}

function normalizeBody(body: CreateCashCountBody) {
  return {
    event_name: body.event_name.trim(),
    counted_by_first: Number(body.counted_by_first || 0),
    counted_by_second: Number(body.counted_by_second || 0),
    checked_by: Number(body.checked_by || 0),
    counted_before_at: String(body.counted_before_at || ''),
    counted_after_at: String(body.counted_after_at || ''),
    positions: Array.isArray(body.positions) ? body.positions.map(normalizePosition) : [],
  }
}

function validate(body: ReturnType<typeof normalizeBody>) {
  if (!body.event_name) return 'event_name is required'
  if (!body.counted_by_first || !body.counted_by_second || !body.checked_by) return 'All member references are required'
  if (!body.counted_before_at || !body.counted_after_at) return 'Both timestamps are required'
  if (new Set([body.counted_by_first, body.counted_by_second, body.checked_by]).size !== 3) {
    return 'All three member references must be distinct'
  }
  if (!body.positions.length) return 'At least one register is required'
  if (body.positions.some(position => Number.isNaN(position.amount_before) || Number.isNaN(position.amount_after))) {
    return 'Each position requires amount_before and amount_after'
  }

  const beforeTs = Date.parse(body.counted_before_at)
  const afterTs = Date.parse(body.counted_after_at)
  if (!Number.isFinite(beforeTs) || !Number.isFinite(afterTs)) return 'Invalid timestamps'
  if (afterTs <= beforeTs) return 'counted_after_at must be later than counted_before_at'

  return null
}

function sameDecimal(left: unknown, right: unknown) {
  return Number(left ?? 0).toFixed(2) === Number(right ?? 0).toFixed(2)
}

export default defineEventHandler(async (event): Promise<UpdateCashCountResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (!current.user.permissions.includes('cash_counts.edit')) return { ok: false, error: 'Not authorized' }

  const cashCountId = Number(event.context.params?.id)
  if (!cashCountId) return { ok: false, error: 'Invalid cash count id' }

  const formData = await readMultipartFormData(event)
  if (!formData) return { ok: false, error: 'Missing form data' }

  const getField = (name: string) => formData.find(f => f.name === name)?.data?.toString()
  const file = formData.find(f => f.type && f.filename)
  const cashCountJson = getField('cashCount')
  const removeExistingFile = getField('removeExistingFile') === 'true'

  if (!cashCountJson) return { ok: false, error: 'Missing cash count data' }

  const updated = normalizeBody(JSON.parse(cashCountJson) as CreateCashCountBody)
  const validationError = validate(updated)
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

      for (const field of fields) {
        if (String(existing[field]) === String(updated[field])) continue

        await logChange({
          entityType: 'cash_count',
          entityId: cashCountId,
          subEntityType: null,
          subEntityId: null,
          field,
          oldValue: existing[field],
          newValue: updated[field],
          userId: current.user.id,
        }, conn)
      }

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

      const existingAttachment: FileAttachment[] = await query(
        `SELECT id, file_id
         FROM file_attachments
         WHERE entity_type = 'cash_count' AND entity_id = ? AND detached_at IS NULL`,
        [cashCountId],
        conn
      )

      const hasExistingFile = existingAttachment.length > 0
      const hasFileAfterSave = Boolean(file) || (hasExistingFile && !removeExistingFile)
      if (!hasFileAfterSave) {
        return { ok: false, error: 'A file is required for cash counts' }
      }

      if (removeExistingFile && existingAttachment.length) {
        await query(
          `UPDATE file_attachments
           SET detached_at = NOW(), detached_by = ?
           WHERE id = ?`,
          [current.user.id, existingAttachment[0].id],
          conn
        )

        await logChange({
          entityType: 'cash_count',
          entityId: cashCountId,
          subEntityType: 'file_attachment',
          subEntityId: existingAttachment[0].id,
          field: 'file_detached',
          oldValue: existingAttachment[0].file_id,
          newValue: null,
          userId: current.user.id,
        }, conn)
      }

      if (file) {
        if (!ALLOWED_MIME.includes(file.type || '')) return { ok: false, error: 'Invalid file type' }
        if (file.data.length > MAX_SIZE) return { ok: false, error: 'File too large' }

        const uploadRoot = process.env.UPLOAD_DIR!
        const uploadDir = path.join(uploadRoot, 'cash_counts')
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
            `/uploads/cash_counts/${filename}`,
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
           VALUES (?, 'cash_count', ?, ?)`,
          [
            fileId,
            cashCountId,
            current.user.id,
          ],
          conn
        )

        await logChange({
          entityType: 'cash_count',
          entityId: cashCountId,
          subEntityType: 'file_attachment',
          subEntityId: Number(attachmentResult.insertId),
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
