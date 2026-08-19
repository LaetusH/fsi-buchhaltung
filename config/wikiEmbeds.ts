import type { PermissionKey } from '~/config/permissions'

export type WikiEmbedArgType = 'number' | 'string' | 'boolean'

export interface WikiEmbedDefinition {
  key: string
  labelKey: string
  /** The reader needs at least one of these; the embed handler re-checks them itself. */
  permissions: PermissionKey[]
  argsSchema?: Record<string, WikiEmbedArgType>
}

/**
 * The single source of truth for what an article may embed. The renderer validates every
 * `:::embed{widget="…"}` against this list, the editor builds its insert menu from it, and the
 * resolve endpoint dispatches on it.
 */
export const WIKI_EMBEDS: WikiEmbedDefinition[] = [
  { key: 'open-reimbursements', labelKey: 'wiki.embeds.openReimbursements', permissions: ['reimbursements.view'] },
  { key: 'budget-status', labelKey: 'wiki.embeds.budgetStatus', permissions: ['budgets.view'], argsSchema: { year: 'number', costCentreId: 'number' } },
  { key: 'cash-position', labelKey: 'wiki.embeds.cashPosition', permissions: ['cash_counts.view'] },
  { key: 'next-events', labelKey: 'wiki.embeds.nextEvents', permissions: ['events.access'], argsSchema: { limit: 'number' } },
  { key: 'my-shifts', labelKey: 'wiki.embeds.myShifts', permissions: ['events.access'], argsSchema: { limit: 'number' } },
  { key: 'my-open-tasks', labelKey: 'wiki.embeds.myOpenTasks', permissions: ['events.access'] },
  { key: 'association-contact', labelKey: 'wiki.embeds.associationContact', permissions: ['positions.view'] },
  { key: 'pending-member-changes', labelKey: 'wiki.embeds.pendingMemberChanges', permissions: ['members.approveChanges'] },
]

export const WIKI_EMBEDS_BY_KEY: Record<string, WikiEmbedDefinition> = Object.fromEntries(
  WIKI_EMBEDS.map(embed => [embed.key, embed]),
)
