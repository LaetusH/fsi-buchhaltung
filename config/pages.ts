import type { AppPage } from '~/types/page'
import LoginPage from '~/components/Page/Login.vue'
import HomePage from '~/components/Page/Home.vue'
import FinancesPage from '~/components/Page/Finances/Overview.vue'
import ReceiptListPage from '~/components/Page/Finances/Receipt/List.vue'
import ReceiptCreatePage from '~/components/Page/Finances/Receipt/Create.vue'
import InvoiceListPage from '~/components/Page/Finances/Invoice/List.vue'
import InvoiceCreatePage from '~/components/Page/Finances/Invoice/Create.vue'
import ReimbursementListPage from '~/components/Page/Finances/Reimbursement/List.vue'
import ReimbursementCreatePage from '~/components/Page/Finances/Reimbursement/Create.vue'
import CashCountListPage from '~/components/Page/Finances/CashCount/List.vue'
import CashCountCreatePage from '~/components/Page/Finances/CashCount/Create.vue'
import BudgetListPage from '~/components/Page/Finances/Budget/List.vue'
import BudgetCreatePage from '~/components/Page/Finances/Budget/Create.vue'
import FinanceAnalysisPage from '~/components/Page/Finances/Analysis.vue'
import EventListPage from '~/components/Page/Events/List.vue'
import EventPlanningWorkspacePage from '~/components/Page/Events/PlanningWorkspace.vue'
import MemberListPage from '~/components/Page/Members/List.vue'
import MemberCreatePage from '~/components/Page/Members/Create.vue'
import SettingsPage from '~/components/Page/Settings/Overview.vue'

// Do not display more than 8 pages at once
export const PAGES: Record<string, AppPage> = {
  Login: { main: true, labelKey: 'pages.login', component: LoginPage, icon: 'material-symbols:login-rounded', permissions: [], allowGuest: true },
  Home: { main: true, labelKey: 'pages.home', component: HomePage, icon: 'material-symbols:home-rounded', permissions: ['pages.home.view'] },
  Finances: { main: true, labelKey: 'pages.finances', component: FinancesPage, icon: 'ri:money-euro-circle-fill', permissions: ['receipts.view', 'invoices.view', 'reimbursements.view', 'cash_counts.view', 'budgets.view'] },
  ReceiptList: { main: false, labelKey: 'pages.receipts', component: ReceiptListPage, permissions: ['receipts.view'] },
  ReceiptCreate: { main: false, labelKey: 'pages.createReceipt', component: ReceiptCreatePage, permissions: ['receipts.view'], preserveOnRefresh: true },
  InvoiceList: { main: false, labelKey: 'pages.invoices', component: InvoiceListPage, permissions: ['invoices.view'] },
  InvoiceCreate: { main: false, labelKey: 'pages.createInvoice', component: InvoiceCreatePage, permissions: ['invoices.view'], preserveOnRefresh: true },
  ReimbursementList: { main: false, labelKey: 'pages.reimbursements', component: ReimbursementListPage, permissions: ['reimbursements.view'] },
  ReimbursementCreate: { main: false, labelKey: 'pages.createReimbursement', component: ReimbursementCreatePage, permissions: ['reimbursements.view'], preserveOnRefresh: true },
  CashCountList: { main: false, labelKey: 'pages.cashCounts', component: CashCountListPage, permissions: ['cash_counts.view'] },
  CashCountCreate: { main: false, labelKey: 'pages.createCashCount', component: CashCountCreatePage, permissions: ['cash_counts.view'], preserveOnRefresh: true },
  BudgetList: { main: false, labelKey: 'pages.budgets', component: BudgetListPage, permissions: ['budgets.view'] },
  BudgetCreate: { main: false, labelKey: 'pages.createBudget', component: BudgetCreatePage, permissions: ['budgets.view'], preserveOnRefresh: true },
  FinanceAnalysis: { main: true, labelKey: 'pages.financeAnalysis', component: FinanceAnalysisPage, icon: 'material-symbols:query-stats-rounded', permissions: ['receipts.view', 'cash_counts.view', 'invoices.view'], requireAllPermissions: true },
  Events: { main: true, labelKey: 'pages.events', component: EventListPage, icon: 'material-symbols:event-rounded', permissions: ['events.view'] },
  EventCreate: { main: false, labelKey: 'pages.createEvent', component: EventPlanningWorkspacePage, permissions: ['events.view'], preserveOnRefresh: true },
  MemberList: { main: true, labelKey: 'pages.members', component: MemberListPage, icon: 'material-symbols:groups-rounded', permissions: ['members.view'] },
  MemberCreate: { main: false, labelKey: 'pages.createMember', component: MemberCreatePage, permissions: ['members.view'], preserveOnRefresh: true },
  Settings: { main: true, labelKey: 'pages.settings', component: SettingsPage, icon: 'material-symbols:settings-rounded', permissions: ['settings.access'], preserveOnRefresh: true },
}
