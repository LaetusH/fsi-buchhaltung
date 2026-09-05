import { describe, expect, it } from 'vitest'
import { receiptRequiresFile, validateReceiptPayload } from '~/server/utils/receipts'
import { ReceiptStatus } from '~/types/receipt'

function validReceipt(overrides: Record<string, any> = {}) {
  return {
    company_id: 1,
    receipt_date: '2026-03-01',
    status: ReceiptStatus.Open,
    positions: [{ sphere: 1, cost_centre: 1, amount: 12.5 }],
    ...overrides,
  }
}

describe('validateReceiptPayload', () => {
  it('accepts a complete payload', () => {
    expect(validateReceiptPayload(validReceipt())).toBeNull()
  })

  it.each([
    ['company', { company_id: null }],
    ['receipt date', { receipt_date: '' }],
    ['status', { status: '' }],
  ])('rejects a payload without a %s', (_label, overrides) => {
    expect(validateReceiptPayload(validReceipt(overrides))).toBe('Missing required receipt fields')
  })

  it('rejects a payload with no positions', () => {
    expect(validateReceiptPayload(validReceipt({ positions: [] }))).toBe('Missing required receipt fields')
    expect(validateReceiptPayload(validReceipt({ positions: 'none' }))).toBe('Missing required receipt fields')
  })

  it.each([
    ['sphere', { sphere: null }],
    ['cost centre', { cost_centre: undefined }],
  ])('rejects a position without a %s', (_label, overrides) => {
    const payload = validReceipt({ positions: [{ sphere: 1, cost_centre: 1, amount: 5, ...overrides }] })
    expect(validateReceiptPayload(payload)).toBe('Each position requires sphere, cost centre and amount')
  })

  it('rejects a position whose amount is absent', () => {
    expect(validateReceiptPayload(validReceipt({ positions: [{ sphere: 1, cost_centre: 1, amount: null }] })))
      .toBe('Each position requires sphere, cost centre and amount')
    expect(validateReceiptPayload(validReceipt({ positions: [{ sphere: 1, cost_centre: 1 }] })))
      .toBe('Each position requires sphere, cost centre and amount')
  })

  it('accepts a position with a zero amount', () => {
    expect(validateReceiptPayload(validReceipt({ positions: [{ sphere: 1, cost_centre: 1, amount: 0 }] })))
      .toBeNull()
  })

  it('rejects a position that is not an object', () => {
    expect(validateReceiptPayload(validReceipt({ positions: [null] }))).toBeTruthy()
  })
})

describe('receiptRequiresFile', () => {
  it('demands a scan for open and paid receipts only', () => {
    expect(receiptRequiresFile(ReceiptStatus.Open)).toBe(true)
    expect(receiptRequiresFile(ReceiptStatus.Paid)).toBe(true)
    expect(receiptRequiresFile(ReceiptStatus.Draft)).toBe(false)
    expect(receiptRequiresFile(ReceiptStatus.Cancelled)).toBe(false)
  })
})
