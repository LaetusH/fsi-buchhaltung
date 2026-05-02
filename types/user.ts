import type { PermissionKey } from '~/config/permissions'

export interface User {
  id: number
  username: string
  roles: number[]
  permissions: PermissionKey[]
  is_active: boolean
  must_change_password: boolean
}

export interface UserRow {
  id: number
  username: string
  password_hash: string
  is_active: number
  must_change_password: number
}
