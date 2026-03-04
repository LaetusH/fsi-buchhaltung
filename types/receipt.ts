export enum ReceiptStatus {
  Draft = 'draft',
  Open = 'open',
  Paid = 'paid',
  Cancelled = 'cancelled',
}

export interface ReceiptPosition {
  id: number
  sphere: number
  cost_centre: number
  amount: number
  tax: number
}

export interface Receipt {
  id: number
  company_id: number | null
  company_name: string | null
  receipt_date: string
  receipt_number: string | null
  description: string | null
  status: ReceiptStatus
  positions: ReceiptPosition[]
}

export interface ReceiptPositionRow {
  id: number
  receipt_id: number
  sphere: number
  cost_centre: number
  amount: number
  tax: number
}

export interface ReceiptRow {
  id: number
  company_id: number | null
  company_name: string | null
  receipt_date: string
  receipt_number: string | null
  description: string | null
  status: ReceiptStatus
  total_amount: number
}

export interface CreateReceiptPositionBody {
  sphere: number
  cost_centre: number
  amount: number
  tax: number
}

export interface CreateReceiptBody {
  company_id: number | null
  receipt_date: string
  receipt_number: string | null
  description: string | null
  status: ReceiptStatus
  positions: CreateReceiptPositionBody[]
}