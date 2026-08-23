import { defineEventHandler, getQuery } from 'h3'
import { requireAuth } from '~/server/utils/api/guards'
import { canViewAuditTable } from '~/server/utils/audit/registry'
import { getRecordAuditGroups, type AuditGroup } from '~/server/utils/audit/log'

interface GetRecordAuditSuccess { ok: true, groups: AuditGroup[] }
interface GetRecordAuditError { ok: false, error: string }
export type GetRecordAuditResponse = GetRecordAuditSuccess | GetRecordAuditError

export default defineEventHandler(async (event): Promise<GetRecordAuditResponse> => {
  const current = await requireAuth(event)
  if (!current.ok) return current

  const q = getQuery(event)
  const table = typeof q.table === 'string' ? q.table : ''
  const id = q.id ? Number(q.id) : NaN
  const includeChildren = q.includeChildren !== 'false'

  // `table` is user-controlled query input: it must be validated against the registry whitelist
  // (canViewAuditTable rejects anything not registered) and never interpolated into SQL beyond a
  // parameterized lookup.
  if (!Number.isFinite(id) || !canViewAuditTable(current.user, table)) return { ok: false, error: 'Not authorized' }

  const result = await getRecordAuditGroups(current.user, table, { id }, { includeChildren })
  return result
})
