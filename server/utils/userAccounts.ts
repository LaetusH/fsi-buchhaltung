import type mariadb from 'mariadb'
import { hashPassword } from '~/server/utils/auth'
import { query } from '~/server/utils/db'
import { assignDefaultRoleToUser } from '~/server/utils/roles'
import { MIN_PASSWORD_LENGTH } from '~/config/validation'

export interface CreateUserAccountInput {
  username: string
  password: string
  is_active?: boolean
  must_change_password?: boolean
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
  const mustChangePassword = input.must_change_password === true

  if (!username || !password) throw new Error('Missing fields')
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error('Password too short')

  const passwordHash = await hashPassword(password)

  try {
    const result = await query<any>(
      `INSERT INTO users (username, password_hash, is_active, must_change_password) VALUES (?, ?, ?, ?)`,
      [username, passwordHash, isActive ? 1 : 0, mustChangePassword ? 1 : 0],
      conn
    )

    const userId = Number(result.insertId)
    await assignDefaultRoleToUser(userId, conn)

    return userId
  } catch (err: unknown) {
    const error = err as MysqlError
    if (error.code === 'ER_DUP_ENTRY') throw new DuplicateUsernameError()
    throw err
  }
}

export async function assignMemberToUser(
  userId: number,
  memberId: number | null,
  _changedByUserId: number,
  conn?: mariadb.PoolConnection
) {
  if (memberId === null) {
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

  await query(`UPDATE members SET account = NULL WHERE account = ? AND id <> ?`, [userId, memberId], conn)
  await query(`UPDATE members SET account = ? WHERE id = ?`, [userId, memberId], conn)
}
