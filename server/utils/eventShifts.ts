import type mariadb from 'mariadb'
import { query } from '~/server/utils/db'
import type { EventShiftMember, EventShiftSlot, SaveEventShiftSlot } from '~/types/event'

interface EventShiftSlotRow {
  id: number
  name: string
  starts_at: string | Date
  ends_at: string | Date
  required_people: number
}

interface EventShiftMemberRow {
  shift_id: number
  member_id: number
  full_name: string
}

function normalizeDateTime(value: unknown) {
  const trimmed = String(value ?? '').trim()
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|\s)(\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hours = Number(match[4])
  const minutes = Number(match[5])
  const seconds = Number(match[6] ?? 0)

  if (month < 1 || month > 12 || day < 1 || day > 31 || hours > 23 || minutes > 59 || seconds > 59) return null
  const parsed = new Date(year, month - 1, day, hours, minutes, seconds)
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
    || parsed.getHours() !== hours
    || parsed.getMinutes() !== minutes
    || parsed.getSeconds() !== seconds
  ) {
    return null
  }

  return `${String(year).padStart(4, '0')}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6] ?? '00'}`
}

function formatDateTimeForClient(value: string | Date) {
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    const hours = String(value.getHours()).padStart(2, '0')
    const minutes = String(value.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  return String(value).trim().replace(' ', 'T').slice(0, 16)
}

function normalizePositiveInteger(value: unknown) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function normalizeMemberIds(value: unknown) {
  if (!Array.isArray(value)) return null

  const ids: number[] = []
  const seen = new Set<number>()

  for (const entry of value) {
    const parsed = Number(entry)
    if (!Number.isInteger(parsed) || parsed <= 0 || seen.has(parsed)) return null
    seen.add(parsed)
    ids.push(parsed)
  }

  return ids
}

export function normalizeEventShiftSlots(value: unknown): SaveEventShiftSlot[] | null {
  if (!Array.isArray(value)) return null

  const slots: SaveEventShiftSlot[] = []

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') return null

    const raw = entry as Record<string, unknown>
    const id = raw.id === undefined || raw.id === null ? undefined : normalizePositiveInteger(raw.id)
    const startsAt = normalizeDateTime(raw.starts_at ?? raw.startsAt ?? raw.start_time ?? raw.startTime)
    const endsAt = normalizeDateTime(raw.ends_at ?? raw.endsAt ?? raw.end_time ?? raw.endTime)
    const requiredPeople = normalizePositiveInteger(raw.required_people ?? raw.requiredPeople)
    const memberIds = normalizeMemberIds(raw.member_ids ?? raw.memberIds)
    const name = String(raw.name ?? '').trim()

    if (raw.id !== undefined && raw.id !== null && !id) return null
    if (!startsAt || !endsAt || startsAt >= endsAt || !requiredPeople || !memberIds || !name) return null

    slots.push({
      ...(id ? { id } : {}),
      name,
      starts_at: startsAt,
      ends_at: endsAt,
      required_people: requiredPeople,
      member_ids: memberIds,
    })
  }

  return slots
}

export async function eventExists(eventId: number, conn?: mariadb.PoolConnection) {
  const rows = await query<{ id: number }[]>(
    `SELECT id
     FROM events
     WHERE id = ?
     LIMIT 1`,
    [eventId],
    conn,
  )

  return Boolean(rows[0])
}

export async function loadCurrentMemberIdForUser(userId: number, conn?: mariadb.PoolConnection) {
  const rows = await query<{ id: number }[]>(
    `SELECT id
     FROM members
     WHERE account = ?
     LIMIT 1`,
    [userId],
    conn,
  )

  return rows[0] ? Number(rows[0].id) : null
}

export async function loadEventShiftSlots(eventId: number, conn?: mariadb.PoolConnection): Promise<EventShiftSlot[]> {
  const slotRows = await query<EventShiftSlotRow[]>(
    `SELECT id, name, starts_at, ends_at, required_people
     FROM event_shift_slots
     WHERE event_id = ?
     ORDER BY starts_at, ends_at, name, id`,
    [eventId],
    conn,
  )

  if (!slotRows.length) return []

  const shiftIds = slotRows.map(row => Number(row.id))
  const memberRows = await query<EventShiftMemberRow[]>(
    `SELECT esm.shift_id,
            esm.member_id,
            CONCAT(m.first_name, ' ', m.last_name) AS full_name
     FROM event_shift_members esm
     JOIN members m ON m.id = esm.member_id
     WHERE esm.shift_id IN (${shiftIds.map(() => '?').join(',')})
     ORDER BY m.first_name, m.last_name, esm.member_id`,
    shiftIds,
    conn,
  )

  const membersByShift = new Map<number, EventShiftMember[]>()

  for (const row of memberRows) {
    const shiftId = Number(row.shift_id)
    const members = membersByShift.get(shiftId) ?? []
    members.push({
      id: Number(row.member_id),
      full_name: String(row.full_name),
    })
    membersByShift.set(shiftId, members)
  }

  return slotRows.map(row => ({
    id: Number(row.id),
    name: String(row.name),
    starts_at: formatDateTimeForClient(row.starts_at),
    ends_at: formatDateTimeForClient(row.ends_at),
    required_people: Number(row.required_people),
    members: membersByShift.get(Number(row.id)) ?? [],
  }))
}

