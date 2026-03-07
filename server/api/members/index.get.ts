import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'
import type { MemberListItem } from '~/types/member'

interface GetMembersSuccess {
  ok: true
  members: MemberListItem[]
}

interface GetMembersError {
  ok: false
  error: string
}

type GetMembersResponse = GetMembersSuccess | GetMembersError

export default defineEventHandler(async (event): Promise<GetMembersResponse> => {
  const current = await getCurrentUserFromEvent(event, true)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  try {
    const rows: any[] = await query(
      `
      SELECT id, first_name, last_name
      FROM members
      ORDER BY last_name ASC, first_name ASC
      `
    )

    return {
      ok: true,
      members: rows.map(row => ({
        id: Number(row.id),
        first_name: String(row.first_name),
        last_name: String(row.last_name),
      }))
    }
  } catch (err: any) {
    return { ok: false, error: `Failed to load members: ${err}` }
  }
})
