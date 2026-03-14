import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/api/guards'
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
  const current = await requirePermission(event, 'subjects.view')
  if (!current.ok) return current

  const rows = await query<SubjectRow[]>(`
    SELECT id, name
    FROM subjects
    ORDER BY name ASC
  `)

  return { ok: true, subjects: rows }
})
