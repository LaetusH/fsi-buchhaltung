export interface SavePositionBody {
  id?: number
  code: string
  name: string
  is_active?: boolean
  description?: string
}

export interface PositionRow {
  id: number
  code: string
  name: string
  is_active: boolean
  description: string
  created_at: string
}
