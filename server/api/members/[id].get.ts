import { defineEventHandler, getRouterParam } from 'h3'
import { MemberStatus, type Member, type MemberPositionAssignment } from '~/types/member'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'

interface GetMemberSuccess {
  ok: true
  member: Member
}

interface GetMemberError {
  ok: false
  error: string
}

type GetMemberResponse = GetMemberSuccess | GetMemberError

function parseStatus(value: unknown): MemberStatus {
  if (value === MemberStatus.Active || value === MemberStatus.Passive || value === MemberStatus.Left) {
    return value
  }
  return MemberStatus.Active
}

export default defineEventHandler(async (event): Promise<GetMemberResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  const id = Number(getRouterParam(event, 'id'))
  if (!id) return { ok: false, error: 'Missing member id' }

  const rows = await query<any[]>(
    `SELECT m.*, s.name AS subject_name
     FROM members m
     LEFT JOIN subjects s ON s.id = m.subject
     WHERE m.id = ?
     LIMIT 1`,
    [id]
  )

  const row = rows[0]
  if (!row) return { ok: false, error: 'Member not found' }

  const positions = await query<MemberPositionAssignment[]>(
    `SELECT id, position_id, since, until
     FROM member_positions
     WHERE member_id = ?
     ORDER BY since DESC`,
    [id]
  )

  return {
    ok: true,
    member: {
      id: Number(row.id),
      account: row.account ? Number(row.account) : null,
      last_name: String(row.last_name),
      first_name: String(row.first_name),
      birthdate: String(row.birthdate),
      street: String(row.street),
      street_number: String(row.street_number),
      postal_code: String(row.postal_code),
      city: String(row.city),
      subject: Number(row.subject),
      subject_name: String(row.subject_name || ''),
      phone: String(row.phone),
      email: String(row.email),
      notes: row.notes ? String(row.notes) : null,
      status: parseStatus(String(row.status)),
      honorary: Boolean(row.honorary),
      applied_at: String(row.applied_at),
      joined_at: String(row.joined_at),
      left_at: row.left_at ? String(row.left_at) : null,
      positions: positions.map(position => ({
        id: Number(position.id),
        position_id: Number(position.position_id),
        since: String(position.since),
        until: position.until ? String(position.until) : null,
      })),
    }
  }
})
