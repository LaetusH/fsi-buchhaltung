export type AuditOperation = 'insert' | 'update' | 'delete'
export type AuditFieldKind = 'money' | 'date' | 'datetime' | 'bool' | 'text' | 'number' | 'reference' | 'json'

export interface AuditChangeField {
  column: string
  labelKey: string | null
  fallbackLabel: string
  kind: AuditFieldKind
  before: unknown | null
  after: unknown | null
  beforeLabel?: string | null
  afterLabel?: string | null
  redacted?: boolean
}

export interface AuditEntry {
  id: number
  table: string
  entityLabelKey: string
  domain: string
  recordKey: string
  primaryKey: Record<string, unknown>
  operation: AuditOperation
  description: string | null
  fields: AuditChangeField[]
  openPage: { page: string, meta: Record<string, unknown> } | null
  deletedSnapshot?: Record<string, unknown> | null
}

export interface AuditActorInfo {
  id: number | null
  username: string | null
  displayName: string | null
}

export interface AuditGroup {
  key: string
  grouped: boolean
  changedAt: string
  changedBy: AuditActorInfo
  entries: AuditEntry[]
}

export interface AuditFilters {
  from?: string
  to?: string
  userId?: number | 'system'
  tables?: string[]
  domains?: string[]
  operations?: AuditOperation[]
  search?: string
}

export interface AuditFilterOptions {
  domains: Array<{ key: string, tables: string[] }>
  tables: Array<{ table: string, labelKey: string, domain: string }>
  actors: Array<{ id: number | null, username: string | null }>
}

export interface AuditRetentionSettings {
  retentionDays: number
  financeRetentionDays: number
}
