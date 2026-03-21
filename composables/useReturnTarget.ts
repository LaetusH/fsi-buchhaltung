import { computed, isProxy, toRaw } from 'vue'
import type { PageName, PageTarget } from '~/types/page'
import { usePage } from '~/composables/usePage'

function isPlainObject(value: unknown): value is Record<string, any> {
  if (!value || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function normalizeValue<T>(value: T): T {
  if (value === null || value === undefined) return value

  const rawValue = isProxy(value) ? toRaw(value) : value

  if (Array.isArray(rawValue)) {
    return rawValue.map(item => normalizeValue(item)) as T
  }

  if (isPlainObject(rawValue)) {
    return Object.fromEntries(
      Object.entries(rawValue).map(([key, entry]) => [key, normalizeValue(entry)]),
    ) as T
  }

  return rawValue
}

function cloneValue<T>(value: T): T {
  if (value === null || value === undefined || typeof value !== 'object') return value

  const normalized = normalizeValue(value)

  try {
    if (typeof structuredClone === 'function') return structuredClone(normalized)
  } catch {
    // Fall back to JSON for simple page metadata if structured cloning fails.
  }

  return JSON.parse(JSON.stringify(normalized)) as T
}

function mergeMeta(
  base?: Record<string, any> | null,
  extra?: Record<string, any> | null,
) {
  const merged = {
    ...(cloneValue(base) ?? {}),
    ...(cloneValue(extra) ?? {}),
  }

  return Object.keys(merged).length ? merged : undefined
}

export function cloneReturnTarget(target?: PageTarget | null) {
  if (!target) return undefined

  return {
    page: target.page,
    meta: cloneValue(target.meta) ?? undefined,
  } satisfies PageTarget
}

export function buildReturnTarget(page: PageName, meta?: Record<string, any> | null) {
  const target: PageTarget = { page }
  if (meta && Object.keys(meta).length) target.meta = cloneValue(meta)
  return target
}

export function resolveReturnTarget(meta: Record<string, any> | null | undefined, defaultPage: PageName) {
  const explicitTarget = cloneReturnTarget(meta?.returnTarget as PageTarget | null | undefined)
  if (explicitTarget) return explicitTarget

  const legacyPage = meta?.returnTo as PageName | undefined
  if (legacyPage) return buildReturnTarget(legacyPage, meta?.returnToMeta as Record<string, any> | null | undefined)

  return buildReturnTarget(defaultPage)
}

export function useReturnTarget(defaultPage: PageName) {
  const { pageMeta, setPage } = usePage()

  const returnTarget = computed(() => resolveReturnTarget(pageMeta.value, defaultPage))

  function goToReturnTarget(extraMeta?: Record<string, any> | null, target?: PageTarget | null) {
    const resolvedTarget = cloneReturnTarget(target ?? returnTarget.value) ?? buildReturnTarget(defaultPage)
    const safeExtraMeta = isPlainObject(extraMeta) ? extraMeta : undefined
    setPage(resolvedTarget.page, mergeMeta(resolvedTarget.meta, safeExtraMeta))
  }

  function setPageWithReturnTarget(page: PageName, meta?: Record<string, any> | null, target?: PageTarget | null) {
    const resolvedTarget = cloneReturnTarget(target ?? returnTarget.value) ?? buildReturnTarget(defaultPage)
    const safeMeta = isPlainObject(meta) ? meta : undefined
    setPage(page, mergeMeta(safeMeta, { returnTarget: resolvedTarget }))
  }

  return {
    returnTarget,
    goToReturnTarget,
    setPageWithReturnTarget,
  }
}
