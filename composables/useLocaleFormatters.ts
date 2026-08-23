import { useI18n } from '~/composables/useI18n'

export function useLocaleFormatters() {
  const { locale } = useI18n()

  function formatCurrency(value: number, options?: Intl.NumberFormatOptions) {
    return new Intl.NumberFormat(locale.value, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(value)
  }

  function parseUtcDate(value: string): Date {
    // DB returns bare strings like "2025-06-21 14:30:45" with no timezone marker.
    // Treat them as UTC (matching the pool's timezone: 'UTC' setting).
    if (!/[Z+\-]\d{2}:?\d{2}$/.test(value) && !value.endsWith('Z')) {
      const withT = value.replace(' ', 'T')
      // Date-only strings ("YYYY-MM-DD"): append explicit midnight UTC
      return new Date(withT.includes('T') ? withT + 'Z' : withT + 'T00:00:00Z')
    }
    return new Date(value)
  }

  function formatDate(value?: string | null) {
    if (!value) return ''
    return parseUtcDate(value).toLocaleDateString(locale.value, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Berlin',
    })
  }

  function formatDateTime(value?: string | null) {
    if (!value) return ''
    return parseUtcDate(value).toLocaleString(locale.value, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Berlin',
    })
  }

  function formatTime(value?: string | null) {
    if (!value) return ''
    return parseUtcDate(value).toLocaleTimeString(locale.value, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Berlin',
    })
  }

  // "YYYY-MM-DD" of the instant as seen in Berlin. Grouping by a raw UTC slice would put changes
  // made shortly after midnight local time under the previous day's heading.
  function berlinDayKey(value?: string | null) {
    if (!value) return ''
    return parseUtcDate(value).toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })
  }

  /** "Montag, 23.08.2026" — for day headings in chronological lists. */
  function formatDayHeading(value?: string | null) {
    if (!value) return ''
    const date = parseUtcDate(value)
    const weekday = date.toLocaleDateString(locale.value, { weekday: 'long', timeZone: 'Europe/Berlin' })
    return `${weekday}, ${formatDate(value)}`
  }

  /** "vor 5 Minuten" / "jetzt" — locale-aware, no extra i18n keys needed. */
  function formatRelativeTime(value?: string | null) {
    if (!value) return ''
    const diffMs = parseUtcDate(value).getTime() - Date.now()
    const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' })
    const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
      ['year', 31536000000],
      ['month', 2592000000],
      ['week', 604800000],
      ['day', 86400000],
      ['hour', 3600000],
      ['minute', 60000],
    ]
    for (const [unit, ms] of units) {
      if (Math.abs(diffMs) >= ms) return rtf.format(Math.round(diffMs / ms), unit)
    }
    // numeric: 'auto' renders 0 seconds as "jetzt" / "now" rather than "in 0 seconds".
    return rtf.format(Math.round(diffMs / 1000), 'second')
  }

  // For DATETIME columns that store Berlin-local time (e.g. event starts_at/ends_at):
  // pure string reformat, no timezone conversion needed.
  function formatLocalDate(value?: string | null) {
    if (!value) return ''
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!m) return ''
    return `${m[3]}.${m[2]}.${m[1]}`
  }

  function formatLocalDateTime(value?: string | null) {
    if (!value) return ''
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2})/)
    if (!m) return ''
    return `${m[3]}.${m[2]}.${m[1]}, ${m[4]}:${m[5]}`
  }

  return {
    formatCurrency,
    formatDate,
    formatDateTime,
    formatTime,
    berlinDayKey,
    formatDayHeading,
    formatRelativeTime,
    formatLocalDate,
    formatLocalDateTime,
  }
}
