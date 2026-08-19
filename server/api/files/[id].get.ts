import { defineEventHandler, createError, sendStream, setHeader } from 'h3'
import { query } from '~/server/utils/db'
import { hasPermission, requireAuth } from '~/server/utils/api/guards'
import { canReadArticle, getWikiAccess } from '~/server/utils/wiki/access'
import type { User } from '~/types/user'
import fs from 'fs'
import path from 'path'
import type { H3Event } from 'h3'

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

/**
 * Wiki attachments hang on articles whose visibility is decided by the wiki ACL, not by `files.view`.
 * A reader who may see the article may fetch its attachment — checked through the shared resolver, so
 * this stays in step with the tree, search and export paths instead of loosening `files.view` globally.
 */
async function mayReadAsWikiAttachment(event: H3Event, user: User, fileId: number) {
  if (!hasPermission(user, 'wiki.view')) return false

  const rows = await query<Array<{ entity_id: number }>>(
    `SELECT entity_id
     FROM file_attachments
     WHERE file_id = ? AND entity_type = 'wiki_article' AND detached_at IS NULL`,
    [fileId],
  )
  if (!rows.length) return false

  const { index, subjects } = await getWikiAccess(event, user)
  return rows.some(row => canReadArticle(index, subjects, Number(row.entity_id)))
}

export default defineEventHandler(async (event): Promise<GetFileResponse> => {
  const current = await requireAuth(event)
  if (!current.ok) return current

  const idParam = event.context.params?.id

  if (!idParam || isNaN(Number(idParam))) return { ok: false, error: 'Invalid file id' }

  const id = Number(idParam)

  try {
    if (!hasPermission(current.user, 'files.view') && !(await mayReadAsWikiAttachment(event, current.user, id))) {
      return { ok: false, error: 'Not authorized' }
    }

    const result: FileRecord[] = await query(
      `SELECT id, file_path, mime_type
      FROM files
      WHERE id = ?
      LIMIT 1`,
      [id]
    )

    const file = result[0]
    if (!file) return { ok: false, error: 'File not found' }

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
