import { defineEventHandler } from 'h3'
import { query, withAuditTransaction } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/api/guards'
import { detachFileAttachment } from '~/server/utils/files'
import { requireArticleWrite } from '~/server/utils/wiki/access'

export type DeleteWikiAttachmentResponse = { ok: true } | { ok: false, error: string }

export default defineEventHandler(async (event): Promise<DeleteWikiAttachmentResponse> => {
  const current = await requirePermission(event, 'wiki.view')
  if (!current.ok) return current

  const attachmentId = Number(event.context.params?.attachmentId)
  if (!Number.isInteger(attachmentId) || attachmentId <= 0) {
    return { ok: false, error: 'Der Anhang wurde nicht gefunden.' }
  }

  const rows = await query<Array<{ entity_id: number }>>(
    `SELECT entity_id
     FROM file_attachments
     WHERE id = ? AND entity_type = 'wiki_article' AND detached_at IS NULL
     LIMIT 1`,
    [attachmentId],
  )
  const attachment = rows[0]
  if (!attachment) return { ok: false, error: 'Der Anhang wurde nicht gefunden.' }

  const access = await requireArticleWrite(event, current.user, Number(attachment.entity_id))
  if (!access.ok) return access

  try {
    await withAuditTransaction(current.user, async (conn) => {
      await detachFileAttachment(attachmentId, Number(current.user.id), conn)
    })
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: `Failed to remove wiki attachment: ${err}` }
  }
})
