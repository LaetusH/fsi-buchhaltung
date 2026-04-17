import { defineEventHandler, readBody } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { logFieldChanges } from '~/server/utils/api/audit'
import { getNumericRouteParam } from '~/server/utils/api/request'
import { query, withTransaction } from '~/server/utils/db'
import {
  normalizeEventPayload,
  syncEventCostCentreSplits,
  syncEventMemberOrganizers,
  syncEventSubdivisionOrganizers,
  validateEventPayload,
  validateEventRelations,
} from '~/server/utils/events'
import type { EventRow } from '~/types/event'

interface UpdateEventSuccess {
  ok: true
}

interface UpdateEventError {
  ok: false
  error: string
}

export type UpdateEventResponse = UpdateEventSuccess | UpdateEventError

type EventLogField = 'name' | 'starts_at' | 'ends_at' | 'location' | 'expected_guests'

export default defineEventHandler(async (event): Promise<UpdateEventResponse> => {
  const current = await requirePermission(event, 'events.edit')
  if (!current.ok) return current

  const eventId = getNumericRouteParam(event)
  if (!eventId) return { ok: false, error: 'Invalid event id' }

  const body = normalizeEventPayload(await readBody(event))
  if (!body) return { ok: false, error: 'Invalid event data' }

  const validationError = validateEventPayload(body)
  if (validationError) return { ok: false, error: validationError }

  try {
    return await withTransaction(async (conn) => {
      const existingRows = await query<EventRow[]>(
        `SELECT id, name, starts_at, ends_at, location, expected_guests, created_at
         FROM events
         WHERE id = ?
         LIMIT 1`,
        [eventId],
        conn,
      )

      const existing = existingRows[0]
      if (!existing) return { ok: false, error: 'Event not found' }

      const existingSplitRows = await query<{ id: number, cost_centre_id: number, allocation_percentage: number }[]>(
        `SELECT id, cost_centre_id, allocation_percentage
         FROM event_cost_centre_splits
         WHERE event_id = ?`,
        [eventId],
        conn,
      )

      const relationError = await validateEventRelations(
        body,
        conn,
        existingSplitRows.map(row => Number(row.cost_centre_id)),
      )
      if (relationError) return { ok: false, error: relationError }

      const fields: EventLogField[] = ['name', 'starts_at', 'ends_at', 'location', 'expected_guests']
      await logFieldChanges({
        entityType: 'event',
        entityId: eventId,
        fields,
        previous: existing,
        next: body,
        userId: current.user.id,
        conn,
      })

      await query(
        `UPDATE events
         SET name = ?, starts_at = ?, ends_at = ?, location = ?, expected_guests = ?
         WHERE id = ?`,
        [
          body.name,
          body.starts_at,
          body.ends_at,
          body.location,
          body.expected_guests,
          eventId,
        ],
        conn,
      )

      const [memberRows, subdivisionRows] = await Promise.all([
        query<{ member_id: number }[]>(
          `SELECT member_id
           FROM event_member_organizers
           WHERE event_id = ?`,
          [eventId],
          conn,
        ),
        query<{ subdivision_id: number }[]>(
          `SELECT subdivision_id
           FROM event_subdivision_organizers
           WHERE event_id = ?`,
          [eventId],
          conn,
        ),
      ])

      await syncEventMemberOrganizers({
        eventId,
        existingIds: memberRows.map(row => Number(row.member_id)),
        nextIds: body.member_organizer_ids,
        userId: current.user.id,
        conn,
      })
      await syncEventSubdivisionOrganizers({
        eventId,
        existingIds: subdivisionRows.map(row => Number(row.subdivision_id)),
        nextIds: body.subdivision_organizer_ids,
        userId: current.user.id,
        conn,
      })
      await syncEventCostCentreSplits({
        eventId,
        existingRows: existingSplitRows.map(row => ({
          id: Number(row.id),
          cost_centre_id: Number(row.cost_centre_id),
          allocation_percentage: Number(row.allocation_percentage),
        })),
        nextRows: body.cost_centre_splits,
        userId: current.user.id,
        conn,
      })

      return { ok: true }
    })
  } catch (err: any) {
    return { ok: false, error: `Failed to update event: ${err}` }
  }
})
