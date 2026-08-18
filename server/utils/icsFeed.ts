const CRLF = '\r\n'

export interface IcsFeedEvent {
  id: number
  name: string
  starts_at: string
  ends_at: string
  location: string | null
  description: string
}

export interface IcsFeedShift {
  id: number
  eventName: string
  name: string
  description: string
  location: string | null
  starts_at: string
  ends_at: string
}

export interface IcsFeedTaskDeadline {
  id: number
  eventName: string
  title: string
  deadline: string
  description: string
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

// RFC 5545 line folding: no content line may exceed 75 octets; continuation
// lines start with a single space. Most calendar apps tolerate long lines,
// but Outlook does not, so this is not optional.
function foldLine(line: string): string {
  const maxBytes = 75
  let result = ''
  let chunkBytes = 0
  let isFirstChunk = true

  for (const char of line) {
    const charBytes = Buffer.byteLength(char, 'utf8')
    const limit = isFirstChunk ? maxBytes : maxBytes - 1

    if (chunkBytes + charBytes > limit) {
      result += `${CRLF} `
      chunkBytes = 0
      isFirstChunk = false
    }

    result += char
    chunkBytes += charBytes
  }

  return result
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatUtcTimestamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`
    + `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

// The schema stores naive DATETIME values with no timezone (treated as
// Europe/Berlin floating local time throughout the app, e.g. eventShifts.ts).
// Rather than hand-roll a Europe/Berlin VTIMEZONE/DST block, we emit floating
// local time (no TZID/UTC conversion) — calendar apps display it as-is,
// which matches how the rest of the app already shows these times.
function formatLocalDateTime(value: string): string {
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!match) return ''

  const [, year, month, day, hours, minutes, seconds] = match
  return `${year}${month}${day}T${hours}${minutes}${seconds ?? '00'}`
}

function formatAllDayDate(value: string): string {
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return ''

  const [, year, month, day] = match
  return `${year}${month}${day}`
}

export function buildIcsFeed(
  events: IcsFeedEvent[],
  shifts: IcsFeedShift[],
  tasks: IcsFeedTaskDeadline[],
  calendarName: string,
  host: string,
): string {
  const dtstamp = formatUtcTimestamp(new Date())
  const lines: string[] = []

  lines.push('BEGIN:VCALENDAR')
  lines.push('VERSION:2.0')
  lines.push('PRODID:-//FSi Portal//Calendar Feed//DE')
  lines.push('CALSCALE:GREGORIAN')
  lines.push('METHOD:PUBLISH')
  lines.push(`X-WR-CALNAME:${escapeIcsText(calendarName)}`)
  lines.push('REFRESH-INTERVAL;VALUE=DURATION:PT1H')
  lines.push('X-PUBLISHED-TTL:PT1H')

  for (const evt of events) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:event-${evt.id}@${host}`)
    lines.push(`DTSTAMP:${dtstamp}`)
    lines.push(`DTSTART:${formatLocalDateTime(evt.starts_at)}`)
    lines.push(`DTEND:${formatLocalDateTime(evt.ends_at)}`)
    lines.push(`SUMMARY:${escapeIcsText(evt.name)}`)
    if (evt.location) lines.push(`LOCATION:${escapeIcsText(evt.location)}`)
    if (evt.description) lines.push(`DESCRIPTION:${escapeIcsText(evt.description)}`)
    lines.push('END:VEVENT')
  }

  for (const shift of shifts) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:shift-${shift.id}@${host}`)
    lines.push(`DTSTAMP:${dtstamp}`)
    lines.push(`DTSTART:${formatLocalDateTime(shift.starts_at)}`)
    lines.push(`DTEND:${formatLocalDateTime(shift.ends_at)}`)
    lines.push(`SUMMARY:${escapeIcsText(`Schicht: ${shift.name} (${shift.eventName})`)}`)
    if (shift.location) lines.push(`LOCATION:${escapeIcsText(shift.location)}`)
    if (shift.description) lines.push(`DESCRIPTION:${escapeIcsText(shift.description)}`)
    lines.push('END:VEVENT')
  }

  for (const task of tasks) {
    const hasTime = /T\d{2}:\d{2}/.test(task.deadline)

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:task-${task.id}@${host}`)
    lines.push(`DTSTAMP:${dtstamp}`)
    if (hasTime) {
      lines.push(`DTSTART:${formatLocalDateTime(task.deadline)}`)
    } else {
      lines.push(`DTSTART;VALUE=DATE:${formatAllDayDate(task.deadline)}`)
    }
    lines.push(`SUMMARY:${escapeIcsText(`Frist: ${task.title} (${task.eventName})`)}`)
    if (task.description) lines.push(`DESCRIPTION:${escapeIcsText(task.description)}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  return lines.map(foldLine).join(CRLF) + CRLF
}
