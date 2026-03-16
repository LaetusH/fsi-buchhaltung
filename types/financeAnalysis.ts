import type { ReceiptStatus } from '~/types/receipt'

export interface FinanceAnalysisReceiptItem {
  id: number
  receipt_date: string
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

export interface FinanceAnalysisCashCountItem {
  id: number
  event_name: string
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
  net_result: number
}

export interface FinanceAnalysisData {
  summary: FinanceAnalysisSummary
  receipts: FinanceAnalysisReceiptItem[]
  receiptBreakdown: FinanceAnalysisReceiptBreakdownItem[]
  cashCounts: FinanceAnalysisCashCountItem[]
}
