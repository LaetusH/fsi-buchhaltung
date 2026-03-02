import { defineEventHandler, createError, sendStream, setHeader } from 'h3'
import { query } from '~/server/utils/db'
import fs from 'fs'
import path from 'path'

interface FileRecord {
  id: number
  file_path: string
  mime_type: string
}

export default defineEventHandler(async (event) => {
  const current = await getCurrentUserFromEvent(event, true )
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  const idParam = event.context.params?.id

  if (!idParam || isNaN(Number(idParam))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid file id'
    })
  }

  const id = Number(idParam)

  const result: any = await query(
    `SELECT id, file_path, mime_type
     FROM files
     WHERE id = ?
     LIMIT 1`,
    [id]
  )

  if (!result.length) {
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }

  const file = result[0]

  const uploadRoot = process.env.UPLOAD_DIR!
  const relativePath = file.file_path.replace(/^\/uploads\//, '')
  const absolutePath = path.join(uploadRoot, relativePath)

  if (!fs.existsSync(absolutePath)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Physical file not found'
    })
  }

  const stat = fs.statSync(absolutePath)

  setHeader(event, 'Content-Type', file.mime_type)
  setHeader(event, 'Content-Length', stat.size)
  setHeader(event, 'Content-Disposition', 'inline')
  setHeader(event, 'Accept-Ranges', 'bytes')
  setHeader(event, 'Cache-Control', 'no-transform')

  return sendStream(event, fs.createReadStream(absolutePath))
})