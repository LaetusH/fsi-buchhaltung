/**
 * Recurrence expansion for appointments ("Termine").
 *
 * Deliberately free of any DB access so that every consumer — the calendar API, the ICS feed, the
 * reminder sweep and the dashboard widget — expands series through exactly the same code and can
 * never drift apart.
 *
 * All timestamps are the association's local wall clock in 'YYYY-MM-DD HH:mm:ss' form, the same
 * convention every DATETIME column in this app follows (see server/utils/notifications/enqueue.ts).
 * Arithmetic runs through `Date` in the UTC frame purely as a calendar calculator; no timezone
 * conversion ever happens.
 */

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly'
export type RecurrenceMonthlyMode = 'day_of_month' | 'weekday_of_month'

export interface AppointmentRecurrenceRow {
  id: number
  title: string
  agenda?: string | null
  location?: string | null
  starts_at: string
  ends_at: string
  all_day?: number | boolean
  recurrence_freq: RecurrenceFreq | null
  recurrence_interval?: number | null
  recurrence_weekdays?: string | null
  recurrence_monthly_mode?: RecurrenceMonthlyMode | null
  recurrence_until?: string | null
  recurrence_count?: number | null
  status?: 'active' | 'cancelled'
}

export interface OccurrenceOverrideRow {
  appointment_id?: number
  occurrence_date: string
  is_cancelled?: number | boolean
  title?: string | null
  agenda?: string | null
  location?: string | null
  starts_at?: string | null
  ends_at?: string | null
}

export interface AppointmentOccurrence {
  appointmentId: number
  /** The original, un-moved start computed from the rule — the occurrence's identity everywhere. */
  occurrenceDate: string
  /** Effective start with any override applied. */
  startsAt: string
  endsAt: string
  title: string
  agenda: string | null
  location: string | null
  isCancelled: boolean
  isOverridden: boolean
}

export interface ExpandWindow {
  from: string
  to: string
}

export interface ExpandOptions {
  includeCancelled?: boolean
  maxOccurrences?: number
}

export const WEEKDAY_CODES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const
export type WeekdayCode = typeof WEEKDAY_CODES[number]

/** Longest displacement an override is assumed to apply; the generation window is padded by it. */
const OVERRIDE_PADDING_DAYS = 31
const DAY_MS = 86400000
const MAX_WINDOW_DAYS = 366 * 2
const DEFAULT_MAX_OCCURRENCES = 500
/** Guards against pathological scans (a daily series that started decades ago). */
const MAX_SCANNED_DATES = 20000

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

/** Parses 'YYYY-MM-DD[ HH:mm[:ss]]' into a Date in the UTC frame. Returns null when unparsable. */
export function parseWallClock(value: string | null | undefined): Date | null {
  if (!value) return null
  const match = String(value).trim().replace('T', ' ').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ ](\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (!match) return null

  const [, year, month, day, hours, minutes, seconds] = match
  return new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours ?? '0'),
    Number(minutes ?? '0'),
    Number(seconds ?? '0'),
  ))
}

export function formatWallClock(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
    + ` ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`
}

export function formatWallClockDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
}

/** Monday-based weekday index (0 = Monday) matching WEEKDAY_CODES. */
function weekdayIndex(date: Date): number {
  return (date.getUTCDay() + 6) % 7
}

export function parseWeekdays(value: string | null | undefined): number[] {
  if (!value) return []
  const indices = String(value)
    .split(',')
    .map(part => WEEKDAY_CODES.indexOf(part.trim().toUpperCase() as WeekdayCode))
    .filter(index => index >= 0)
  return Array.from(new Set(indices)).sort((a, b) => a - b)
}

