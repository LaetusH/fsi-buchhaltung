import { query } from '~/server/utils/db'
import { AUDIT_TABLES } from '~/server/utils/audit/registry'

const SETTING_KEYS = {
  retentionDays: 'audit_retention_days',
  financeRetentionDays: 'audit_retention_finance_days',
} as const

export const AUDIT_FINANCE_TABLES = Object.values(AUDIT_TABLES)
  .filter(def => def.domain === 'finances')
  .map(def => def.table)

export interface AuditRetentionSettings {
  retentionDays: number
  financeRetentionDays: number
}

export const DEFAULT_AUDIT_RETENTION_SETTINGS: AuditRetentionSettings = {
  retentionDays: 1095,
  financeRetentionDays: 0,
}

export function normalizeAuditRetentionSettings(input: Partial<AuditRetentionSettings> | null | undefined): AuditRetentionSettings {
  const retentionDays = Number(input?.retentionDays)
  const financeRetentionDays = Number(input?.financeRetentionDays)
  return {
    retentionDays: Number.isInteger(retentionDays) && retentionDays >= 0 ? retentionDays : DEFAULT_AUDIT_RETENTION_SETTINGS.retentionDays,
    financeRetentionDays: Number.isInteger(financeRetentionDays) && financeRetentionDays >= 0 ? financeRetentionDays : DEFAULT_AUDIT_RETENTION_SETTINGS.financeRetentionDays,
  }
}

export async function getAuditRetentionSettings(conn?: any): Promise<AuditRetentionSettings> {
  const rows = await query<Array<{ setting_key: string, setting_value: string | null }>>(
    `SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN (?, ?)`,
    [SETTING_KEYS.retentionDays, SETTING_KEYS.financeRetentionDays],
    conn,
  )
  const values = new Map(rows.map(row => [row.setting_key, row.setting_value]))
  return normalizeAuditRetentionSettings({
    retentionDays: Number(values.get(SETTING_KEYS.retentionDays)),
    financeRetentionDays: Number(values.get(SETTING_KEYS.financeRetentionDays)),
  })
}

export async function saveAuditRetentionSettings(settings: Partial<AuditRetentionSettings>, conn?: any) {
  const normalized = normalizeAuditRetentionSettings(settings)
  await query(
    `INSERT INTO app_settings (setting_key, setting_value)
     VALUES (?, ?), (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [
      SETTING_KEYS.retentionDays, String(normalized.retentionDays),
      SETTING_KEYS.financeRetentionDays, String(normalized.financeRetentionDays),
    ],
    conn,
  )
  return normalized
}

export async function getAuditLogStats() {
  const rows = await query<Array<{ row_count: number, size_bytes: number }>>(
    `SELECT TABLE_ROWS AS row_count, (DATA_LENGTH + INDEX_LENGTH) AS size_bytes
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'entity_versions'
     LIMIT 1`,
  )
  const row = rows[0]
  return {
    rowCount: Number(row?.row_count ?? 0),
    sizeBytes: Number(row?.size_bytes ?? 0),
  }
}
