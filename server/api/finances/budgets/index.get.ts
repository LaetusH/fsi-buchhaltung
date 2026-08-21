import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { normalizeBigInt } from '~/server/utils/normalize'
import { requirePermission } from '~/server/utils/api/guards'
import type { BudgetListItem, BudgetSemester } from '~/types/budget'

interface BudgetListRow {
  id: number
  start_date: string
  end_date: string
  notes: string | null
  own_expense_total: number
  own_income_total: number
  line_count: number
}

interface GetBudgetsSuccess {
  ok: true
  budgets: BudgetListItem[]
}

interface GetBudgetsError {
  ok: false
  error: string
}

type GetBudgetsResponse = GetBudgetsSuccess | GetBudgetsError

function getBudgetPeriod(startDate: string, endDate: string): { year: number, semester: BudgetSemester } {
  const startYear = Number(startDate.slice(0, 4))
  const startMonth = Number(startDate.slice(5, 7))
  const endMonth = Number(endDate.slice(5, 7))

  if (startMonth === 4 && endMonth === 9) {
    return { year: startYear, semester: 'summer' }
  }

  return { year: startYear, semester: 'winter' }
}

export default defineEventHandler(async (event): Promise<GetBudgetsResponse> => {
  const current = await requirePermission(event, 'budgets.view')
  if (!current.ok) return current

  const rows = await query<BudgetListRow[]>(`
    SELECT
      b.id,
      b.start_date,
      b.end_date,
      b.notes,
      IFNULL(SUM(l.expense_amount), 0) AS own_expense_total,
      IFNULL(SUM(l.income_amount), 0) AS own_income_total,
      COUNT(l.id) AS line_count
    FROM budgets b
    LEFT JOIN budget_cost_centre_lines l ON l.budget_id = b.id
    GROUP BY b.id, b.start_date, b.end_date, b.notes
    ORDER BY b.start_date DESC, b.id DESC
  `)

  const budgets = normalizeBigInt(rows).map((row: BudgetListRow) => {
    const period = getBudgetPeriod(row.start_date, row.end_date)
    const ownExpenseTotal = Number(row.own_expense_total ?? 0)
    const ownIncomeTotal = Number(row.own_income_total ?? 0)

    return {
      ...row,
      ...period,
      own_expense_total: ownExpenseTotal,
      own_income_total: ownIncomeTotal,
      own_saldo: Number((ownIncomeTotal - ownExpenseTotal).toFixed(2)),
    }
  }) as BudgetListItem[]

  return { ok: true, budgets }
})
