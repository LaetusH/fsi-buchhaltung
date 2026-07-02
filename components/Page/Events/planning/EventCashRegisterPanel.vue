<template>
  <section class="space-y-6">
    <div v-if="loading" class="-mx-6 bg-white p-8 text-center text-sm text-slate-400 shadow-sm sm:mx-0 sm:rounded-xl sm:shadow-lg">
      {{ t('event.cashRegister.loading') }}
    </div>

    <div v-else-if="error" class="-mx-6 bg-white p-8 text-center shadow-sm sm:mx-0 sm:rounded-xl sm:shadow-lg">
      <Icon name="material-symbols:error-outline-rounded" class="mb-1 text-2xl text-rose-400" />
      <p class="text-sm text-slate-500">{{ error }}</p>
    </div>

    <div v-else-if="!linked" class="-mx-6 bg-white p-8 text-center shadow-sm sm:mx-0 sm:rounded-xl sm:shadow-lg">
      <Icon name="material-symbols:link-off-rounded" class="mb-1 text-2xl text-slate-300" />
      <p class="text-sm text-slate-500">{{ t('event.cashRegister.notLinked') }}</p>
    </div>

    <template v-else-if="overview">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div
          v-for="tile in statTiles"
          :key="tile.label"
          class="-mx-6 bg-white p-4 shadow-sm sm:mx-0 sm:rounded-xl sm:shadow-lg"
        >
          <div class="flex items-center gap-2">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Icon :name="tile.icon" class="text-base" />
            </span>
            <p class="text-sm text-slate-500">{{ tile.label }}</p>
          </div>
          <p class="mt-3 text-2xl font-semibold text-slate-900">{{ tile.value }}</p>
          <p class="mt-1 text-xs text-slate-400">{{ tile.meta }}</p>
        </div>
      </div>

      <div class="-mx-6 bg-white p-4 shadow-sm sm:mx-0 sm:rounded-xl sm:shadow-lg">
        <div class="mb-4 flex items-center gap-2">
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
            <Icon name="material-symbols:bar-chart-rounded" class="text-base" />
          </span>
          <h2 class="text-lg font-semibold">{{ t('event.cashRegister.hourlyTitle') }}</h2>
        </div>

        <div v-if="overview.hourly.length === 0" class="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
          {{ t('event.cashRegister.noSales') }}
        </div>

        <div v-else class="overflow-x-auto pb-1">
          <div class="flex items-end gap-2 min-w-fit">
            <div
              v-for="entry in overview.hourly"
              :key="entry.hour"
              class="group flex min-w-14 flex-1 flex-col items-center"
              :title="`${formatCurrency(entry.revenue)} · ${entry.quantity} ${t('event.cashRegister.pcs')}`"
            >
              <span class="mb-1 whitespace-nowrap text-xs text-slate-500">{{ formatCurrency(entry.revenue) }}</span>
              <div
                class="w-full rounded-t-md bg-orange-400 transition-colors"
                :style="{ height: `${barHeight(entry.revenue)}px` }"
              ></div>
              <span class="mt-1 w-full whitespace-nowrap border-t border-slate-200 pt-1 text-center text-xs font-medium text-slate-500">
                {{ hourLabel(entry.hour) }}
              </span>
              <span class="h-4 whitespace-nowrap text-xs text-slate-400">
                {{ dayLabel(entry.hour) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid items-start gap-6 lg:grid-cols-2">
        <div class="-mx-6 bg-white p-4 shadow-sm sm:mx-0 sm:rounded-xl sm:shadow-lg">
          <div class="mb-3 flex items-center gap-2">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Icon name="material-symbols:shopping-cart-rounded" class="text-base" />
            </span>
            <h2 class="text-lg font-semibold">{{ t('event.cashRegister.salesTitle') }}</h2>
          </div>

          <div v-if="overview.regular.items.length === 0" class="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
            {{ t('event.cashRegister.noSales') }}
          </div>

          <table v-else class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th class="pb-2 text-left font-semibold">{{ t('event.cashRegister.item') }}</th>
                <th class="pb-2 text-right font-semibold">{{ t('event.cashRegister.quantity') }}</th>
                <th class="pb-2 text-right font-semibold">{{ t('event.cashRegister.revenue') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in overview.regular.items" :key="item.id" class="border-b border-slate-100">
                <td class="max-w-0 truncate py-2 pr-3 text-slate-700">{{ item.name }}</td>
                <td class="py-2 text-right text-slate-500">{{ item.quantity }}</td>
                <td class="py-2 text-right font-medium text-slate-800">{{ formatCurrency(item.amount) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td class="pt-2 font-semibold text-slate-700">{{ t('common.total') }}</td>
                <td class="pt-2 text-right font-semibold text-slate-700">{{ overview.regular.totalQuantity }}</td>
                <td class="pt-2 text-right font-semibold text-slate-900">{{ formatCurrency(overview.regular.totalRevenue) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="-mx-6 bg-white p-4 shadow-sm sm:mx-0 sm:rounded-xl sm:shadow-lg">
          <div class="mb-3 flex items-center gap-2">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Icon name="material-symbols:volunteer-activism-rounded" class="text-base" />
            </span>
            <h2 class="text-lg font-semibold">{{ t('event.cashRegister.givenOutTitle') }}</h2>
          </div>

          <div v-if="overview.fachschaft.items.length === 0" class="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
            {{ t('event.cashRegister.noGivenOut') }}
          </div>

          <table v-else class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th class="pb-2 text-left font-semibold">{{ t('event.cashRegister.item') }}</th>
                <th class="pb-2 text-right font-semibold">{{ t('event.cashRegister.quantity') }}</th>
                <th class="pb-2 text-right font-semibold">{{ t('event.cashRegister.worth') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in overview.fachschaft.items" :key="item.id" class="border-b border-slate-100">
                <td class="max-w-0 truncate py-2 pr-3 text-slate-700">{{ item.name }}</td>
                <td class="py-2 text-right text-slate-500">{{ item.quantity }}</td>
                <td class="py-2 text-right font-medium text-slate-800">{{ formatCurrency(item.amount) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td class="pt-2 font-semibold text-slate-700">{{ t('common.total') }}</td>
                <td class="pt-2 text-right font-semibold text-slate-700">{{ overview.fachschaft.totalQuantity }}</td>
                <td class="pt-2 text-right font-semibold text-slate-900">{{ formatCurrency(overview.fachschaft.totalWorth) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import type { CashRegisterOverview, EventCashRegisterResponse } from '~/server/api/events/[id]/cash-register.get'

const props = defineProps<{
  eventId: number
}>()

const { t } = useI18n()
const { formatCurrency } = useLocaleFormatters()

const loading = ref(true)
const error = ref('')
const linked = ref(false)
const overview = ref<CashRegisterOverview | null>(null)

const MAX_BAR_HEIGHT = 160

const maxHourlyRevenue = computed(() =>
  (overview.value?.hourly ?? []).reduce((max, entry) => Math.max(max, entry.revenue), 0),
)

const statTiles = computed(() => {
  if (!overview.value) return []

  const totalIncome = overview.value.regular.totalRevenue
    + overview.value.payments.revenue
    + overview.value.donations.total

  return [
    {
      label: t('event.cashRegister.totalRevenue'),
      value: formatCurrency(overview.value.regular.totalRevenue),
      meta: t('event.cashRegister.itemsSoldMeta', { count: overview.value.regular.totalQuantity }),
      icon: 'material-symbols:euro-rounded',
    },
    {
      label: t('event.cashRegister.fachschaftPayments'),
      value: formatCurrency(overview.value.payments.revenue),
      meta: t('event.cashRegister.fachschaftPaymentsMeta', {
        count: overview.value.payments.count,
        amount: formatCurrency(overview.value.payments.amount),
      }),
      icon: 'material-symbols:savings-rounded',
    },
    {
      label: t('event.cashRegister.donations'),
      value: formatCurrency(overview.value.donations.total),
      meta: t('event.cashRegister.donationsMeta', { count: overview.value.donations.count }),
      icon: 'material-symbols:favorite-rounded',
    },
    {
      label: t('event.cashRegister.givenOutWorth'),
      value: formatCurrency(overview.value.fachschaft.totalWorth),
      meta: t('event.cashRegister.givenOutMeta', { count: overview.value.fachschaft.totalQuantity }),
      icon: 'material-symbols:volunteer-activism-rounded',
    },
    {
      label: t('event.cashRegister.combinedRevenue'),
      value: formatCurrency(totalIncome),
      meta: t('event.cashRegister.combinedRevenueMeta'),
      icon: 'material-symbols:account-balance-wallet',
    },
  ]
})

function barHeight(revenue: number) {
  if (maxHourlyRevenue.value <= 0) return 2
  const scaled = Math.round((revenue / maxHourlyRevenue.value) * MAX_BAR_HEIGHT)
  return Math.max(revenue > 0 ? 4 : 2, scaled)
}

function toBerlinIso(hour: string) {
  return new Date(hour.replace(' ', 'T') + 'Z').toLocaleString('sv-SE', { timeZone: 'Europe/Berlin' })
}

function hourLabel(hour: string) {
  return toBerlinIso(hour).slice(11, 16)
}

function dayLabel(hour: string) {
  const entries = overview.value?.hourly ?? []
  const index = entries.findIndex(entry => entry.hour === hour)
  const berlinDate = toBerlinIso(hour).slice(0, 10)
  if (index > 0 && toBerlinIso(entries[index - 1]!.hour).slice(0, 10) === berlinDate) return ''
  return `${berlinDate.slice(8, 10)}.${berlinDate.slice(5, 7)}.`
}

async function loadOverview() {
  loading.value = true
  error.value = ''

  try {
    const res = await $fetch<EventCashRegisterResponse>(`/api/events/${props.eventId}/cash-register`)

    if (!res.ok) {
      error.value = res.error || t('event.cashRegister.loadFailed')
      return
    }

    if (!res.connected || !res.linked) {
      linked.value = false
      overview.value = null
      return
    }

    linked.value = true
    overview.value = res.overview
  } catch {
    error.value = t('event.cashRegister.loadFailed')
  } finally {
    loading.value = false
  }
}

watch(() => props.eventId, loadOverview)
onMounted(loadOverview)
useAppRefresh().onRefresh(loadOverview)
</script>
