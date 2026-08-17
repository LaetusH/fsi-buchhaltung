import { defineEventHandler, readBody } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { query } from '~/server/utils/db'
import { isSelfEditFieldMode, isSelfEditFieldName } from '~/config/memberSelfEdit'

interface UpdateFieldConfigSuccess {
  ok: true
}

interface UpdateFieldConfigError {
  ok: false
  error: string
}

type UpdateFieldConfigResponse = UpdateFieldConfigSuccess | UpdateFieldConfigError

export default defineEventHandler(async (event): Promise<UpdateFieldConfigResponse> => {
  const current = await requirePermission(event, 'members.configureSelfEditFields')
  if (!current.ok) return current

  const body = await readBody<Array<{ field_name: string, mode: string }>>(event)
  if (!Array.isArray(body)) return { ok: false, error: 'Invalid body' }

  for (const entry of body) {
    if (!isSelfEditFieldName(entry?.field_name) || !isSelfEditFieldMode(entry?.mode)) {
      return { ok: false, error: 'Invalid field configuration entry' }
    }
  }

  for (const entry of body) {
    await query(
      `INSERT INTO member_self_edit_field_config (field_name, mode) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE mode = VALUES(mode)`,
      [entry.field_name, entry.mode],
    )
  }

  return { ok: true }
})
