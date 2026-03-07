import { defineEventHandler, readBody } from 'h3'
import { MemberStatus, type SaveMemberBody } from '~/types/member'
import { query, withTransaction } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'

interface CreateMemberSuccess {
  ok: true
  id: number
}

interface CreateMemberError {
  ok: false
  error: string
}

type CreateMemberResponse = CreateMemberSuccess | CreateMemberError

function isMemberStatus(value: unknown): value is MemberStatus {
  return value === MemberStatus.Active || value === MemberStatus.Passive || value === MemberStatus.Left
}

async function ensureSubjectId(subjectName: string, createdBy: number, conn: any) {
  const name = subjectName.trim()

  const existing = await query<{ id: number }[]>(
    `SELECT id FROM subjects WHERE LOWER(name) = LOWER(?) LIMIT 1`,
    [name],
    conn
  )

  if (existing.length) return Number(existing[0]!.id)

  const created = await query<any>(
    `INSERT INTO subjects (name, created_by) VALUES (?, ?)`,
    [name, createdBy],
    conn
  )

  return Number(created.insertId)
}

export default defineEventHandler(async (event): Promise<CreateMemberResponse> => {
  const current = await getCurrentUserFromEvent(event, false)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  const body = await readBody<SaveMemberBody>(event)

  if (!body.first_name || !body.last_name || !body.birthdate || !body.street || !body.street_number || !body.postal_code || !body.city || !body.phone || !body.email || !body.status || !body.applied_at || !body.joined_at || !body.subject_name?.trim()) {
    return { ok: false, error: 'Missing fields' }
  }
  if (!isMemberStatus(body.status)) return { ok: false, error: 'Invalid status' }
  if (body.status === MemberStatus.Left && !body.left_at) {
    return { ok: false, error: 'Status left requires left_at' }
  }
  if (body.status !== MemberStatus.Left && body.left_at) {
    return { ok: false, error: 'left_at is only allowed with status left' }
  }

  try {
    return await withTransaction(async (conn) => {
      const subjectId = await ensureSubjectId(body.subject_name, current.user.id, conn)

      const insertMemberRes = await query<any>(
        `INSERT INTO members
          (account, last_name, first_name, birthdate, street, street_number, postal_code, city, subject, phone, email, notes, status, honorary, applied_at, joined_at, left_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          body.account ?? null,
          body.last_name,
          body.first_name,
          body.birthdate,
          body.street,
          body.street_number,
          body.postal_code,
          body.city,
          subjectId,
          body.phone,
          body.email,
          body.notes ?? null,
          body.status,
          body.honorary ? 1 : 0,
          body.applied_at,
          body.joined_at,
          body.left_at || null,
          current.user.id,
        ],
        conn
      )

      const memberId = Number(insertMemberRes.insertId)

      if (Array.isArray(body.positions) && body.positions.length) {
        for (const position of body.positions) {
          if (!position.position_id || !position.since) continue

          await query(
            `INSERT INTO member_positions (member_id, position_id, since, until)
             VALUES (?, ?, ?, ?)`,
            [memberId, position.position_id, position.since, position.until || null],
            conn
          )
        }
      }

      return { ok: true, id: memberId }
    })
  } catch (err: any) {
    return { ok: false, error: `Failed to create member: ${err?.code || err}` }
  }
})
