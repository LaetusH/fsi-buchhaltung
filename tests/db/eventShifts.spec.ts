import { beforeEach, describe, expect, it } from 'vitest'
import {
  addSelfToShift,
  loadEventShiftSlots,
  removeSelfFromShift,
  replaceEventShiftSlots,
  validateShiftMembers,
} from '~/server/utils/eventShifts'
import { withAuditTransaction } from '~/server/utils/db'
import { countRows, resetDatabase } from '../helpers/db'
import { createEvent, createMember, createUser, resetFixtureCounter } from '../helpers/fixtures'

function memberIdsOf(slot: { members: Array<{ id: number }> } | undefined) {
  return (slot?.members ?? []).map(member => member.id).sort((a, b) => a - b)
}

describe('event shift slots', () => {
  let actorId: number
  let eventId: number
  let otherEventId: number

  beforeEach(async () => {
    await resetDatabase()
    resetFixtureCounter()
    actorId = (await createUser()).id
    eventId = await createEvent({ name: 'Sommerfest' })
    otherEventId = await createEvent({ name: 'Winterfest' })
  })

  function slot(overrides: Record<string, any> = {}) {
    return {
      name: 'Theke',
      description: '',
      starts_at: '2026-06-01 18:00:00',
      ends_at: '2026-06-01 20:00:00',
      required_people: 2,
      member_ids: [] as number[],
      ...overrides,
    }
  }

  async function replace(slots: any[], targetEvent = eventId) {
    return withAuditTransaction({ id: actorId }, conn => replaceEventShiftSlots({
      eventId: targetEvent,
      slots,
      conn,
      actingUserId: actorId,
    }))
  }

  it('inserts new slots', async () => {
    expect(await replace([slot(), slot({ name: 'Aufbau' })])).toBeNull()

    const stored = await loadEventShiftSlots(eventId)
    expect(stored.map(entry => entry.name).sort()).toEqual(['Aufbau', 'Theke'])
  })

  it('deletes slots that are no longer in the payload', async () => {
    await replace([slot(), slot({ name: 'Aufbau' })])
    const stored = await loadEventShiftSlots(eventId)
    const keep = stored.find(entry => entry.name === 'Theke')!

    await replace([slot({ id: keep.id })])

    const after = await loadEventShiftSlots(eventId)
    expect(after.map(entry => entry.name)).toEqual(['Theke'])
  })

  it('updates a slot in place, keeping its id', async () => {
    await replace([slot()])
    const [stored] = await loadEventShiftSlots(eventId)

    await replace([slot({ id: stored!.id, name: 'Theke spät', required_people: 4 })])

    const after = await loadEventShiftSlots(eventId)
    expect(after).toHaveLength(1)
    expect(after[0]!.id).toBe(stored!.id)
    expect(after[0]!.name).toBe('Theke spät')
    expect(after[0]!.required_people).toBe(4)
  })

  // Ownership check: passing another event's slot id must be refused outright, not
  // silently move the slot between events.
  it('refuses a slot id belonging to another event', async () => {
    await replace([slot()], otherEventId)
    const [foreign] = await loadEventShiftSlots(otherEventId)

    const error = await replace([slot({ id: foreign!.id })])

    expect(error).toBe('At least one shift does not belong to this event')
    expect(await loadEventShiftSlots(eventId)).toHaveLength(0)
    expect(await loadEventShiftSlots(otherEventId)).toHaveLength(1)
  })

  it('refuses a roster containing a member that does not exist', async () => {
    const error = await replace([slot({ member_ids: [999999] })])

    expect(error).toBe('At least one selected shift member does not exist')
    expect(await loadEventShiftSlots(eventId)).toHaveLength(0)
  })

  it('assigns and then diffs the roster', async () => {
    const first = await createMember()
    const second = await createMember()
    const third = await createMember()

    await replace([slot({ member_ids: [first, second] })])
    const [stored] = await loadEventShiftSlots(eventId)
    expect(memberIdsOf(stored)).toEqual([first, second].sort())

    // Drop `first`, keep `second`, add `third`.
    await replace([slot({ id: stored!.id, member_ids: [second, third] })])

    const [after] = await loadEventShiftSlots(eventId)
    expect(memberIdsOf(after)).toEqual([second, third].sort())
    expect(await countRows('event_shift_members', 'shift_id = ?', [stored!.id])).toBe(2)
  })

  it('removes the roster rows along with the slot', async () => {
    const member = await createMember()
    await replace([slot({ member_ids: [member] })])
    const [stored] = await loadEventShiftSlots(eventId)

    await replace([])

    expect(await loadEventShiftSlots(eventId)).toHaveLength(0)
    expect(await countRows('event_shift_members', 'shift_id = ?', [stored!.id])).toBe(0)
  })

  it('clears every slot for an empty payload', async () => {
    await replace([slot(), slot({ name: 'Abbau' })])
    expect(await replace([])).toBeNull()
    expect(await loadEventShiftSlots(eventId)).toHaveLength(0)
  })
})

