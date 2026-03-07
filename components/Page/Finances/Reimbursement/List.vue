<template>
  <Page headline1="Auslagenerstattungen" @open-menu="$emit('openMenu')">
    <template #cards>
      <div class="bg-white rounded-xl shadow-lg p-6 space-y-6 col-span-12">
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold">Gespeicherte Auslagenerstattungen</h2>

          <button
            class="btn-primary"
            @click="setPage('ReimbursementCreate', { returnTo: 'ReimbursementList' })"
          >
            ＋ Neue Auslagenerstattung
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-left border-b">
                <th class="py-2">Eingereicht</th>
                <th class="py-2">Geprüft</th>
                <th class="py-2">Ausgezahlt</th>
                <th class="py-2">Eingereicht von</th>
                <th class="py-2 text-right">Anzahl Belege</th>
                <th class="py-2 text-right">Betrag (Brutto)</th>
                <th class="py-2 text-center">Status</th>
                <th class="py-2 text-right">Aktionen</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="reimbursement in reimbursements"
                :key="reimbursement.id"
                class="border-b last:border-b-0 transition"
              >
                <td class="py-2">
                  {{ formatDate(reimbursement.submitted_at) }}
                </td>

                <td class="py-2">
                  {{ reimbursement.checked_at ? formatDate(reimbursement.checked_at) : '—' }}
                </td>

                <td class="py-2">
                  {{ reimbursement.disbursed_at ? formatDate(reimbursement.disbursed_at) : '—' }}
                </td>

                <td class="py-2">
                  {{ reimbursement.member_name || '—' }}
                </td>

                <td class="py-2 text-right font-medium">
                  {{ reimbursement.receipt_count }}
                </td>

                <td class="py-2 text-right font-medium">
                  {{ formatCurrency(reimbursement.total_amount) }}
                </td>

                <td class="py-2 text-center">
                  <span
                    class="px-3 py-1 rounded-full text-xs font-medium"
                    :class="statusClass(status(reimbursement))"
                  >
                    {{ statusLabels[status(reimbursement)] }}
                  </span>
                </td>

                <td class="py-2 text-right space-x-2">
                  <button
                    class="text-blue-600 hover:underline cursor-pointer"
                    @click="openReimbursement(reimbursement.id)"
                  >
                    Öffnen
                  </button>
                </td>
              </tr>

              <tr v-if="reimbursements.length === 0">
                <td colspan="7" class="py-6 text-center text-slate-500">
                  Keine Auslagenerstattungen vorhanden
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
import { ReimbursementStatus, type ReimbursementOverview } from '~/types/reimbursement';

const emit = defineEmits<{
  (e: 'openMenu'): void
}>()

const { setPage } = usePage()

const reimbursements = ref<ReimbursementOverview[]>([])

const statusLabels: Record<ReimbursementStatus, string> = {
  submitted: 'EINGEREICHT',
  checked: 'GEPRÜFT',
  disbursed: 'AUSGEZAHLT',
  cancelled: 'STORNIERT',
}

onMounted(async () => {
  const res = await $fetch('/api/reimbursements')
  if (res.ok) reimbursements.value = res.reimbursements
})

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function status(reimbursement: ReimbursementOverview): ReimbursementStatus {
  if (reimbursement.disbursed_at) return ReimbursementStatus.Disbursed
  if (reimbursement.checked_at) return ReimbursementStatus.Checked
  if (reimbursement.submitted_at) return ReimbursementStatus.Submitted
  return ReimbursementStatus.Cancelled
}

function statusClass(status: string) {
  switch (status) {
    case ReimbursementStatus.Submitted:
      return 'bg-slate-300 text-slate-900'
    case ReimbursementStatus.Checked:
      return 'bg-yellow-300 text-yellow-900'
    case ReimbursementStatus.Disbursed:
      return 'bg-green-300 text-green-900'
    case ReimbursementStatus.Cancelled:
      return 'bg-red-300 text-red-900 line-through'
    default:
      return 'bg-gray-100 text-gray-500'
  }
}

function openReimbursement(id: number) {
  setPage('ReimbursementCreate', {
    reimbursementId: id,
    returnTo: 'ReimbursementList'
  })
}
</script>
