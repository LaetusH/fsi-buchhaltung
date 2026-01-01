import type { UserRole } from '~/types/user'
import type { Component } from 'vue'
import { PAGES } from '~/config/pages'

export interface AppPage {
  label: string
  component: Component
  icon: string
  roles: UserRole[]
}

export type PageName = keyof typeof PAGES