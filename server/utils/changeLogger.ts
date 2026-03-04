import mariadb from 'mariadb'
import { query } from '~/server/utils/db'

interface ChangeLogInput {
  entityType: string
  entityId: number
  subEntityType: string | null
  subEntityId: number | null
  field: string
  oldValue: any
  newValue: any
  userId: number
}

interface MysqlError extends Error {
  code?: string
}

interface LogChangeSuccess {
  ok: true
}

interface LogChangeError {
  ok: false
  error: string
}

type LogChangeResponse = LogChangeSuccess | LogChangeError

function normalize(value: any) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value.trim()
  return value
}

export async function logChange({
  entityType,
  entityId,
  subEntityType,
  subEntityId,
  field,
  oldValue,
  newValue,
  userId,
}: ChangeLogInput, 
conn?: mariadb.PoolConnection): Promise<LogChangeResponse> {
  if (normalize(oldValue) === normalize(newValue)) return { ok: false, error: 'Old and new value are the same' }

  try {
    await query(
      `INSERT INTO entity_change_logs
      (entity_type, entity_id, sub_entity_type, sub_entity_id, field_name, old_value, new_value, changed_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entityType,
        entityId,
        subEntityType,
        subEntityId,
        field,
        oldValue ?? null,
        newValue ?? null,
        userId,
      ],
      conn
    )
    return { ok: true }
  } catch (err) {
    const error = err as MysqlError
    return { ok: false, error: error.code ?? 'DB_ERROR' }
  }
}