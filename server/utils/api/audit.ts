import type mariadb from 'mariadb'
import { logChange } from '~/server/utils/changeLogger'

type ChangeValue = string | number | boolean | null | undefined

interface LogFieldChangesOptions<T extends Record<string, any>, K extends keyof T> {
  entityType: string
  entityId: number
  fields: readonly K[]
  previous: T
  next: Partial<Record<K, ChangeValue>> | T
  userId: number
  conn?: mariadb.PoolConnection
  subEntityType?: string | null
  subEntityId?: number | null
  equals?: Partial<Record<K, (left: T[K], right: ChangeValue) => boolean>>
  transformOldValue?: Partial<Record<K, (value: T[K]) => ChangeValue>>
  transformNewValue?: Partial<Record<K, (value: ChangeValue) => ChangeValue>>
}

function defaultEquals(left: ChangeValue, right: ChangeValue) {
  return String(left) === String(right)
}

export async function logFieldChanges<T extends Record<string, any>, K extends keyof T>({
  entityType,
  entityId,
  fields,
  previous,
  next,
  userId,
  conn,
  subEntityType = null,
  subEntityId = null,
  equals = {},
  transformOldValue = {},
  transformNewValue = {},
}: LogFieldChangesOptions<T, K>) {
  for (const field of fields) {
    const oldValue = previous[field]
    const newValue = next[field]
    const comparator = equals[field] ?? defaultEquals

    if (comparator(oldValue, newValue)) continue

    await logChange({
      entityType,
      entityId,
      subEntityType,
      subEntityId,
      field: String(field),
      oldValue: transformOldValue[field]?.(oldValue) ?? oldValue,
      newValue: transformNewValue[field]?.(newValue) ?? newValue,
      userId,
    }, conn)
  }
}

interface SyncScalarCollectionOptions<T extends string | number> {
  existing: T[]
  incoming: T[]
  onRemove: (value: T) => Promise<void>
  onAdd: (value: T) => Promise<void>
}

export async function syncScalarCollection<T extends string | number>({
  existing,
  incoming,
  onRemove,
  onAdd,
}: SyncScalarCollectionOptions<T>) {
  const existingSet = new Set(existing)
  const incomingSet = new Set(incoming)

  for (const value of existing) {
    if (!incomingSet.has(value)) {
      await onRemove(value)
    }
  }

  for (const value of incoming) {
    if (!existingSet.has(value)) {
      await onAdd(value)
    }
  }
}
