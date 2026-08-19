import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/api/guards'
import { requireArticleWrite } from '~/server/utils/wiki/access'

export type WikiRevisionDetailResponse =
  | { ok: true, revision: { id: number, revisionNumber: number, title: string, summary: string, contentMd: string, changeNote: string, createdAt: string } }
  | { ok: false, error: string }

export default defineEventHandler(async (event): Promise<WikiRevisionDetailResponse> => {
  const current = await requirePermission(event, 'wiki.view')
  if (!current.ok) return current

  const revisionId = Number(event.context.params?.revisionId)
  if (!Number.isInteger(revisionId) || revisionId <= 0) return { ok: false, error: 'Diese Version wurde nicht gefunden.' }

  const rows = await query<Array<{
    id: number
    article_id: number
    revision_number: number
    title: string
    summary: string
    content_md: string
    change_note: string
    created_at: string
  }>>(
    `SELECT id, article_id, revision_number, title, summary, content_md, change_note, created_at
     FROM wiki_article_revisions
     WHERE id = ?
     LIMIT 1`,
    [revisionId],
  )
  const revision = rows[0]
  if (!revision) return { ok: false, error: 'Diese Version wurde nicht gefunden.' }

  const access = await requireArticleWrite(event, current.user, Number(revision.article_id))
  if (!access.ok) return access

  return {
    ok: true,
    revision: {
      id: Number(revision.id),
      revisionNumber: Number(revision.revision_number),
      title: revision.title,
      summary: revision.summary,
      contentMd: revision.content_md,
      changeNote: revision.change_note,
      createdAt: String(revision.created_at),
    },
  }
})
