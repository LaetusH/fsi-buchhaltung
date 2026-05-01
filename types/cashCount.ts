export interface CashCountPositionRow {
  id: number
  cash_count_id: number
  register_number: number
  amount_before: number
  amount_after: number
  notes: string | null
}

export interface CashCountPosition extends CashCountPositionRow {
  difference: number
}

export interface CashCountRow {
  id: number
  event_id: number | null
  event_name: string | null
  counted_by_first: number
  counted_by_second: number
  checked_by: number
  counted_before_at: string | null
  counted_after_at: string
}

export interface CashCount extends CashCountRow {
  positions: CashCountPosition[]
}

export interface CashCountOverview {
  id: number
  event_id: number | null
  event_name: string | null
  counted_before_at: string | null
  counted_after_at: string
  counted_by_first_name: string
  counted_by_second_name: string
  checked_by_name: string
  register_count: number
  total_before_amount: number
  total_after_amount: number
  total_difference: number
}

export interface CreateCashCountPositionBody {
  id?: number
  register_number?: number
  amount_before: number
  amount_after: number
  notes: string | null
}

export interface CreateCashCountBody {
  event_id: number | null
  counted_by_first: number
  counted_by_second: number
  checked_by: number
  counted_before_at: string | null
  counted_after_at: string
  positions: CreateCashCountPositionBody[]
}
