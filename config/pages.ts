import type { AppPage } from '~/types/page'
import LoginPage from '~/components/Page/Login.vue'
import HomePage from '~/components/Page/Home.vue'

// Do not display more than 8 pages at once
export const PAGES: Record<string, AppPage> = {
  Login: { label: 'Login', component: LoginPage, icon: '', roles: ['guest'] },
  Home: { label: 'Home', component: HomePage, icon: '', roles: ['user', 'admin'] },
}