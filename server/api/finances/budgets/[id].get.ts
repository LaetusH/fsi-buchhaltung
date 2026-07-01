import { defineEventHandler } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { loadBudgetDetail } from '~/server/utils/budgets'
import type { BudgetDetail } from '~/types/budget'

interface GetBudgetSuccess {
  ok: true
  budget: BudgetDetail
}

interface GetBudgetError {
  ok: false
  error: string
}

export type GetBudgetResponse = GetBudgetSuccess | GetBudgetError

export default defineEventHandler(async (event): Promise<GetBudgetResponse> => {
  const current = await requirePermission(event, 'budgets.view')
  if (!current.ok) return current

  const budgetId = Number(event.context.params?.id)
  if (!Number.isInteger(budgetId) || budgetId <= 0) {
    return { ok: false, error: 'Invalid budget id' }
  }

  const budget = await loadBudgetDetail(budgetId)
  if (!budget) return { ok: false, error: 'Budget not found' }

  return { ok: true, budget }
})
