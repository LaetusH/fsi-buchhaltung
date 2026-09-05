import { beforeEach, describe, expect, it } from 'vitest'
import { query, withAuditTransaction } from '~/server/utils/db'
import { auditRowsFor, resetDatabase } from '../helpers/db'
import { createUser, resetFixtureCounter } from '../helpers/fixtures'

describe('audit noise suppression', () => {
  let actorId: number
  let articleId: number

  beforeEach(async () => {
    await resetDatabase()
    resetFixtureCounter()

    const actor = await createUser()
    actorId = actor.id

    const space = await query<any>(
      'INSERT INTO wiki_spaces (slug, title) VALUES (?, ?)',
      ['test-space', 'Test'],
    )

    const article = await query<any>(
      'INSERT INTO wiki_articles (space_id, slug, title, created_by) VALUES (?, ?, ?, ?)',
      [Number(space.insertId), 'test-artikel', 'Test-Artikel', actorId],
    )
    articleId = Number(article.insertId)
  })

  it('writes no audit row for an autosave that only touches the draft columns', async () => {
    const before = (await auditRowsFor('wiki_articles', articleId)).length

    await withAuditTransaction({ id: actorId }, async (conn) => {
      await query(
        'UPDATE wiki_articles SET draft_md = ?, draft_updated_at = NOW(), draft_updated_by = ? WHERE id = ?',
        ['Ein Entwurf', actorId, articleId],
        conn,
      )
    })

    expect((await auditRowsFor('wiki_articles', articleId)).length).toBe(before)
  })

  it('still records a change to the published content', async () => {
    const before = (await auditRowsFor('wiki_articles', articleId)).length

    await withAuditTransaction({ id: actorId }, async (conn) => {
      await query('UPDATE wiki_articles SET title = ? WHERE id = ?', ['Neuer Titel', articleId], conn)
    })

    expect((await auditRowsFor('wiki_articles', articleId)).length).toBe(before + 1)
  })

  it('records the change when a draft edit accompanies a real one', async () => {
    const before = (await auditRowsFor('wiki_articles', articleId)).length

    await withAuditTransaction({ id: actorId }, async (conn) => {
      await query(
        'UPDATE wiki_articles SET draft_md = ?, status = ? WHERE id = ?',
        ['Entwurf', 'published', articleId],
        conn,
      )
    })

    expect((await auditRowsFor('wiki_articles', articleId)).length).toBe(before + 1)
  })

  // `updated_at` is ignored on every table: a row whose only change is that timestamp
  // would render as an empty "changed by X" entry in the history view.
  it('ignores an updated_at-only change', async () => {
    const before = (await auditRowsFor('wiki_articles', articleId)).length

    await withAuditTransaction({ id: actorId }, async (conn) => {
      await query('UPDATE wiki_articles SET updated_at = NOW() WHERE id = ?', [articleId], conn)
    })

    expect((await auditRowsFor('wiki_articles', articleId)).length).toBe(before)
  })
})
