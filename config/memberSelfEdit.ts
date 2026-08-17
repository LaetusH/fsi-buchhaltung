export const SELF_EDIT_ELIGIBLE_FIELDS = [
  'first_name',
  'last_name',
  'birthdate',
  'phone',
  'email',
  'street',
  'street_number',
  'postal_code',
  'city',
  'subject',
] as const

export type SelfEditFieldName = typeof SELF_EDIT_ELIGIBLE_FIELDS[number]

export type SelfEditFieldMode = 'locked' | 'direct' | 'approval'

export const SELF_EDIT_FIELD_MODES: SelfEditFieldMode[] = ['locked', 'direct', 'approval']

export function isSelfEditFieldName(value: unknown): value is SelfEditFieldName {
  return typeof value === 'string' && (SELF_EDIT_ELIGIBLE_FIELDS as readonly string[]).includes(value)
}

export function isSelfEditFieldMode(value: unknown): value is SelfEditFieldMode {
  return typeof value === 'string' && (SELF_EDIT_FIELD_MODES as string[]).includes(value)
}
