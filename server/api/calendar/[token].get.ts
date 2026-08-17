import { defineEventHandler, getRequestHost, getRouterParam, setHeader, setResponseStatus } from 'h3'
import { getUserByCalendarToken } from '~/server/utils/calendarToken'
import { query } from '~/server/utils/db'
import { loadEventRelations } from '~/server/utils/events'
import { normalizeShiftTypeKey } from '~/server/utils/eventShifts'
import { buildIcsFeed, type IcsFeedEvent, type IcsFeedShift, type IcsFeedTaskDeadline } from '~/server/utils/icsFeed'

interface EventRow {
  id: number
  name: string
  starts_at: string
  ends_at: string
  location: string | null
  expected_guests: number | null
}

interface ShiftRow {
  id: number
  event_id: number
  event_name: string
  name: string
  description: string | null
  event_location: string | null
  starts_at: string
  ends_at: string
}

interface ShiftTypeDescriptionRow {
  event_id: number
  name_key: string
  description: string
}

interface TaskDeadlineRow {
  id: number
  event_name: string
  title: string
  deadline: string
  status: 'open' | 'in_progress' | 'done'
}

interface TaskAssigneeRow {
  task_id: number
  name: string
}

const TASK_STATUS_LABELS: Record<TaskDeadlineRow['status'], string> = {
  open: 'Offen',
  in_progress: 'In Bearbeitung',
  done: 'Erledigt',
}

function buildEventDescription(row: EventRow, memberOrganizers: string[], subdivisionOrganizers: string[]): string {
  const lines: string[] = []

  if (row.expected_guests != null) lines.push(`Erwartete Gäste: ${row.expected_guests}`)

  const organizers = [...memberOrganizers, ...subdivisionOrganizers]
  if (organizers.length) lines.push(`Organisiert von: ${organizers.join(', ')}`)

  return lines.join('\n')
}

function buildShiftDescription(typeDescription: string, shiftDescription: string): string {
  const parts: string[] = []

  if (typeDescription) parts.push(typeDescription)
  if (shiftDescription) parts.push(shiftDescription)

  return parts.join('\n\n')
}

function buildTaskDescription(status: TaskDeadlineRow['status'], members: string[], subdivisions: string[]): string {
  const lines: string[] = [`Status: ${TASK_STATUS_LABELS[status]}`]

  if (members.length) lines.push(`Zugewiesen an: ${members.join(', ')}`)
  if (subdivisions.length) lines.push(`Abteilung(en): ${subdivisions.join(', ')}`)

  return lines.join('\n')
}

