import { defineEventHandler, readBody } from 'h3'
import { logFieldChanges } from '~/server/utils/api/audit'
import { requirePermission } from '~/server/utils/api/guards'
import {
  normalizeAssociationProfileBody,
  syncAssociationResponsibleMembers,
  syncAssociationResponsiblePositions,
  validateAssociationReferences,
  validateAssociationProfilePayload,
} from '~/server/utils/association'
import { query, withTransaction } from '~/server/utils/db'
import { normalizeBigInt } from '~/server/utils/normalize'
import type { AssociationProfileRow } from '~/types/association'

interface SaveAssociationProfileSuccess {
  ok: true
  id: number
}

interface SaveAssociationProfileError {
  ok: false
  error: string
}

type SaveAssociationProfileResponse = SaveAssociationProfileSuccess | SaveAssociationProfileError

interface MysqlError extends Error {
  code?: string
}

export default defineEventHandler(async (event): Promise<SaveAssociationProfileResponse> => {
  const current = await requirePermission(event, 'settings.association.manage', { touch: false })
  if (!current.ok) return current

  const rawBody = await readBody<Record<string, unknown>>(event)
  const updated = normalizeAssociationProfileBody(rawBody)
  const validationError = validateAssociationProfilePayload(updated)
  if (validationError) return { ok: false, error: validationError }
  if (!updated) return { ok: false, error: 'Invalid payload' }

  try {
    return await withTransaction(async (conn) => {
      const referenceValidation = await validateAssociationReferences({
        memberIds: updated.responsible_member_ids,
        positionIds: updated.responsible_position_ids,
        conn,
      })
      if (!referenceValidation.ok) return referenceValidation

      const existingRows = normalizeBigInt(await query<AssociationProfileRow[]>(`
        SELECT
          id, name, short_name, street, street_number, postal_code, city, email, phone, website,
          vat_id, iban, bic, bankname, register_number, register_court, created_at
        FROM association_profiles
        ORDER BY id ASC
        LIMIT 1
      `, [], conn)) as AssociationProfileRow[]

      const existing = existingRows[0] ?? null

      if (existing) {
        const existingMemberRows = normalizeBigInt(await query<{ member_id: number }[]>(
          `SELECT member_id
           FROM association_responsible_members
           WHERE association_profile_id = ?
           ORDER BY member_id ASC`,
          [existing.id],
          conn,
        )) as { member_id: number }[]
        const existingPositionRows = normalizeBigInt(await query<{ position_id: number }[]>(
          `SELECT position_id
           FROM association_responsible_positions
           WHERE association_profile_id = ?
           ORDER BY position_id ASC`,
          [existing.id],
          conn,
        )) as { position_id: number }[]

        const fields = [
          'name',
          'short_name',
          'street',
          'street_number',
          'postal_code',
          'city',
          'email',
          'phone',
          'website',
          'vat_id',
          'iban',
          'bic',
          'bankname',
          'register_number',
          'register_court',
        ] as const

        await logFieldChanges({
          entityType: 'association_profile',
          entityId: existing.id,
          fields,
          previous: existing,
          next: updated,
          userId: current.user.id,
          conn,
        })

        await query(
          `UPDATE association_profiles
           SET
             name = ?,
             short_name = ?,
             street = ?,
             street_number = ?,
             postal_code = ?,
             city = ?,
             email = ?,
             phone = ?,
             website = ?,
             vat_id = ?,
             iban = ?,
             bic = ?,
             bankname = ?,
             register_number = ?,
             register_court = ?
           WHERE id = ?`,
          [
            updated.name,
            updated.short_name,
            updated.street,
            updated.street_number,
            updated.postal_code,
            updated.city,
            updated.email,
            updated.phone,
            updated.website,
            updated.vat_id,
            updated.iban,
            updated.bic,
            updated.bankname,
            updated.register_number,
            updated.register_court,
            existing.id,
          ],
          conn,
        )

        const memberSync = await syncAssociationResponsibleMembers({
          profileId: existing.id,
          existingIds: existingMemberRows.map(row => Number(row.member_id)),
          nextIds: updated.responsible_member_ids,
          userId: current.user.id,
          conn,
        })
        if (!memberSync.ok) return memberSync

        const positionSync = await syncAssociationResponsiblePositions({
          profileId: existing.id,
          existingIds: existingPositionRows.map(row => Number(row.position_id)),
          nextIds: updated.responsible_position_ids,
          userId: current.user.id,
          conn,
        })
        if (!positionSync.ok) return positionSync

        return { ok: true, id: existing.id }
      }

      const res = await query<{ insertId: number }>(
        `INSERT INTO association_profiles (
          singleton_key, name, short_name, street, street_number, postal_code, city, email, phone, website,
          vat_id, iban, bic, bankname, register_number, register_court, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          1,
          updated.name,
          updated.short_name,
          updated.street,
          updated.street_number,
          updated.postal_code,
          updated.city,
          updated.email,
          updated.phone,
          updated.website,
          updated.vat_id,
          updated.iban,
          updated.bic,
          updated.bankname,
          updated.register_number,
          updated.register_court,
          current.user.id,
        ],
        conn,
      )

      const profileId = Number(normalizeBigInt(res.insertId))

      for (const memberId of updated.responsible_member_ids) {
        await query(
          `INSERT INTO association_responsible_members (association_profile_id, member_id, created_by)
           VALUES (?, ?, ?)`,
          [profileId, memberId, current.user.id],
          conn,
        )
      }

      for (const positionId of updated.responsible_position_ids) {
        await query(
          `INSERT INTO association_responsible_positions (association_profile_id, position_id, created_by)
           VALUES (?, ?, ?)`,
          [profileId, positionId, current.user.id],
          conn,
        )
      }

      return { ok: true, id: profileId }
    })
  } catch (err: unknown) {
    const error = err as MysqlError
    return { ok: false, error: `An error occured while saving the association profile: ${error.code ?? 'DB_ERROR'}` }
  }
})
