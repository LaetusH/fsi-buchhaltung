import { defineEventHandler } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { getMemberForUser, getPendingChangesForMember, getSelfEditFieldConfig } from '~/server/utils/memberSelfEdit'
import { SELF_EDIT_ELIGIBLE_FIELDS, type SelfEditFieldMode, type SelfEditFieldName } from '~/config/memberSelfEdit'

export interface SelfEditFieldState {
  mode: SelfEditFieldMode
  value: string
  pending: { new_value: string, requested_at: string } | null
}

interface GetSelfSuccess {
  ok: true
  member: {
    id: number
    fields: Record<SelfEditFieldName, SelfEditFieldState>
  } | null
}

interface GetSelfError {
  ok: false
  error: string
}

export type GetMemberSelfResponse = GetSelfSuccess | GetSelfError

export default defineEventHandler(async (event): Promise<GetMemberSelfResponse> => {
  const current = await requirePermission(event, 'members.editOwnData')
  if (!current.ok) return current

  const member = await getMemberForUser(current.user.id)
  if (!member) return { ok: true, member: null }

  const [config, pendingChanges] = await Promise.all([
    getSelfEditFieldConfig(),
    getPendingChangesForMember(member.id),
  ])

  const pendingByField = new Map(pendingChanges.map(change => [change.field_name, change]))

  const fields = {} as Record<SelfEditFieldName, SelfEditFieldState>
  for (const field of SELF_EDIT_ELIGIBLE_FIELDS) {
    const pending = pendingByField.get(field)
    fields[field] = {
      mode: config[field],
      value: String((member as any)[field]),
      pending: pending ? { new_value: String(pending.new_value), requested_at: pending.requested_at } : null,
    }
  }

  return { ok: true, member: { id: member.id, fields } }
})
