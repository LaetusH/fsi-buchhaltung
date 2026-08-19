import { defineEventHandler } from 'h3'
import { query, withAuditTransaction } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/api/guards'
import { getWikiAccess, invalidateWikiAccess } from '~/server/utils/wiki/access'
import { deleteScopeGrants } from '~/server/utils/wiki/grants'

export type DeleteWikiSpaceResponse = { ok: true } | { ok: false, error: string }

export default defineEventHandler(async (event): Promise<DeleteWikiSpaceResponse> => {
  const current = await requirePermission(event, 'wiki.manage')
  if (!current.ok) return current

  const spaceId = Number(event.context.params?.id)
  if (!Number.isInteger(spaceId) || spaceId <= 0) return { ok: false, error: 'Der Bereich wurde nicht gefunden.' }

  const { index } = await getWikiAccess(event, current.user)
  if (!index.spaceIds.has(spaceId)) return { ok: false, error: 'Der Bereich wurde nicht gefunden.' }

  const articleIds = [...index.articles.values()]
    .filter(article => article.spaceId === spaceId)
    .map(article => article.id)

  try {
    await withAuditTransaction(current.user, async (conn) => {
      await deleteScopeGrants('article', articleIds, conn)
      await deleteScopeGrants('space', [spaceId], conn)
      await query('DELETE FROM wiki_spaces WHERE id = ?', [spaceId], conn)
    })

    invalidateWikiAccess(event)
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: `Failed to delete wiki space: ${err}` }
  }
})
