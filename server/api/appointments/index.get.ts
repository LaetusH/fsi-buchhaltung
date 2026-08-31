import { defineEventHandler, getQuery } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { buildAppointmentEntries, loadCalendarAppointments } from '~/server/utils/calendarSources'
import { resolveAppointmentViewer } from '~/server/utils/appointments/visibility'
import { formatWallClock, parseWallClock } from '~/server/utils/appointments/recurrence'
import type { AppointmentSeries, AppointmentTypeRow, CalendarEntry } from '~/types/appointment'

interface GetAppointmentsSuccess {
  ok: true
  /** Expanded occurrences of every visible appointment in the window. */
  entries: CalendarEntry[]
  /** The raw series behind those occurrences, for the editor. */
  series: AppointmentSeries[]
  appointmentTypes: AppointmentTypeRow[]
}

interface GetAppointmentsError {
  ok: false
  error: string
}

export type GetAppointmentsResponse = GetAppointmentsSuccess | GetAppointmentsError

export default defineEventHandler(async (event): Promise<GetAppointmentsResponse> => {
  const current = await requirePermission(event, 'calendar.view')
  if (!current.ok) return current

  const params = getQuery(event)
  const from = parseWallClock(typeof params.from === 'string' ? boundary(params.from, '00:00:00') : null)
  const to = parseWallClock(typeof params.to === 'string' ? boundary(params.to, '23:59:59') : null)
  if (!from || !to || to.getTime() < from.getTime()) return { ok: false, error: 'Ungültiger Zeitraum.' }

  const requestedTypes = normalizeTypeFilter(params.types)

  const viewer = await resolveAppointmentViewer(current.user)
  const source = await loadCalendarAppointments(viewer, { from: formatWallClock(from), to: formatWallClock(to) })

  const entries = buildAppointmentEntries(source, current.user)
    .filter(entry => !requestedTypes || (entry.typeId != null && requestedTypes.includes(entry.typeId)))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  return {
    ok: true,
    entries,
    series: source.series,
    appointmentTypes: Array.from(source.typesById.values())
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
  }
})

function boundary(value: string, fallbackTime: string): string {
  return value.length <= 10 ? `${value} ${fallbackTime}` : value
}

/** Returns null when no filter was requested — an empty list would mean "show nothing". */
function normalizeTypeFilter(value: unknown): number[] | null {
  const raw = Array.isArray(value) ? value : typeof value === 'string' && value ? value.split(',') : null
  if (!raw) return null

  const ids = raw.map(entry => Number(entry)).filter(entry => Number.isInteger(entry) && entry > 0)
  return ids.length ? ids : null
}
