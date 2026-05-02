import { defineEventHandler, createError, sendStream, setHeader } from 'h3'
import { query } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/api/guards'
import fs from 'fs'
import path from 'path'

interface FileRecord {
  id: number
  file_path: string
  mime_type: string
}

interface GetFileError {
  ok: false
  error: string
}

export type GetFileResponse = Promise<void> | GetFileError

export default defineEventHandler(async (event): Promise<GetFileResponse> => {
  const current = await requirePermission(event, 'files.view')
  if (!current.ok) return current

  const idParam = event.context.params?.id

  if (!idParam || isNaN(Number(idParam))) return { ok: false, error: 'Invalid file id' }

  const id = Number(idParam)

  try {
    const result: FileRecord[] = await query(
      `SELECT id, file_path, mime_type
      FROM files
      WHERE id = ?
      LIMIT 1`,
      [id]
    )

    if (!result.length) return { ok: false, error: 'File not found' }

    const file = result[0]

    const uploadRoot = process.env.UPLOAD_DIR!
    const relativePath = file.file_path.replace(/^\/uploads\//, '')
    const absolutePath = path.join(uploadRoot, relativePath)

    if (!fs.existsSync(absolutePath)) return { ok: false, error: 'Physical file not found' }

    const stat = fs.statSync(absolutePath)

    setHeader(event, 'Content-Type', file.mime_type)
    setHeader(event, 'Content-Length', stat.size)
    setHeader(event, 'Content-Disposition', 'inline')
    setHeader(event, 'Accept-Ranges', 'bytes')
    setHeader(event, 'Cache-Control', 'no-transform')

    return sendStream(event, fs.createReadStream(absolutePath))
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to get file', message: err })
  }
})
