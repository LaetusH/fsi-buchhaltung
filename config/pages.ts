import type { AppPage } from '~/types/page'
import LoginPage from '~/components/Page/Login.vue'
import HomePage from '~/components/Page/Home.vue'
import ReceiptPage from '~/components/Page/Finances/ReceiptCreate.vue'
import SettingsPage from '~/components/Page/Settings/Overview.vue'

// Do not display more than 8 pages at once
export const PAGES: Record<string, AppPage> = {
  Login: { label: 'Login', component: LoginPage, icon: '', roles: ['guest'] },
  Home: { label: 'Home', component: HomePage, icon: '', roles: ['user', 'admin'] },
  Receipt: { label: 'Receipt', component: ReceiptPage, icon: '', roles: ['admin'] },
  Settings: { label: 'Settings', component: SettingsPage, icon: '', roles: ['admin'] },
}