export function formatWeekdays(indices: number[]): string {
  return Array.from(new Set(indices))
    .filter(index => index >= 0 && index < 7)
    .sort((a, b) => a - b)
    .map(index => WEEKDAY_CODES[index])
    .join(',')
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

/** Same clock time, `months` calendar months later. Returns null when that day doesn't exist. */
function addMonthsStrict(date: Date, months: number): Date | null {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + months
  const day = date.getUTCDate()

  const candidate = new Date(Date.UTC(
    year, month, day,
    date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(),
  ))

  // "am 31." in a 30-day month is skipped, not clamped.
  if (candidate.getUTCDate() !== day) return null
  return candidate
}

/** The date of the `nth` (1-based) `weekday` in the month of `reference`, or null when absent. */
function nthWeekdayOfMonth(reference: Date, monthOffset: number, nth: number, weekday: number, template: Date): Date | null {
  const first = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + monthOffset, 1))
  const offsetToWeekday = (weekday - weekdayIndex(first) + 7) % 7
  const day = 1 + offsetToWeekday + (nth - 1) * 7

  const candidate = new Date(Date.UTC(
    first.getUTCFullYear(), first.getUTCMonth(), day,
    template.getUTCHours(), template.getUTCMinutes(), template.getUTCSeconds(),
  ))

  if (candidate.getUTCMonth() !== first.getUTCMonth()) return null
  return candidate
}

/**
 * The scheduled (original) start dates of a series, in ascending order. Cancelled occurrences are
 * still produced here: `recurrence_count` counts scheduled dates, not surviving ones.
 */
function generateScheduledDates(
  appointment: AppointmentRecurrenceRow,
  seriesStart: Date,
  horizon: Date,
): Date[] {
  const freq = appointment.recurrence_freq
  if (!freq) return [seriesStart]

  const interval = Math.max(1, Number(appointment.recurrence_interval ?? 1) || 1)
  const countLimit = appointment.recurrence_count != null && Number(appointment.recurrence_count) > 0
    ? Number(appointment.recurrence_count)
    : null
  const untilDate = appointment.recurrence_until ? parseWallClock(`${String(appointment.recurrence_until).slice(0, 10)} 23:59:59`) : null

  const dates: Date[] = []
  let scanned = 0

  const push = (date: Date): boolean => {
    // `until` and `count` bound the series itself; the horizon only bounds this expansion.
    if (untilDate && date.getTime() > untilDate.getTime()) return false
    dates.push(date)
    return !(countLimit != null && dates.length >= countLimit)
  }

  if (freq === 'daily') {
    for (let index = 0; ; index += 1) {
      if (++scanned > MAX_SCANNED_DATES) break
      const date = addDays(seriesStart, index * interval)
      if (date.getTime() > horizon.getTime()) break
      if (!push(date)) break
    }
    return dates
  }

  if (freq === 'weekly') {
    const weekdays = parseWeekdays(appointment.recurrence_weekdays)
    const selected = weekdays.length ? weekdays : [weekdayIndex(seriesStart)]
    // Monday of the series' first week — every further week is measured from here.
    const weekStart = addDays(seriesStart, -weekdayIndex(seriesStart))

    outer: for (let week = 0; ; week += 1) {
      if (++scanned > MAX_SCANNED_DATES) break
      const base = addDays(weekStart, week * interval * 7)
      if (base.getTime() > horizon.getTime() + 7 * DAY_MS) break

      for (const weekday of selected) {
        const date = addDays(base, weekday)
        // Days before the series start in its first week are not occurrences.
        if (date.getTime() < seriesStart.getTime()) continue
        if (date.getTime() > horizon.getTime()) break outer
        if (!push(date)) break outer
      }
    }
    return dates
  }

  const mode: RecurrenceMonthlyMode = appointment.recurrence_monthly_mode ?? 'day_of_month'
  const nth = Math.ceil(seriesStart.getUTCDate() / 7)
  const weekday = weekdayIndex(seriesStart)

  for (let index = 0; ; index += 1) {
    if (++scanned > MAX_SCANNED_DATES) break

    const date = mode === 'day_of_month'
      ? addMonthsStrict(seriesStart, index * interval)
      : nthWeekdayOfMonth(seriesStart, index * interval, nth, weekday, seriesStart)

    // A month without a 31st / without a 5th Tuesday is skipped, but the scan continues.
    if (!date) {
      const probe = new Date(Date.UTC(seriesStart.getUTCFullYear(), seriesStart.getUTCMonth() + index * interval, 1))
      if (probe.getTime() > horizon.getTime()) break
      continue
    }

    if (date.getTime() > horizon.getTime()) break
    if (date.getTime() < seriesStart.getTime()) continue
    if (!push(date)) break
  }

  return dates
}

