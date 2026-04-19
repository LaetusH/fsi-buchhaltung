export interface AssociationResponsibleMemberOption {
  id: number
  full_name: string
  subject_name: string | null
}

export interface AssociationResponsiblePositionOption {
  id: number
  code: string
  name: string
  is_active: boolean
  current_holder_names: string[]
}

export interface AssociationProfileRow {
  id: number
  name: string
  short_name: string | null
  street: string
  street_number: string
  postal_code: string
  city: string
  email: string
  phone: string | null
  website: string | null
  vat_id: string | null
  iban: string | null
  bic: string | null
  bankname: string | null
  register_number: string | null
  register_court: string | null
  logo_file_id: number | null
  responsible_member_ids: number[]
  responsible_position_ids: number[]
}

export interface SaveAssociationProfileBody {
  id?: number
  name: string
  short_name: string | null
  street: string
  street_number: string
  postal_code: string
  city: string
  email: string
  phone: string | null
  website: string | null
  vat_id: string | null
  iban: string | null
  bic: string | null
  bankname: string | null
  register_number: string | null
  register_court: string | null
  responsible_member_ids: number[]
  responsible_position_ids: number[]
}
