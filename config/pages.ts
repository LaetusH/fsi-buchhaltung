import type { AppPage } from '~/types/page'
import LoginPage from '~/components/Page/Login.vue'
import HomePage from '~/components/Page/Home.vue'
import FinancesPage from '~/components/Page/Finances/Overview.vue'
import ReceiptListPage from '~/components/Page/Finances/Receipt/List.vue'
import ReceiptCreatePage from '~/components/Page/Finances/Receipt/Create.vue'
import ReimbursementListPage from '~/components/Page/Finances/Reimbursement/List.vue'
import ReimbursementCreatePage from '~/components/Page/Finances/Reimbursement/Create.vue'
import CashCountListPage from '~/components/Page/Finances/CashCount/List.vue'
import CashCountCreatePage from '~/components/Page/Finances/CashCount/Create.vue'
import FinanceAnalysisPage from '~/components/Page/Finances/Analysis.vue'
import EventListPage from '~/components/Page/Events/List.vue'
import EventCreatePage from '~/components/Page/Events/Create.vue'
import MemberListPage from '~/components/Page/Members/List.vue'
import MemberCreatePage from '~/components/Page/Members/Create.vue'
import SettingsPage from '~/components/Page/Settings/Overview.vue'

// Do not display more than 8 pages at once
export const PAGES: Record<string, AppPage> = {
  Login: { main: true, labelKey: 'pages.login', component: LoginPage, icon: '', permissions: [], allowGuest: true },
  Home: { main: true, labelKey: 'pages.home', component: HomePage, icon: '', permissions: ['pages.home.view'] },
  Finances: { main: true, labelKey: 'pages.finances', component: FinancesPage, icon: '', permissions: ['receipts.view', 'reimbursements.view', 'cash_counts.view'] },
  ReceiptList: { main: false, labelKey: 'pages.receipts', component: ReceiptListPage, permissions: ['receipts.view'] },
  ReceiptCreate: { main: false, labelKey: 'pages.createReceipt', component: ReceiptCreatePage, permissions: ['receipts.view'] },
  ReimbursementList: { main: false, labelKey: 'pages.reimbursements', component: ReimbursementListPage, permissions: ['reimbursements.view'] },
  ReimbursementCreate: { main: false, labelKey: 'pages.createReimbursement', component: ReimbursementCreatePage, permissions: ['reimbursements.view'] },
  CashCountList: { main: false, labelKey: 'pages.cashCounts', component: CashCountListPage, permissions: ['cash_counts.view'] },
  CashCountCreate: { main: false, labelKey: 'pages.createCashCount', component: CashCountCreatePage, permissions: ['cash_counts.view'] },
  FinanceAnalysis: { main: true, labelKey: 'pages.financeAnalysis', component: FinanceAnalysisPage, icon: '', permissions: ['receipts.view', 'cash_counts.view'], requireAllPermissions: true },
  Events: { main: true, labelKey: 'pages.events', component: EventListPage, icon: '', permissions: ['events.view'] },
  EventCreate: { main: false, labelKey: 'pages.createEvent', component: EventCreatePage, permissions: ['events.view'] },
  MemberList: { main: true, labelKey: 'pages.members', component: MemberListPage, icon: '', permissions: ['members.view'] },
  MemberCreate: { main: false, labelKey: 'pages.createMember', component: MemberCreatePage, permissions: ['members.view'] },
  Settings: { main: true, labelKey: 'pages.settings', component: SettingsPage, icon: '', permissions: ['settings.access'] },
}
