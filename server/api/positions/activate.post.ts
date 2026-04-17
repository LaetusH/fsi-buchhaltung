import { defineEventHandler, readBody } from 'h3'
import type { ActivateResponse } from '~/types/activate'
import { requirePermission } from '~/server/utils/api/guards'
import { toggleActiveRecord } from '~/server/utils/api/toggle'
import { query, withTransaction } from '~/server/utils/db'
import { logChange } from '~/server/utils/changeLogger'
import { logFieldChanges } from '~/server/utils/api/audit'
import { getMemberLabels } from '~/server/utils/subdivisions'

interface PositionActivateBody {
  id: number
  is_active: boolean
  assignment_until?: string | null
  delete_future_assignments?: boolean
}

interface PositionRow {
  id: number
  code: string
  name: string
  is_active: number
}

interface PositionAssignmentRow {
  id: number
  member_id: number
  since: string
  until: string | null
}

function isValidDate(value: string | null | undefined) {
  if (!value) return false
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function todayValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function assignmentSummary(memberLabel: string, assignment: PositionAssignmentRow) {
  return `${memberLabel} (${assignment.since} - ${assignment.until || '-'})`
}

export default defineEventHandler(async (event): Promise<ActivateResponse> => {
  const current = await requirePermission(event, 'settings.positions.manage')
  if (!current.ok) return current

  const {
    id,
    is_active,
    assignment_until,
    delete_future_assignments,
  } = await readBody<PositionActivateBody>(event)

  if (id === undefined || id === null || is_active === undefined || is_active === null) {
    return { ok: false, error: 'Missing fields' }
  }

  if (assignment_until !== undefined && assignment_until !== null && assignment_until !== '' && !isValidDate(assignment_until)) {
    return { ok: false, error: 'Invalid assignment end date' }
  }

  try {
    if (is_active) {
      return await toggleActiveRecord({
        table: 'positions',
        entityType: 'position',
        id,
        isActive: is_active,
        userId: current.user.id,
        notFoundMessage: 'No matching positions in database',
      })
    }

    return await withTransaction(async (conn) => {
      const existingRows = await query<PositionRow[]>(
        `SELECT id, code, name, is_active
         FROM positions
         WHERE id = ?
         LIMIT 1`,
        [id],
        conn,
      )
      const position = existingRows[0]
      if (!position) return { ok: false as const, error: 'No matching positions in database' }

      const nextActive = 0
      await logChange({
        entityType: 'position',
        entityId: id,
        subEntityType: null,
        subEntityId: null,
        field: 'is_active',
        oldValue: position.is_active,
        newValue: nextActive,
        userId: current.user.id,
      }, conn)

      await query(
        `UPDATE positions
         SET is_active = ?
         WHERE id = ?`,
        [nextActive, id],
        conn,
      )

      const assignments = await query<PositionAssignmentRow[]>(
        `SELECT id, member_id, since, until
         FROM member_positions
         WHERE position_id = ?`,
        [id],
        conn,
      )

      if (!assignments.length) return { ok: true as const }

      const memberIds = Array.from(new Set(assignments.map(assignment => Number(assignment.member_id))))
      const memberLabels = await getMemberLabels(memberIds, conn)
      const effectiveEndDate = assignment_until?.trim() || null
      const futureCutoff = effectiveEndDate || todayValue()

      if (effectiveEndDate) {
        const assignmentsToClose = assignments.filter(assignment => (
          assignment.since <= effectiveEndDate
          && (!assignment.until || assignment.until > effectiveEndDate)
        ))

        for (const assignment of assignmentsToClose) {
          await logFieldChanges({
            entityType: 'position',
            entityId: id,
            subEntityType: 'position_assignment',
            subEntityId: assignment.id,
            fields: ['until'],
            previous: assignment,
            next: {
              ...assignment,
              until: effectiveEndDate,
            },
            userId: current.user.id,
            conn,
          })

          await query(
            `UPDATE member_positions
             SET until = ?
             WHERE id = ?`,
            [effectiveEndDate, assignment.id],
            conn,
          )
        }
      }

      if (delete_future_assignments === true) {
        const assignmentsToDelete = assignments.filter(assignment => assignment.since > futureCutoff)

        for (const assignment of assignmentsToDelete) {
          const memberLabel = memberLabels.get(Number(assignment.member_id)) ?? `#${assignment.member_id}`
          await logChange({
            entityType: 'position',
            entityId: id,
            subEntityType: 'position_assignment',
            subEntityId: assignment.id,
            field: 'member_removed',
            oldValue: assignmentSummary(memberLabel, assignment),
            newValue: null,
            userId: current.user.id,
          }, conn)

          await query(
            `DELETE FROM member_positions
             WHERE id = ?`,
            [assignment.id],
            conn,
          )
        }
      }

      return { ok: true as const }
    })
  } catch (err: any) {
    return { ok: false, error: `An error occured while activating/deactivating the position: ${err}` }
  }
})
