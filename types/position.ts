export interface SavePositionAssignmentBody {
  id?: number
  member_id: number
  since: string
  until: string | null
}

export interface SavePositionBody {
  id?: number
  code: string
  name: string
  is_active?: boolean
  description?: string
  assignments?: SavePositionAssignmentBody[]
}

export interface PositionMemberAssignment extends SavePositionAssignmentBody {
  full_name: string
}

export interface PositionMemberOption {
  id: number
  full_name: string
}

export interface PositionRow {
  id: number
  code: string
  name: string
  is_active: boolean
  description: string
  assignments?: PositionMemberAssignment[]
}
