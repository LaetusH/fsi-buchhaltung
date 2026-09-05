import { describe, expect, it } from 'vitest'
import { parseScopedTableSpec } from '~/server/utils/audit/log'
import { AUDIT_TABLES } from '~/server/utils/audit/registry'

/**
 * Grammar: `table[:scopeColumn][>viaTable:viaColumn][;column=value]`
 *
 * These specs come from component props and end up as identifiers in generated SQL, so
 * every rejection path matters as much as the happy path. A malformed spec must return
 * null (the caller drops it silently) and never a half-parsed one.
 */
describe('parseScopedTableSpec', () => {
  it('takes the scope column from the registry for a bare table', () => {
    expect(parseScopedTableSpec('member_positions')).toEqual({
      table: 'member_positions',
      scopeColumn: 'member_id',
      via: undefined,
      literals: [],
    })
  })

  it('lets an explicit column override the registry', () => {
    expect(parseScopedTableSpec('event_shift_slots:id')).toMatchObject({
      table: 'event_shift_slots',
      scopeColumn: 'id',
    })
  })

  // Self-scoping: a table with no `parent` entry is only usable with an explicit column.
  it('rejects a bare table that has no parent in the registry', () => {
    expect(AUDIT_TABLES.wiki_articles?.parent).toBeUndefined()
    expect(parseScopedTableSpec('wiki_articles')).toBeNull()
    expect(parseScopedTableSpec('wiki_articles:id')).toMatchObject({ table: 'wiki_articles', scopeColumn: 'id' })
  })

  it('parses a two-hop scope', () => {
    expect(parseScopedTableSpec('event_shift_members>event_shift_slots:event_id')).toEqual({
      table: 'event_shift_members',
      scopeColumn: 'shift_id',
      via: { table: 'event_shift_slots', column: 'event_id' },
      literals: [],
    })
  })

  it('parses a constant filter for a polymorphic table', () => {
    expect(parseScopedTableSpec('file_attachments:entity_id;entity_type=wiki_article')).toEqual({
      table: 'file_attachments',
      scopeColumn: 'entity_id',
      via: undefined,
      literals: [['entity_type', 'wiki_article']],
    })
  })

  it('parses several constant filters', () => {
    expect(parseScopedTableSpec('file_attachments:entity_id;entity_type=wiki_article;detached_by=1')?.literals)
      .toEqual([['entity_type', 'wiki_article'], ['detached_by', '1']])
  })

  it('keeps a value containing an equals sign intact', () => {
    expect(parseScopedTableSpec('file_attachments:entity_id;entity_type=a=b')?.literals)
      .toEqual([['entity_type', 'a=b']])
  })

  it('allows an empty value', () => {
    expect(parseScopedTableSpec('file_attachments:entity_id;entity_type=')?.literals)
      .toEqual([['entity_type', '']])
  })

  it('rejects a table that is not in the registry', () => {
    expect(parseScopedTableSpec('secret_table:id')).toBeNull()
    expect(parseScopedTableSpec('')).toBeNull()
  })

  it('rejects an unregistered via table', () => {
    expect(parseScopedTableSpec('event_shift_members>secret_table:event_id')).toBeNull()
  })

  it('rejects an incomplete via clause', () => {
    expect(parseScopedTableSpec('event_shift_members>event_shift_slots')).toBeNull()
    expect(parseScopedTableSpec('event_shift_members>:event_id')).toBeNull()
    expect(parseScopedTableSpec('event_shift_members>')).toBeNull()
  })

  // The column names reach SQL as backtick-quoted identifiers; the pattern is what keeps
  // an injected string out.
  it.each([
    ['a space', 'member_positions:member id'],
    ['a backtick', 'member_positions:member_id`'],
    ['a leading digit', 'member_positions:1id'],
    ['a hyphen', 'member_positions:member-id'],
    ['a quote', "member_positions:member_id'"],
  ])('rejects a scope column with %s', (_label, spec) => {
    expect(parseScopedTableSpec(spec)).toBeNull()
  })

  it('rejects an unsafe via column', () => {
    expect(parseScopedTableSpec('event_shift_members>event_shift_slots:event id')).toBeNull()
  })

  it('rejects an unsafe or malformed literal', () => {
    expect(parseScopedTableSpec('file_attachments:entity_id;entity type=wiki')).toBeNull()
    expect(parseScopedTableSpec('file_attachments:entity_id;entity_type')).toBeNull()
    expect(parseScopedTableSpec('file_attachments:entity_id;=wiki')).toBeNull()
  })
})

describe('AUDIT_TABLES registry', () => {
  it('keys every entry by its own table name', () => {
    for (const [key, definition] of Object.entries(AUDIT_TABLES)) {
      expect(definition.table).toBe(key)
    }
  })

  it('only points parents and references at registered tables', () => {
    for (const definition of Object.values(AUDIT_TABLES)) {
      if (definition.parent) {
        expect(AUDIT_TABLES, `parent of ${definition.table}`).toHaveProperty(definition.parent.table)
      }
      for (const reference of Object.values(definition.references ?? {})) {
        expect(AUDIT_TABLES, `reference of ${definition.table}`).toHaveProperty(reference.table)
      }
    }
  })
})
