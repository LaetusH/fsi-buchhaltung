import { defineEventHandler, readBody } from 'h3'
import { query, withTransaction } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import type { SaveSphereBody, SphereRow } from '~/types/sphere'

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
  if (!body.name || !body.code) return { ok: false, error: 'Missing fields' }
  const updated = body

  if (updated.is_active === undefined || updated.is_active === null) updated.is_active = true
  const active = 1 ? updated.is_active : 0

  try {
    return await withTransaction(async (conn) => {
      if (updated.id && updated.id > 0) {
        const existingRows: SphereRow[] = await query(
          `SELECT * FROM spheres WHERE id = ? LIMIT 1`,
          [updated.id],
          conn
        )
      
        if (!existingRows.length) return { ok: false, error: 'No matching spheres in database' }           
        const existing = existingRows[0]
    
        const fields = ['code', 'name', 'description'] as (keyof SaveSphereBody)[]
            
        for (const field of fields) {
          await logChange({
            entityType: 'sphere',
            entityId: updated.id,
            subEntityType: null,
            subEntityId: null,
            field,
            oldValue: existing[field],
            newValue: updated[field],
            userId: current.user.id,
          }, conn)
        }

        await query(
          `UPDATE spheres
            SET code = ?, name = ?, description = ?
          WHERE id = ?`,
          [updated.code, updated.name, updated.description, updated.id],
          conn
        )

        return { ok: true, id: updated.id }
      }

      const res = await query(
        `INSERT INTO spheres (code, name, is_active, description, created_by)
        VALUES (?, ?, ?, ?, ?)`,
        [updated.code, updated.name, active, updated.description, current.user.id],
        conn
      )

      return { ok: true, id: normalizeBigInt(res.insertId) }
    })
  } catch (err: unknown) {
    const error = err as MysqlError
    return { ok: false, error: `An error occured while saving the sphere: ${error.code ?? 'DB_ERROR'}` }
  }
})