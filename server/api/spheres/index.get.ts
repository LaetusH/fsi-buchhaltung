import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import { normalizeBigInt } from '~/server/utils/normalize'
import type { SphereRow } from '~/types/sphere'

interface GetSpheresSuccess {
  ok: true
  spheres: SphereRow[]
}

interface GetSpheresError {
  ok: false
  error: string
}

type GetSpheresResponse = GetSpheresSuccess | GetSpheresError

export default defineEventHandler(async (event): Promise<GetSpheresResponse> => {
  const current = await getCurrentUserFromEvent(event, true )
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  const rows = await query(`
    SELECT id, code, name, is_active, description, created_at
    FROM spheres
    ORDER BY code ASC
  `) as SphereRow[]

  return { ok: true, spheres: normalizeBigInt(rows) as SphereRow[] }
})