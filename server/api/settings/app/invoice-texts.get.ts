import { defineEventHandler } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { getInvoiceTextSettings, INVOICE_TEXT_VARIABLES } from '~/server/utils/appSettings'
import type { InvoiceTextSettings, InvoiceTextVariable } from '~/types/appSettings'

interface GetInvoiceTextSettingsSuccess {
  ok: true
  settings: InvoiceTextSettings
  variables: InvoiceTextVariable[]
}

interface GetInvoiceTextSettingsError {
  ok: false
  error: string
}

export type GetInvoiceTextSettingsResponse = GetInvoiceTextSettingsSuccess | GetInvoiceTextSettingsError

export default defineEventHandler(async (event): Promise<GetInvoiceTextSettingsResponse> => {
  const current = await requirePermission(event, ['settings.app.access', 'invoices.view'])
  if (!current.ok) return current

  const settings = await getInvoiceTextSettings()
  return { ok: true, settings, variables: INVOICE_TEXT_VARIABLES }
})
