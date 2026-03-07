import { defineEventHandler, readBody } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import type { CreateSubjectBody } from '~/types/subject'

interface CreateSubjectSuccess {
  ok: true
  id: number
}

interface CreateSubjectError {
  ok: false
  error: string
}

type CreateSubjectResponse = CreateSubjectSuccess | CreateSubjectError

export default defineEventHandler(async (event): Promise<CreateSubjectResponse> => {
  const current = await getCurrentUserFromEvent(event, false)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  const body = await readBody<CreateSubjectBody>(event)
  const name = body?.name?.trim()

  if (!name) return { ok: false, error: 'Missing fields' }

  const existing = await query<{ id: number }[]>(
    `SELECT id FROM subjects WHERE LOWER(name) = LOWER(?) LIMIT 1`,
    [name]
  )

  if (existing.length) return { ok: true, id: Number(existing[0]!.id) }

  const res = await query<any>(
    `INSERT INTO subjects (name, created_by) VALUES (?, ?)`,
    [name, current.user.id]
  )

  return { ok: true, id: Number(res.insertId) }
})
