import { defineEventHandler, readBody } from 'h3'
import { query, withAuditTransaction } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/api/guards'
import { invalidateWikiAccess } from '~/server/utils/wiki/access'
import { slugifyTitle } from '~/server/utils/wiki/articles'
import { DEFAULT_SPACE_ICON, isSpaceSlugTaken, validateSpaceFields } from '~/server/utils/wiki/spaces'

export type CreateWikiSpaceResponse =
  | { ok: true, spaceId: number }
  | { ok: false, error: string }

export default defineEventHandler(async (event): Promise<CreateWikiSpaceResponse> => {
  const current = await requirePermission(event, 'wiki.manage')
  if (!current.ok) return current

  const body = await readBody(event)
  const title = String(body?.title ?? '').trim()
  const slug = String(body?.slug ?? '').trim() || slugifyTitle(title)
  const description = String(body?.description ?? '').trim()
  const icon = String(body?.icon ?? '').trim() || DEFAULT_SPACE_ICON
  const requiresReview = body?.requiresReview ? 1 : 0

  const invalid = validateSpaceFields({ title, slug, description, icon })
  if (invalid) return { ok: false, error: invalid }

  if (await isSpaceSlugTaken(slug, null)) {
    return { ok: false, error: 'Es gibt bereits einen Bereich mit diesem Kurznamen.' }
  }

  try {
    const spaceId = await withAuditTransaction(current.user, async (conn) => {
      const positionRows = await query<Array<{ next_position: number }>>(
        'SELECT COALESCE(MAX(position), 0) + 10 AS next_position FROM wiki_spaces',
        [],
        conn,
      )

      const result: any = await query(
        'INSERT INTO wiki_spaces (slug, title, description, icon, position, requires_review) VALUES (?, ?, ?, ?, ?, ?)',
        [slug, title, description, icon, Number(positionRows[0]?.next_position ?? 10), requiresReview],
        conn,
      )

      return Number(result.insertId)
    })

    invalidateWikiAccess(event)
    return { ok: true, spaceId }
  } catch (err: any) {
    return { ok: false, error: `Failed to create wiki space: ${err}` }
  }
})
