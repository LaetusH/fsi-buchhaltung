import type { UserRole } from '~/types/user'
import type { Component } from 'vue'
import { PAGES } from '~/config/pages'

export type AppPage = MainPage | SubPage

interface MainPage {
  main: true
  label: string
  component: Component
  icon: string
  roles: UserRole[]
}

interface SubPage {
  main: false
  label: string
  component: Component
  roles: UserRole[]
}

export type PageName = keyof typeof PAGES