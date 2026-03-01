import { defineEventHandler, readBody } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import type { SaveSphereBody } from '~/types/sphere'

interface SaveSphereSuccess {
  ok: true
  id: number
}

interface SaveSphereError {
  ok: false
  error: string
}

type SaveSphereResponse = SaveSphereSuccess | SaveSphereError

interface MysqlError extends Error {
  code?: string
}

export default defineEventHandler(async (event): Promise<SaveSphereResponse> => {
  const current = await getCurrentUserFromEvent(event, false)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  const body = await readBody<SaveSphereBody>(event)
  const { id, code, name, is_active = true, description } = body

  if (!code || !name) return { ok: false, error: 'Missing fields' }

  const active = 1 ? is_active : 0

  try {
    if (id && id > 0) {
      await query(
        `UPDATE spheres
         SET code = ?, name = ?, is_active = ?, description = ?, updated_by = ?
         WHERE id = ?`,
        [code, name, active, description, current.user.id, id]
      )

      return { ok: true, id }
    }

    const res = await query(
      `INSERT INTO spheres (code, name, is_active, description, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [code, name, active, description, current.user.id, current.user.id]
    )

    return { ok: true, id: normalizeBigInt(res.insertId) }
  } catch (err: unknown) {
    const error = err as MysqlError
    return { ok: false, error: error.code ?? 'DB_ERROR' }
  }
})