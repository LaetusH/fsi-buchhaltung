import { translate } from '~/composables/useI18n'

export type ChangeFieldKey = 'name' | 'start' | 'end' | 'location'

/** One field to compare for a `{changes}` notification variable — `from`/`to` should already be display-formatted (e.g. via `formatLocalDateTime`). */
export interface ChangedField {
  field: ChangeFieldKey
  from: string | null | undefined
  to: string | null | undefined
}

/**
 * Keeps only the fields whose formatted value actually differs. Call this at enqueue time (before
 * the field-change list is stored in the notification's `payload` JSON) so unrelated fields never
 * end up in the payload — the labels themselves are translated later, at render time, since only
 * then is the recipient's locale known (see `describeChangedFields` below).
 */
export function pickChangedFields(fields: ChangedField[]): ChangedField[] {
  return fields.filter(field => (field.from ?? '') !== (field.to ?? ''))
}

/**
 * Builds the human-readable `{changes}` value used by `shift.changed`/`event.changed` templates
 * (e.g. `notifications.types.shift.changed.body`), listing only the fields that actually differ
 * instead of a generic "something was updated" sentence. Field labels come from
 * `notifications.changeFields.*` so the text follows the recipient's locale like the rest of the
 * rendered notification, instead of being baked into a fixed language at enqueue time.
 */
export function describeChangedFields(locale: 'de' | 'en', fields: ChangedField[]): string {
  if (!fields.length) return translate(locale, 'notifications.changeFields.fallback')
  return fields
    .map(field => `${translate(locale, `notifications.changeFields.${field.field}`)}: ${field.from || '–'} → ${field.to || '–'}`)
    .join('; ')
}
