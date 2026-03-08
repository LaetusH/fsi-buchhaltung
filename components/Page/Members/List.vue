<template>
  <Page headline1="Mitglieder" @open-menu="$emit('openMenu')">
    <template #cards>
      <div class="bg-white rounded-xl shadow-lg p-6 space-y-6 col-span-12">
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold">Gespeicherte Mitglieder</h2>

          <button
            class="btn-primary"
            @click="setPage('MemberCreate', { returnTo: 'MemberList' })"
          >
            + Neues Mitglied
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-left border-b">
                <th class="py-2">Name</th>
                <th class="py-2">Fach</th>
                <th class="py-2">Status</th>
                <th class="py-2">Eintritt</th>
                <th class="py-2">Austritt</th>
                <th class="py-2 text-right">Aktionen</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="member in members"
                :key="member.id"
                class="border-b last:border-b-0 transition"
              >
                <td class="py-2 font-medium">{{ member.last_name }}, {{ member.first_name }}</td>
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

              <tr v-if="members.length === 0">
                <td colspan="6" class="py-6 text-center text-slate-500">
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
import { usePage } from '~/composables/usePage'
import { type MemberListItem, MemberStatus } from '~/types/member'

const emit = defineEmits<{
  (e: 'openMenu'): void
}>()

const { setPage } = usePage()

const members = ref<MemberListItem[]>([])

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
</script>
