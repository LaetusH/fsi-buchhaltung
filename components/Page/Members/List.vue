<template>
  <Page headline1="Mitglieder" @open-menu="$emit('openMenu')">
    <template #cards>
      <div class="bg-white rounded-xl shadow-lg p-6 space-y-6 col-span-12">
        <div class="flex justify-between items-center gap-3 flex-wrap">
          <h2 class="text-lg font-semibold">Gespeicherte Mitglieder</h2>

          <div class="flex items-center gap-2 flex-wrap justify-end">
            <CommonGlobalSearchBar v-model="globalSearchInput" :placeholder="'Mitglieder durchsuchen'" />
            <button
              class="btn-primary"
              @click="setPage('MemberCreate', { returnTo: 'MemberList' })"
            >
              ＋ Neues Mitglied
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-left border-b">
                <th class="py-2">
                  <CommonTableColumnControl
                    label="Vorname"
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
                    label="Nachname"
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
                    label="Geburtsdatum"
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
                    label="Fach"
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
                    label="Status"
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
                    label="Eintritt"
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
                    label="Austritt"
                    filter-type="date"
                    :sort-direction="columnSortDirection('left_at')"
                    :is-filter-active="isFilterActive('left_at')"
                    :filter="getFilter('left_at')"
                    @toggle-sort="toggleSort('left_at')"
                    @apply-range-filter="setRangeFilter('left_at', $event.min, $event.max)"
                    @reset-filter="resetFilter('left_at')"
                  />
                </th>
                <th class="py-2 text-right">Aktionen</th>
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
                <td class="py-2">{{ member.subject_name || '-' }}</td>
                <td class="py-2">{{ statusLabel(member.status) || '-' }}</td>
                <td class="py-2">{{ formatDate(member.joined_at) }}</td>
                <td class="py-2">{{ member.left_at ? formatDate(member.left_at) : '-' }}</td>
                <td class="py-2 text-right space-x-2">
                  <button
                    class="text-blue-600 hover:underline cursor-pointer"
                    @click="openMember(member.id)"
                  >
                    Öffnen
                  </button>
                </td>
              </tr>

              <tr v-if="processedRows.length === 0">
                <td colspan="8" class="py-6 text-center text-slate-500">
                  Keine Mitglieder vorhanden
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
import { usePage } from '~/composables/usePage'
import { type MemberListItem, MemberStatus } from '~/types/member'

const emit = defineEmits<{
  (e: 'openMenu'): void
}>()

const { setPage } = usePage()

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
  {
    key: 'first_name',
    filterType: 'text',
    globalSearchable: true,
    getValue: row => row.first_name,
  },
  {
    key: 'last_name',
    filterType: 'text',
    globalSearchable: true,
    getValue: row => row.last_name,
  },
  {
    key: 'birthdate',
    filterType: 'date',
    globalSearchable: true,
    getValue: row => row.birthdate,
  },
  {
    key: 'subject_name',
    filterType: 'text',
    globalSearchable: true,
    getValue: row => row.subject_name ?? '-',
  },
  {
    key: 'status',
    filterType: 'text',
    globalSearchable: true,
    getValue: row => statusLabel(row.status),
  },
  {
    key: 'joined_at',
    filterType: 'date',
    globalSearchable: true,
    getValue: row => row.joined_at,
  },
  {
    key: 'left_at',
    filterType: 'date',
    globalSearchable: true,
    getValue: row => row.left_at,
  },
])

onMounted(async () => {
  const res = await $fetch<{ ok: boolean, members?: MemberListItem[] }>('/api/members')
  if (res.ok && res.members) members.value = res.members
})

function formatDate(date?: string | null) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function statusLabel(status: MemberStatus) {
  if (status === MemberStatus.Active) return 'Aktiv'
  if (status === MemberStatus.Passive) return 'Passiv'
  if (status === MemberStatus.Hold) return 'Ruhend'
  return 'Ausgetreten'
}

function openMember(id: number) {
  setPage('MemberCreate', {
    memberId: id,
    returnTo: 'MemberList'
  })
}

function columnSortDirection(key: MemberColumnKey) {
  return sortKey.value === key ? sortDirection.value : null
}
</script>
