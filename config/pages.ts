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
  Login: { main: true, labelKey: 'pages.login', component: LoginPage, icon: '', permissions: [], allowGuest: true },
  Home: { main: true, labelKey: 'pages.home', component: HomePage, icon: '', permissions: ['pages.home.view'] },
  ReceiptList: { main: true, labelKey: 'pages.receipts', component: ReceiptListPage, icon: '', permissions: ['receipts.view'] },
  ReceiptCreate: { main: false, labelKey: 'pages.createReceipt', component: ReceiptCreatePage, permissions: ['receipts.view'] },
  ReimbursementList: { main: true, labelKey: 'pages.reimbursements', component: ReimbursementListPage, icon: '', permissions: ['reimbursements.view'] },
  ReimbursementCreate: { main: false, labelKey: 'pages.createReimbursement', component: ReimbursementCreatePage, permissions: ['reimbursements.view'] },
  MemberList: { main: true, labelKey: 'pages.members', component: MemberListPage, icon: '', permissions: ['members.view'] },
  MemberCreate: { main: false, labelKey: 'pages.createMember', component: MemberCreatePage, permissions: ['members.view'] },
  Settings: { main: true, labelKey: 'pages.settings', component: SettingsPage, icon: '', permissions: ['settings.access'] },
}
