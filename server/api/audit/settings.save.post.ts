import { defineEventHandler, readBody } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { withAuditTransaction } from '~/server/utils/db'
import { saveAuditRetentionSettings, type AuditRetentionSettings } from '~/server/utils/audit/retention'

interface SaveAuditSettingsSuccess { ok: true, settings: AuditRetentionSettings }
interface SaveAuditSettingsError { ok: false, error: string }
export type SaveAuditSettingsResponse = SaveAuditSettingsSuccess | SaveAuditSettingsError

export default defineEventHandler(async (event): Promise<SaveAuditSettingsResponse> => {
  const current = await requirePermission(event, 'settings.app.access', { touch: false })
  if (!current.ok) return current

  const body = await readBody<Partial<AuditRetentionSettings>>(event)
  const settings = await withAuditTransaction(current.user, async conn => saveAuditRetentionSettings(body, conn))

  return { ok: true, settings }
})