// Token-authenticated route, deliberately isolated from the cookie-based
// guards in server/utils/api/guards.ts — calendar apps can't send cookies.
export default defineEventHandler(async (event) => {
  const rawParam = getRouterParam(event, 'token') ?? ''
  const token = rawParam.replace(/\.ics$/i, '')

  if (!token) {
    setResponseStatus(event, 404)
    return 'Not found'
  }

  const user = await getUserByCalendarToken(token)
  if (!user) {
    setResponseStatus(event, 404)
    return 'Not found'
  }

  const memberRows = await query<{ id: number }[]>(
    `SELECT id FROM members WHERE account = ? LIMIT 1`,
    [user.id],
  )
  const memberId = memberRows[0] ? Number(memberRows[0].id) : null

  const eventRows = await query<EventRow[]>(
    `SELECT id, name, starts_at, ends_at, location, expected_guests
     FROM events
     ORDER BY starts_at`,
  )

  const eventRelations = await loadEventRelations(eventRows.map(row => Number(row.id)))

  let shiftRows: ShiftRow[] = []
  let taskRows: TaskDeadlineRow[] = []
  let taskMemberRows: TaskAssigneeRow[] = []
  let taskSubdivisionRows: TaskAssigneeRow[] = []

  if (memberId) {
    shiftRows = await query<ShiftRow[]>(
      `SELECT s.id, s.event_id, e.name AS event_name, s.name, s.description, e.location AS event_location, s.starts_at, s.ends_at
       FROM event_shift_slots s
       JOIN event_shift_members esm ON esm.shift_id = s.id
       JOIN events e ON e.id = s.event_id
       WHERE esm.member_id = ?
       ORDER BY s.starts_at`,
      [memberId],
    )

    taskRows = await query<TaskDeadlineRow[]>(
      `SELECT t.id, e.name AS event_name, t.title, t.deadline, t.status
       FROM event_tasks t
       JOIN events e ON e.id = t.event_id
       WHERE t.deadline IS NOT NULL
         AND (
           t.id IN (SELECT task_id FROM event_task_members WHERE member_id = ?)
           OR t.id IN (
             SELECT task_id FROM event_task_subdivisions
             WHERE subdivision_id IN (SELECT subdivision_id FROM subdivision_members WHERE member_id = ?)
           )
         )
       GROUP BY t.id
       ORDER BY t.deadline`,
      [memberId, memberId],
    )

    if (taskRows.length) {
      const taskIds = taskRows.map(row => Number(row.id))

      taskMemberRows = await query<TaskAssigneeRow[]>(
        `SELECT etm.task_id, CONCAT(m.first_name, ' ', m.last_name) AS name
         FROM event_task_members etm
         JOIN members m ON m.id = etm.member_id
         WHERE etm.task_id IN (${taskIds.map(() => '?').join(',')})
         ORDER BY m.first_name, m.last_name`,
        taskIds,
      )

      taskSubdivisionRows = await query<TaskAssigneeRow[]>(
        `SELECT ets.task_id, s.name AS name
         FROM event_task_subdivisions ets
         JOIN subdivisions s ON s.id = ets.subdivision_id
         WHERE ets.task_id IN (${taskIds.map(() => '?').join(',')})
         ORDER BY s.name`,
        taskIds,
      )
    }
  }

  let shiftTypeDescriptionRows: ShiftTypeDescriptionRow[] = []
  const shiftEventIds = Array.from(new Set(shiftRows.map(row => Number(row.event_id))))

  if (shiftEventIds.length) {
    shiftTypeDescriptionRows = await query<ShiftTypeDescriptionRow[]>(
      `SELECT event_id, name_key, description
       FROM event_shift_type_descriptions
       WHERE event_id IN (${shiftEventIds.map(() => '?').join(',')})`,
      shiftEventIds,
    )
  }

  const shiftTypeDescriptionByKey = new Map<string, string>()
  for (const row of shiftTypeDescriptionRows) {
    shiftTypeDescriptionByKey.set(`${Number(row.event_id)}::${row.name_key}`, String(row.description))
  }

  const taskMembersById = new Map<number, string[]>()
  for (const row of taskMemberRows) {
    const taskId = Number(row.task_id)
    taskMembersById.set(taskId, [...(taskMembersById.get(taskId) ?? []), String(row.name)])
  }

  const taskSubdivisionsById = new Map<number, string[]>()
  for (const row of taskSubdivisionRows) {
    const taskId = Number(row.task_id)
    taskSubdivisionsById.set(taskId, [...(taskSubdivisionsById.get(taskId) ?? []), String(row.name)])
  }

  const host = getRequestHost(event) || 'fsi-buchhaltung.local'

  const icsEvents: IcsFeedEvent[] = eventRows.map(row => ({
    id: Number(row.id),
    name: String(row.name),
    starts_at: String(row.starts_at),
    ends_at: String(row.ends_at),
    location: row.location != null ? String(row.location) : null,
    description: buildEventDescription(
      row,
      (eventRelations.memberOrganizers.get(Number(row.id)) ?? []).map(organizer => organizer.full_name),
      (eventRelations.subdivisionOrganizers.get(Number(row.id)) ?? []).map(organizer => organizer.name),
    ),
  }))

  const icsShifts: IcsFeedShift[] = shiftRows.map(row => ({
    id: Number(row.id),
    eventName: String(row.event_name),
    name: String(row.name),
    description: buildShiftDescription(
      shiftTypeDescriptionByKey.get(`${Number(row.event_id)}::${normalizeShiftTypeKey(row.name)}`) ?? '',
      row.description != null ? String(row.description) : '',
    ),
    location: row.event_location != null ? String(row.event_location) : null,
    starts_at: String(row.starts_at),
    ends_at: String(row.ends_at),
  }))

  const icsTasks: IcsFeedTaskDeadline[] = taskRows.map(row => ({
    id: Number(row.id),
    eventName: String(row.event_name),
    title: String(row.title),
    deadline: String(row.deadline),
    description: buildTaskDescription(
      row.status,
      taskMembersById.get(Number(row.id)) ?? [],
      taskSubdivisionsById.get(Number(row.id)) ?? [],
    ),
  }))

  const ics = buildIcsFeed(icsEvents, icsShifts, icsTasks, 'FSi Kalender', host)

  setHeader(event, 'Content-Type', 'text/calendar; charset=utf-8')
  setHeader(event, 'Content-Disposition', 'inline; filename="fsi-kalender.ics"')
  setHeader(event, 'Cache-Control', 'private, max-age=300')

  return ics
})
