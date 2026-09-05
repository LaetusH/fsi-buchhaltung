import { describe, expect, it } from 'vitest'
import {
  normalizeEventShiftSlots,
  normalizeEventShiftTemplates,
  normalizeEventShiftTypeDescriptions,
  normalizeShiftTypeKey,
} from '~/server/utils/eventShifts'

function slot(overrides: Record<string, any> = {}) {
  return {
    name: 'Theke',
    description: 'Getränke ausgeben',
    starts_at: '2026-06-01T18:00',
    ends_at: '2026-06-01T20:00',
    required_people: 2,
    member_ids: [1, 2],
    ...overrides,
  }
}

describe('normalizeEventShiftSlots', () => {
  it('normalises a valid slot to the DB datetime format', () => {
    const result = normalizeEventShiftSlots([slot()])

    expect(result).toEqual([{
      name: 'Theke',
      description: 'Getränke ausgeben',
      starts_at: '2026-06-01 18:00:00',
      ends_at: '2026-06-01 20:00:00',
      required_people: 2,
      member_ids: [1, 2],
    }])
  })

  it('accepts the camelCase and legacy field spellings', () => {
    const result = normalizeEventShiftSlots([{
      name: 'Aufbau',
      startTime: '2026-06-01 08:00:00',
      endTime: '2026-06-01 10:00',
      requiredPeople: 1,
      memberIds: [3],
    }])

    expect(result?.[0]).toMatchObject({ starts_at: '2026-06-01 08:00:00', required_people: 1, member_ids: [3] })
  })

  it('keeps an id when one is supplied and omits it otherwise', () => {
    expect(normalizeEventShiftSlots([slot({ id: 42 })])?.[0]).toHaveProperty('id', 42)
    expect(normalizeEventShiftSlots([slot()])?.[0]).not.toHaveProperty('id')
    expect(normalizeEventShiftSlots([slot({ id: null })])?.[0]).not.toHaveProperty('id')
  })

  it('returns null for a non-array input', () => {
    expect(normalizeEventShiftSlots(null)).toBeNull()
    expect(normalizeEventShiftSlots({})).toBeNull()
  })

  it.each([
    ['a blank name', { name: '   ' }],
    ['a malformed start', { starts_at: '01.06.2026 18:00' }],
    ['an impossible date', { starts_at: '2026-02-30T18:00' }],
    ['an out-of-range hour', { starts_at: '2026-06-01T25:00' }],
    ['an end before the start', { starts_at: '2026-06-01T20:00', ends_at: '2026-06-01T18:00' }],
    ['a zero-length slot', { starts_at: '2026-06-01T18:00', ends_at: '2026-06-01T18:00' }],
    ['zero required people', { required_people: 0 }],
    ['fractional required people', { required_people: 1.5 }],
    ['a non-array member list', { member_ids: 'all' }],
    ['a duplicate member', { member_ids: [1, 1] }],
    ['a non-positive member id', { member_ids: [0] }],
    ['an invalid id', { id: -1 }],
  ])('rejects the whole batch for a slot with %s', (_label, overrides) => {
    expect(normalizeEventShiftSlots([slot(overrides)])).toBeNull()
  })

  it('rejects the whole batch when any slot is invalid', () => {
    expect(normalizeEventShiftSlots([slot(), slot({ name: '' })])).toBeNull()
  })

  it('accepts an empty roster', () => {
    expect(normalizeEventShiftSlots([slot({ member_ids: [] })])?.[0]?.member_ids).toEqual([])
    expect(normalizeEventShiftSlots([])).toEqual([])
  })
})

describe('normalizeEventShiftTemplates', () => {
  it('trims the text fields', () => {
    expect(normalizeEventShiftTemplates([{ name: '  Theke  ', description: '  Text  ', required_people: 2 }]))
      .toEqual([{ name: 'Theke', description: 'Text', required_people: 2 }])
  })

  it('defaults a missing description to an empty string', () => {
    expect(normalizeEventShiftTemplates([{ name: 'Theke', required_people: 1 }])?.[0]?.description).toBe('')
  })

  it.each([
    ['a blank name', { name: '  ', required_people: 1 }],
    ['no required people', { name: 'Theke' }],
    ['zero required people', { name: 'Theke', required_people: 0 }],
  ])('rejects a template with %s', (_label, entry) => {
    expect(normalizeEventShiftTemplates([entry])).toBeNull()
  })

  it('returns null for a non-array input', () => {
    expect(normalizeEventShiftTemplates('templates')).toBeNull()
  })
})

describe('normalizeShiftTypeKey', () => {
  // Shift-type descriptions are keyed by the lowercased name, so two slots named "Theke"
  // and "theke" must share one description.
  it('lowercases and trims', () => {
    expect(normalizeShiftTypeKey('  Theke  ')).toBe('theke')
    expect(normalizeShiftTypeKey('THEKE')).toBe(normalizeShiftTypeKey('theke'))
  })
})

describe('normalizeEventShiftTypeDescriptions', () => {
  it('normalises keys and trims values', () => {
    expect(normalizeEventShiftTypeDescriptions({ '  Theke ': '  Text  ', 'AUFBAU': 'Mehr' }))
      .toEqual({ theke: 'Text', aufbau: 'Mehr' })
  })

  it('rejects a blank key', () => {
    expect(normalizeEventShiftTypeDescriptions({ '   ': 'Text' })).toBeNull()
  })

  it.each([[null], [undefined], [[]], ['x']])('rejects %s', (value) => {
    expect(normalizeEventShiftTypeDescriptions(value)).toBeNull()
  })
})
