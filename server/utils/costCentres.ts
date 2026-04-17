import { query } from '~/server/utils/db'

interface CostCentreStateRow {
  id: number
  code: string
  name: string
  is_active: number
}

interface CostCentreSelectionInput {
  itemId?: number | null
  costCentreId: number
}

export async function validateCostCentreSelection(
  selections: CostCentreSelectionInput[],
  existingSelections: Iterable<CostCentreSelectionInput> = [],
  conn?: any,
) {
  const normalizedCostCentreIds = Array.from(new Set(
    selections
      .map(selection => Number(selection.costCentreId))
      .filter(value => Number.isInteger(value) && value > 0),
  ))

  if (!normalizedCostCentreIds.length) return null

  const rows = await query<CostCentreStateRow[]>(
    `SELECT id, code, name, is_active
     FROM cost_centres
     WHERE id IN (${normalizedCostCentreIds.map(() => '?').join(',')})`,
    normalizedCostCentreIds,
    conn,
  )

  if (rows.length !== normalizedCostCentreIds.length) {
    return 'One or more selected cost centres do not exist'
  }

  const existingCostCentreIdsByItemId = new Map(
    Array.from(existingSelections)
      .map(selection => ({
        itemId: Number(selection.itemId),
        costCentreId: Number(selection.costCentreId),
      }))
      .filter(selection => Number.isInteger(selection.itemId) && selection.itemId > 0 && Number.isInteger(selection.costCentreId) && selection.costCentreId > 0)
      .map(selection => [selection.itemId, selection.costCentreId] as const),
  )

  const rowsById = new Map(rows.map(row => [Number(row.id), row]))

  const disallowedCostCentre = selections.find((selection) => {
    const row = rowsById.get(Number(selection.costCentreId))
    if (!row || Boolean(row.is_active)) return false

    const existingCostCentreId = selection.itemId
      ? existingCostCentreIdsByItemId.get(Number(selection.itemId))
      : null

    return existingCostCentreId !== Number(row.id)
  })

  if (!disallowedCostCentre) return null

  const row = rowsById.get(Number(disallowedCostCentre.costCentreId))
  const label = row ? `${row.code} - ${row.name}` : `#${disallowedCostCentre.costCentreId}`
  return `${label}: inactive cost centres cannot be newly selected`
}

export async function validateSimpleCostCentreSelection(
  costCentreIds: number[],
  allowedExistingCostCentreIds: Iterable<number> = [],
  conn?: any,
) {
  return validateCostCentreSelection(
    costCentreIds.map(costCentreId => ({ costCentreId: Number(costCentreId) })),
    Array.from(allowedExistingCostCentreIds).map(costCentreId => ({
      itemId: Number(costCentreId),
      costCentreId: Number(costCentreId),
    })),
    conn,
  )
}
