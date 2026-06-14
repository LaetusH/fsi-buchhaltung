<template>
  <PageMembersSpotlight @open="openMember" />

  <CommonPageTableCard
    :title="t('member.stored')"
    :search-value="globalSearchInput"
    :search-placeholder="t('member.search')"
    :can-create="canEdit"
    :create-label="`+ ${t('member.new')}`"
    @update:search-value="globalSearchInput = $event"
    @create="createMember"
  >
    <!-- Desktop table -->
    <div class="hidden overflow-x-auto xl:block">
      <table class="w-full min-w-[64rem] text-sm border-collapse">
        <thead>
          <tr class="text-left border-b">
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('member.firstName')"
                filter-type="text"
                :sort-direction="columnSortDirection('first_name')"
                :is-filter-active="isFilterActive('first_name')"
                :filter="getFilter('first_name')"
                :text-options="textOptionsByColumn.first_name"
                @toggle-sort="toggleSort('first_name')"
                @apply-text-filter="setTextFilter('first_name', $event)"
                @reset-filter="resetFilter('first_name')"
              />
            </th>
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('member.lastName')"
                filter-type="text"
                :sort-direction="columnSortDirection('last_name')"
                :is-filter-active="isFilterActive('last_name')"
                :filter="getFilter('last_name')"
                :text-options="textOptionsByColumn.last_name"
                @toggle-sort="toggleSort('last_name')"
                @apply-text-filter="setTextFilter('last_name', $event)"
                @reset-filter="resetFilter('last_name')"
              />
            </th>
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('member.birthdate')"
                filter-type="date"
                :sort-direction="columnSortDirection('birthdate')"
                :is-filter-active="isFilterActive('birthdate')"
                :filter="getFilter('birthdate')"
                @toggle-sort="toggleSort('birthdate')"
                @apply-range-filter="setRangeFilter('birthdate', $event.min, $event.max)"
                @reset-filter="resetFilter('birthdate')"
              />
            </th>
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('member.subject')"
                filter-type="text"
                :sort-direction="columnSortDirection('subject_name')"
                :is-filter-active="isFilterActive('subject_name')"
                :filter="getFilter('subject_name')"
                :text-options="textOptionsByColumn.subject_name"
                @toggle-sort="toggleSort('subject_name')"
                @apply-text-filter="setTextFilter('subject_name', $event)"
                @reset-filter="resetFilter('subject_name')"
              />
            </th>
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('member.status')"
                filter-type="text"
                :sort-direction="columnSortDirection('status')"
                :is-filter-active="isFilterActive('status')"
                :filter="getFilter('status')"
                :text-options="textOptionsByColumn.status"
                @toggle-sort="toggleSort('status')"
                @apply-text-filter="setTextFilter('status', $event)"
                @reset-filter="resetFilter('status')"
              />
            </th>
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('member.joinedAt')"
                filter-type="date"
                :sort-direction="columnSortDirection('joined_at')"
                :is-filter-active="isFilterActive('joined_at')"
                :filter="getFilter('joined_at')"
                @toggle-sort="toggleSort('joined_at')"
                @apply-range-filter="setRangeFilter('joined_at', $event.min, $event.max)"
                @reset-filter="resetFilter('joined_at')"
              />
            </th>
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('member.leftAt')"
                filter-type="date"
                :sort-direction="columnSortDirection('left_at')"
                :is-filter-active="isFilterActive('left_at')"
                :filter="getFilter('left_at')"
                @toggle-sort="toggleSort('left_at')"
                @apply-range-filter="setRangeFilter('left_at', $event.min, $event.max)"
                @reset-filter="resetFilter('left_at')"
              />
            </th>
            <th v-if="canViewUsers" class="py-2">
              <CommonTableColumnControl
                :label="t('member.hasAccount')"
                filter-type="text"
                :sort-direction="columnSortDirection('has_account')"
                :is-filter-active="isFilterActive('has_account')"
                :filter="getFilter('has_account')"
                :text-options="textOptionsByColumn.has_account"
                @toggle-sort="toggleSort('has_account')"
                @apply-text-filter="setTextFilter('has_account', $event)"
                @reset-filter="resetFilter('has_account')"
              />
            </th>
            <th class="py-2 text-right">{{ t('common.actions') }}</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="member in processedRows"
            :key="member.id"
            class="border-b last:border-b-0 transition"
          >
            <td class="py-2">{{ member.first_name }}</td>
            <td class="py-2">{{ member.last_name }}</td>
            <td class="py-2">{{ formatDate(member.birthdate) }}</td>
            <td class="py-2">{{ member.subject_name || t('common.notAvailable') }}</td>
            <td class="py-2">{{ statusLabel(member.status) || t('common.notAvailable') }}</td>
            <td class="py-2">{{ formatDate(member.joined_at) }}</td>
            <td class="py-2">{{ member.left_at ? formatDate(member.left_at) : t('common.notAvailable') }}</td>
            <td v-if="canViewUsers" class="py-2">{{ accountLabel(member) }}</td>
            <td class="py-2 text-right">
              <button
                class="text-blue-600 hover:underline cursor-pointer"
                @click="openMember(member.id)"
              >
                {{ t('actions.open') }}
              </button>
            </td>
          </tr>

          <tr v-if="processedRows.length === 0">
            <td :colspan="canViewUsers ? 9 : 8" class="py-6 text-center text-slate-500">
              {{ t('member.none') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Compact card list (mobile + medium screens) -->
    <ul class="grid gap-3 sm:grid-cols-2 xl:hidden">
      <li
        v-for="member in processedRows"
        :key="member.id"
        class="rounded-xl border border-slate-200 p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate font-semibold text-slate-800">{{ member.first_name }} {{ member.last_name }}</p>
            <p class="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              <Icon name="material-symbols:cake-rounded" class="shrink-0 text-sm text-slate-400" />
              {{ formatDate(member.birthdate) }}
            </p>
          </div>
          <button
            class="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 transition cursor-pointer hover:bg-blue-100"
            @click="openMember(member.id)"
          >
            <Icon name="material-symbols:open-in-new-rounded" class="text-sm" />
            {{ t('actions.open') }}
          </button>
        </div>

        <dl class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">{{ t('member.status') }}</dt>
            <dd class="text-slate-700">{{ statusLabel(member.status) || t('common.notAvailable') }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">{{ t('member.subject') }}</dt>
            <dd class="truncate text-slate-700">{{ member.subject_name || t('common.notAvailable') }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">{{ t('member.joinedAt') }}</dt>
            <dd class="text-slate-700">{{ formatDate(member.joined_at) }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">{{ t('member.leftAt') }}</dt>
            <dd class="text-slate-700">{{ member.left_at ? formatDate(member.left_at) : t('common.notAvailable') }}</dd>
          </div>
          <div v-if="canViewUsers" class="col-span-2">
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">{{ t('member.hasAccount') }}</dt>
            <dd class="text-slate-700">{{ accountLabel(member) }}</dd>
          </div>
        </dl>
      </li>

      <li v-if="processedRows.length === 0" class="py-6 text-center text-slate-500 sm:col-span-2">
        {{ t('member.none') }}
      </li>
    </ul>
  </CommonPageTableCard>
</template>

<script setup lang="ts">
import { useAdvancedTable } from '~/composables/useAdvancedTable'
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import { usePage } from '~/composables/usePage'
import { useAuth } from '~/composables/useAuth'
import { type MemberListItem, MemberStatus } from '~/types/member'

const { setPage } = usePage()
const { t } = useI18n()
const { formatDate } = useLocaleFormatters()
const { hasPermission } = useAuth()

const canEdit = computed(() => hasPermission('members.edit'))
const canViewUsers = computed(() => hasPermission(['users.view', 'users.manage']))

const members = ref<MemberListItem[]>([])
type MemberColumnKey = 'first_name' | 'last_name' | 'birthdate' | 'subject_name' | 'status' | 'joined_at' | 'left_at' | 'has_account'

const {
  sortKey,
  sortDirection,
  textOptionsByColumn,
  globalSearchInput,
  processedRows,
  getFilter,
  isFilterActive,
  toggleSort,
  setTextFilter,
  setRangeFilter,
  resetFilter,
} = useAdvancedTable<MemberListItem, MemberColumnKey>(members, [
  { key: 'first_name', filterType: 'text', globalSearchable: true, getValue: row => row.first_name },
  { key: 'last_name', filterType: 'text', globalSearchable: true, getValue: row => row.last_name },
  { key: 'birthdate', filterType: 'date', globalSearchable: true, getValue: row => row.birthdate },
  { key: 'subject_name', filterType: 'text', globalSearchable: true, getValue: row => row.subject_name ?? '-' },
  { key: 'status', filterType: 'text', globalSearchable: true, getValue: row => statusLabel(row.status) },
  { key: 'joined_at', filterType: 'date', globalSearchable: true, getValue: row => row.joined_at },
  { key: 'left_at', filterType: 'date', globalSearchable: true, getValue: row => row.left_at },
  { key: 'has_account', filterType: 'text', globalSearchable: false, getValue: row => accountLabel(row) },
])

async function load() {
  const res = await $fetch('/api/members')
  if (res.ok) {
    members.value = res.members
  } else {
    console.log(res.error)
  }
}

onMounted(load)

function statusLabel(status: MemberStatus) {
  if (status === MemberStatus.Active) return t('member.states.active')
  if (status === MemberStatus.Passive) return t('member.states.passive')
  if (status === MemberStatus.Hold) return t('member.states.hold')
  return t('member.states.left')
}

function accountLabel(member: MemberListItem) {
  if (!member.has_account) return t('common.no')
  return `${t('common.yes')}${member.account_is_active ? '' : ` (${t('member.accountInactive')})`}`
}

function openMember(id: number) {
  setPage('MemberCreate', { memberId: id, returnTo: 'MemberList' })
}

function createMember() {
  setPage('MemberCreate', { returnTo: 'MemberList' })
}

function columnSortDirection(key: MemberColumnKey) {
  return sortKey.value === key ? sortDirection.value : null
}
</script>
