import { defineEventHandler, readBody } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { saveInvoiceTextSettings } from '~/server/utils/appSettings'
import { withAuditTransaction } from '~/server/utils/db'
import type { InvoiceTextSettings } from '~/types/appSettings'

interface SaveInvoiceTextSettingsSuccess {
  ok: true
  settings: InvoiceTextSettings
}

interface SaveInvoiceTextSettingsError {
  ok: false
  error: string
}

type SaveInvoiceTextSettingsResponse = SaveInvoiceTextSettingsSuccess | SaveInvoiceTextSettingsError

export default defineEventHandler(async (event): Promise<SaveInvoiceTextSettingsResponse> => {
  const current = await requirePermission(event, 'settings.app.access', { touch: false })
  if (!current.ok) return current

  const body = await readBody<Partial<InvoiceTextSettings>>(event)
  const settings = await withAuditTransaction(current.user, async conn => saveInvoiceTextSettings(body, conn))
  return { ok: true, settings }
})
