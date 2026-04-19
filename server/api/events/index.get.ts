import { defineEventHandler } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { query } from '~/server/utils/db'
import { loadEventRelations } from '~/server/utils/events'
import type { Event, EventRow } from '~/types/event'

interface GetEventsSuccess {
  ok: true
  events: Event[]
}

interface GetEventsError {
  ok: false
  error: string
}

export type GetEventsResponse = GetEventsSuccess | GetEventsError

export default defineEventHandler(async (event): Promise<GetEventsResponse> => {
  const current = await requirePermission(event, 'events.view')
  if (!current.ok) return current

  try {
    const rows = await query<EventRow[]>(
      `SELECT id, name, starts_at, ends_at, location, expected_guests
       FROM events
       ORDER BY starts_at DESC, ends_at DESC, name ASC`,
    )

    const eventIds = rows.map(row => Number(row.id))
    const relations = await loadEventRelations(eventIds)

    return {
      ok: true,
      events: rows.map(row => ({
        id: Number(row.id),
        name: String(row.name),
        starts_at: String(row.starts_at),
        ends_at: String(row.ends_at),
        location: String(row.location),
        expected_guests: Number(row.expected_guests),
        member_organizers: relations.memberOrganizers.get(Number(row.id)) ?? [],
        subdivision_organizers: relations.subdivisionOrganizers.get(Number(row.id)) ?? [],
        cost_centre_splits: relations.costCentreSplits.get(Number(row.id)) ?? [],
      })),
    }
  } catch (err: any) {
    return { ok: false, error: `Failed to load events: ${err}` }
  }
})