/**
 * Expands one appointment into its occurrences inside `window`, with per-occurrence overrides
 * applied. An override that moves an occurrence *into* the window makes it appear, one that moves
 * it *out of* the window drops it — hence the padded generation window.
 */
export function expandOccurrences(
  appointment: AppointmentRecurrenceRow,
  overrides: OccurrenceOverrideRow[],
  window: ExpandWindow,
  options: ExpandOptions = {},
): AppointmentOccurrence[] {
  const seriesStart = parseWallClock(appointment.starts_at)
  const seriesEnd = parseWallClock(appointment.ends_at)
  const windowFrom = parseWallClock(window.from)
  let windowTo = parseWallClock(window.to)
  if (!seriesStart || !windowFrom || !windowTo) return []

  // Open-ended series must always resolve to a finite result.
  if (windowTo.getTime() - windowFrom.getTime() > MAX_WINDOW_DAYS * DAY_MS) {
    windowTo = addDays(windowFrom, MAX_WINDOW_DAYS)
  }

  const durationMs = seriesEnd ? Math.max(0, seriesEnd.getTime() - seriesStart.getTime()) : 0
  const maxOccurrences = Math.max(1, options.maxOccurrences ?? DEFAULT_MAX_OCCURRENCES)

  const overrideByDate = new Map<string, OccurrenceOverrideRow>()
  for (const override of overrides) {
    const key = parseWallClock(override.occurrence_date)
    if (key) overrideByDate.set(formatWallClock(key), override)
  }

  const horizon = addDays(windowTo, OVERRIDE_PADDING_DAYS)
  const paddedFrom = addDays(windowFrom, -OVERRIDE_PADDING_DAYS).getTime()
  const scheduled = generateScheduledDates(appointment, seriesStart, horizon)

  const occurrences: AppointmentOccurrence[] = []

  for (const date of scheduled) {
    const occurrenceDate = formatWallClock(date)
    const override = overrideByDate.get(occurrenceDate)

    // Cheap pre-filter; an overridden occurrence may still be displaced into the window.
    if (!override && date.getTime() + durationMs < paddedFrom) continue

    // A whole-appointment cancellation (appointment.status) cancels every occurrence, same as a
    // per-occurrence override does for just one date.
    const isCancelled = Boolean(override?.is_cancelled) || appointment.status === 'cancelled'
    if (isCancelled && !options.includeCancelled) continue

    const overriddenStart = override?.starts_at ? parseWallClock(override.starts_at) : null
    const effectiveStart = overriddenStart ?? date
    const overriddenEnd = override?.ends_at ? parseWallClock(override.ends_at) : null
    const effectiveEnd = overriddenEnd ?? new Date(effectiveStart.getTime() + durationMs)

    // Overlap rather than start-only, so a multi-day or all-day occurrence that straddles a window
    // edge still renders in the month/week grid it reaches into.
    if (effectiveEnd.getTime() < windowFrom.getTime()) continue
    if (effectiveStart.getTime() > windowTo.getTime()) continue

    occurrences.push({
      appointmentId: Number(appointment.id),
      occurrenceDate,
      startsAt: formatWallClock(effectiveStart),
      endsAt: formatWallClock(effectiveEnd),
      title: override?.title ?? appointment.title,
      agenda: override?.agenda ?? appointment.agenda ?? null,
      location: override?.location ?? appointment.location ?? null,
      isCancelled,
      isOverridden: Boolean(override),
    })

    if (occurrences.length >= maxOccurrences) break
  }

  occurrences.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  return occurrences
}

/**
 * Every scheduled occurrence date of a series, ignoring the window — used when a series' start or
 * rule changes and orphaned overrides/responses have to be identified.
 */
export function listScheduledOccurrenceDates(appointment: AppointmentRecurrenceRow, horizonDays = MAX_WINDOW_DAYS * 2): string[] {
  const seriesStart = parseWallClock(appointment.starts_at)
  if (!seriesStart) return []

  const horizon = addDays(seriesStart, horizonDays)
  return generateScheduledDates(appointment, seriesStart, horizon).map(formatWallClock)
}

/** True when the series has no recurrence rule, i.e. it is a single appointment. */
export function isSingleAppointment(appointment: Pick<AppointmentRecurrenceRow, 'recurrence_freq'>): boolean {
  return !appointment.recurrence_freq
}
