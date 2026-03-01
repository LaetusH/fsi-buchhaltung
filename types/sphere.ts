export interface SaveSphereBody {
  id?: number
  code: string
  name: string
  is_active?: boolean
  description?: string
}

export interface SphereRow {
  id: number
  code: string
  name: string
  is_active: boolean
  description: string
  created_at: string
  updated_at: string
}