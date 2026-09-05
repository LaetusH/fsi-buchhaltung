import { describe, expect, it } from 'vitest'
import { hasAllPermissions, hasPermission } from '~/server/utils/api/guards'
import type { User } from '~/types/user'

function user(permissions: string[]): User {
  return {
    id: 1,
    username: 'tester',
    roles: [],
    permissions,
    is_active: true,
    must_change_password: false,
  } as unknown as User
}

describe('hasPermission', () => {
  it('matches a single key', () => {
    expect(hasPermission(user(['receipts.view']), 'receipts.view')).toBe(true)
    expect(hasPermission(user(['receipts.view']), 'receipts.edit')).toBe(false)
  })

  it('treats a list of keys as "any of"', () => {
    expect(hasPermission(user(['invoices.view']), ['receipts.view', 'invoices.view'])).toBe(true)
    expect(hasPermission(user(['members.view']), ['receipts.view', 'invoices.view'])).toBe(false)
  })

  it('denies a null user', () => {
    expect(hasPermission(null, 'receipts.view')).toBe(false)
    expect(hasPermission(null, ['receipts.view'])).toBe(false)
  })

  it('denies an empty permission list', () => {
    expect(hasPermission(user(['receipts.view']), [])).toBe(false)
  })
})

describe('hasAllPermissions', () => {
  it('requires every key', () => {
    expect(hasAllPermissions(user(['receipts.view', 'invoices.view']), ['receipts.view', 'invoices.view'])).toBe(true)
    expect(hasAllPermissions(user(['receipts.view']), ['receipts.view', 'invoices.view'])).toBe(false)
  })

  it('denies a null user', () => {
    expect(hasAllPermissions(null, ['receipts.view'])).toBe(false)
  })

  it('is vacuously true for an empty list', () => {
    expect(hasAllPermissions(user([]), [])).toBe(true)
  })
})
