import type { AppPage } from '~/types/page'
import LoginPage from '~/components/Page/Login.vue'
import HomePage from '~/components/Page/Home.vue'
import ReceiptListPage from '~/components/Page/Finances/Receipt/List.vue'
import ReceiptCreatePage from '~/components/Page/Finances/Receipt/Create.vue'
import ReimbursementListPage from '~/components/Page/Finances/Reimbursement/List.vue'
import ReimbursementCreatePage from '~/components/Page/Finances/Reimbursement/Create.vue'
import SettingsPage from '~/components/Page/Settings/Overview.vue'

// Do not display more than 8 pages at once
export const PAGES: Record<string, AppPage> = {
  Login: { main: true, label: 'Login', component: LoginPage, icon: '', roles: ['guest'] },
  Home: { main: true, label: 'Home', component: HomePage, icon: '', roles: ['user', 'admin'] },
  ReceiptList: { main: true, label: 'Receipts', component: ReceiptListPage, icon: '', roles: ['admin'] },
  ReceiptCreate: { main: false, label: 'Create Receipt', component: ReceiptCreatePage, roles: ['admin'] },
  ReimbursementList: { main: true, label: 'Reimbursements', component: ReimbursementListPage, icon: '', roles: ['admin'] },
  ReimbursementCreate: { main: false, label: 'Create Reimbursement', component: ReimbursementCreatePage, roles: ['admin'] },
  Settings: { main: true, label: 'Settings', component: SettingsPage, icon: '', roles: ['admin'] },
}