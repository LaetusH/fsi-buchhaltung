export interface SaveCostCentreBody {
  id?: number
  code: string
  name: string
  is_active?: boolean
  description?: string
}

export interface CostCentreRow {
  id: number
  code: string
  name: string
  is_active: boolean
  description: string
  created_at: string
}