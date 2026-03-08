import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { MemberStatus, type SaveMemberBody } from '~/types/member'
import { logChange } from '~/server/utils/changeLogger'
import { query, withTransaction } from '~/server/utils/db'
import { getCurrentUserFromEvent } from '~/server/utils/sessionGuard'

interface UpdateMemberSuccess {
  ok: true
  id: number
}

interface UpdateMemberError {
  ok: false
  error: string
}

type UpdateMemberResponse = UpdateMemberSuccess | UpdateMemberError

function isMemberStatus(value: unknown): value is MemberStatus {
  return value === MemberStatus.Active || value === MemberStatus.Passive || value === MemberStatus.Hold || value === MemberStatus.Left
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

export default defineEventHandler(async (event): Promise<UpdateMemberResponse> => {
  const current = await getCurrentUserFromEvent(event, false)
  if (!current.ok) return { ok: false, error: 'Not authenticated' }

  const memberId = Number(getRouterParam(event, 'id'))
  if (!memberId) return { ok: false, error: 'Missing member id' }

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
      const existingRows = await query<any[]>(`SELECT * FROM members WHERE id = ? LIMIT 1`, [memberId], conn)
      const existing = existingRows[0]
      if (!existing) return { ok: false, error: 'Member not found' }

      const subjectId = await ensureSubjectId(body.subject_name, current.user.id, conn)

      const updatedFields = {
        account: body.account ?? null,
        last_name: body.last_name,
        first_name: body.first_name,
        birthdate: body.birthdate,
        street: body.street,
        street_number: body.street_number,
        postal_code: body.postal_code,
        city: body.city,
        subject: subjectId,
        phone: body.phone,
        email: body.email,
        notes: body.notes ?? null,
        status: body.status,
        honorary: body.honorary ? 1 : 0,
        applied_at: body.applied_at,
        joined_at: body.joined_at,
        left_at: body.left_at || null,
      }

      for (const [field, value] of Object.entries(updatedFields)) {
        await logChange({
          entityType: 'member',
          entityId: memberId,
          subEntityType: null,
          subEntityId: null,
          field,
          oldValue: existing[field],
          newValue: value,
          userId: current.user.id,
        }, conn)
      }

      await query(
        `UPDATE members
         SET account = ?, last_name = ?, first_name = ?, birthdate = ?, street = ?, street_number = ?, postal_code = ?, city = ?, subject = ?, phone = ?, email = ?, notes = ?, status = ?, honorary = ?, applied_at = ?, joined_at = ?, left_at = ?
         WHERE id = ?`,
        [
          updatedFields.account,
          updatedFields.last_name,
          updatedFields.first_name,
          updatedFields.birthdate,
          updatedFields.street,
          updatedFields.street_number,
          updatedFields.postal_code,
          updatedFields.city,
          updatedFields.subject,
          updatedFields.phone,
          updatedFields.email,
          updatedFields.notes,
          updatedFields.status,
          updatedFields.honorary,
          updatedFields.applied_at,
          updatedFields.joined_at,
          updatedFields.left_at,
          memberId,
        ],
        conn
      )

      await query(`DELETE FROM member_positions WHERE member_id = ?`, [memberId], conn)

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
    return { ok: false, error: `Failed to update member: ${err?.code || err}` }
  }
})
