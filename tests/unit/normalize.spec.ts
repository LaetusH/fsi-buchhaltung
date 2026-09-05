import { describe, expect, it } from 'vitest'
import { normalizeBigInt } from '~/server/utils/normalize'

describe('normalizeBigInt', () => {
  it('converts a bare BigInt', () => {
    expect(normalizeBigInt(42n)).toBe(42)
  })

  it('converts BigInt fields inside a row object', () => {
    expect(normalizeBigInt({ id: 1n, name: 'Test', amount: 5 }))
      .toEqual({ id: 1, name: 'Test', amount: 5 })
  })

  it('converts BigInts across an array of rows', () => {
    expect(normalizeBigInt([{ id: 1n }, { id: 2n }])).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('passes null and undefined through', () => {
    expect(normalizeBigInt(null)).toBeNull()
    expect(normalizeBigInt(undefined)).toBeUndefined()
  })

  it('leaves primitives untouched', () => {
    expect(normalizeBigInt('text')).toBe('text')
    expect(normalizeBigInt(3.5)).toBe(3.5)
    expect(normalizeBigInt(false)).toBe(false)
  })

  it('keeps a Date usable', () => {
    const date = new Date('2026-01-15T00:00:00Z')
    const result = normalizeBigInt({ when: date })
    expect(result.when).toEqual(date)
  })

  it('serialises to JSON without throwing', () => {
    expect(() => JSON.stringify(normalizeBigInt({ id: 9007199254740993n }))).not.toThrow()
  })

  it('does not descend into nested objects', () => {
    expect(normalizeBigInt({ outer: { id: 1n } }).outer.id).toBe(1n)
  })
})
