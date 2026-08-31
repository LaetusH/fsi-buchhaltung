import type { User } from '~/types/user'
import { hasPermission } from '~/server/utils/api/guards'
import { query } from '~/server/utils/db'
import type { DbConn } from '~/server/utils/notifications/types'

export interface AppointmentViewer {
  userId: number | null
  memberId: number | null
  canManage: boolean
}

/**
 * The one place that decides who may see an appointment. The calendar API, the ICS feed and the
 * notification recipient resolution all go through this so the three can never drift apart.
 *
 * An appointment is visible when any of these holds:
 *  - it is association-wide, or
 *  - the viewer belongs to one of its selected subdivisions, or
 *  - the viewer is explicitly invited, or
 *  - the viewer created it, or
 *  - the viewer holds `calendar.manage`.
 *
 */
export function buildVisibleAppointmentsFilter(
  viewer: AppointmentViewer,
  alias = 'a',
): { sql: string, params: unknown[] } {
  if (viewer.canManage) return { sql: '1 = 1', params: [] }

  const clauses = [`(
      NOT EXISTS (SELECT 1 FROM appointment_subdivisions ${alias}_asub WHERE ${alias}_asub.appointment_id = ${alias}.id)
      AND NOT EXISTS (SELECT 1 FROM appointment_members ${alias}_am WHERE ${alias}_am.appointment_id = ${alias}.id)
    )`]
  const params: unknown[] = []

  if (viewer.memberId != null) {
    clauses.push(`EXISTS (
        SELECT 1 FROM appointment_subdivisions asub
        JOIN subdivision_members asm ON asm.subdivision_id = asub.subdivision_id
        WHERE asub.appointment_id = ${alias}.id AND asm.member_id = ?
      )`)
    params.push(viewer.memberId)

    clauses.push(`EXISTS (
        SELECT 1 FROM appointment_members am
        WHERE am.appointment_id = ${alias}.id AND am.member_id = ?
      )`)
    params.push(viewer.memberId)
  }

  if (viewer.userId != null) {
    clauses.push(`${alias}.created_by = ?`)
    params.push(viewer.userId)
  }

  return { sql: `(${clauses.join(' OR ')})`, params }
}

export async function getMemberIdForUser(userId: number, conn?: DbConn): Promise<number | null> {
  const rows = await query<Array<{ id: number }>>(
    `SELECT id FROM members WHERE account = ? LIMIT 1`,
    [userId],
    conn,
  )
  return rows[0] ? Number(rows[0].id) : null
}

export async function resolveAppointmentViewer(user: User, conn?: DbConn): Promise<AppointmentViewer> {
  return {
    userId: Number(user.id),
    memberId: await getMemberIdForUser(Number(user.id), conn),
    canManage: hasPermission(user, 'calendar.manage'),
  }
}

/** Whether one specific appointment is visible to the viewer, using the very same filter. */
export async function isAppointmentVisible(appointmentId: number, viewer: AppointmentViewer, conn?: DbConn): Promise<boolean> {
  const filter = buildVisibleAppointmentsFilter(viewer)
  const rows = await query<Array<{ id: number }>>(
    `SELECT a.id FROM appointments a WHERE a.id = ? AND ${filter.sql} LIMIT 1`,
    [appointmentId, ...filter.params],
    conn,
  )
  return rows.length > 0
}

export interface AppointmentAudience {
  memberIds: number[]
  /** The creator's user id — always in the audience, even without a linked members row. */
  createdByUserId: number | null
}

/**
 * The inverse of `buildVisibleAppointmentsFilter`: everyone who may see one appointment. Lives next
 * to the filter on purpose — the notification recipients and the calendar's visibility must be
 * decided by the same three branches, and keeping them in one file is what stops them drifting.
 */
export async function loadAppointmentAudience(appointmentId: number, conn?: DbConn): Promise<AppointmentAudience> {
  const rows = await query<Array<{ created_by: number | null }>>(
    `SELECT created_by FROM appointments WHERE id = ? LIMIT 1`,
    [appointmentId],
    conn,
  )

  const appointment = rows[0]
  if (!appointment) return { memberIds: [], createdByUserId: null }

  const createdByUserId = appointment.created_by == null ? null : Number(appointment.created_by)

  // Both join tables contribute to the audience — an appointment can combine "everyone in these
  // subdivisions" with "these specific people" at once, matching `buildVisibleAppointmentsFilter`.
  const [subdivisionMembers, explicitMembers] = await Promise.all([
    query<Array<{ member_id: number }>>(
      `SELECT DISTINCT sm.member_id
       FROM subdivision_members sm
       JOIN appointment_subdivisions asub ON asub.subdivision_id = sm.subdivision_id
       WHERE asub.appointment_id = ?`,
      [appointmentId],
      conn,
    ),
    query<Array<{ member_id: number }>>(
      `SELECT member_id FROM appointment_members WHERE appointment_id = ?`,
      [appointmentId],
      conn,
    ),
  ])

  // No scope rows at all means this appointment was never narrowed down — association-wide.
  if (!subdivisionMembers.length && !explicitMembers.length) {
    const hasScopeRows = await query<Array<{ found: number }>>(
      `SELECT 1 AS found FROM appointment_subdivisions WHERE appointment_id = ?
       UNION ALL
       SELECT 1 FROM appointment_members WHERE appointment_id = ?
       LIMIT 1`,
      [appointmentId, appointmentId],
      conn,
    )
    if (!hasScopeRows.length) {
      const members = await query<Array<{ id: number }>>(
        `SELECT id FROM members WHERE status != 'left'`,
        [],
        conn,
      )
      return { memberIds: members.map(row => Number(row.id)), createdByUserId }
    }
  }

  const memberIds = Array.from(new Set([
    ...subdivisionMembers.map(row => Number(row.member_id)),
    ...explicitMembers.map(row => Number(row.member_id)),
  ]))
  return { memberIds, createdByUserId }
}
