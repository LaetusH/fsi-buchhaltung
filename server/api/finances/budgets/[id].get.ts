import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { normalizeBigInt } from '~/server/utils/normalize'
import { requirePermission } from '~/server/utils/api/guards'
import type { BudgetCostCentreLine, BudgetDetail, BudgetSemester } from '~/types/budget'

interface BudgetRow {
  id: number
  start_date: string
  end_date: string
  notes: string | null
}

interface BudgetLineRow extends BudgetCostCentreLine {
  id: number
}

interface GetBudgetSuccess {
  ok: true
  budget: BudgetDetail
}

interface GetBudgetError {
  ok: false
  error: string
}

export type GetBudgetResponse = GetBudgetSuccess | GetBudgetError

function getBudgetPeriod(startDate: string, endDate: string): { year: number, semester: BudgetSemester } {
  const [startYear, startMonth] = startDate.split('-').map(Number)
  const [, endMonth] = endDate.split('-').map(Number)

  if (startMonth === 4 && endMonth === 9) {
    return { year: startYear, semester: 'summer' }
  }

  return { year: startYear, semester: 'winter' }
}

export default defineEventHandler(async (event): Promise<GetBudgetResponse> => {
  const current = await requirePermission(event, 'budgets.view')
  if (!current.ok) return current

  const budgetId = Number(event.context.params?.id)
  if (!Number.isInteger(budgetId) || budgetId <= 0) {
    return { ok: false, error: 'Invalid budget id' }
  }

  const budgetRows = await query<BudgetRow[]>(
    `SELECT id, start_date, end_date, notes
     FROM budgets
     WHERE id = ?
     LIMIT 1`,
    [budgetId],
  )

  if (!budgetRows.length) return { ok: false, error: 'Budget not found' }

  const lineRows = await query<BudgetLineRow[]>(
    `SELECT cost_centre_id, expense_amount, income_amount, notes, id
     FROM budget_cost_centre_lines
     WHERE budget_id = ?
     ORDER BY cost_centre_id ASC`,
    [budgetId],
  )

  const budgetRow = normalizeBigInt(budgetRows[0]) as BudgetRow
  const lines = normalizeBigInt(lineRows).map((row: BudgetLineRow) => ({
    cost_centre_id: row.cost_centre_id,
    expense_amount: Number(row.expense_amount),
    income_amount: Number(row.income_amount),
    notes: row.notes ?? null,
  })) as BudgetCostCentreLine[]
  const period = getBudgetPeriod(budgetRow.start_date, budgetRow.end_date)
  const ownExpenseTotal = lines.reduce((sum, line) => sum + Number(line.expense_amount || 0), 0)
  const ownIncomeTotal = lines.reduce((sum, line) => sum + Number(line.income_amount || 0), 0)

  return {
    ok: true,
    budget: {
      id: budgetRow.id,
      start_date: budgetRow.start_date,
      end_date: budgetRow.end_date,
      year: period.year,
      semester: period.semester,
      notes: budgetRow.notes ?? null,
      own_expense_total: Number(ownExpenseTotal.toFixed(2)),
      own_income_total: Number(ownIncomeTotal.toFixed(2)),
      own_saldo: Number((ownIncomeTotal - ownExpenseTotal).toFixed(2)),
      line_count: lines.length,
      lines,
    },
  }
})
