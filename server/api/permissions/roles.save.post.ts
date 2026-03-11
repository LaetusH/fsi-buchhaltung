import { defineEventHandler, readBody } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'

interface SaveRoleBody {
  id?: number
  code: string
  name: string
  description?: string | null
  is_active?: boolean
}

interface SaveRoleSuccess {
  ok: true
}

interface SaveRoleError {
  ok: false
  error: string
}

type SaveRoleResponse = SaveRoleSuccess | SaveRoleError

export default defineEventHandler(async (event): Promise<SaveRoleResponse> => {
  const current = await getCurrentUserFromEvent(event, false)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }
  if (!current.user.permissions.includes('permissions.manage')) return { ok: false, error: 'Not authorized' }

  const body = await readBody<SaveRoleBody>(event)
  if (!body.code?.trim() || !body.name?.trim()) return { ok: false, error: 'Missing fields' }

  const updated = {
    id: body.id || null,
    code: body.code.trim(),
    name: body.name.trim(),
    description: body.description?.trim() || null,
    is_active: body.is_active !== false
  }

  try {
    return await withTransaction(async (conn) => {
      if (updated.id && updated.id > 0) {
        const existingRows = await query(
          `SELECT id, code, name, description FROM roles WHERE id = ? LIMIT 1`,
          [updated.id],
          conn
        )

        if (!existingRows.length) return { ok: false, error: 'No matching role in database' }
        const existing = existingRows[0]

        const fields = ['code', 'name', 'description', 'is_active'] as (keyof SaveRoleBody)[]

        for (const field of fields) {
          await logChange({
            entityType: 'role',
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
          `UPDATE roles
          SET code = ?, name = ?, description = ?, is_active = ?
          WHERE id = ?`,
          [updated.code, updated.name, updated.description, updated.is_active ? 1 : 0, updated.id],
          conn
        )

        return { ok: true }
      }

      await query(
        `INSERT INTO roles (code, name, is_active, description, created_by)
        VALUES (?, ?, ?, ?, ?)`,
        [updated.code, updated.name, updated.is_active ? 1 : 0, updated.description, current.user.id],
        conn
      )

      return { ok: true }
    })
  } catch (err: any) {
    return { ok: false, error: `An error occured while saving the cost centre: ${err.code ?? 'DB_ERROR'}` }
  }
})
