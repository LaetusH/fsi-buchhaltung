export type PermissionKey = 
  | 'pages.home.view'
  | 'members.view'
  | 'members.edit'
  | 'subjects.view'
  | 'subjects.edit'
  | 'positions.view'
  | 'receipts.view'
  | 'receipts.edit'
  | 'reimbursements.view'
  | 'reimbursements.edit'
  | 'companies.view'
  | 'companies.edit'
  | 'spheres.view'
  | 'cost_centres.view'
  | 'settings.access'
  | 'settings.spheres.manage'
  | 'settings.cost_centres.manage'
  | 'settings.positions.manage'
  | 'permissions.manage'
  | 'files.view'
  | 'users.view'
  | 'users.manage'

export interface PermissionDefinition {
  key: PermissionKey
  labelKey: string
  descriptionKey?: string
  categoryKey: string
}

export const PERMISSIONS: PermissionDefinition[] = [
  { key: 'pages.home.view', labelKey: 'permissions.items.pagesHomeView', categoryKey: 'permissions.categories.pages' },
  { key: 'members.view', labelKey: 'permissions.items.membersView', categoryKey: 'permissions.categories.members' },
  { key: 'members.edit', labelKey: 'permissions.items.membersEdit', categoryKey: 'permissions.categories.members' },
  { key: 'subjects.view', labelKey: 'permissions.items.subjectsView', categoryKey: 'permissions.categories.members' },
  { key: 'subjects.edit', labelKey: 'permissions.items.subjectsEdit', categoryKey: 'permissions.categories.members' },
  { key: 'positions.view', labelKey: 'permissions.items.positionsView', categoryKey: 'permissions.categories.members' },
  { key: 'receipts.view', labelKey: 'permissions.items.receiptsView', categoryKey: 'permissions.categories.receipts' },
  { key: 'receipts.edit', labelKey: 'permissions.items.receiptsEdit', categoryKey: 'permissions.categories.receipts' },
  { key: 'reimbursements.view', labelKey: 'permissions.items.reimbursementsView', categoryKey: 'permissions.categories.reimbursements' },
  { key: 'reimbursements.edit', labelKey: 'permissions.items.reimbursementsEdit', categoryKey: 'permissions.categories.reimbursements' },
  { key: 'companies.view', labelKey: 'permissions.items.companiesView', categoryKey: 'permissions.categories.companies' },
  { key: 'companies.edit', labelKey: 'permissions.items.companiesEdit', categoryKey: 'permissions.categories.companies' },
  { key: 'spheres.view', labelKey: 'permissions.items.spheresView', categoryKey: 'permissions.categories.settings' },
  { key: 'cost_centres.view', labelKey: 'permissions.items.costCentresView', categoryKey: 'permissions.categories.settings' },
  { key: 'settings.access', labelKey: 'permissions.items.settingsAccess', categoryKey: 'permissions.categories.settings' },
  { key: 'settings.spheres.manage', labelKey: 'permissions.items.settingsSpheresManage', categoryKey: 'permissions.categories.settings' },
  { key: 'settings.cost_centres.manage', labelKey: 'permissions.items.settingsCostCentresManage', categoryKey: 'permissions.categories.settings' },
  { key: 'settings.positions.manage', labelKey: 'permissions.items.settingsPositionsManage', categoryKey: 'permissions.categories.settings' },
  { key: 'permissions.manage', labelKey: 'permissions.items.permissionsManage', categoryKey: 'permissions.categories.settings' },
  { key: 'files.view', labelKey: 'permissions.items.filesView', categoryKey: 'permissions.categories.files' },
  { key: 'users.view', labelKey: 'permissions.items.usersView', categoryKey: 'permissions.categories.users' },
  { key: 'users.manage', labelKey: 'permissions.items.usersManage', categoryKey: 'permissions.categories.users' },
]

export const implied: Partial<Record<PermissionKey, PermissionKey[]>> = {
  'members.edit': ['members.view'],
  'receipts.edit': ['receipts.view'],
  'reimbursements.edit': ['reimbursements.view'],
  'companies.edit': ['companies.view'],
  'subjects.edit': ['subjects.view'],
  'settings.spheres.manage': ['spheres.view', 'settings.access'],
  'settings.cost_centres.manage': ['cost_centres.view', 'settings.access'],
  'settings.positions.manage': ['positions.view', 'settings.access'],
  'permissions.manage': ['settings.access', 'users.view'],
  'users.manage': ['users.view'],
}
