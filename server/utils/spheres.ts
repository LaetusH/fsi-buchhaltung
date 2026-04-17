import { query } from '~/server/utils/db'

interface SphereStateRow {
  id: number
  name: string
  is_active: number
}

interface SphereSelectionInput {
  itemId?: number | null
  sphereId: number
}

export async function validateSphereSelection(
  selections: SphereSelectionInput[],
  existingSelections: Iterable<SphereSelectionInput> = [],
  conn?: any,
) {
  const normalizedSphereIds = Array.from(new Set(
    selections
      .map(selection => Number(selection.sphereId))
      .filter(value => Number.isInteger(value) && value > 0),
  ))

  if (!normalizedSphereIds.length) return null

  const rows = await query<SphereStateRow[]>(
    `SELECT id, name, is_active
     FROM spheres
     WHERE id IN (${normalizedSphereIds.map(() => '?').join(',')})`,
    normalizedSphereIds,
    conn,
  )

  if (rows.length !== normalizedSphereIds.length) {
    return 'One or more selected spheres do not exist'
  }

  const existingSphereIdsByItemId = new Map(
    Array.from(existingSelections)
      .map(selection => ({
        itemId: Number(selection.itemId),
        sphereId: Number(selection.sphereId),
      }))
      .filter(selection => Number.isInteger(selection.itemId) && selection.itemId > 0 && Number.isInteger(selection.sphereId) && selection.sphereId > 0)
      .map(selection => [selection.itemId, selection.sphereId] as const),
  )

  const sphereRowsById = new Map(rows.map(row => [Number(row.id), row]))

  const disallowedSphere = selections.find((selection) => {
    const sphereRow = sphereRowsById.get(Number(selection.sphereId))
    if (!sphereRow || Boolean(sphereRow.is_active)) return false

    const existingSphereId = selection.itemId
      ? existingSphereIdsByItemId.get(Number(selection.itemId))
      : null

    return existingSphereId !== Number(sphereRow.id)
  })

  if (!disallowedSphere) return null

  const sphereRow = sphereRowsById.get(Number(disallowedSphere.sphereId))
  return `${sphereRow?.name || `#${disallowedSphere.sphereId}`}: inactive spheres cannot be newly selected`
}
