import { defineEventHandler } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { getSelfEditFieldConfig } from '~/server/utils/memberSelfEdit'
import type { SelfEditFieldMode, SelfEditFieldName } from '~/config/memberSelfEdit'

interface GetFieldConfigSuccess {
  ok: true
  config: Record<SelfEditFieldName, SelfEditFieldMode>
}

interface GetFieldConfigError {
  ok: false
  error: string
}

export type GetMemberFieldConfigResponse = GetFieldConfigSuccess | GetFieldConfigError

export default defineEventHandler(async (event): Promise<GetMemberFieldConfigResponse> => {
  const current = await requirePermission(event, 'members.configureSelfEditFields')
  if (!current.ok) return current

  const config = await getSelfEditFieldConfig()
  return { ok: true, config }
})
