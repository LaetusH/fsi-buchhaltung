import { defineEventHandler, readBody } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { resolveWikiEmbeds } from '~/server/utils/wiki/embeds'
import type { WikiEmbedRequestItem, WikiEmbedResult } from '~/types/wiki'

interface ResolveEmbedsBody {
  embeds?: WikiEmbedRequestItem[]
}

export type WikiEmbedsResolveResponse =
  | { ok: true, results: WikiEmbedResult[] }
  | { ok: false, error: string }

const MAX_EMBEDS_PER_REQUEST = 30

export default defineEventHandler(async (event): Promise<WikiEmbedsResolveResponse> => {
  const current = await requirePermission(event, 'wiki.view')
  if (!current.ok) return current

  const body = await readBody<ResolveEmbedsBody>(event)
  const requested = Array.isArray(body?.embeds) ? body.embeds : []

  if (requested.length > MAX_EMBEDS_PER_REQUEST) {
    return { ok: false, error: 'Zu viele Bausteine in einer Anfrage.' }
  }

  const items: WikiEmbedRequestItem[] = requested.map(entry => ({
    key: String(entry?.key ?? ''),
    args: entry?.args && typeof entry.args === 'object' && !Array.isArray(entry.args) ? entry.args : {},
  }))

  return { ok: true, results: await resolveWikiEmbeds(current.user, items) }
})
