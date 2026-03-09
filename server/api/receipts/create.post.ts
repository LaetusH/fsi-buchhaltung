import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { query, withTransaction } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { ReceiptStatus } from '~/types/receipt'

interface CreateReceiptSuccess {
  ok: true
  receiptId: number
}

interface CreateReceiptError {
  ok: false
  error: string
}

type CreateReceiptResponse = CreateReceiptSuccess | CreateReceiptError

const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]

const MAX_SIZE = Number(process.env.MAX_UPLOAD_MB || 5) * 1024 * 1024

export default defineEventHandler(async (event): Promise<CreateReceiptResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  const formData = await readMultipartFormData(event)
  if (!formData) return { ok: false, error: 'Invalid form data' }

  const getField = (name: string) =>
    formData.find(f => f.name === name)?.data?.toString()

  const file = formData.find(f => f.type && f.filename)

  const receiptJson = getField('receipt')
  if (!receiptJson) return { ok: false, error: 'Missing receipt data' }

  const receipt = JSON.parse(receiptJson)

  const {
    receipt_date,
    receipt_number,
    description,
    status,
    company_id,
    positions,
  } = receipt

  if (!company_id || !receipt_date || !status || !positions || !Array.isArray(positions) || positions.length === 0) {
    return { ok: false, error: 'Missing required receipt fields' }
  }
  if (positions.some((p: any) => !p?.sphere || !p?.cost_centre || p?.amount === null || p?.amount === undefined)) {
    return { ok: false, error: 'Each position requires sphere, cost centre and amount' }
  }

  const requiresFile = status === ReceiptStatus.Open || status === ReceiptStatus.Paid
  if (requiresFile && !file) {
    return { ok: false, error: 'A file is required for open or paid receipts' }
  }

  if (file) {
    if (!ALLOWED_MIME.includes(file.type || '')) return { ok: false, error: 'Invalid file type' }
    if (file.data.length > MAX_SIZE) return { ok: false, error: 'File too large' }
  }

  try {
    return await withTransaction(async (conn) => {
      const receiptResult: any = await query(
        `INSERT INTO receipts
          (company_id, receipt_date, receipt_number, description, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          company_id || null,
          receipt_date,
          receipt_number || null,
          description || null,
          status,
          current.user.id,
        ],
        conn
      )

      const receiptId = Number(receiptResult.insertId)

      for (const p of positions) {
        await query(
          `INSERT INTO receipt_positions
            (receipt_id, sphere, cost_centre, amount, tax, created_by)
          VALUES (?, ?, ?, ?, ?, ?)`,
          [
            receiptId,
            p.sphere,
            p.cost_centre,
            p.amount,
            p.tax ?? 19,
            current.user.id,
          ],
          conn
        )
      }

      if (file) {
        const uploadRoot = process.env.UPLOAD_DIR!
        const uploadDir = path.join(uploadRoot, 'receipts')
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
            `/uploads/receipts/${filename}`,
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
            'receipt',
            receiptId,
            current.user.id,
          ],
          conn
        )
      }

      return { ok: true, receiptId }
    })
  } catch (err: any) {
    return { ok: false, error: `Failed to create receipt: ${err}` }
  }
})
