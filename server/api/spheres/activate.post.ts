import { defineEventHandler, readBody } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import type { ActivateBody, ActivateResponse } from '~/types/activate'

export default defineEventHandler(async (event): Promise<ActivateResponse> => {
  const current = await getCurrentUserFromEvent(event, true )
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (current.user.role !== 'admin') return { ok: false, error: 'Not authorized' }

  const { id, is_active } = await readBody<ActivateBody>(event)
  if (id == undefined || id == null || is_active == undefined || is_active == null) return { ok: false, error: 'Missing fields' }
  const active = 1 ? is_active : 0

  await query(`UPDATE spheres SET is_active = ? WHERE id = ?`, [active, id])
  return { ok: true }
})