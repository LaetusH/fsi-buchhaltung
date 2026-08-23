import { defineEventHandler } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { getAuditFilterOptions, type AuditFilterOptions } from '~/server/utils/audit/log'

interface GetAuditFiltersSuccess extends AuditFilterOptions { ok: true }
interface GetAuditFiltersError { ok: false, error: string }
export type GetAuditFiltersResponse = GetAuditFiltersSuccess | GetAuditFiltersError

export default defineEventHandler(async (event): Promise<GetAuditFiltersResponse> => {
  const current = await requirePermission(event, 'audit.view')
  if (!current.ok) return current

  const options = await getAuditFilterOptions(current.user)
  return { ok: true, ...options }
})
