import { defineEventHandler, readMultipartFormData } from 'h3'
import { query, withTransaction } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import type { CreateCashCountBody } from '~/types/cashCount'

interface CreateCashCountSuccess {
  ok: true
  cashCountId: number
}

interface CreateCashCountError {
  ok: false
  error: string
}

type CreateCashCountResponse = CreateCashCountSuccess | CreateCashCountError

const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]

const MAX_SIZE = Number(process.env.MAX_UPLOAD_MB || 5) * 1024 * 1024

function normalizeAmount(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : NaN
}

function normalizeBody(body: CreateCashCountBody): CreateCashCountBody {
  return {
    event_name: body.event_name.trim(),
    counted_by_first: Number(body.counted_by_first || 0),
    counted_by_second: Number(body.counted_by_second || 0),
    checked_by: Number(body.checked_by || 0),
    counted_before_at: String(body.counted_before_at || ''),
    counted_after_at: String(body.counted_after_at || ''),
    positions: Array.isArray(body.positions)
      ? body.positions.map((position, index) => ({
          id: position.id ? Number(position.id) : undefined,
          register_number: index + 1,
          amount_before: normalizeAmount(position.amount_before),
          amount_after: normalizeAmount(position.amount_after),
          notes: position.notes?.trim() ? position.notes.trim() : null,
        }))
      : [],
  }
}

function validate(body: CreateCashCountBody) {
  if (!body.event_name) return 'event_name is required'
  if (!body.counted_by_first || !body.counted_by_second || !body.checked_by) return 'All member references are required'
  if (!body.counted_before_at || !body.counted_after_at) return 'Both timestamps are required'
  if (new Set([body.counted_by_first, body.counted_by_second, body.checked_by]).size !== 3) {
    return 'All three member references must be distinct'
  }
  if (!Array.isArray(body.positions) || body.positions.length === 0) return 'At least one register is required'
  if (body.positions.some(position => Number.isNaN(position.amount_before) || Number.isNaN(position.amount_after))) {
    return 'Each position requires amount_before and amount_after'
  }

  const beforeTs = Date.parse(body.counted_before_at)
  const afterTs = Date.parse(body.counted_after_at)
  if (!Number.isFinite(beforeTs) || !Number.isFinite(afterTs)) return 'Invalid timestamps'
  if (afterTs <= beforeTs) return 'counted_after_at must be later than counted_before_at'

  return null
}

export default defineEventHandler(async (event): Promise<CreateCashCountResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (!current.user.permissions.includes('cash_counts.edit')) return { ok: false, error: 'Not authorized' }

  const formData = await readMultipartFormData(event)
  if (!formData) return { ok: false, error: 'Invalid form data' }

  const getField = (name: string) => formData.find(f => f.name === name)?.data?.toString()
  const file = formData.find(f => f.type && f.filename)

  const cashCountJson = getField('cashCount')
  if (!cashCountJson) return { ok: false, error: 'Missing cash count data' }

  const cashCount = normalizeBody(JSON.parse(cashCountJson) as CreateCashCountBody)
  const validationError = validate(cashCount)
  if (validationError) return { ok: false, error: validationError }
  if (!file) return { ok: false, error: 'A file is required for cash counts' }
  if (!ALLOWED_MIME.includes(file.type || '')) return { ok: false, error: 'Invalid file type' }
  if (file.data.length > MAX_SIZE) return { ok: false, error: 'File too large' }

  try {
    return await withTransaction(async (conn) => {
      const result: any = await query(
        `INSERT INTO cash_counts
          (event_name, counted_by_first, counted_by_second, checked_by, counted_before_at, counted_after_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          cashCount.event_name,
          cashCount.counted_by_first,
          cashCount.counted_by_second,
          cashCount.checked_by,
          cashCount.counted_before_at,
          cashCount.counted_after_at,
          current.user.id,
        ],
        conn
      )

      const cashCountId = Number(result.insertId)

      for (const position of cashCount.positions) {
        await query(
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
      }

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

      await query(
        `INSERT INTO file_attachments
          (file_id, entity_type, entity_id, attached_by)
         VALUES (?, 'cash_count', ?, ?)`,
        [
          Number(fileResult.insertId),
          cashCountId,
          current.user.id,
        ],
        conn
      )

      return { ok: true, cashCountId }
    })
  } catch (err: any) {
    return { ok: false, error: `Failed to create cash count: ${err}` }
  }
})
