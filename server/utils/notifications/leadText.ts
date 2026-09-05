import { translate } from '~/shared/i18n'

/**
 * Builds the human-readable `{lead_text}` value used by `*.reminder`/`shift.understaffed` templates
 * ("in 3 Tagen" / "in 3 days") from the raw lead time in minutes. Translated here — at render time,
 * once the recipient's locale is known — rather than baked into a fixed language when the reminder
 * is swept (see server/utils/notifications/reminders.ts).
 */
export function describeLeadText(locale: 'de' | 'en', minutes: number): string {
  if (minutes % 1440 === 0) {
    const days = minutes / 1440
    return days === 1 ? translate(locale, 'notifications.leadText.dayOne') : translate(locale, 'notifications.leadText.day', { count: days })
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60
    return hours === 1 ? translate(locale, 'notifications.leadText.hourOne') : translate(locale, 'notifications.leadText.hour', { count: hours })
  }
  return minutes === 1 ? translate(locale, 'notifications.leadText.minuteOne') : translate(locale, 'notifications.leadText.minute', { count: minutes })
}
