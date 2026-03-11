<template>
  <Page :headline1="t('member.listTitle')" @open-menu="$emit('openMenu')">
    <template #cards>
      <div class="bg-white rounded-xl shadow-lg p-6 space-y-6 col-span-12">
        <div class="flex justify-between items-center gap-3 flex-wrap">
          <h2 class="text-lg font-semibold">{{ t('member.stored') }}</h2>

          <div class="flex items-center gap-2 flex-wrap justify-end">
            <CommonGlobalSearchBar v-model="globalSearchInput" :placeholder="t('member.search')" />
            <button
              v-if="canEdit"
              class="btn-primary"
              @click="setPage('MemberCreate', { returnTo: 'MemberList' })"
            >
              + {{ t('member.new') }}
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
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
                <th v-if="canViewUsers" class="py-2">{{ t('member.hasAccount') }}</th>
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
                <td v-if="canViewUsers" class="py-2">{{ member.has_account ? t('common.yes') : t('common.no') }}</td>
                <td class="py-2 text-right space-x-2">
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
      </div>
    </template>
  </Page>
</template>

<script setup lang="ts">
import { useAdvancedTable } from '~/composables/useAdvancedTable'
import { useI18n } from '~/composables/useI18n'
import { usePage } from '~/composables/usePage'
import { useAuth } from '~/composables/useAuth'
import { type MemberListItem, MemberStatus } from '~/types/member'

const emit = defineEmits<{
  (e: 'openMenu'): void
}>()

const { setPage } = usePage()
const { locale, t } = useI18n()
const { hasPermission } = useAuth()

const canEdit = computed(() => hasPermission('members.edit'))
const canViewUsers = computed(() => hasPermission(['users.view', 'users.manage']))

const members = ref<MemberListItem[]>([])
type MemberColumnKey = 'first_name' | 'last_name' | 'birthdate' | 'subject_name' | 'status' | 'joined_at' | 'left_at'

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
])

onMounted(async () => {
  const res = await $fetch('/api/members')
  if (res.ok) {
    members.value = res.members
  } else {
    console.log(res.error)
  }
})

function formatDate(date?: string | null) {
  if (!date) return t('common.notAvailable')
  return new Date(date).toLocaleDateString(locale.value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function statusLabel(status: MemberStatus) {
  if (status === MemberStatus.Active) return t('member.states.active')
  if (status === MemberStatus.Passive) return t('member.states.passive')
  if (status === MemberStatus.Hold) return t('member.states.hold')
  return t('member.states.left')
}

function openMember(id: number) {
  setPage('MemberCreate', { memberId: id, returnTo: 'MemberList' })
}

function columnSortDirection(key: MemberColumnKey) {
  return sortKey.value === key ? sortDirection.value : null
}
</script>
