import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { normalizeBigInt } from '~/server/utils/normalize'
import { requirePermission } from '~/server/utils/api/guards'
import type {
  AssociationProfileRow,
  AssociationResponsibleMemberOption,
  AssociationResponsiblePositionOption,
} from '~/types/association'

interface AssociationProfileBaseRow {
  id: number
  name: string
  short_name: string | null
  street: string
  street_number: string
  postal_code: string
  city: string
  email: string
  phone: string | null
  website: string | null
  vat_id: string | null
  iban: string | null
  bic: string | null
  bankname: string | null
  register_number: string | null
  register_court: string | null
  created_at: string
}

interface AssociationMemberRow {
  id: number
  full_name: string
  subject_name: string | null
}

interface AssociationPositionRow {
  id: number
  code: string
  name: string
  is_active: boolean
  member_id: number | null
  full_name: string | null
}

interface GetAssociationProfileSuccess {
  ok: true
  profile: AssociationProfileRow | null
  members: AssociationResponsibleMemberOption[]
  positions: AssociationResponsiblePositionOption[]
}

interface GetAssociationProfileError {
  ok: false
  error: string
}

type GetAssociationProfileResponse = GetAssociationProfileSuccess | GetAssociationProfileError

export default defineEventHandler(async (event): Promise<GetAssociationProfileResponse> => {
  const current = await requirePermission(event, 'settings.association.manage')
  if (!current.ok) return current

  const [profileRows, memberRows, positionRows, responsibleMemberRows, responsiblePositionRows] = await Promise.all([
    query<AssociationProfileBaseRow[]>(`
      SELECT
        id, name, short_name, street, street_number, postal_code, city, email, phone, website,
        vat_id, iban, bic, bankname, register_number, register_court, created_at
      FROM association_profiles
      ORDER BY id ASC
      LIMIT 1
    `),
    query<AssociationMemberRow[]>(`
      SELECT
        m.id,
        TRIM(CONCAT(m.first_name, ' ', m.last_name)) AS full_name,
        s.name AS subject_name
      FROM members m
      LEFT JOIN subjects s ON s.id = m.subject
      ORDER BY m.last_name ASC, m.first_name ASC
    `),
    query<AssociationPositionRow[]>(`
      SELECT
        p.id,
        p.code,
        p.name,
        p.is_active,
        mp.member_id,
        TRIM(CONCAT(m.first_name, ' ', m.last_name)) AS full_name
      FROM positions p
      LEFT JOIN member_positions mp
        ON mp.position_id = p.id
        AND mp.since <= CURRENT_DATE()
        AND (mp.until IS NULL OR mp.until >= CURRENT_DATE())
      LEFT JOIN members m ON m.id = mp.member_id
      ORDER BY p.code ASC, m.last_name ASC, m.first_name ASC
    `),
    query<{ member_id: number }[]>(`
      SELECT member_id
      FROM association_responsible_members
      ORDER BY member_id ASC
    `),
    query<{ position_id: number }[]>(`
      SELECT position_id
      FROM association_responsible_positions
      ORDER BY position_id ASC
    `),
  ])

  const normalizedMembers = normalizeBigInt(memberRows) as AssociationMemberRow[]
  const normalizedPositions = normalizeBigInt(positionRows) as AssociationPositionRow[]
  const groupedPositions = new Map<number, AssociationResponsiblePositionOption>()

  for (const row of normalizedPositions) {
    const id = Number(row.id)
    if (!groupedPositions.has(id)) {
      groupedPositions.set(id, {
        id,
        code: String(row.code),
        name: String(row.name),
        is_active: Boolean(row.is_active),
        current_holder_names: [],
      })
    }

    if (row.full_name && !groupedPositions.get(id)!.current_holder_names.includes(String(row.full_name))) {
      groupedPositions.get(id)!.current_holder_names.push(String(row.full_name))
    }
  }

  const profile = (normalizeBigInt(profileRows) as AssociationProfileBaseRow[])[0]
  return {
    ok: true,
    profile: profile
      ? {
          ...profile,
          id: Number(profile.id),
          responsible_member_ids: (normalizeBigInt(responsibleMemberRows) as { member_id: number }[]).map(row => Number(row.member_id)),
          responsible_position_ids: (normalizeBigInt(responsiblePositionRows) as { position_id: number }[]).map(row => Number(row.position_id)),
        }
      : null,
    members: normalizedMembers.map(row => ({
      id: Number(row.id),
      full_name: String(row.full_name),
      subject_name: row.subject_name ? String(row.subject_name) : null,
    })),
    positions: Array.from(groupedPositions.values()),
  }
})
