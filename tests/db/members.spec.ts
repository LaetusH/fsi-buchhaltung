import { beforeEach, describe, expect, it } from 'vitest'
import { ensureSubjectId } from '~/server/utils/members'
import { invoiceNumberExists } from '~/server/utils/invoices'
import { query, withTransaction } from '~/server/utils/db'
import { countRows, resetDatabase } from '../helpers/db'
import { createCompany, resetFixtureCounter } from '../helpers/fixtures'

describe('ensureSubjectId', () => {
  beforeEach(async () => {
    await resetDatabase()
    resetFixtureCounter()
  })

  it('creates a subject that does not exist yet', async () => {
    const id = await withTransaction(conn => ensureSubjectId('Informatik', conn))

    expect(id).toBeGreaterThan(0)
    expect(await countRows('subjects')).toBe(1)
  })

  it('reuses an existing subject', async () => {
    const first = await withTransaction(conn => ensureSubjectId('Informatik', conn))
    const second = await withTransaction(conn => ensureSubjectId('Informatik', conn))

    expect(second).toBe(first)
    expect(await countRows('subjects')).toBe(1)
  })

  // Members type their subject freehand, so "informatik" and "Informatik" must not create
  // two entries in the subject list.
  it('matches case-insensitively', async () => {
    const first = await withTransaction(conn => ensureSubjectId('Informatik', conn))
    const second = await withTransaction(conn => ensureSubjectId('informatik', conn))

    expect(second).toBe(first)
    expect(await countRows('subjects')).toBe(1)
  })

  it('trims surrounding whitespace', async () => {
    const first = await withTransaction(conn => ensureSubjectId('Informatik', conn))
    const second = await withTransaction(conn => ensureSubjectId('   Informatik  ', conn))

    expect(second).toBe(first)
    const rows = await query<Array<{ name: string }>>('SELECT name FROM subjects')
    expect(rows[0]!.name).toBe('Informatik')
  })

  it('keeps genuinely different subjects apart', async () => {
    const first = await withTransaction(conn => ensureSubjectId('Informatik', conn))
    const second = await withTransaction(conn => ensureSubjectId('Mathematik', conn))

    expect(second).not.toBe(first)
    expect(await countRows('subjects')).toBe(2)
  })
})

describe('invoiceNumberExists', () => {
  let companyId: number

  beforeEach(async () => {
    await resetDatabase()
    resetFixtureCounter()
    companyId = await createCompany()
  })

  async function createInvoice(invoiceNumber: string) {
    const result = await query<any>(
      `INSERT INTO invoices
        (company_id, source_type, invoice_date, due_date, invoice_number, status)
       VALUES (?, 'generated', '2026-01-15', '2026-02-15', ?, 'draft')`,
      [companyId, invoiceNumber],
    )
    return Number(result.insertId)
  }

  it('is false for an unused number', async () => {
    expect(await invoiceNumberExists('R-2026-001')).toBe(false)
  })

  it('is true once the number is taken', async () => {
    await createInvoice('R-2026-001')
    expect(await invoiceNumberExists('R-2026-001')).toBe(true)
  })

  // Editing an invoice re-submits its own number; excluding its id is what stops the
  // uniqueness check from rejecting a save that changed nothing else.
  it('ignores the invoice being edited', async () => {
    const id = await createInvoice('R-2026-001')

    expect(await invoiceNumberExists('R-2026-001', id)).toBe(false)
    expect(await invoiceNumberExists('R-2026-001', id + 1000)).toBe(true)
  })

  it('does not treat a different number as taken', async () => {
    await createInvoice('R-2026-001')
    expect(await invoiceNumberExists('R-2026-002')).toBe(false)
  })
})
