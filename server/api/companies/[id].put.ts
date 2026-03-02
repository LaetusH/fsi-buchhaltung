import { defineEventHandler, readBody } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import type { CompanyRow, UpdateCompanyBody } from '~/types/company'

interface UpdateCompanySuccess {
  ok: true
}

interface UpdateCompanyError {
  ok: false
  error: string
}

type UpdateCompanyResponse = UpdateCompanySuccess | UpdateCompanyError

interface MysqlError extends Error {
  code?: string
}

export default defineEventHandler(async (event): Promise<UpdateCompanyResponse> => {
  const current = await getCurrentUserFromEvent(event, false)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  const companyId = Number(event.context.params?.id)
  if (!companyId) return { ok: false, error: 'Invalid receipt id' }

  const body = await readBody<UpdateCompanyBody>(event)
  if (!body.name) return { ok: false, error: 'Missing fields' }
  const updated = body

  try {
    const existingRows: CompanyRow[] = await query(
      `SELECT * FROM companies WHERE id = ? LIMIT 1`,
      [companyId]
    )
    
    if (!existingRows.length) return { ok: false, error: 'No matching companies in database' }
    
    const existing = existingRows[0]
    
    const fields = ['name', 'street', 'street_number', 'postal_code', 'city', 'country', 'iban', 'bic', 'bankname', 'vat_id', 'email', 'phone', 'notes'] as (keyof UpdateCompanyBody)[]
    
    for (const field of fields) {
      if (String(existing[field]) !== String(updated[field])) {
        await logChange({
          entityType: 'company',
          entityId: companyId,
          subEntityType: null,
          subEntityId: null,
          field,
          oldValue: existing[field],
          newValue: updated[field],
          userId: current.user.id,
        })
      }
    }

    await query(
      `UPDATE companies
       SET
        name = ?,
        street = ?,
        street_number = ?,
        postal_code = ?,
        city = ?,
        country = ?,
        iban = ?,
        bic = ?,
        bankname = ?,
        vat_id = ?,
        email = ?,
        phone = ?,
        notes = ?
       WHERE id = ?`,
      [
        updated.name, 
        updated.street || null, 
        updated.street_number || null, 
        updated.postal_code || null, 
        updated.city || null, 
        updated.country || null, 
        updated.iban || null, 
        updated.bic || null, 
        updated.bankname || null, 
        updated.vat_id || null, 
        updated.email || null, 
        updated.phone || null, 
        updated.notes || null, 
        companyId,
      ]
    )
  } catch (err: unknown) {
    const error = err as MysqlError
    return { ok: false, error: error.code! }
  }

  return { ok: true }
})