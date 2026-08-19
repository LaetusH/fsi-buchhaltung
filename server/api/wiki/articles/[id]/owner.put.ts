import { defineEventHandler, readBody } from 'h3'
import { query, withAuditTransaction } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/api/guards'
import { requireArticleWrite } from '~/server/utils/wiki/access'

export type SetWikiOwnerResponse = { ok: true } | { ok: false, error: string }

async function exists(table: string, id: number) {
  const rows = await query<Array<{ id: number }>>(`SELECT id FROM ${table} WHERE id = ? LIMIT 1`, [id])
  return rows.length > 0
}

export default defineEventHandler(async (event): Promise<SetWikiOwnerResponse> => {
  const current = await requirePermission(event, 'wiki.view')
  if (!current.ok) return current

  const articleId = Number(event.context.params?.id)
  if (!Number.isInteger(articleId) || articleId <= 0) return { ok: false, error: 'Der Artikel wurde nicht gefunden.' }

  const access = await requireArticleWrite(event, current.user, articleId)
  if (!access.ok) return access

  const body = await readBody(event)
  const positionId = body?.ownerPositionId ? Number(body.ownerPositionId) : null
  const subdivisionId = body?.ownerSubdivisionId ? Number(body.ownerSubdivisionId) : null
  const createGrant = body?.createGrant === true

  if (positionId !== null && !(await exists('positions', positionId))) {
    return { ok: false, error: 'Dieses Amt wurde nicht gefunden.' }
  }
  if (subdivisionId !== null && !(await exists('subdivisions', subdivisionId))) {
    return { ok: false, error: 'Diese Untergliederung wurde nicht gefunden.' }
  }

  try {
    await withAuditTransaction(current.user, async (conn) => {
      await query(
        'UPDATE wiki_articles SET owner_position_id = ?, owner_subdivision_id = ? WHERE id = ?',
        [positionId, subdivisionId, articleId],
        conn,
      )

      if (!createGrant) return

      for (const [subjectType, subjectId] of [['position', positionId], ['subdivision', subdivisionId]] as const) {
        if (!subjectId) continue
        await query(
          `INSERT IGNORE INTO wiki_access_grants
             (scope_type, scope_id, include_descendants, subject_type, subject_id, subject_key, access_level, created_by)
           VALUES ('article', ?, 1, ?, ?, '', 'write', ?)`,
          [articleId, subjectType, subjectId, current.user.id],
          conn,
        )
      }
    })

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: `Failed to set the wiki article owner: ${err}` }
  }
})