describe('validateShiftMembers', () => {
  beforeEach(async () => {
    await resetDatabase()
    resetFixtureCounter()
  })

  it('accepts an empty list and existing members', async () => {
    const member = await createMember()
    await withAuditTransaction(null, async (conn) => {
      expect(await validateShiftMembers([], conn)).toBeNull()
      expect(await validateShiftMembers([member], conn)).toBeNull()
    })
  })

  it('rejects a list containing an unknown member', async () => {
    const member = await createMember()
    await withAuditTransaction(null, async (conn) => {
      expect(await validateShiftMembers([member, 999999], conn))
        .toBe('At least one selected shift member does not exist')
    })
  })
})

describe('self sign-up', () => {
  let eventId: number
  let otherEventId: number
  let shiftId: number
  let memberId: number

  beforeEach(async () => {
    await resetDatabase()
    resetFixtureCounter()

    eventId = await createEvent()
    otherEventId = await createEvent()
    memberId = await createMember()

    await withAuditTransaction(null, conn => replaceEventShiftSlots({
      eventId,
      slots: [{
        name: 'Theke',
        description: '',
        starts_at: '2026-06-01 18:00:00',
        ends_at: '2026-06-01 20:00:00',
        required_people: 2,
        member_ids: [],
      }],
      conn,
    }))

    shiftId = (await loadEventShiftSlots(eventId))[0]!.id
  })

  it('adds a member to a shift', async () => {
    await withAuditTransaction(null, async (conn) => {
      expect(await addSelfToShift({ eventId, shiftId, memberId, conn })).toBeNull()
    })

    expect(memberIdsOf((await loadEventShiftSlots(eventId))[0])).toEqual([memberId])
  })

  // Signing up twice must be a no-op, not a duplicate row or a unique-key crash.
  it('is idempotent', async () => {
    await withAuditTransaction(null, async (conn) => {
      await addSelfToShift({ eventId, shiftId, memberId, conn })
      expect(await addSelfToShift({ eventId, shiftId, memberId, conn })).toBeNull()
    })

    expect(await countRows('event_shift_members', 'shift_id = ? AND member_id = ?', [shiftId, memberId])).toBe(1)
  })

  it('refuses a shift that belongs to another event', async () => {
    await withAuditTransaction(null, async (conn) => {
      expect(await addSelfToShift({ eventId: otherEventId, shiftId, memberId, conn })).toBe('Shift not found')
    })

    expect(await countRows('event_shift_members', 'shift_id = ?', [shiftId])).toBe(0)
  })

  it('removes a member again', async () => {
    await withAuditTransaction(null, async (conn) => {
      await addSelfToShift({ eventId, shiftId, memberId, conn })
      expect(await removeSelfFromShift({ eventId, shiftId, memberId, conn })).toBeNull()
    })

    expect(memberIdsOf((await loadEventShiftSlots(eventId))[0])).toEqual([])
  })

  it('refuses to remove through the wrong event', async () => {
    await withAuditTransaction(null, async (conn) => {
      await addSelfToShift({ eventId, shiftId, memberId, conn })
      expect(await removeSelfFromShift({ eventId: otherEventId, shiftId, memberId, conn })).toBe('Shift not found')
    })

    expect(await countRows('event_shift_members', 'shift_id = ?', [shiftId])).toBe(1)
  })
})
