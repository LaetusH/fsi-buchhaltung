import type mariadb from 'mariadb'
import { hashPassword } from '~/server/utils/auth'
import { logChange } from '~/server/utils/changeLogger'
import { query } from '~/server/utils/db'

export interface CreateUserAccountInput {
  username: string
  password: string
  is_active?: boolean
}

interface MysqlError extends Error {
  code?: string
}

export class DuplicateUsernameError extends Error {
  constructor() {
    super('Username already exists')
    this.name = 'DuplicateUsernameError'
  }
}

export class MemberAlreadyLinkedError extends Error {
  constructor() {
    super('Member already linked to another user')
    this.name = 'MemberAlreadyLinkedError'
  }
}

export class MemberNotFoundError extends Error {
  constructor() {
    super('Member not found')
    this.name = 'MemberNotFoundError'
  }
}

export async function createUserAccount(input: CreateUserAccountInput, conn?: mariadb.PoolConnection): Promise<number> {
  const username = input.username.trim()
  const password = input.password
  const isActive = input.is_active !== false

  if (!username || !password) throw new Error('Missing fields')

  const passwordHash = await hashPassword(password)

  try {
    const result = await query<any>(
      `INSERT INTO users (username, password_hash, is_active) VALUES (?, ?, ?)`,
      [username, passwordHash, isActive ? 1 : 0],
      conn
    )

    return Number(result.insertId)
  } catch (err: unknown) {
    const error = err as MysqlError
    if (error.code === 'ER_DUP_ENTRY') throw new DuplicateUsernameError()
    throw err
  }
}

export async function assignMemberToUser(
  userId: number,
  memberId: number | null,
  changedByUserId: number,
  conn?: mariadb.PoolConnection
) {
  if (memberId === null) {
    const existingLinks = await query<{ id: number, account: number | null }[]>(
      `SELECT id, account FROM members WHERE account = ?`,
      [userId],
      conn
    )

    for (const linkedMember of existingLinks) {
      await logChange({
        entityType: 'member',
        entityId: Number(linkedMember.id),
        subEntityType: null,
        subEntityId: null,
        field: 'account',
        oldValue: linkedMember.account,
        newValue: null,
        userId: changedByUserId,
      }, conn)
    }

    await query(`UPDATE members SET account = NULL WHERE account = ?`, [userId], conn)
    return
  }

  const memberRows = await query<{ id: number, account: number | null }[]>(
    `SELECT id, account FROM members WHERE id = ? LIMIT 1`,
    [memberId],
    conn
  )
  const member = memberRows[0]
  if (!member) throw new MemberNotFoundError()
  if (member.account !== null && Number(member.account) !== userId) {
    throw new MemberAlreadyLinkedError()
  }

  const previousLinks = await query<{ id: number, account: number | null }[]>(
    `SELECT id, account FROM members WHERE account = ? AND id <> ?`,
    [userId, memberId],
    conn
  )

  for (const linkedMember of previousLinks) {
    await logChange({
      entityType: 'member',
      entityId: Number(linkedMember.id),
      subEntityType: null,
      subEntityId: null,
      field: 'account',
      oldValue: linkedMember.account,
      newValue: null,
      userId: changedByUserId,
    }, conn)
  }

  if (member.account !== userId) {
    await logChange({
      entityType: 'member',
      entityId: Number(member.id),
      subEntityType: null,
      subEntityId: null,
      field: 'account',
      oldValue: member.account,
      newValue: userId,
      userId: changedByUserId,
    }, conn)
  }

  await query(`UPDATE members SET account = NULL WHERE account = ? AND id <> ?`, [userId, memberId], conn)
  await query(`UPDATE members SET account = ? WHERE id = ?`, [userId, memberId], conn)
}
