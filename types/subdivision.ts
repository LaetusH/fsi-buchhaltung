import type { MemberStatus } from '~/types/member'

export interface SaveSubdivisionBody {
  id?: number
  code: string
  name: string
  is_active?: boolean
  description?: string
  member_ids?: number[]
}

export interface SubdivisionMember {
  id: number
  first_name: string
  last_name: string
  full_name: string
  status: MemberStatus
}

export interface SubdivisionRow {
  id: number
  code: string
  name: string
  is_active: boolean
  description: string | null
  members: SubdivisionMember[]
}

export interface SubdivisionMemberOption {
  id: number
  full_name: string
  status: MemberStatus
  subject_name: string | null
}

export interface SubdivisionOption {
  id: number
  code: string
  name: string
  is_active: boolean
}
