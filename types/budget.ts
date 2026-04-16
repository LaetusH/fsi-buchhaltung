export type BudgetSemester = 'summer' | 'winter'

export interface BudgetCostCentreLine {
  cost_centre_id: number
  expense_amount: number
  income_amount: number
  notes: string | null
}

export interface BudgetListItem {
  id: number
  start_date: string
  end_date: string
  year: number
  semester: BudgetSemester
  notes: string | null
  own_expense_total: number
  own_income_total: number
  own_saldo: number
  line_count: number
}

export interface BudgetDetail extends BudgetListItem {
  lines: BudgetCostCentreLine[]
}

export interface SaveBudgetLineBody {
  cost_centre_id: number
  expense_amount: number
  income_amount: number
  notes?: string | null
}

export interface SaveBudgetBody {
  id?: number
  year: number
  semester: BudgetSemester
  notes?: string | null
  lines: SaveBudgetLineBody[]
}
