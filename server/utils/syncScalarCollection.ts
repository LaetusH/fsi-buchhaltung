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
