export interface CompanyRow {
  id: number
  name: string
  street: string
  street_number: string
  postal_code: string
  city: string
  country: string
  iban: string
  bic: string
  bankname: string
  vat_id: string
  email: string
  phone: string
  notes: string
}

export interface Company {
  id: number
  name: string
  street?: string
  street_number?: string
  postal_code?: string
  city?: string
  country?: string
  iban?: string
  bic?: string
  bankname?: string
  vat_id?: string
  email?: string
  phone?: string
  notes?: string
}

export interface CreateCompanyBody {
  name: string
  street: string | null
  street_number: string | null
  postal_code: string | null
  city: string | null
  country: string | null
  iban: string | null
  bic: string | null
  bankname: string | null
  vat_id: string | null
  email: string | null
  phone: string | null
  notes: string | null
}

export interface UpdateCompanyBody {
  id: number
  name: string
  street: string | null
  street_number: string | null
  postal_code: string | null
  city: string | null
  country: string | null
  iban: string | null
  bic: string | null
  bankname: string | null
  vat_id: string | null
  email: string | null
  phone: string | null
  notes: string | null
}
