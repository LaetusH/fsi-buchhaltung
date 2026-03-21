export enum MemberStatus {
  Active = 'active',
  Passive = 'passive',
  Hold = 'hold',
  Left = 'left',
}

export interface MemberListItem {
  id: number
  first_name: string
  last_name: string
  birthdate: string
  status: MemberStatus
  honorary: boolean
  subject_name: string | null
  joined_at: string
  left_at: string | null
  has_account?: boolean | null
  account_is_active?: boolean | null
}

export interface MemberPositionAssignment {
  id?: number
  position_id: number
  since: string
  until: string | null
}

export interface NewMemberAccount {
  username: string
  password: string
  is_active: boolean
}

export interface MemberSubdivisionAssignment {
  id: number
  code: string
  name: string
  is_active: boolean
}

export interface Member {
  id: number
  account: number | null
  last_name: string
  first_name: string
  birthdate: string
  street: string
  street_number: string
  postal_code: string
  city: string
  subject: number
  subject_name: string
  phone: string
  email: string
  notes: string | null
  status: MemberStatus
  honorary: boolean
  applied_at: string
  joined_at: string
  left_at: string | null
  positions: MemberPositionAssignment[]
  subdivisions?: MemberSubdivisionAssignment[]
}

export interface SaveMemberBody {
  account?: number | null
  new_account?: NewMemberAccount | null
  last_name: string
  first_name: string
  birthdate: string
  street: string
  street_number: string
  postal_code: string
  city: string
  subject_name: string
  phone: string
  email: string
  notes?: string | null
  status: MemberStatus
  honorary: boolean
  applied_at: string
  joined_at: string
  left_at?: string | null
  positions: MemberPositionAssignment[]
  subdivision_ids?: number[]
}
