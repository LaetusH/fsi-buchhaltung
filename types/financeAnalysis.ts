import type { InvoiceStatus } from '~/types/invoice'
import type { ReceiptStatus } from '~/types/receipt'

export interface FinanceAnalysisReceiptItem {
  id: number
  receipt_date: string
  reimbursement_submitted_at: string | null
  receipt_number: string | null
  company_name: string | null
  status: ReceiptStatus
  total_amount: number
}

export interface FinanceAnalysisReceiptBreakdownItem {
  group_type: 'costCentre' | 'sphere'
  group_id: number | null
  group_code: string
  group_name: string
  month_key: string
  status: ReceiptStatus
  receipt_count: number
  total_amount: number
}

export interface FinanceAnalysisInvoiceBreakdownItem {
  group_type: 'costCentre' | 'sphere'
  group_id: number | null
  group_code: string
  group_name: string
  month_key: string
  status: InvoiceStatus
  invoice_count: number
  total_amount: number
}

export interface FinanceAnalysisCashCountItem {
  id: number
  source_type?: 'bankStatementEvent'
  bank_statement_id?: number
  event_id: number
  event_name: string
  cost_centres: {
    sphere_id: number
    sphere_code: string
    sphere_name: string
    cost_centre_id: number
    code: string
    name: string
    allocation_percentage: number
  }[]
  counted_before_at: string
  counted_after_at: string
  counted_by_first_name: string
  counted_by_second_name: string
  checked_by_name: string
  register_count: number
  total_before_amount: number
  total_after_amount: number
  total_difference: number
}

export interface FinanceAnalysisInvoiceItem {
  id: number
  invoice_date: string
  due_date: string | null
  paid_at: string | null
  service_date: string | null
  invoice_number: string
  company_name: string | null
  status: InvoiceStatus
  total_amount: number
}

export type FinanceAnalysisBalanceEventType = 'opening' | 'receipt' | 'invoice' | 'cashCount'

export interface FinanceAnalysisBalanceEvent {
  id: string
  type: FinanceAnalysisBalanceEventType
  source_id: number | null
  date: string
  label: string
  reference: string | null
  delta_amount: number
  balance_amount: number
  cash_before_amount: number | null
  cash_after_amount: number | null
  discrepancy_amount: number | null
  has_discrepancy: boolean
  note: string | null
}

export interface FinanceAnalysisSummary {
  start_date: string
  end_date: string
  receipt_count: number
  receipt_total: number
  receipt_paid_count: number
  receipt_paid_total: number
  receipt_open_count: number
  receipt_open_total: number
  receipt_draft_count: number
  receipt_draft_total: number
  receipt_cancelled_count: number
  receipt_cancelled_total: number
  cash_count_count: number
  cash_count_register_total: number
  cash_count_total_before: number
  cash_count_total_after: number
  cash_count_total_difference: number
  invoice_count: number
  invoice_total: number
  net_result: number
}

export interface FinanceAnalysisData {
  summary: FinanceAnalysisSummary
  receipts: FinanceAnalysisReceiptItem[]
  receiptBreakdown: FinanceAnalysisReceiptBreakdownItem[]
  invoiceBreakdown: FinanceAnalysisInvoiceBreakdownItem[]
  cashCounts: FinanceAnalysisCashCountItem[]
  invoices: FinanceAnalysisInvoiceItem[]
  balanceEvents: FinanceAnalysisBalanceEvent[]
}
