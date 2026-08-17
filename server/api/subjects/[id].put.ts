import { defineEventHandler, readBody } from 'h3'
import { query, withAuditTransaction } from '~/server/utils/db'
import { getNumericRouteParam } from '~/server/utils/api/request'
import { requirePermission } from '~/server/utils/api/guards'
import type { UpdateSubjectBody } from '~/types/subject'

interface UpdateSubjectSuccess {
  ok: true
}

interface UpdateSubjectError {
  ok: false
  error: string
}

type UpdateSubjectResponse = UpdateSubjectSuccess | UpdateSubjectError

export default defineEventHandler(async (event): Promise<UpdateSubjectResponse> => {
  const current = await requirePermission(event, 'subjects.edit', { touch: false })
  if (!current.ok) return current

  const id = getNumericRouteParam(event, 'id')
  if (!id) return { ok: false, error: 'Invalid id' }

  const body = await readBody<UpdateSubjectBody>(event)
  const name = body?.name?.trim()
  if (!name) return { ok: false, error: 'Missing fields' }

  const duplicate = await query<{ id: number }[]>(
    `SELECT id FROM subjects WHERE LOWER(name) = LOWER(?) AND id != ? LIMIT 1`,
    [name, id],
  )
  if (duplicate.length) return { ok: false, error: 'A subject with this name already exists' }

  return await withAuditTransaction(current.user, async (conn) => {
    const existing = await query<{ id: number }[]>(
      `SELECT id FROM subjects WHERE id = ? LIMIT 1`,
      [id],
      conn,
    )
    if (!existing.length) return { ok: false, error: 'No matching subject in database' }

    await query(
      `UPDATE subjects SET name = ? WHERE id = ?`,
      [name, id],
      conn,
    )

    return { ok: true }
  })
})
