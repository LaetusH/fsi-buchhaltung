import type { AppPage } from '~/types/page'
import LoginPage from '~/components/Page/Login.vue'
import HomePage from '~/components/Page/Home.vue'
import ReceiptListPage from '~/components/Page/Finances/Receipt/List.vue'
import ReceiptCreatePage from '~/components/Page/Finances/Receipt/Create.vue'
import ReimbursementListPage from '~/components/Page/Finances/Reimbursement/List.vue'
import ReimbursementCreatePage from '~/components/Page/Finances/Reimbursement/Create.vue'
import MemberListPage from '~/components/Page/Members/List.vue'
import MemberCreatePage from '~/components/Page/Members/Create.vue'
import SettingsPage from '~/components/Page/Settings/Overview.vue'

// Do not display more than 8 pages at once
export const PAGES: Record<string, AppPage> = {
  Login: { main: true, labelKey: 'pages.login', component: LoginPage, icon: '', roles: ['guest'] },
  Home: { main: true, labelKey: 'pages.home', component: HomePage, icon: '', roles: ['user', 'admin'] },
  ReceiptList: { main: true, labelKey: 'pages.receipts', component: ReceiptListPage, icon: '', roles: ['admin'] },
  ReceiptCreate: { main: false, labelKey: 'pages.createReceipt', component: ReceiptCreatePage, roles: ['admin'] },
  ReimbursementList: { main: true, labelKey: 'pages.reimbursements', component: ReimbursementListPage, icon: '', roles: ['admin'] },
  ReimbursementCreate: { main: false, labelKey: 'pages.createReimbursement', component: ReimbursementCreatePage, roles: ['admin'] },
  MemberList: { main: true, labelKey: 'pages.members', component: MemberListPage, icon: '', roles: ['admin'] },
  MemberCreate: { main: false, labelKey: 'pages.createMember', component: MemberCreatePage, roles: ['admin'] },
  Settings: { main: true, labelKey: 'pages.settings', component: SettingsPage, icon: '', roles: ['admin'] },
}
