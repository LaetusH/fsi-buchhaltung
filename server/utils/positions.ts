import type mariadb from 'mariadb'
import { logFieldChanges } from '~/server/utils/api/audit'
import { query } from '~/server/utils/db'
import { logChange } from '~/server/utils/changeLogger'
import { getMemberLabels } from '~/server/utils/subdivisions'

interface NamedRow {
  id: number
  label: string
}

export interface PositionAssignmentRow {
  id: number
  member_id: number
  position_id: number
  since: string
  until: string | null
}

export interface PositionAssignmentInput {
  id?: number
  member_id: number
  position_id: number
  since: string
  until: string | null
}

interface SyncPositionAssignmentsOptions {
  scope: 'member' | 'position'
  ownerId: number
  existingAssignments: PositionAssignmentRow[]
  incomingAssignments: PositionAssignmentInput[]
  userId: number
  conn: mariadb.PoolConnection
}

export function normalizePositionAssignments(
  value: unknown,
  fixed: Partial<Pick<PositionAssignmentInput, 'member_id' | 'position_id'>> = {},
) {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) return null

  const normalized: PositionAssignmentInput[] = []

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue

    const source = entry as Record<string, unknown>
    const id = Number(source.id)
    const memberId = Number(source.member_id ?? fixed.member_id ?? 0)
    const positionId = Number(source.position_id ?? fixed.position_id ?? 0)
    const since = String(source.since || '').trim()
    const untilValue = source.until
    const until = untilValue ? String(untilValue).trim() : null

    if (!memberId || !positionId || !since) continue

    normalized.push({
      id: Number.isInteger(id) && id > 0 ? id : undefined,
      member_id: memberId,
      position_id: positionId,
      since,
      until: until || null,
    })
  }

  return normalized
}

export async function getPositionLabels(
  positionIds: number[],
  conn: mariadb.PoolConnection,
) {
  if (!positionIds.length) return new Map<number, string>()

  const rows = await query<NamedRow[]>(
    `SELECT id, TRIM(CONCAT(code, ' - ', name)) AS label
     FROM positions
     WHERE id IN (${positionIds.map(() => '?').join(',')})`,
    positionIds,
    conn,
  )

  return new Map(rows.map(row => [Number(row.id), String(row.label)]))
}

function assignmentSummary(
  scope: SyncPositionAssignmentsOptions['scope'],
  assignment: PositionAssignmentInput | PositionAssignmentRow,
  memberLabels: Map<number, string>,
  positionLabels: Map<number, string>,
) {
  const baseLabel = scope === 'member'
    ? (positionLabels.get(assignment.position_id) ?? String(assignment.position_id))
    : (memberLabels.get(assignment.member_id) ?? String(assignment.member_id))
  const until = assignment.until || '-'

  return `${baseLabel} (${assignment.since} - ${until})`
}

export async function syncPositionAssignments({
  scope,
  ownerId,
  existingAssignments,
  incomingAssignments,
  userId,
  conn,
}: SyncPositionAssignmentsOptions) {
  const memberIds = Array.from(new Set([
    ...existingAssignments.map(assignment => Number(assignment.member_id)),
    ...incomingAssignments.map(assignment => Number(assignment.member_id)),
  ]))
  const positionIds = Array.from(new Set([
    ...existingAssignments.map(assignment => Number(assignment.position_id)),
    ...incomingAssignments.map(assignment => Number(assignment.position_id)),
  ]))

  const [memberLabels, positionLabels] = await Promise.all([
    getMemberLabels(memberIds, conn),
    getPositionLabels(positionIds, conn),
  ])

  if (memberLabels.size !== memberIds.length) {
    return { ok: false as const, error: 'One or more selected members do not exist' }
  }

  if (positionLabels.size !== positionIds.length) {
    return { ok: false as const, error: 'One or more selected positions do not exist' }
  }

  const entityType = scope
  const addField = scope === 'member' ? 'position_added' : 'member_added'
  const removeField = scope === 'member' ? 'position_removed' : 'member_removed'
  const memberDiffFields: readonly (keyof PositionAssignmentInput)[] = ['position_id', 'since', 'until']
  const positionDiffFields: readonly (keyof PositionAssignmentInput)[] = ['member_id', 'since', 'until']
  const diffFields = scope === 'member' ? memberDiffFields : positionDiffFields

  const existingById = new Map(existingAssignments.map(assignment => [assignment.id, assignment]))
  const retainedIds = new Set<number>()

  for (const incoming of incomingAssignments) {
    if (!incoming.id || !existingById.has(incoming.id)) continue

    const existing = existingById.get(incoming.id)!
    retainedIds.add(existing.id)

    await logFieldChanges({
      entityType,
      entityId: ownerId,
      subEntityType: 'position_assignment',
      subEntityId: existing.id,
      fields: diffFields,
      previous: existing,
      next: incoming,
      userId,
      conn,
      transformOldValue: {
        member_id: value => memberLabels.get(Number(value)) ?? value,
        position_id: value => positionLabels.get(Number(value)) ?? value,
      },
      transformNewValue: {
        member_id: value => memberLabels.get(Number(value)) ?? value,
        position_id: value => positionLabels.get(Number(value)) ?? value,
      },
    })

    await query(
      `UPDATE member_positions
       SET member_id = ?, position_id = ?, since = ?, until = ?
       WHERE id = ?`,
      [incoming.member_id, incoming.position_id, incoming.since, incoming.until || null, existing.id],
      conn,
    )
  }

  for (const existing of existingAssignments) {
    if (retainedIds.has(existing.id)) continue

    await logChange({
      entityType,
      entityId: ownerId,
      subEntityType: 'position_assignment',
      subEntityId: existing.id,
      field: removeField,
      oldValue: assignmentSummary(scope, existing, memberLabels, positionLabels),
      newValue: null,
      userId,
    }, conn)

    await query(
      `DELETE FROM member_positions
       WHERE id = ?`,
      [existing.id],
      conn,
    )
  }

  for (const incoming of incomingAssignments) {
    if (incoming.id && existingById.has(incoming.id)) continue

    const res = await query<{ insertId: number }>(
      `INSERT INTO member_positions (member_id, position_id, since, until)
       VALUES (?, ?, ?, ?)`,
      [incoming.member_id, incoming.position_id, incoming.since, incoming.until || null],
      conn,
    )

    await logChange({
      entityType,
      entityId: ownerId,
      subEntityType: 'position_assignment',
      subEntityId: Number(res.insertId),
      field: addField,
      oldValue: null,
      newValue: assignmentSummary(scope, incoming, memberLabels, positionLabels),
      userId,
    }, conn)
  }

  return { ok: true as const }
}
