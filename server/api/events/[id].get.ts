import { defineEventHandler } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { getNumericRouteParam } from '~/server/utils/api/request'
import { query } from '~/server/utils/db'
import { loadEventRelations } from '~/server/utils/events'
import type { Event, EventRow } from '~/types/event'

interface GetEventSuccess {
  ok: true
  event: Event
}

interface GetEventError {
  ok: false
  error: string
}

export type GetEventResponse = GetEventSuccess | GetEventError

export default defineEventHandler(async (event): Promise<GetEventResponse> => {
  const current = await requirePermission(event, 'events.view')
  if (!current.ok) return current

  const eventId = getNumericRouteParam(event)
  if (!eventId) return { ok: false, error: 'Invalid event id' }

  try {
    const rows = await query<EventRow[]>(
      `SELECT id, name, starts_at, ends_at, location, expected_guests, created_at
       FROM events
       WHERE id = ?
       LIMIT 1`,
      [eventId],
    )

    const existing = rows[0]
    if (!existing) return { ok: false, error: 'Event not found' }

    const relations = await loadEventRelations([eventId])

    return {
      ok: true,
      event: {
        id: Number(existing.id),
        name: String(existing.name),
        starts_at: String(existing.starts_at),
        ends_at: String(existing.ends_at),
        location: String(existing.location),
        expected_guests: Number(existing.expected_guests),
        created_at: String(existing.created_at),
        member_organizers: relations.memberOrganizers.get(eventId) ?? [],
        subdivision_organizers: relations.subdivisionOrganizers.get(eventId) ?? [],
        cost_centre_splits: relations.costCentreSplits.get(eventId) ?? [],
      },
    }
  } catch (err: any) {
    return { ok: false, error: `Failed to load event: ${err}` }
  }
})
