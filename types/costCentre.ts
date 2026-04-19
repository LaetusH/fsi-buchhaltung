export interface SaveCostCentreBody {
  id?: number
  code: string
  name: string
  is_active?: boolean
  description?: string
  parent_id?: number | null
}

export interface CostCentreRow {
  id: number
  code: string
  name: string
  is_active: boolean
  description: string
  parent_id: number | null
}
