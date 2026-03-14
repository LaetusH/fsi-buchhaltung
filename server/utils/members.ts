import type mariadb from 'mariadb'
import { query } from '~/server/utils/db'
import { MemberStatus, type SaveMemberBody } from '~/types/member'

export function isMemberStatus(value: unknown): value is MemberStatus {
  return value === MemberStatus.Active
    || value === MemberStatus.Passive
    || value === MemberStatus.Hold
    || value === MemberStatus.Left
}

export function parseMemberStatus(value: unknown): MemberStatus {
  return isMemberStatus(value) ? value : MemberStatus.Active
}

export function validateMemberPayload(body: SaveMemberBody) {
  if (!body.first_name || !body.last_name || !body.birthdate || !body.street || !body.street_number || !body.postal_code || !body.city || !body.phone || !body.email || !body.status || !body.applied_at || !body.joined_at || !body.subject_name?.trim()) {
    return 'Missing fields'
  }
  if (!isMemberStatus(body.status)) return 'Invalid status'
  if (body.status === MemberStatus.Left && !body.left_at) return 'Status left requires left_at'
  if (body.status !== MemberStatus.Left && body.left_at) return 'left_at is only allowed with status left'
  return null
}

export async function ensureSubjectId(subjectName: string, createdBy: number, conn: mariadb.PoolConnection) {
  const name = subjectName.trim()

  const existing = await query<{ id: number }[]>(
    `SELECT id FROM subjects WHERE LOWER(name) = LOWER(?) LIMIT 1`,
    [name],
    conn,
  )

  if (existing.length) return Number(existing[0]!.id)

  const created = await query<any>(
    `INSERT INTO subjects (name, created_by) VALUES (?, ?)`,
    [name, createdBy],
    conn,
  )

  return Number(created.insertId)
}
