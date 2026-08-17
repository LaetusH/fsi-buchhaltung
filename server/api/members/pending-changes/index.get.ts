import { defineEventHandler } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { getAllPendingChanges } from '~/server/utils/memberSelfEdit'
import type { SelfEditFieldName } from '~/config/memberSelfEdit'

export interface PendingFieldChangeDto {
  id: number
  member_id: number
  member_name: string
  field_name: SelfEditFieldName
  old_value: string | null
  new_value: string | null
  requested_at: string
}

interface GetPendingChangesSuccess {
  ok: true
  changes: PendingFieldChangeDto[]
}

interface GetPendingChangesError {
  ok: false
  error: string
}

export type GetPendingChangesResponse = GetPendingChangesSuccess | GetPendingChangesError

export default defineEventHandler(async (event): Promise<GetPendingChangesResponse> => {
  const current = await requirePermission(event, 'members.approveChanges')
  if (!current.ok) return current

  const rows = await getAllPendingChanges()

  return {
    ok: true,
    changes: rows.map(row => ({
      id: row.id,
      member_id: row.member_id,
      member_name: `${row.member_first_name} ${row.member_last_name}`.trim(),
      field_name: row.field_name,
      old_value: row.old_value,
      new_value: row.new_value,
      requested_at: row.requested_at,
    })),
  }
})
