import type { Receipt } from "./receipt"

export enum ReimbursementStatus {
  Submitted = 'submitted',
  Checked = 'checked',
  Disbursed = 'disbursed',
  Cancelled = 'cancelled',
}

export interface ReimbursementPositionRow {
  id: number
  reimbursement_id: number
  receipt_id: number
}

export interface ReimbursementPosition {
  id: number
  receipt: Receipt
}

export interface CreateReimbursementPositionBody {
  receipt_id: number
  receipt?: Receipt
}

export interface ReimbursementRow {
  id: number
  paid_by: number
  submitted_at: string
  bankname: string | null
  account_holder: string | null
  iban: string | null
  bic: string | null
  advance: number
  cash: boolean
  checked_by: number | null
  checked_at: string | null
  disbursed_by: number | null
  disbursed_at: string | null
}

export interface Reimbursement extends ReimbursementRow {
  positions: ReimbursementPosition[]
}

export interface ReimbursementOverview {
  id: number
  paid_by: number
  member_name: string
  submitted_at: string
  checked_at: string | null
  disbursed_at: string | null
  receipt_count: number
  total_amount: number
}

export interface CreateReimbursementBody {
  paid_by: number,
  bankname: string | null,
  account_holder: string | null,
  iban: string | null,
  bic: string | null,
  advance: number,
  cash: boolean,
  submitted_at: string,
  checked_at: string | null,
  checked_by: number | null,
  disbursed_at: string | null,
  disbursed_by: number | null,
  positions: CreateReimbursementPositionBody[]
}
