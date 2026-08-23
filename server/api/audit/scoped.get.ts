import { defineEventHandler, getQuery } from 'h3'
import { requireAuth } from '~/server/utils/api/guards'
import { getScopedAuditGroups, type AuditGroup } from '~/server/utils/audit/log'

interface GetScopedAuditSuccess { ok: true, groups: AuditGroup[] }
interface GetScopedAuditError { ok: false, error: string }
export type GetScopedAuditResponse = GetScopedAuditSuccess | GetScopedAuditError

export default defineEventHandler(async (event): Promise<GetScopedAuditResponse> => {
  const current = await requireAuth(event)
  if (!current.ok) return current

  const q = getQuery(event)
  const tables = typeof q.tables === 'string' ? q.tables.split(',').filter(Boolean) : []
  const parentId = q.parentId ? Number(q.parentId) : NaN

  if (!tables.length || !Number.isFinite(parentId)) return { ok: false, error: 'Not authorized' }

  // `tables` is user-controlled query input: getScopedAuditGroups parses every entry against the
  // registry whitelist and a strict column pattern, and drops the ones this user may not view,
  // before touching SQL.
  const result = await getScopedAuditGroups(current.user, tables, parentId)
  return result
})
