export interface EventPlanningTabDef {
  key: string
  labelKey: string
}

export const EVENT_PLANNING_TABS: EventPlanningTabDef[] = [
  { key: 'overview', labelKey: 'event.planning.tabs.overview' },
  { key: 'timeline', labelKey: 'event.planning.tabs.timeline' },
  { key: 'tasks', labelKey: 'event.planning.tabs.tasks' },
  { key: 'checklists', labelKey: 'event.planning.tabs.checklists' },
  { key: 'shifts', labelKey: 'event.planning.tabs.shifts' },
  { key: 'cashRegister', labelKey: 'event.planning.tabs.cashRegister' },
  { key: 'details', labelKey: 'event.planning.tabs.details' },
]
