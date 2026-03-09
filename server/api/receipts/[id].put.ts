import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { query, withTransaction } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import { logChange } from '~/server/utils/changeLogger'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { ReceiptPosition, ReceiptRow } from '~/types/receipt'
import { FileAttachment } from '~/types/file'

interface UpdateReceiptSuccess {
  ok: true
}

interface UpdateReceiptError {
  ok: false
  error: string
}

type UpdateReceiptResponse = UpdateReceiptSuccess | UpdateReceiptError

const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]

const MAX_SIZE = Number(process.env.MAX_UPLOAD_MB || 5) * 1024 * 1024

export default defineEventHandler(async (event): Promise<UpdateReceiptResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  const receiptId = Number(event.context.params?.id)
  if (!receiptId) return { ok: false, error: 'Invalid receipt id' }

  const formData = await readMultipartFormData(event)
  if (!formData) return { ok: false, error: 'Missing form data' }

  const getField = (name: string) =>
    formData.find(f => f.name === name)?.data?.toString()

  const file = formData.find(f => f.type && f.filename)
  const receiptJson = getField('receipt')
  const removeExistingFile = getField('removeExistingFile') === 'true'

  if (!receiptJson) return { ok: false, error: 'Missing receipt' }

  const updated = JSON.parse(receiptJson)
  if (!updated.company_id || !updated.receipt_date || !updated.status || !Array.isArray(updated.positions) || updated.positions.length === 0) {
    return { ok: false, error: 'Missing required receipt fields' }
  }
  if (updated.positions.some((p: any) => !p?.sphere || !p?.cost_centre || p?.amount === null || p?.amount === undefined)) {
    return { ok: false, error: 'Each position requires sphere, cost centre and amount' }
  }

  try {
    return await withTransaction(async (conn) => {
      const existingRows: ReceiptRow[] = await query(
        `SELECT * FROM receipts WHERE id = ? LIMIT 1`,
        [receiptId],
        conn
      )

      if (!existingRows.length) return { ok: false, error: 'No matching receipts in database' }
      const existing = existingRows[0]

      const existingAttachment: FileAttachment[] = await query(
        `SELECT id, file_id
         FROM file_attachments
         WHERE entity_type = 'receipt' AND entity_id = ? AND detached_at IS NULL`,
        [receiptId],
        conn
      )

      const hasExistingFile = existingAttachment.length > 0
      const hasFileAfterSave = Boolean(file) || (hasExistingFile && !removeExistingFile)
      const requiresFile = updated.status === 'open' || updated.status === 'paid'

      if (requiresFile && !hasFileAfterSave) {
        return { ok: false, error: 'A file is required for open or paid receipts' }
      }

      const fields = ['receipt_date', 'receipt_number', 'status', 'company_id', 'description'] as (keyof ReceiptRow)[]

      for (const field of fields) {
        if (String(existing[field]) !== String(updated[field])) {
          await logChange({
            entityType: 'receipt',
            entityId: receiptId,
            subEntityType: null,
            subEntityId: null,
            field,
            oldValue: existing[field],
            newValue: updated[field],
            userId: current.user.id,
          }, conn)
        }
      }

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
      
      const existingMap = new Map(
        existingPositions.map(p => [p.id, p])
      )
      
      const incomingMap = new Map(
        updated.positions
          .filter((p: any) => p.id)
          .map((p: any) => [p.id, p])
      )

      // Detect Removed Positions
      for (const existing of existingPositions) {
        if (!incomingMap.has(existing.id)) {
          await logChange({
            entityType: 'receipt',
            entityId: receiptId,
            subEntityType: 'receipt_position',
            subEntityId: existing.id,
            field: 'position_removed',
            oldValue: JSON.stringify(existing),
            newValue: null,
            userId: current.user.id,
          }, conn)
      
          await query(`DELETE FROM receipt_positions WHERE id = ?`, [existing.id], conn)
        }
      }

      // Detect Updated Positions
      for (const incoming of updated.positions) {
        if (!incoming.id) continue
      
        const existing = existingMap.get(incoming.id)
        if (!existing) continue
      
        const fields = ['sphere', 'cost_centre', 'amount', 'tax'] as (keyof ReceiptPosition)[]
      
        for (const field of fields) {
          if (String(existing[field]) !== String(incoming[field])) {
            await logChange({
              entityType: 'receipt',
              entityId: receiptId,
              subEntityType: 'receipt_position',
              subEntityId: incoming.id,
              field,
              oldValue: existing[field],
              newValue: incoming[field],
              userId: current.user.id,
            }, conn)
          }
        }
      
        await query(
          `UPDATE receipt_positions
          SET sphere=?, cost_centre=?, amount=?, tax=?
          WHERE id=?`,
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

      // Detect Added Positions
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
          subEntityId: result.insertId,
          field: 'position_added',
          oldValue: null,
          newValue: JSON.stringify(incoming),
          userId: current.user.id,
        }, conn)
      }

      if (removeExistingFile) {
        if (existingAttachment.length) {
          await query(
            `UPDATE file_attachments
            SET detached_at=NOW(), detached_by=?
            WHERE id=?`,
            [current.user.id, existingAttachment[0].id],
            conn
          )
      
          await logChange({
            entityType: 'receipt',
            entityId: receiptId,
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
        const uploadDir = path.join(uploadRoot, 'receipts')
        await fs.mkdir(uploadDir, { recursive: true })

        const ext = path.extname(file.filename!)
        const filename = crypto.randomUUID() + ext
        const filePath = path.join(uploadDir, filename)

        await fs.writeFile(filePath, file.data)

        const fileResult: any = await query(
          `INSERT INTO files
          (file_path, original_name, mime_type, file_size, uploaded_by)
          VALUES (?, ?, ?, ?, ?)`,
          [
            `/uploads/receipts/${filename}`,
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
          VALUES (?, 'receipt', ?, ?)`,
          [
            fileId,
            receiptId,
            current.user.id,
          ],
          conn
        )

        await logChange({
          entityType: 'receipt',
          entityId: receiptId,
          subEntityType: 'file_attachment',
          subEntityId: attachmentResult.insertId,
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
