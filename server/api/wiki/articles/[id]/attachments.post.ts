import { defineEventHandler } from 'h3'
import { withAuditTransaction } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/api/guards'
import { readMultipart } from '~/server/utils/api/request'
import { storeAndAttachUploadedFile, validateUploadedFile } from '~/server/utils/files'
import { requireArticleWrite } from '~/server/utils/wiki/access'
import { loadAttachments } from '~/server/utils/wiki/articles'
import type { WikiAttachment } from '~/types/wiki'

export type UploadWikiAttachmentResponse =
  | { ok: true, attachments: WikiAttachment[] }
  | { ok: false, error: string }

export default defineEventHandler(async (event): Promise<UploadWikiAttachmentResponse> => {
  const current = await requirePermission(event, 'wiki.view')
  if (!current.ok) return current

  const articleId = Number(event.context.params?.id)
  if (!Number.isInteger(articleId) || articleId <= 0) return { ok: false, error: 'Der Artikel wurde nicht gefunden.' }

  const access = await requireArticleWrite(event, current.user, articleId)
  if (!access.ok) return access

  const multipart = await readMultipart(event)
  if (!multipart?.file) return { ok: false, error: 'Es wurde keine Datei übertragen.' }

  const fileError = validateUploadedFile(multipart.file, 'Es wurde keine Datei übertragen.')
  if (fileError) {
    return {
      ok: false,
      error: fileError === 'File too large'
        ? `Die Datei ist größer als ${process.env.MAX_UPLOAD_MB || 5} MB.`
        : 'Dieser Dateityp ist nicht erlaubt.',
    }
  }

  try {
    await withAuditTransaction(current.user, async (conn) => {
      await storeAndAttachUploadedFile(
        multipart.file!,
        'wiki',
        'wiki_article',
        articleId,
        Number(current.user.id),
        conn,
      )
    })

    return { ok: true, attachments: await loadAttachments(articleId) }
  } catch (err: any) {
    return { ok: false, error: `Failed to upload wiki attachment: ${err}` }
  }
})
