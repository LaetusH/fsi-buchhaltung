import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import { normalizeBigInt } from '~/server/utils/normalize'
import type { CompanyRow } from '~/types/company'

interface GetCompaniesSuccess {
  ok: true
  companies: CompanyRow[]
}

interface GetCompaniesError {
  ok: false
  error: string
}

type GetCompaniesResponse = GetCompaniesSuccess | GetCompaniesError

export default defineEventHandler(async (event): Promise<GetCompaniesResponse> => {
  const current = await getCurrentUserFromEvent(event, true )
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  const rows = await query(`
    SELECT id, name, street, street_number, postal_code, city, country, iban, bic, bankname, vat_id, email, phone, notes, created_at, updated_at
    FROM companies
    ORDER BY name ASC
  `) as CompanyRow[]

  return { ok: true, companies: normalizeBigInt(rows) as CompanyRow[] }
})