export type BankStatementPositionType = 'receipt' | 'invoice' | 'event'

export interface BankStatementPositionRow {
  id: number
  bank_statement_id: number
  position_type: BankStatementPositionType
  position_date: string
  receipt_id: number | null
  invoice_id: number | null
  event_id: number | null
  amount: number | null
  notes: string | null
}

export interface BankStatementRow {
  id: number
  statement_number: string
  checked_by: number
  checked_by_name: string
  statement_date: string
}

export interface BankStatement extends BankStatementRow {
  positions: BankStatementPositionRow[]
}

export interface BankStatementPositionDetail extends BankStatementPositionRow {
  label: string
  entity_amount: number
}

export interface BankStatementOverview extends BankStatementRow {
  position_count: number
  opening_balance: number
  closing_balance: number
}

export interface CreateBankStatementPositionBody {
  id?: number
  position_type: BankStatementPositionType
  position_date: string
  receipt_id: number | null
  invoice_id: number | null
  event_id: number | null
  amount: number | null
  notes: string | null
}

export interface CreateBankStatementBody {
  statement_number: string
  checked_by: number
  statement_date: string
  positions: CreateBankStatementPositionBody[]
}

export interface BankStatementReceiptOption {
  id: number
  receipt_date: string
  receipt_number: string | null
  company_name: string | null
  total_amount: number
}

export interface BankStatementInvoiceOption {
  id: number
  invoice_date: string
  invoice_number: string
  company_name: string | null
  subject: string | null
  total_amount: number
}

export interface BankStatementEventOption {
  id: number
  name: string
  starts_at: string
}
