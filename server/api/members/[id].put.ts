import { defineEventHandler, readBody } from 'h3'
import type { SaveMemberBody } from '~/types/member'
import { query, withTransaction } from '~/server/utils/db'
import { logFieldChanges } from '~/server/utils/api/audit'
import { requirePermission } from '~/server/utils/api/guards'
import { getNumericRouteParam } from '~/server/utils/api/request'
import { ensureSubjectId, validateMemberPayload } from '~/server/utils/members'

interface UpdateMemberSuccess {
  ok: true
  id: number
}

interface UpdateMemberError {
  ok: false
  error: string
}

type UpdateMemberResponse = UpdateMemberSuccess | UpdateMemberError

export default defineEventHandler(async (event): Promise<UpdateMemberResponse> => {
  const current = await requirePermission(event, 'members.edit', { touch: false })
  if (!current.ok) return current

  const memberId = getNumericRouteParam(event)
  if (!memberId) return { ok: false, error: 'Missing member id' }

  const body = await readBody<SaveMemberBody>(event)
  const validationError = validateMemberPayload(body)
  if (validationError) return { ok: false, error: validationError }

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

      await logFieldChanges({
        entityType: 'member',
        entityId: memberId,
        fields: Object.keys(updatedFields) as (keyof typeof updatedFields)[],
        previous: existing,
        next: updatedFields,
        userId: current.user.id,
        conn,
      })

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
