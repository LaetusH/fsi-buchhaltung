import type mariadb from 'mariadb'
import { query } from '~/server/utils/db'
import { logChange } from '~/server/utils/changeLogger'
import { syncScalarCollection } from '~/server/utils/api/audit'

interface NamedRow {
  id: number
  label: string
}

interface SyncSubdivisionAssignmentsOptions {
  existingIds: number[]
  nextIds: number[]
  getAssignment: (id: number) => {
    subdivisionId: number
    memberId: number
    memberLabel: string
  }
  userId: number
  conn: mariadb.PoolConnection
}

export function normalizeRelationIds(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null

  const normalized: number[] = []
  const seen = new Set<number>()

  for (const entry of value) {
    const id = Number(entry)
    if (!Number.isInteger(id) || id <= 0) return null
    if (seen.has(id)) continue
    seen.add(id)
    normalized.push(id)
  }

  return normalized
}

export async function getSubdivisionLabels(
  subdivisionIds: number[],
  conn: mariadb.PoolConnection,
) {
  if (!subdivisionIds.length) return new Map<number, string>()

  const rows = await query<NamedRow[]>(
    `SELECT id, TRIM(CONCAT(code, ' - ', name)) AS label
     FROM subdivisions
     WHERE id IN (${subdivisionIds.map(() => '?').join(',')})`,
    subdivisionIds,
    conn,
  )

  return new Map(rows.map(row => [Number(row.id), String(row.label)]))
}

export async function getMemberLabels(
  memberIds: number[],
  conn: mariadb.PoolConnection,
) {
  if (!memberIds.length) return new Map<number, string>()

  const rows = await query<NamedRow[]>(
    `SELECT id, TRIM(CONCAT(first_name, ' ', last_name)) AS label
     FROM members
     WHERE id IN (${memberIds.map(() => '?').join(',')})`,
    memberIds,
    conn,
  )

  return new Map(rows.map(row => [Number(row.id), String(row.label)]))
}

export async function syncSubdivisionAssignments(
  options: SyncSubdivisionAssignmentsOptions,
) {
  const { existingIds, nextIds, getAssignment, userId, conn } = options

  await syncScalarCollection({
    existing: existingIds,
    incoming: nextIds,
    onRemove: async (id) => {
      const { subdivisionId, memberId, memberLabel } = getAssignment(id)

      await logChange({
        entityType: 'subdivision',
        entityId: subdivisionId,
        subEntityType: 'member',
        subEntityId: memberId,
        field: 'member_removed',
        oldValue: memberLabel,
        newValue: null,
        userId,
      }, conn)

      await query(
        `DELETE FROM subdivision_members
         WHERE subdivision_id = ? AND member_id = ?`,
        [subdivisionId, memberId],
        conn,
      )
    },
    onAdd: async (id) => {
      const { subdivisionId, memberId, memberLabel } = getAssignment(id)

      await logChange({
        entityType: 'subdivision',
        entityId: subdivisionId,
        subEntityType: 'member',
        subEntityId: memberId,
        field: 'member_added',
        oldValue: null,
        newValue: memberLabel,
        userId,
      }, conn)

      await query(
        `INSERT INTO subdivision_members (subdivision_id, member_id, created_by)
         VALUES (?, ?, ?)`,
        [subdivisionId, memberId, userId],
        conn,
      )
    },
  })
}
