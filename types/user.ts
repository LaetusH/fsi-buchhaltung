export const USER_ROLES = ['user', 'admin']
export type UserRole = typeof USER_ROLES[number]

export interface User {
  id: number
  username: string
  role: UserRole
  is_active: boolean
}