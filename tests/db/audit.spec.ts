import { beforeEach, describe, expect, it } from 'vitest'
import { query, withAuditTransaction, withTransaction } from '~/server/utils/db'
import { auditRowsFor, auditState, resetDatabase } from '../helpers/db'
import { createEvent, createMember, createUser, resetFixtureCounter } from '../helpers/fixtures'

describe('audit trail', () => {
  beforeEach(async () => {
    await resetDatabase()
    resetFixtureCounter()
  })

  it('records an insert with the acting user', async () => {
    const actor = await createUser({ username: 'auditor' })

    const eventId = await withAuditTransaction(actor, async (conn) => {
      const result = await query<any>(
        'INSERT INTO events (name, starts_at, ends_at) VALUES (?, ?, ?)',
        ['Sommerfest', '2026-06-01 18:00:00', '2026-06-01 23:00:00'],
        conn,
      )
      return Number(result.insertId)
    })

    const rows = await auditRowsFor('events', eventId)

    expect(rows).toHaveLength(1)
    expect(rows[0]!.operation).toBe('insert')
    expect(Number(rows[0]!.changed_by)).toBe(actor.id)
    expect(rows[0]!.changed_by_username).toBe('auditor')
    expect(auditState(rows[0]!).name).toBe('Sommerfest')
  })

  it('records an update with the new row state', async () => {
    const actor = await createUser()
    const eventId = await createEvent({ name: 'Alt' })

    await withAuditTransaction(actor, async (conn) => {
      await query('UPDATE events SET name = ? WHERE id = ?', ['Neu', eventId], conn)
    })

    const rows = await auditRowsFor('events', eventId)
    const update = rows.find(row => row.operation === 'update')

    expect(update, 'no update row was written').toBeTruthy()
    expect(auditState(update!).name).toBe('Neu')
    expect(Number(update!.changed_by)).toBe(actor.id)
  })

  it('records a delete with the row as it was', async () => {
    const actor = await createUser()
    const eventId = await createEvent({ name: 'Wird gelöscht' })

    await withAuditTransaction(actor, async (conn) => {
      await query('DELETE FROM events WHERE id = ?', [eventId], conn)
    })

    const remove = (await auditRowsFor('events', eventId)).find(row => row.operation === 'delete')

    expect(remove, 'no delete row was written').toBeTruthy()
    expect(auditState(remove!).name).toBe('Wird gelöscht')
  })

  // The AFTER UPDATE trigger compares the old and new row and skips writing when nothing
  // it tracks changed, so a no-op save does not pollute the history.
  it('writes nothing for an update that changes no value', async () => {
    const actor = await createUser()
    const eventId = await createEvent({ name: 'Unverändert' })
    const before = (await auditRowsFor('events', eventId)).length

    await withAuditTransaction(actor, async (conn) => {
      await query('UPDATE events SET name = ? WHERE id = ?', ['Unverändert', eventId], conn)
    })

    expect((await auditRowsFor('events', eventId)).length).toBe(before)
  })

  it('leaves the actor empty for a plain transaction', async () => {
    const eventId = await withTransaction(async (conn) => {
      const result = await query<any>(
        'INSERT INTO events (name, starts_at, ends_at) VALUES (?, ?, ?)',
        ['Ohne Akteur', '2026-06-01 18:00:00', '2026-06-01 23:00:00'],
        conn,
      )
      return Number(result.insertId)
    })

    const rows = await auditRowsFor('events', eventId)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.changed_by).toBeNull()
  })

  // One user action spanning several tables must be recoverable as one change group.
  it('shares a change group id across every write in one transaction', async () => {
    const actor = await createUser()

    const { eventId, memberId } = await withAuditTransaction(actor, async (conn) => {
      const event = await query<any>(
        'INSERT INTO events (name, starts_at, ends_at) VALUES (?, ?, ?)',
        ['Gruppiert', '2026-06-01 18:00:00', '2026-06-01 23:00:00'],
        conn,
      )
      const subject = await query<any>('INSERT INTO subjects (name) VALUES (?)', ['Informatik'], conn)
      const member = await query<any>(
        `INSERT INTO members
          (last_name, first_name, birthdate, street, street_number, postal_code, city, subject,
           phone, email, status, applied_at, joined_at)
         VALUES ('Muster', 'Anna', '2000-01-01', 'Str.', '1', '12345', 'Stadt', ?, '0', 'a@test.invalid',
                 'active', '2024-01-01', '2024-01-01')`,
        [Number(subject.insertId)],
        conn,
      )
      return { eventId: Number(event.insertId), memberId: Number(member.insertId) }
    })

    const eventRow = (await auditRowsFor('events', eventId))[0]!
    const memberRow = (await auditRowsFor('members', memberId))[0]!

    expect(eventRow.change_group_id).toBeTruthy()
    expect(memberRow.change_group_id).toBe(eventRow.change_group_id)
  })

  it('gives separate transactions separate change groups', async () => {
    const actor = await createUser()
    const first = await withAuditTransaction(actor, async conn => createEventIn(conn))
    const second = await withAuditTransaction(actor, async conn => createEventIn(conn))

    const firstGroup = (await auditRowsFor('events', first))[0]!.change_group_id
    const secondGroup = (await auditRowsFor('events', second))[0]!.change_group_id

    expect(firstGroup).not.toBe(secondGroup)
  })

  it('records nothing when the transaction rolls back', async () => {
    const actor = await createUser()
    let eventId = 0

    await expect(withAuditTransaction(actor, async (conn) => {
      eventId = await createEventIn(conn)
      throw new Error('boom')
    })).rejects.toThrow('boom')

    expect(await auditRowsFor('events', eventId)).toHaveLength(0)
    expect(await query<any[]>('SELECT id FROM events WHERE id = ?', [eventId])).toHaveLength(0)
  })

  // The actor is a connection-scoped session variable. If it survived into the next use of
  // a pooled connection, unattributed writes would be misattributed to the previous actor.
  it('does not leak the actor into a later plain transaction', async () => {
    const actor = await createUser()
    await withAuditTransaction(actor, async conn => createEventIn(conn))

    const laterId = await withTransaction(async conn => createEventIn(conn))

    expect((await auditRowsFor('events', laterId))[0]!.changed_by).toBeNull()
  })

  it('audits a child table under its own record key', async () => {
    const actor = await createUser()
    const memberId = await createMember()

    const positionId = await withAuditTransaction(actor, async (conn) => {
      const position = await query<any>(
        'INSERT INTO positions (code, name) VALUES (?, ?)',
        ['kassenwart', 'Kassenwart'],
        conn,
      )
      const assignment = await query<any>(
        'INSERT INTO member_positions (member_id, position_id, since) VALUES (?, ?, ?)',
        [memberId, Number(position.insertId), '2026-01-01'],
        conn,
      )
      return Number(assignment.insertId)
    })

    const rows = await auditRowsFor('member_positions', positionId)

    expect(rows).toHaveLength(1)
    expect(Number(auditState(rows[0]!).member_id)).toBe(memberId)
  })
})

async function createEventIn(conn: any) {
  const result = await query<any>(
    'INSERT INTO events (name, starts_at, ends_at) VALUES (?, ?, ?)',
    [`Event ${Math.random()}`, '2026-06-01 18:00:00', '2026-06-01 23:00:00'],
    conn,
  )
  return Number(result.insertId)
}
