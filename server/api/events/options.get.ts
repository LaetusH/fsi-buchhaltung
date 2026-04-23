import { defineEventHandler } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { loadEventOptions } from '~/server/utils/events'
import type { EventCostCentreOption, EventMemberOption, EventSphereOption, EventSubdivisionOption } from '~/types/event'

interface GetEventOptionsSuccess {
  ok: true
  members: EventMemberOption[]
  subdivisions: EventSubdivisionOption[]
  costCentres: EventCostCentreOption[]
  spheres: EventSphereOption[]
}

interface GetEventOptionsError {
  ok: false
  error: string
}

export type GetEventOptionsResponse = GetEventOptionsSuccess | GetEventOptionsError

export default defineEventHandler(async (event): Promise<GetEventOptionsResponse> => {
  const current = await requirePermission(event, 'events.view')
  if (!current.ok) return current

  try {
    const options = await loadEventOptions()
    return {
      ok: true,
      members: options.members,
      subdivisions: options.subdivisions,
      costCentres: options.costCentres,
      spheres: options.spheres,
    }
  } catch (err: any) {
    return { ok: false, error: `Failed to load event options: ${err}` }
  }
})
