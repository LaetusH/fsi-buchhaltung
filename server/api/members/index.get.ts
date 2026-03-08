import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import { MemberStatus, type MemberListItem } from '~/types/member'

interface GetMembersSuccess {
  ok: true
  members: MemberListItem[]
}

interface GetMembersError {
  ok: false
  error: string
}

type GetMembersResponse = GetMembersSuccess | GetMembersError

function parseStatus(value: unknown): MemberStatus {
  if (value === MemberStatus.Active || value === MemberStatus.Passive || value === MemberStatus.Hold || value === MemberStatus.Left) {
    return value
  }
  return MemberStatus.Active
}

export default defineEventHandler(async (event): Promise<GetMembersResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  try {
    const rows: any[] = await query(
      `
      SELECT m.id, m.first_name, m.last_name, m.birthdate, m.status, m.honorary, m.joined_at, m.left_at, s.name AS subject_name
      FROM members m
      LEFT JOIN subjects s ON s.id = m.subject
      ORDER BY m.last_name ASC, m.first_name ASC
      `
    )

    return {
      ok: true,
      members: rows.map(row => ({
        id: Number(row.id),
        first_name: String(row.first_name),
        last_name: String(row.last_name),
        birthdate: String(row.birthdate),
        status: parseStatus(String(row.status)),
        honorary: Boolean(row.honorary),
        subject_name: row.subject_name ? String(row.subject_name) : null,
        joined_at: String(row.joined_at),
        left_at: row.left_at ? String(row.left_at) : null,
      }))
    }
  } catch (err: any) {
    return { ok: false, error: `Failed to load members: ${err}` }
  }
})
