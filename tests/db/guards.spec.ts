import { beforeEach, describe, expect, it } from 'vitest'
import { requireAuth, requirePermission } from '~/server/utils/api/guards'
import { query } from '~/server/utils/db'
import { hmacToken } from '~/server/utils/auth'
import { resetDatabase } from '../helpers/db'
import { anonymousEvent, eventWithToken, signIn } from '../helpers/auth'
import { assignRole, createRole, resetFixtureCounter } from '../helpers/fixtures'

describe('requirePermission', () => {
  beforeEach(async () => {
    await resetDatabase()
    resetFixtureCounter()
  })

  it('allows a user holding the permission', async () => {
    const user = await signIn({ permissions: ['receipts.edit'] })
    const result = await requirePermission(user.event, 'receipts.edit')

    expect(result.ok).toBe(true)
    expect(result.ok && result.user.id).toBe(user.id)
  })

  it('denies a user without the permission', async () => {
    const user = await signIn({ permissions: ['receipts.view'] })
    const result = await requirePermission(user.event, 'receipts.edit')

    expect(result).toEqual({ ok: false, error: 'Not authorized' })
  })

  it('denies a caller with no session cookie', async () => {
    const result = await requirePermission(anonymousEvent(), 'receipts.view')
    expect(result).toEqual({ ok: false, error: 'Not authenticated' })
  })

  it('denies an unknown token', async () => {
    const result = await requirePermission(eventWithToken('not-a-real-token'), 'receipts.view')
    expect(result).toEqual({ ok: false, error: 'Not authenticated' })
  })

  it('denies a deactivated account and drops its session', async () => {
    const user = await signIn({ permissions: ['receipts.view'] })
    await query('UPDATE users SET is_active = 0 WHERE id = ?', [user.id])

    const result = await requirePermission(user.event, 'receipts.view')

    expect(result.ok).toBe(false)
    const sessions = await query<any[]>('SELECT id FROM sessions WHERE token_hash = ?', [hmacToken(user.token)])
    expect(sessions, 'the session of a deactivated user must be deleted').toHaveLength(0)
  })

  // A user who still has to set a new password must not be able to act, even with the
  // right permission — otherwise the forced password change is trivially bypassed.
  it('denies a user who must change their password', async () => {
    const user = await signIn({ permissions: ['receipts.edit'], mustChangePassword: true })

    expect(await requirePermission(user.event, 'receipts.edit'))
      .toEqual({ ok: false, error: 'Password change required' })
  })

  it('lets an endpoint opt out of the password-change block', async () => {
    const user = await signIn({ permissions: ['receipts.edit'], mustChangePassword: true })
    const result = await requirePermission(user.event, 'receipts.edit', { allowPasswordChangeRequired: true })

    expect(result.ok).toBe(true)
  })

  it('denies an expired session', async () => {
    const user = await signIn({ permissions: ['receipts.view'] })
    await query(
      'UPDATE sessions SET expires_at = ? WHERE token_hash = ?',
      ['2000-01-01 00:00:00', hmacToken(user.token)],
    )

    expect(await requirePermission(user.event, 'receipts.view'))
      .toEqual({ ok: false, error: 'Not authenticated' })
  })

  it('denies and drops a session that went idle past the inactivity window', async () => {
    const user = await signIn({ permissions: ['receipts.view'] })
    await query(
      'UPDATE sessions SET last_active_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY) WHERE token_hash = ?',
      [hmacToken(user.token)],
    )

    expect((await requirePermission(user.event, 'receipts.view')).ok).toBe(false)
    const sessions = await query<any[]>('SELECT id FROM sessions WHERE token_hash = ?', [hmacToken(user.token)])
    expect(sessions).toHaveLength(0)
  })

  it('accepts any one of a list of permissions', async () => {
    const user = await signIn({ permissions: ['invoices.view'] })

    expect((await requirePermission(user.event, ['receipts.view', 'invoices.view'])).ok).toBe(true)
    expect((await requirePermission(user.event, ['receipts.view', 'members.view'])).ok).toBe(false)
  })

  it('requires every permission with requireAll', async () => {
    const user = await signIn({ permissions: ['invoices.view'] })

    expect((await requirePermission(user.event, ['receipts.view', 'invoices.view'], { requireAll: true })).ok)
      .toBe(false)
  })

  // Permissions inherited through `implied` must satisfy a guard just like a direct grant:
  // receipts.edit implies receipts.view.
  it('honours an implied permission', async () => {
    const user = await signIn({ permissions: ['receipts.edit'] })
    expect((await requirePermission(user.event, 'receipts.view')).ok).toBe(true)
  })

  it('resolves permissions granted through a role', async () => {
    const user = await signIn()
    const role = await createRole({ permissions: ['budgets.edit'] })
    await assignRole(user.id, role)

    expect((await requirePermission(user.event, 'budgets.edit')).ok).toBe(true)
    // budgets.edit implies budgets.view, which in turn implies cost_centres.view.
    expect((await requirePermission(user.event, 'cost_centres.view')).ok).toBe(true)
  })

  it('refreshes last_active_at when touching is on and leaves it alone otherwise', async () => {
    const user = await signIn({ permissions: ['receipts.view'] })
    await query(
      'UPDATE sessions SET last_active_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 MINUTE) WHERE token_hash = ?',
      [hmacToken(user.token)],
    )

    const readLastActive = async () => {
      const rows = await query<any[]>('SELECT last_active_at FROM sessions WHERE token_hash = ?', [hmacToken(user.token)])
      return String(rows[0]!.last_active_at)
    }

    const stale = await readLastActive()

    await requirePermission(user.event, 'receipts.view', { touch: false })
    expect(await readLastActive()).toBe(stale)

    await requirePermission(user.event, 'receipts.view', { touch: true })
    expect(await readLastActive()).not.toBe(stale)
  })
})

describe('requireAuth', () => {
  beforeEach(async () => {
    await resetDatabase()
    resetFixtureCounter()
  })

  it('accepts any signed-in user regardless of permissions', async () => {
    const user = await signIn()
    const result = await requireAuth(user.event)

    expect(result.ok).toBe(true)
    expect(result.ok && result.user.permissions).toEqual([])
  })

  it('rejects an anonymous caller', async () => {
    expect(await requireAuth(anonymousEvent())).toEqual({ ok: false, error: 'Not authenticated' })
  })

  it('rejects a user who must change their password', async () => {
    const user = await signIn({ mustChangePassword: true })
    expect(await requireAuth(user.event)).toEqual({ ok: false, error: 'Password change required' })
  })
})
