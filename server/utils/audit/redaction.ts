import { getAuditTableDefinition } from '~/server/utils/audit/registry'

const HARD_BLOCKLIST: Record<string, string[]> = {
  users: ['password_hash', 'calendar_token_hash'],
  notification_push_subscriptions: ['endpoint', 'p256dh', 'auth'],
  notification_deliveries: ['unsubscribe_token'],
}

// Deliberately narrow: this schema uses `_key` for plain identifiers (permission_key, setting_key,
// name_key, type_key, ...) that are not secrets, so `_key$` is NOT part of this pattern — false
// positives there would silently hide ordinary data as if it were sensitive. `must_change_password`
// is a boolean flag about password state, not a credential, so it's excluded from the `password`
// match; the real secret is `password_hash`, already covered by HARD_BLOCKLIST.
const SENSITIVE_NAME_PATTERN = /(?<!must_change_)password|_token$|_secret$/i

export function isRedactedColumn(table: string, column: string): boolean {
  if (HARD_BLOCKLIST[table]?.includes(column)) return true
  if (getAuditTableDefinition(table)?.redactedColumns?.includes(column)) return true
  return SENSITIVE_NAME_PATTERN.test(column)
}
