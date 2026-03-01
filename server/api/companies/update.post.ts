import { defineEventHandler, readBody } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import type { UpdateCompanyBody } from '~/types/company'

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

  const body = await readBody<UpdateCompanyBody>(event)
  if (!body.id || !body.name) return { ok: false, error: 'Missing fields' }
  const { id, name, street, street_number, postal_code, city, country, iban, bic, bankname, vat_id, email, phone, notes } = body

  try {
    const res = await query(
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
        notes = ?,
        updated_by = ?
       WHERE id = ?`,
      [name, street, street_number, postal_code, city, country, iban, bic, bankname, vat_id, email, phone, notes, current.user.id, id]
    )
  } catch (err: unknown) {
    const error = err as MysqlError
    return { ok: false, error: error.code! }
  }

  return { ok: true }
})