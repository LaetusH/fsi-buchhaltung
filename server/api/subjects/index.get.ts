import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import type { SubjectRow } from '~/types/subject'

interface GetSubjectsSuccess {
  ok: true
  subjects: SubjectRow[]
}

interface GetSubjectsError {
  ok: false
  error: string
}

type GetSubjectsResponse = GetSubjectsSuccess | GetSubjectsError

export default defineEventHandler(async (event): Promise<GetSubjectsResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (!current.user.permissions.includes('subjects.view')) return { ok: false, error: 'Not authorized' }

  const rows = await query<SubjectRow[]>(`
    SELECT id, name
    FROM subjects
    ORDER BY name ASC
  `)

  return { ok: true, subjects: rows }
})