export async function validateShiftMembers(memberIds: number[], conn: mariadb.PoolConnection) {
  if (!memberIds.length) return null

  const rows = await query<{ id: number }[]>(
    `SELECT id
     FROM members
     WHERE id IN (${memberIds.map(() => '?').join(',')})`,
    memberIds,
    conn,
  )

  return rows.length === memberIds.length ? null : 'At least one selected shift member does not exist'
}

async function syncShiftMembers({
  shiftId,
  existingIds,
  nextIds,
  conn,
}: {
  shiftId: number
  existingIds: number[]
  nextIds: number[]
  conn: mariadb.PoolConnection
}) {
  const nextSet = new Set(nextIds)
  const existingSet = new Set(existingIds)

  for (const memberId of existingIds) {
    if (nextSet.has(memberId)) continue
    await query(
      `DELETE FROM event_shift_members
       WHERE shift_id = ? AND member_id = ?`,
      [shiftId, memberId],
      conn,
    )
  }

  for (const memberId of nextIds) {
    if (existingSet.has(memberId)) continue
    await query(
      `INSERT INTO event_shift_members (shift_id, member_id)
       VALUES (?, ?)`,
      [shiftId, memberId],
      conn,
    )
  }
}

export async function replaceEventShiftSlots({
  eventId,
  slots,
  conn,
}: {
  eventId: number
  slots: SaveEventShiftSlot[]
  conn: mariadb.PoolConnection
}) {
  const existingRows = await query<EventShiftSlotRow[]>(
    `SELECT id, name, starts_at, ends_at, required_people
     FROM event_shift_slots
     WHERE event_id = ?`,
    [eventId],
    conn,
  )
  const existingIds = existingRows.map(row => Number(row.id))
  const existingIdSet = new Set(existingIds)
  const incomingIds = slots.flatMap(slot => slot.id ? [slot.id] : [])

  if (incomingIds.some(id => !existingIdSet.has(id))) {
    return 'At least one shift does not belong to this event'
  }

  const relationError = await validateShiftMembers(
    Array.from(new Set(slots.flatMap(slot => slot.member_ids))),
    conn,
  )
  if (relationError) return relationError

  const incomingIdSet = new Set(incomingIds)
  for (const id of existingIds) {
    if (incomingIdSet.has(id)) continue
    await query(
      `DELETE FROM event_shift_slots
       WHERE id = ? AND event_id = ?`,
      [id, eventId],
      conn,
    )
  }

  for (const slot of slots) {
    let shiftId = slot.id ?? null

    if (shiftId) {
      const existing = existingRows.find(row => Number(row.id) === shiftId)
      if (
        existing
        && (
          String(existing.name) !== slot.name
          || String(existing.starts_at) !== slot.starts_at
          || String(existing.ends_at) !== slot.ends_at
          || Number(existing.required_people) !== slot.required_people
        )
      ) {
        await query(
          `UPDATE event_shift_slots
           SET name = ?, starts_at = ?, ends_at = ?, required_people = ?
           WHERE id = ? AND event_id = ?`,
          [
            slot.name,
            slot.starts_at,
            slot.ends_at,
            slot.required_people,
            shiftId,
            eventId,
          ],
          conn,
        )
      }
    } else {
      const result: any = await query(
        `INSERT INTO event_shift_slots (event_id, name, starts_at, ends_at, required_people)
         VALUES (?, ?, ?, ?, ?)`,
        [
          eventId,
          slot.name,
          slot.starts_at,
          slot.ends_at,
          slot.required_people,
        ],
        conn,
      )
      shiftId = Number(result.insertId)
    }

    const memberRows = await query<{ member_id: number }[]>(
      `SELECT member_id
       FROM event_shift_members
       WHERE shift_id = ?`,
      [shiftId],
      conn,
    )

    await syncShiftMembers({
      shiftId,
      existingIds: memberRows.map(row => Number(row.member_id)),
      nextIds: slot.member_ids,
      conn,
    })
  }

  return null
}

export async function addSelfToShift({
  eventId,
  shiftId,
  memberId,
  conn,
}: {
  eventId: number
  shiftId: number
  memberId: number
  conn: mariadb.PoolConnection
}) {
  const rows = await query<{ id: number }[]>(
    `SELECT id
     FROM event_shift_slots
     WHERE id = ? AND event_id = ?
     LIMIT 1`,
    [shiftId, eventId],
    conn,
  )
  if (!rows[0]) return 'Shift not found'

  await query(
    `INSERT IGNORE INTO event_shift_members (shift_id, member_id)
     VALUES (?, ?)`,
    [shiftId, memberId],
    conn,
  )

  return null
}

export async function removeSelfFromShift({
  eventId,
  shiftId,
  memberId,
  conn,
}: {
  eventId: number
  shiftId: number
  memberId: number
  conn: mariadb.PoolConnection
}) {
  const rows = await query<{ id: number }[]>(
    `SELECT id
     FROM event_shift_slots
     WHERE id = ? AND event_id = ?
     LIMIT 1`,
    [shiftId, eventId],
    conn,
  )
  if (!rows[0]) return 'Shift not found'

  await query(
    `DELETE FROM event_shift_members
     WHERE shift_id = ? AND member_id = ?`,
    [shiftId, memberId],
    conn,
  )

  return null
}
