import { defineEventHandler, readBody } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { renderArticle } from '~/server/utils/wiki/render'
import type { WikiHeading } from '~/server/utils/wiki/render'

interface PreviewBody {
  markdown?: string
  knownChecklists?: string[]
}

export type PreviewResponse =
  | { ok: true, html: string, headings: WikiHeading[] }
  | { ok: false, error: string }

export default defineEventHandler(async (event): Promise<PreviewResponse> => {
  const current = await requirePermission(event, 'wiki.view')
  if (!current.ok) return current

  const body = await readBody<PreviewBody>(event)
  const markdown = typeof body?.markdown === 'string' ? body.markdown : ''

  const knownChecklists = Array.isArray(body?.knownChecklists)
    ? body.knownChecklists.filter((entry): entry is string => typeof entry === 'string')
    : undefined

  const rendered = renderArticle(markdown, { knownChecklists })
  if (!rendered.ok) return rendered

  return { ok: true, html: rendered.html, headings: rendered.headings }
})
