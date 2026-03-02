import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import { logChange } from '~/server/utils/changeLogger'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { ReceiptPosition, ReceiptRow } from '~/types/receipt'

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

  await query('START TRANSACTION')

  try {
    const existingRows: ReceiptRow[] = await query(
      `SELECT * FROM receipts WHERE id = ? LIMIT 1`,
      [receiptId]
    )

    if (!existingRows.length) return { ok: false, error: 'No matching receipts in database' }

    const existing = existingRows[0]

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
        })
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
      ]
    )

    const existingPositions: ReceiptPosition[] = await query(
      `SELECT * FROM receipt_positions WHERE receipt_id = ?`,
      [receiptId]
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
        })
    
        await query(`DELETE FROM receipt_positions WHERE id = ?`, [existing.id])
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
          })
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
        ]
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
        ]
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
      })
    }

    if (removeExistingFile) {
      const existingAttachment: any = await query(
        `SELECT id, file_id
         FROM file_attachments
         WHERE entity_type = 'receipt' AND entity_id = ? AND detached_at IS NULL`,
        [receiptId]
      )

      if (existingAttachment.length) {
        await query(
          `UPDATE file_attachments
           SET detached_at=NOW(), detached_by=?
           WHERE id=?`,
          [current.user.id, existingAttachment[0].id]
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
        })
      }
    }

    if (file) {
      if (!ALLOWED_MIME.includes(file.type || ''))
        throw createError({ statusCode: 400 })

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
        ]
      )

      const fileId = Number(fileResult.insertId)

      const res = await query(
        `INSERT INTO file_attachments
         (file_id, entity_type, entity_id, attached_by)
         VALUES (?, 'receipt', ?, ?)`,
        [
          fileId,
          receiptId,
          current.user.id,
        ]
      )

      await logChange({
        entityType: 'receipt',
        entityId: receiptId,
        subEntityType: 'file_attachment',
        subEntityId: res.insertId,
        field: 'file_attached',
        oldValue: null,
        newValue: fileId,
        userId: current.user.id,
      })
    }

    await query('COMMIT')

    return { ok: true }

  } catch (err) {
    await query('ROLLBACK')
    console.log(err)
    return { ok: false, error: 'An error occured during the update of the receipt' }
  }
})