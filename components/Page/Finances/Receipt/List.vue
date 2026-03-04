<template>
  <Page headline1="Belege" @open-menu="$emit('openMenu')">
    <template #cards>
      <div class="bg-white rounded-xl shadow-lg p-6 space-y-6 col-span-12">
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold">Gespeicherte Belege</h2>

          <button
            class="btn-primary"
            @click="setPage('ReceiptCreate', { returnTo: 'ReceiptList' })"
          >
            ＋ Neuer Beleg
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-left border-b">
                <th class="py-2">Belegdatum</th>
                <th class="py-2">Beleg-Nr.</th>
                <th class="py-2">Zahlungsempfänger</th>
                <th class="py-2 text-right">Betrag (Brutto)</th>
                <th class="py-2 text-center">Zahlungsstatus</th>
                <th class="py-2 text-right">Aktionen</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="receipt in receipts"
                :key="receipt.id"
                class="border-b last:border-b-0 transition"
              >
                <td class="py-2">
                  {{ formatDate(receipt.receipt_date) }}
                </td>

                <td class="py-2">
                  {{ receipt.receipt_number || '—' }}
                </td>

                <td class="py-2">
                  {{ receipt.company_name || '—' }}
                </td>

                <td class="py-2 text-right font-medium">
                  {{ formatCurrency(receipt.total_amount) }}
                </td>

                <td class="py-2 text-center">
                  <span
                    class="px-3 py-1 rounded-full text-xs font-medium"
                    :class="statusClass(receipt.status)"
                  >
                    {{ statusLabels[receipt.status] }}
                  </span>
                </td>

                <td class="py-2 text-right space-x-2">
                  <button
                    class="text-blue-600 hover:underline cursor-pointer"
                    @click="openReceipt(receipt.id)"
                  >
                    Öffnen
                  </button>
                </td>
              </tr>

              <tr v-if="receipts.length === 0">
                <td colspan="7" class="py-6 text-center text-slate-500">
                  Keine Belege vorhanden
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
import { ReceiptStatus, type ReceiptRow } from '~/types/receipt'

const emit = defineEmits<{
  (e: 'openMenu'): void
  (e: 'editReceipt', id: number): void
}>()

const { setPage } = usePage()

const receipts = ref<ReceiptRow[]>([])

const statusLabels: Record<ReceiptStatus, string> = {
  draft: 'ENTWURF',
  open: 'OFFEN',
  paid: 'BEZAHLT',
  cancelled: 'STORNIERT',
}

onMounted(async () => {
  const res = await $fetch('/api/receipts')
  if (res.ok) receipts.value = res.receipts
})

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('de-DE')
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function statusClass(status: string) {
  switch (status) {
    case ReceiptStatus.Draft:
      return 'bg-slate-300 text-slate-900'
    case ReceiptStatus.Open:
      return 'bg-yellow-300 text-yellow-900'
    case ReceiptStatus.Paid:
      return 'bg-green-300 text-green-900'
    case ReceiptStatus.Cancelled:
      return 'bg-red-300 text-red-900 line-through'
    default:
      return 'bg-gray-100 text-gray-500'
  }
}

function openReceipt(id: number) {
  setPage('ReceiptCreate', {
    receiptId: id,
    returnTo: 'ReceiptList'
  })
}
</script>