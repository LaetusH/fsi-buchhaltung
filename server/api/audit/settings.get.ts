import { defineEventHandler } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { getAuditRetentionSettings, getAuditLogStats, type AuditRetentionSettings } from '~/server/utils/audit/retention'

interface GetAuditSettingsSuccess { ok: true, settings: AuditRetentionSettings, rowCount: number, sizeBytes: number }
interface GetAuditSettingsError { ok: false, error: string }
export type GetAuditSettingsResponse = GetAuditSettingsSuccess | GetAuditSettingsError

export default defineEventHandler(async (event): Promise<GetAuditSettingsResponse> => {
  const current = await requirePermission(event, 'settings.app.access')
  if (!current.ok) return current

  const [settings, stats] = await Promise.all([getAuditRetentionSettings(), getAuditLogStats()])
  return { ok: true, settings, rowCount: stats.rowCount, sizeBytes: stats.sizeBytes }
})
