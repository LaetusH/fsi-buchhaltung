<template>
  <Page :headline1="t('financeAnalysis.title')" @open-menu="$emit('openMenu')">
    <template #cards>
      <section class="bg-white rounded-xl shadow-lg p-4 space-y-4 col-span-12 lg:col-span-4 xl:col-span-3">
        <div class="space-y-1">
          <h2 class="text-lg font-semibold">{{ t('financeAnalysis.menuTitle') }}</h2>
          <p class="text-sm text-slate-500">{{ t('financeAnalysis.menuDescription') }}</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="field">
            <label>{{ t('financeAnalysis.startDate') }}</label>
            <input
              :value="startDate"
              type="date"
              class="input"
              @input="handleManualDateInput('start', $event)"
            >
          </div>

          <div class="field">
            <label>{{ t('financeAnalysis.endDate') }}</label>
            <input
              :value="endDate"
              type="date"
              class="input"
              @input="handleManualDateInput('end', $event)"
            >
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          <div class="field">
            <label>{{ t('financeAnalysis.quickYear') }}</label>
            <select v-model="quickYear" class="input" @change="applyYearShortcut">
              <option value="">{{ t('financeAnalysis.customRange') }}</option>
              <option v-for="year in yearOptions" :key="year" :value="String(year)">
                {{ year }}
              </option>
            </select>
          </div>

          <div class="field">
            <label>{{ t('financeAnalysis.quickSemester') }}</label>
            <div class="grid grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-2">
              <button
                type="button"
                :class="semesterButtonClass('summer')"
                @click="toggleSemesterShortcut('summer')"
              >
                {{ t('financeAnalysis.semesters.summer') }}
              </button>
              <button
                type="button"
                :class="semesterButtonClass('winter')"
                @click="toggleSemesterShortcut('winter')"
              >
                {{ t('financeAnalysis.semesters.winter') }}
              </button>
            </div>
          </div>

          <div class="field sm:col-span-2 lg:col-span-1">
            <label>{{ t('financeAnalysis.quickMonth') }}</label>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="month in monthOptions"
                :key="month.value"
                type="button"
                :class="monthButtonClass(month.value)"
                :title="month.label"
                @click="toggleMonthShortcut(month.value)"
              >
                {{ month.shortLabel }}
              </button>
            </div>
          </div>

          <p class="text-xs text-slate-500">{{ t('financeAnalysis.quickHint') }}</p>

          <div v-if="hasCostCentreAccess" class="field sm:col-span-2 lg:col-span-1">
            <label>{{ t('financeAnalysis.costCentre') }}</label>
            <CommonSearchSelect
              v-model="costCentreQuery"
              :options="costCentreOptions"
              :selected-label="selectedCostCentreLabel"
              :placeholder="t('financeAnalysis.costCentrePlaceholder')"
              :empty-text="t('financeAnalysis.noCostCentres')"
              menu-width="wide"
              option-class="overflow-hidden text-ellipsis"
              @select="selectCostCentreFromOption"
              @clear-selection="clearSelectedCostCentre"
            />
          </div>
        </div>

        <div class="space-y-3 rounded-xl border border-slate-200 p-4">
          <div>
            <h3 class="font-semibold text-slate-900">{{ t('financeAnalysis.receiptStateFilters') }}</h3>
            <p class="text-xs text-slate-500">{{ t('financeAnalysis.receiptStateHint') }}</p>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
            <button
              v-for="option in receiptStatusOptions"
              :key="option.value"
              type="button"
              :class="statusButtonClass(option.value)"
              @click="toggleReceiptStatus(option.value)"
            >
              {{ option.label }}
            </button>
          </div>

          <p v-if="selectedStatuses.length === 0" class="text-xs text-red-700">
            {{ t('financeAnalysis.noReceiptStatesSelected') }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <button type="button" class="btn-secondary" @click="resetToCurrentYear">
            {{ t('financeAnalysis.resetRange') }}
          </button>
          <button
            type="button"
            class="btn-primary"
            :class="!hasValidDateRange || isLoading ? 'opacity-70 cursor-not-allowed' : ''"
            :disabled="!hasValidDateRange || isLoading"
            @click="loadAnalysis"
          >
            {{ isLoading ? t('financeAnalysis.loadingShort') : t('financeAnalysis.runAnalysis') }}
          </button>
        </div>

        <div v-if="!hasValidDateRange" class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ t('financeAnalysis.invalidRange') }}
        </div>
      </section>

      <section class="bg-white rounded-xl shadow-lg p-4 md:p-6 space-y-6 col-span-12 lg:col-span-8 xl:col-span-9">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="space-y-1">
            <h2 class="text-lg font-semibold">{{ t('financeAnalysis.analysisTitle') }}</h2>
            <p class="text-sm text-slate-500">{{ activePeriodLabel }}</p>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-3">
            <div class="relative">
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-orange-600 cursor-pointer"
                :class="!canExportAnalysis ? 'cursor-not-allowed opacity-70 hover:bg-orange-500' : ''"
                :disabled="!canExportAnalysis"
                :title="t('financeAnalysis.exportReport')"
                @click="toggleExportMenu"
              >
                <Icon :name="isExporting ? 'material-symbols:hourglass-top-rounded' : 'material-symbols:download-rounded'" class="h-5 w-5" />
                <span>{{ isExporting ? t('financeAnalysis.exportingReport') : t('financeAnalysis.exportReport') }}</span>
              </button>

              <div v-if="isExportMenuOpen && canExportAnalysis" class="absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl space-y-4">
                <div class="space-y-2">
                  <div class="text-sm font-semibold text-slate-900">{{ t('financeAnalysis.exportOptionsTitle') }}</div>
                  <div class="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      :class="exportGroupingButtonClass('none')"
                      @click="setExportGrouping('none')"
                    >
                      {{ t('financeAnalysis.exportGroupingNone') }}
                    </button>
                    <button
                      type="button"
                      :class="exportGroupingButtonClass('costCentres')"
                      @click="setExportGrouping('costCentres')"
                    >
                      {{ t('financeAnalysis.exportGroupingCostCentres') }}
                    </button>
                    <button
                      type="button"
                      :class="exportGroupingButtonClass('spheres')"
                      @click="setExportGrouping('spheres')"
                    >
                      {{ t('financeAnalysis.exportGroupingSpheres') }}
                    </button>
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    :class="exportToggleButtonClass(exportSplitByMonth)"
                    @click="exportSplitByMonth = !exportSplitByMonth"
                  >
                    {{ t('financeAnalysis.exportSplitByMonth') }}
                  </button>
                  <button
                    type="button"
                    :class="exportToggleButtonClass(exportSplitByPaymentStatus)"
                    @click="exportSplitByPaymentStatus = !exportSplitByPaymentStatus"
                  >
                    {{ t('financeAnalysis.exportSplitByPaymentStatus') }}
                  </button>
                </div>

                <div class="flex items-center justify-between gap-2">
                  <button type="button" class="btn-secondary" @click="closeExportMenu">
                    {{ t('actions.cancel') }}
                  </button>
                  <button type="button" class="btn-primary" :disabled="isExporting" @click="exportAnalysisReport">
                    {{ isExporting ? t('financeAnalysis.exportingReport') : t('financeAnalysis.exportNow') }}
                  </button>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 sm:min-w-fit">
              <label class="text-sm font-medium text-slate-900" for="comparison-toggle">
                {{ t('financeAnalysis.compareWithPreviousYear') }}
              </label>
              <button
                id="comparison-toggle"
                type="button"
                role="switch"
                :aria-checked="compareWithPreviousYear"
                :title="t('financeAnalysis.compareWithPreviousYear')"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition cursor-pointer"
                :class="compareWithPreviousYear ? 'bg-orange-500' : 'bg-slate-300'"
                @click="toggleComparisonMode"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition"
                  :class="compareWithPreviousYear ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>
          </div>
        </div>

        <div v-if="errorMessage" class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ errorMessage }}
        </div>

        <div v-else-if="isLoading && !analysis" class="rounded-xl bg-slate-50 px-4 py-10 text-center text-slate-500">
          {{ t('financeAnalysis.loading') }}
        </div>

        <template v-else-if="summary">
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div class="rounded-xl bg-orange-50 px-4 py-4">
              <div class="text-sm text-orange-700">{{ t('financeAnalysis.cards.receiptTotal') }}</div>
              <div class="mt-2 text-2xl font-semibold text-orange-950">{{ formatCurrency(summary.receipt_total) }}</div>
              <div class="mt-1 text-xs text-orange-700">{{ t('financeAnalysis.cards.receiptCount', { count: summary.receipt_count }) }}</div>
            </div>

            <div class="rounded-xl bg-emerald-50 px-4 py-4">
              <div class="text-sm text-emerald-700">{{ t('financeAnalysis.cards.cashCountRevenue') }}</div>
              <div class="mt-2 text-2xl font-semibold text-emerald-950">{{ formatCurrency(summary.cash_count_total_difference) }}</div>
              <div class="mt-1 text-xs text-emerald-700">{{ t('financeAnalysis.cards.cashCountCount', { count: summary.cash_count_count }) }}</div>
            </div>

            <div :class="['rounded-xl px-4 py-4', summary.net_result >= 0 ? 'bg-cyan-50' : 'bg-red-50']">
              <div :class="['text-sm', summary.net_result >= 0 ? 'text-cyan-700' : 'text-red-700']">{{ t('financeAnalysis.cards.netResult') }}</div>
              <div :class="['mt-2 text-2xl font-semibold', summary.net_result >= 0 ? 'text-cyan-950' : 'text-red-900']">
                {{ formatCurrency(summary.net_result) }}
              </div>
              <div :class="['mt-1 text-xs', summary.net_result >= 0 ? 'text-cyan-700' : 'text-red-700']">
                {{ summary.net_result >= 0 ? t('financeAnalysis.cards.positiveResult') : t('financeAnalysis.cards.negativeResult') }}
              </div>
            </div>

            <div class="rounded-xl bg-slate-100 px-4 py-4">
              <div class="text-sm text-slate-600">{{ t('financeAnalysis.cards.entriesReviewed') }}</div>
              <div class="mt-2 text-2xl font-semibold text-slate-900">{{ summary.receipt_count + summary.cash_count_count }}</div>
              <div class="mt-1 text-xs text-slate-600">{{ t('financeAnalysis.cards.registerCount', { count: summary.cash_count_register_total }) }}</div>
            </div>
          </div>

          <section v-if="compareWithPreviousYear && comparisonSummary" class="rounded-xl border border-slate-200 p-4 space-y-4">
            <div class="space-y-1">
              <h3 class="font-semibold">{{ t('financeAnalysis.comparisonTitle') }}</h3>
              <p class="text-sm text-slate-500">{{ t('financeAnalysis.previousYearRange', { start: formatDate(comparisonSummary.start_date), end: formatDate(comparisonSummary.end_date) }) }}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <div v-for="card in comparisonCards" :key="card.key" class="rounded-xl bg-slate-50 px-4 py-4">
                <div class="text-sm text-slate-700">{{ card.label }}</div>
                <div class="mt-3 space-y-1 text-sm text-slate-600">
                  <div>{{ t('financeAnalysis.currentValue') }}: <span class="font-medium text-slate-900">{{ formatComparisonValue(card.current, card.type) }}</span></div>
                  <div>{{ t('financeAnalysis.previousValue') }}: <span class="font-medium text-slate-900">{{ formatComparisonValue(card.previous, card.type) }}</span></div>
                </div>
                <div class="mt-3 text-sm font-semibold" :class="comparisonDifferenceClass(card.difference)">
                  {{ t('financeAnalysis.differenceValue', { value: formatSignedComparisonValue(card.difference, card.type) }) }}
                </div>
              </div>
            </div>
          </section>

          <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <section class="w-full rounded-xl border border-slate-200 p-4 space-y-4">
              <div>
                <h3 class="font-semibold">{{ t('financeAnalysis.receiptsSectionTitle') }}</h3>
                <p class="text-sm text-slate-500">{{ t('financeAnalysis.receiptsSectionDescription') }}</p>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4 gap-3">
                <div v-for="card in receiptStateCards" :key="card.key" class="rounded-xl bg-slate-100 px-4 py-3">
                  <div class="text-xs text-slate-500">{{ card.label }}</div>
                  <div class="mt-1 font-semibold">{{ formatCurrency(card.total) }}</div>
                  <div class="text-xs text-slate-500">{{ t('financeAnalysis.countLabel', { count: card.count }) }}</div>
                </div>
              </div>
            </section>

            <section class="w-full rounded-xl border border-slate-200 p-4 space-y-4">
              <div>
                <h3 class="font-semibold">{{ t('financeAnalysis.cashCountsSectionTitle') }}</h3>
                <p class="text-sm text-slate-500">{{ t('financeAnalysis.cashCountsSectionDescription') }}</p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="rounded-xl bg-slate-100 px-4 py-3">
                  <div class="text-xs text-slate-500">{{ t('financeAnalysis.cashCards.totalBefore') }}</div>
                  <div class="mt-1 font-semibold">{{ formatCurrency(summary.cash_count_total_before) }}</div>
                </div>

                <div class="rounded-xl bg-slate-100 px-4 py-3">
                  <div class="text-xs text-slate-500">{{ t('financeAnalysis.cashCards.totalAfter') }}</div>
                  <div class="mt-1 font-semibold">{{ formatCurrency(summary.cash_count_total_after) }}</div>
                </div>

                <div class="rounded-xl bg-slate-100 px-4 py-3">
                  <div class="text-xs text-slate-500">{{ t('financeAnalysis.cashCards.registers') }}</div>
                  <div class="mt-1 font-semibold">{{ summary.cash_count_register_total }}</div>
                </div>
              </div>
            </section>
          </div>

          <div class="grid grid-cols-1 2xl:grid-cols-2 gap-4 items-start">
            <section class="self-start w-full rounded-xl border border-slate-200 p-4 space-y-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="font-semibold">{{ t('financeAnalysis.receiptsTableTitle') }}</h3>
                  <span class="text-xs text-slate-500">{{ t('financeAnalysis.countLabel', { count: receipts.length }) }}</span>
                </div>

                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 cursor-pointer"
                  :title="receiptsExpanded ? t('financeAnalysis.collapseSection', { section: t('financeAnalysis.receiptListSection') }) : t('financeAnalysis.expandSection', { section: t('financeAnalysis.receiptListSection') })"
                  @click="receiptsExpanded = !receiptsExpanded"
                >
                  <span>{{ receiptsExpanded ? t('financeAnalysis.collapse') : t('financeAnalysis.expand') }}</span>
                  <Icon :name="receiptsExpanded ? 'material-symbols:keyboard-arrow-up-rounded' : 'material-symbols:keyboard-arrow-down-rounded'" class="h-5 w-5" />
                </button>
              </div>

              <div v-if="receiptsExpanded" class="overflow-x-auto">
                <table class="w-full table-fixed text-sm border-collapse">
                  <thead>
                    <tr class="text-left border-b">
                      <th class="w-[18%] py-2 pr-3">{{ t('receipt.receiptDate') }}</th>
                      <th class="w-[28%] py-2 pr-3">{{ t('receipt.receiptNumber') }}</th>
                      <th class="w-[28%] py-2 pr-3">{{ t('receipt.company') }}</th>
                      <th class="w-[14%] py-2 text-right">{{ t('receipt.grossAmount') }}</th>
                      <th class="w-[6%]" />
                      <th class="w-[6%]" />
                    </tr>
                  </thead>

                  <tbody>
                    <tr v-for="receipt in receipts" :key="receipt.id" class="border-b last:border-b-0">
                      <td class="py-2 pr-3 align-middle whitespace-nowrap">{{ formatDate(receipt.receipt_date) }}</td>
                      <td class="py-2 pr-3 align-middle">
                        <div class="min-w-0 whitespace-normal break-words" :title="receipt.receipt_number || t('receipt.noNumber')">
                          {{ receipt.receipt_number || t('receipt.noNumber') }}
                        </div>
                      </td>
                      <td class="py-2 pr-3 align-middle">
                        <div class="min-w-0 whitespace-normal break-words" :title="receipt.company_name || t('receipt.noCompany')">
                          {{ receipt.company_name || t('receipt.noCompany') }}
                        </div>
                      </td>
                      <td class="py-2 align-middle text-right font-medium whitespace-nowrap">{{ formatCurrency(receipt.total_amount) }}</td>
                      <td class="py-2 pl-3 align-middle">
                        <div class="flex items-center justify-end">
                          <span
                            class="inline-block h-4 w-4 rounded-full"
                            :class="receiptStatusDotClass(receipt.status)"
                            :title="receiptStatusLabels[receipt.status]"
                            :aria-label="receiptStatusLabels[receipt.status]"
                          />
                        </div>
                      </td>
                      <td class="py-2 pl-3 align-middle">
                        <div class="flex items-center justify-end">
                          <button
                            type="button"
                            class="inline-flex items-center justify-center rounded-md p-1 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 cursor-pointer"
                            :title="t('actions.open')"
                            @click="openReceipt(receipt.id)"
                          >
                            <Icon name="material-symbols:visibility-outline-rounded" class="h-5 w-5" />
                            <span class="sr-only">{{ t('actions.open') }}</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    <tr v-if="receipts.length === 0">
                      <td colspan="6" class="py-6 text-center text-slate-500">
                        {{ t('financeAnalysis.noReceipts') }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="self-start w-full rounded-xl border border-slate-200 p-4 space-y-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="font-semibold">{{ t('financeAnalysis.cashCountsTableTitle') }}</h3>
                  <span class="text-xs text-slate-500">{{ t('financeAnalysis.countLabel', { count: cashCounts.length }) }}</span>
                </div>

                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 cursor-pointer"
                  :title="cashCountsExpanded ? t('financeAnalysis.collapseSection', { section: t('financeAnalysis.cashCountListSection') }) : t('financeAnalysis.expandSection', { section: t('financeAnalysis.cashCountListSection') })"
                  @click="cashCountsExpanded = !cashCountsExpanded"
                >
                  <span>{{ cashCountsExpanded ? t('financeAnalysis.collapse') : t('financeAnalysis.expand') }}</span>
                  <Icon :name="cashCountsExpanded ? 'material-symbols:keyboard-arrow-up-rounded' : 'material-symbols:keyboard-arrow-down-rounded'" class="h-5 w-5" />
                </button>
              </div>

              <div v-if="cashCountsExpanded" class="overflow-x-auto">
                <table class="w-full table-fixed text-sm border-collapse">
                  <thead>
                    <tr class="text-left border-b">
                      <th class="w-[28%] py-2 pr-3">{{ t('cashCount.countedAfterAt') }}</th>
                      <th class="w-[30%] py-2 pr-3">{{ t('cashCount.event') }}</th>
                      <th class="w-[12%] py-2 pr-3 text-right">{{ t('cashCount.registerCount') }}</th>
                      <th class="w-[12%] py-2 pr-3 text-right">{{ t('cashCount.totalAfter') }}</th>
                      <th class="w-[12%] py-2 text-right">{{ t('cashCount.totalDifference') }}</th>
                      <th class="w-[6%]" />
                    </tr>
                  </thead>

                  <tbody>
                    <tr v-for="cashCount in cashCounts" :key="cashCount.id" class="border-b last:border-b-0">
                      <td class="py-2 pr-3 align-middle whitespace-nowrap">{{ formatDateTime(cashCount.counted_after_at) }}</td>
                      <td class="py-2 pr-3 align-middle whitespace-normal break-words">{{ cashCount.event_name }}</td>
                      <td class="py-2 pr-3 align-middle text-right">{{ cashCount.register_count }}</td>
                      <td class="py-2 pr-3 align-middle text-right whitespace-nowrap">{{ formatCurrency(cashCount.total_after_amount) }}</td>
                      <td class="py-2 align-middle text-right font-medium whitespace-nowrap">{{ formatCurrency(cashCount.total_difference) }}</td>
                      <td class="py-2 pl-3 align-middle text-right">
                        <button
                          type="button"
                          class="inline-flex items-center justify-center rounded-md p-1 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 cursor-pointer"
                          :title="t('actions.open')"
                          @click="openCashCount(cashCount.id)"
                        >
                          <Icon name="material-symbols:visibility-outline-rounded" class="h-5 w-5" />
                          <span class="sr-only">{{ t('actions.open') }}</span>
                        </button>
                      </td>
                    </tr>

                    <tr v-if="cashCounts.length === 0">
                      <td colspan="6" class="py-6 text-center text-slate-500">
                        {{ t('financeAnalysis.noCashCounts') }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </template>
      </section>
    </template>
  </Page>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { SearchSelectOption } from '~/components/Common/SearchSelect.vue'
import { useAuth } from '~/composables/useAuth'
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import { usePage } from '~/composables/usePage'
import { buildReturnTarget } from '~/composables/useReturnTarget'
import type { CostCentreRow } from '~/types/costCentre'
import type { FinanceAnalysisData, FinanceAnalysisReceiptItem } from '~/types/financeAnalysis'
import { ReceiptStatus } from '~/types/receipt'
import { downloadFinanceAnalysisReport, type FinanceAnalysisExportGrouping } from '~/utils/excel/financeAnalysisReport'

type QuickSemester = '' | 'summer' | 'winter'
type ManualDateField = 'start' | 'end'
type ComparisonValueType = 'currency' | 'count'

interface FinanceAnalysisResponse {
  ok: true
  analysis: FinanceAnalysisData
}

interface FinanceAnalysisErrorResponse {
  ok: false
  error: string
}

interface PersistedFinanceAnalysisState {
  startDate?: string
  endDate?: string
  quickYear?: string
  quickSemester?: QuickSemester
  quickMonth?: string
  compareWithPreviousYear?: boolean
  selectedStatuses?: ReceiptStatus[]
  receiptsExpanded?: boolean
  cashCountsExpanded?: boolean
  selectedCostCentreId?: number | null
}

interface PersistedFinanceAnalysisExportState {
  exportGrouping?: FinanceAnalysisExportGrouping
  exportSplitByMonth?: boolean
  exportSplitByPaymentStatus?: boolean
}

const ANALYSIS_STATE_STORAGE_KEY = 'fsi.finance-analysis.state'
const ANALYSIS_EXPORT_STORAGE_KEY = 'fsi.finance-analysis.export'

const emit = defineEmits<{
  (e: 'openMenu'): void
}>()

const { setPage, pageMeta } = usePage()
const { hasPermission } = useAuth()
const { t, locale } = useI18n()
const { formatCurrency, formatDate, formatDateTime } = useLocaleFormatters()

const currentYear = new Date().getFullYear()
const defaultStatuses: ReceiptStatus[] = [ReceiptStatus.Draft, ReceiptStatus.Open, ReceiptStatus.Paid]
const statusOrder: ReceiptStatus[] = [ReceiptStatus.Draft, ReceiptStatus.Open, ReceiptStatus.Paid, ReceiptStatus.Cancelled]
const analysis = ref<FinanceAnalysisData | null>(null)
const comparisonAnalysis = ref<FinanceAnalysisData | null>(null)
const isLoading = ref(false)
const isExporting = ref(false)
const errorMessage = ref('')
const startDate = ref(`${currentYear}-01-01`)
const endDate = ref(`${currentYear}-12-31`)
const quickYear = ref(String(currentYear))
const quickSemester = ref<QuickSemester>('')
const quickMonth = ref('')
const compareWithPreviousYear = ref(false)
const selectedStatuses = ref<ReceiptStatus[]>([...defaultStatuses])
const receiptsExpanded = ref(false)
const cashCountsExpanded = ref(false)
const costCentres = ref<CostCentreRow[]>([])
const costCentreQuery = ref('')
const selectedCostCentre = ref<CostCentreRow | null>(null)
const isExportMenuOpen = ref(false)
const exportGrouping = ref<FinanceAnalysisExportGrouping>('none')
const exportSplitByMonth = ref(false)
const exportSplitByPaymentStatus = ref(false)
const hasCostCentreAccess = computed(() => hasPermission('cost_centres.view'))

const yearOptions = computed(() => {
  return Array.from({ length: 11 }, (_, index) => currentYear + 1 - index)
})

const costCentreOptions = computed<SearchSelectOption<CostCentreRow>[]>(() => {
  return costCentres.value.map(costCentre => ({
    key: costCentre.id,
    label: `${costCentre.code} - ${costCentre.name}`,
    value: costCentre,
    searchText: `${costCentre.code} ${costCentre.name}`,
  }))
})

const selectedCostCentreLabel = computed(() => {
  if (!selectedCostCentre.value) return ''
  return `${selectedCostCentre.value.code} - ${selectedCostCentre.value.name}`
})

const monthOptions = computed(() => {
  return Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1),
    label: new Intl.DateTimeFormat(locale.value, { month: 'long' }).format(new Date(2024, index, 1)),
    shortLabel: new Intl.DateTimeFormat(locale.value, { month: 'short' }).format(new Date(2024, index, 1)).slice(0, 3),
  }))
})

const receiptStatusLabels = computed<Record<ReceiptStatus, string>>(() => ({
  draft: t('receipt.states.draft'),
  open: t('receipt.states.open'),
  paid: t('receipt.states.paid'),
  cancelled: t('receipt.states.cancelled'),
}))

const receiptStatusOptions = computed(() => {
  return [
    { value: ReceiptStatus.Draft, label: receiptStatusLabels.value[ReceiptStatus.Draft] },
    { value: ReceiptStatus.Open, label: receiptStatusLabels.value[ReceiptStatus.Open] },
    { value: ReceiptStatus.Paid, label: receiptStatusLabels.value[ReceiptStatus.Paid] },
    { value: ReceiptStatus.Cancelled, label: receiptStatusLabels.value[ReceiptStatus.Cancelled] },
  ]
})

const summary = computed(() => analysis.value?.summary ?? null)
const comparisonSummary = computed(() => comparisonAnalysis.value?.summary ?? null)
const receipts = computed(() => analysis.value?.receipts ?? [])
const cashCounts = computed(() => analysis.value?.cashCounts ?? [])
const hasValidDateRange = computed(() => Boolean(startDate.value && endDate.value && startDate.value <= endDate.value))
const canExportAnalysis = computed(() => Boolean(summary.value) && !isLoading.value && !isExporting.value)
const activePeriodLabel = computed(() => {
  const from = summary.value?.start_date || startDate.value
  const to = summary.value?.end_date || endDate.value
  return t('financeAnalysis.periodLabel', {
    start: formatDate(from),
    end: formatDate(to),
  })
})
const receiptStateCards = computed(() => {
  if (!summary.value) return []

  return [
    {
      key: ReceiptStatus.Paid,
      label: receiptStatusLabels.value[ReceiptStatus.Paid],
      count: summary.value.receipt_paid_count,
      total: summary.value.receipt_paid_total,
    },
    {
      key: ReceiptStatus.Open,
      label: receiptStatusLabels.value[ReceiptStatus.Open],
      count: summary.value.receipt_open_count,
      total: summary.value.receipt_open_total,
    },
    {
      key: ReceiptStatus.Draft,
      label: receiptStatusLabels.value[ReceiptStatus.Draft],
      count: summary.value.receipt_draft_count,
      total: summary.value.receipt_draft_total,
    },
    {
      key: ReceiptStatus.Cancelled,
      label: receiptStatusLabels.value[ReceiptStatus.Cancelled],
      count: summary.value.receipt_cancelled_count,
      total: summary.value.receipt_cancelled_total,
    },
  ]
})
const comparisonCards = computed(() => {
  if (!summary.value || !comparisonSummary.value) return []

  return [
    {
      key: 'receiptTotal',
      label: t('financeAnalysis.cards.receiptTotal'),
      current: summary.value.receipt_total,
      previous: comparisonSummary.value.receipt_total,
      difference: Number((summary.value.receipt_total - comparisonSummary.value.receipt_total).toFixed(2)),
      type: 'currency' as ComparisonValueType,
    },
    {
      key: 'cashCountRevenue',
      label: t('financeAnalysis.cards.cashCountRevenue'),
      current: summary.value.cash_count_total_difference,
      previous: comparisonSummary.value.cash_count_total_difference,
      difference: Number((summary.value.cash_count_total_difference - comparisonSummary.value.cash_count_total_difference).toFixed(2)),
      type: 'currency' as ComparisonValueType,
    },
    {
      key: 'netResult',
      label: t('financeAnalysis.cards.netResult'),
      current: summary.value.net_result,
      previous: comparisonSummary.value.net_result,
      difference: Number((summary.value.net_result - comparisonSummary.value.net_result).toFixed(2)),
      type: 'currency' as ComparisonValueType,
    },
    {
      key: 'entriesReviewed',
      label: t('financeAnalysis.cards.entriesReviewed'),
      current: summary.value.receipt_count + summary.value.cash_count_count,
      previous: comparisonSummary.value.receipt_count + comparisonSummary.value.cash_count_count,
      difference: (summary.value.receipt_count + summary.value.cash_count_count) - (comparisonSummary.value.receipt_count + comparisonSummary.value.cash_count_count),
      type: 'count' as ComparisonValueType,
    },
  ]
})

function readStoredJson<T>(key: string): T | null {
  if (!import.meta.client) return null

  try {
    const rawValue = window.localStorage.getItem(key)
    return rawValue ? JSON.parse(rawValue) as T : null
  } catch {
    return null
  }
}

function writeStoredJson(key: string, value: unknown) {
  if (!import.meta.client) return

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage errors and keep the current in-memory state.
  }
}

function restoreSelectedCostCentre(costCentreId: number | null | undefined) {
  if (typeof costCentreId !== 'number') {
    selectedCostCentre.value = null
    costCentreQuery.value = ''
    return
  }

  const restoredCostCentre = costCentres.value.find(costCentre => costCentre.id === costCentreId) || null
  selectedCostCentre.value = restoredCostCentre
  costCentreQuery.value = restoredCostCentre ? `${restoredCostCentre.code} - ${restoredCostCentre.name}` : ''
}

function applyAnalysisState(state?: PersistedFinanceAnalysisState | null) {
  if (!state) return

  if (typeof state.startDate === 'string') startDate.value = state.startDate
  if (typeof state.endDate === 'string') endDate.value = state.endDate
  if (typeof state.quickYear === 'string') quickYear.value = state.quickYear
  if (state.quickSemester === '' || state.quickSemester === 'summer' || state.quickSemester === 'winter') {
    quickSemester.value = state.quickSemester
  }
  if (typeof state.quickMonth === 'string') quickMonth.value = state.quickMonth
  if (typeof state.compareWithPreviousYear === 'boolean') compareWithPreviousYear.value = state.compareWithPreviousYear
  if (Array.isArray(state.selectedStatuses)) {
    selectedStatuses.value = state.selectedStatuses.filter((status): status is ReceiptStatus => statusOrder.includes(status as ReceiptStatus))
  }
  if (typeof state.receiptsExpanded === 'boolean') receiptsExpanded.value = state.receiptsExpanded
  if (typeof state.cashCountsExpanded === 'boolean') cashCountsExpanded.value = state.cashCountsExpanded
  restoreSelectedCostCentre(state.selectedCostCentreId)
}

function restoreStoredAnalysisState() {
  applyAnalysisState(readStoredJson<PersistedFinanceAnalysisState>(ANALYSIS_STATE_STORAGE_KEY))
}

function restoreStoredExportState() {
  const state = readStoredJson<PersistedFinanceAnalysisExportState>(ANALYSIS_EXPORT_STORAGE_KEY)
  if (!state) return

  if (state.exportGrouping === 'none' || state.exportGrouping === 'costCentres' || state.exportGrouping === 'spheres') {
    exportGrouping.value = state.exportGrouping
  }
  if (typeof state.exportSplitByMonth === 'boolean') exportSplitByMonth.value = state.exportSplitByMonth
  if (typeof state.exportSplitByPaymentStatus === 'boolean') exportSplitByPaymentStatus.value = state.exportSplitByPaymentStatus
}

function persistAnalysisState() {
  writeStoredJson(ANALYSIS_STATE_STORAGE_KEY, {
    startDate: startDate.value,
    endDate: endDate.value,
    quickYear: quickYear.value,
    quickSemester: quickSemester.value,
    quickMonth: quickMonth.value,
    compareWithPreviousYear: compareWithPreviousYear.value,
    selectedStatuses: [...selectedStatuses.value],
    receiptsExpanded: receiptsExpanded.value,
    cashCountsExpanded: cashCountsExpanded.value,
    selectedCostCentreId: selectedCostCentre.value?.id ?? null,
  } satisfies PersistedFinanceAnalysisState)
}

function persistExportState() {
  writeStoredJson(ANALYSIS_EXPORT_STORAGE_KEY, {
    exportGrouping: exportGrouping.value,
    exportSplitByMonth: exportSplitByMonth.value,
    exportSplitByPaymentStatus: exportSplitByPaymentStatus.value,
  } satisfies PersistedFinanceAnalysisExportState)
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function shiftDateByYears(value: string, years: number) {
  const [yearString, monthString, dayString] = value.split('-')
  const shiftedYear = Number(yearString) + years
  const month = Number(monthString)
  const day = Number(dayString)
  const lastDayOfMonth = new Date(shiftedYear, month, 0).getDate()
  return `${shiftedYear}-${pad(month)}-${pad(Math.min(day, lastDayOfMonth))}`
}

function setRange(nextStartDate: string, nextEndDate: string) {
  startDate.value = nextStartDate
  endDate.value = nextEndDate
}

function applyFullYearRange(year: number) {
  setRange(`${year}-01-01`, `${year}-12-31`)
}

function ensureQuickYear() {
  if (!quickYear.value) quickYear.value = String(currentYear)
  return Number(quickYear.value)
}

function applyYearShortcut() {
  if (!quickYear.value) return
  quickSemester.value = ''
  quickMonth.value = ''
  applyFullYearRange(Number(quickYear.value))
}

function applySemesterShortcut() {
  const year = ensureQuickYear()
  quickMonth.value = ''

  if (!quickSemester.value) {
    applyFullYearRange(year)
    return
  }

  if (quickSemester.value === 'summer') {
    setRange(`${year}-04-01`, `${year}-09-30`)
    return
  }

  setRange(`${year}-10-01`, `${year + 1}-03-31`)
}

function toggleSemesterShortcut(value: Exclude<QuickSemester, ''>) {
  quickSemester.value = quickSemester.value === value ? '' : value
  applySemesterShortcut()
}

function applyMonthShortcut() {
  const year = ensureQuickYear()
  quickSemester.value = ''

  if (!quickMonth.value) {
    applyFullYearRange(year)
    return
  }

  const month = Number(quickMonth.value)
  const lastDay = new Date(year, month, 0).getDate()
  setRange(`${year}-${pad(month)}-01`, `${year}-${pad(month)}-${pad(lastDay)}`)
}

function toggleMonthShortcut(value: string) {
  quickMonth.value = quickMonth.value === value ? '' : value
  applyMonthShortcut()
}

function handleManualDateInput(field: ManualDateField, event: Event) {
  const value = (event.target as HTMLInputElement).value

  if (field === 'start') startDate.value = value
  if (field === 'end') endDate.value = value

  quickYear.value = ''
  quickSemester.value = ''
  quickMonth.value = ''
}

function resetToCurrentYear() {
  quickYear.value = String(currentYear)
  quickSemester.value = ''
  quickMonth.value = ''
  compareWithPreviousYear.value = false
  selectedStatuses.value = [...defaultStatuses]
  selectedCostCentre.value = null
  costCentreQuery.value = ''
  applyFullYearRange(currentYear)
  loadAnalysis()
}

function toggleReceiptStatus(status: ReceiptStatus) {
  if (selectedStatuses.value.includes(status)) {
    selectedStatuses.value = selectedStatuses.value.filter(value => value !== status)
    return
  }

  selectedStatuses.value = [...selectedStatuses.value, status].sort((left, right) => {
    return statusOrder.indexOf(left) - statusOrder.indexOf(right)
  })
}

function statusButtonClass(status: ReceiptStatus) {
  const selected = selectedStatuses.value.includes(status)
  return [
    'w-full rounded-lg border px-3 py-2 text-sm font-medium transition cursor-pointer',
    selected
      ? 'border-orange-400 bg-orange-50 text-orange-700'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  ]
}

function semesterButtonClass(value: Exclude<QuickSemester, ''>) {
  const selected = quickSemester.value === value
  return [
    'rounded-lg border px-3 py-2 text-sm font-medium transition cursor-pointer',
    selected
      ? 'border-orange-400 bg-orange-50 text-orange-700'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  ]
}

function monthButtonClass(value: string) {
  const selected = quickMonth.value === value
  return [
    'rounded-lg border px-3 py-2 text-sm font-medium transition cursor-pointer',
    selected
      ? 'border-orange-400 bg-orange-50 text-orange-700'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  ]
}

function exportGroupingButtonClass(value: FinanceAnalysisExportGrouping) {
  const selected = exportGrouping.value === value
  return [
    'rounded-lg border px-3 py-2 text-xs font-medium transition cursor-pointer',
    selected
      ? 'border-orange-400 bg-orange-50 text-orange-700'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  ]
}

function exportToggleButtonClass(selected: boolean) {
  return [
    'w-full rounded-lg border px-3 py-2 text-sm font-medium text-left transition cursor-pointer',
    selected
      ? 'border-orange-400 bg-orange-50 text-orange-700'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  ]
}

function setExportGrouping(value: FinanceAnalysisExportGrouping) {
  exportGrouping.value = value
}

function closeExportMenu() {
  isExportMenuOpen.value = false
}

function toggleExportMenu() {
  if (!canExportAnalysis.value) return
  isExportMenuOpen.value = !isExportMenuOpen.value
}

function formatComparisonValue(value: number, type: ComparisonValueType) {
  if (type === 'currency') return formatCurrency(value)
  return new Intl.NumberFormat(locale.value).format(value)
}

function formatSignedComparisonValue(value: number, type: ComparisonValueType) {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${formatComparisonValue(Math.abs(value), type)}`
}

function comparisonDifferenceClass(value: number) {
  if (value > 0) return 'text-emerald-700'
  if (value < 0) return 'text-red-700'
  return 'text-slate-600'
}

async function exportAnalysisReport() {
  if (!summary.value || isExporting.value) return

  isExporting.value = true

  try {
    downloadFinanceAnalysisReport({
      t,
      locale: locale.value,
      analysis: analysis.value as FinanceAnalysisData,
      comparisonAnalysis: comparisonAnalysis.value,
      startDate: startDate.value,
      endDate: endDate.value,
      includeComparison: compareWithPreviousYear.value,
      selectedStatuses: selectedStatuses.value,
      receiptStatusLabels: receiptStatusLabels.value,
      selectedCostCentre: selectedCostCentre.value,
      exportGrouping: exportGrouping.value,
      exportSplitByMonth: exportSplitByMonth.value,
      exportSplitByPaymentStatus: exportSplitByPaymentStatus.value,
      formatCurrency,
      formatDate,
      formatDateTime,
    })
    closeExportMenu()
  } catch {
    errorMessage.value = t('financeAnalysis.exportFailed')
  } finally {
    isExporting.value = false
  }
}

function toggleComparisonMode() {
  compareWithPreviousYear.value = !compareWithPreviousYear.value
  loadAnalysis()
}

async function fetchAnalysisRange(periodStartDate: string, periodEndDate: string) {
  const response = await $fetch<FinanceAnalysisResponse | FinanceAnalysisErrorResponse>('/api/finances/analysis', {
    query: {
      startDate: periodStartDate,
      endDate: periodEndDate,
      statuses: selectedStatuses.value,
      costCentreId: selectedCostCentre.value?.id || undefined,
    },
  })

  if (!response.ok) throw new Error(response.error)
  return response.analysis
}

function getAnalysisPageMeta() {
  return {
    analysisState: {
      startDate: startDate.value,
      endDate: endDate.value,
      quickYear: quickYear.value,
      quickSemester: quickSemester.value,
      quickMonth: quickMonth.value,
      compareWithPreviousYear: compareWithPreviousYear.value,
      selectedStatuses: [...selectedStatuses.value],
      receiptsExpanded: receiptsExpanded.value,
      cashCountsExpanded: cashCountsExpanded.value,
      selectedCostCentreId: selectedCostCentre.value?.id ?? null,
    },
  }
}

function restoreAnalysisPageMeta() {
  applyAnalysisState(pageMeta.value?.analysisState as PersistedFinanceAnalysisState | undefined)
}

async function loadCostCentres() {
  if (!hasCostCentreAccess.value) return

  try {
    const response = await $fetch<{ ok: true, costCentres: CostCentreRow[] } | { ok: false, error: string }>('/api/cost_centres', {
      method: 'GET',
    })

    if (!response.ok) return
    costCentres.value = response.costCentres.filter(costCentre => costCentre.is_active)
  } catch {
    costCentres.value = []
  }
}

function selectCostCentre(costCentre: CostCentreRow) {
  selectedCostCentre.value = costCentre
  costCentreQuery.value = `${costCentre.code} - ${costCentre.name}`
}

function selectCostCentreFromOption(value: unknown) {
  selectCostCentre(value as CostCentreRow)
}

function clearSelectedCostCentre() {
  selectedCostCentre.value = null
  costCentreQuery.value = ''
}

function openReceipt(id: number) {
  setPage('ReceiptCreate', {
    receiptId: id,
    returnTarget: buildReturnTarget('FinanceAnalysis', getAnalysisPageMeta()),
    forceReadonly: true,
  })
}

function openCashCount(id: number) {
  setPage('CashCountCreate', {
    cashCountId: id,
    returnTarget: buildReturnTarget('FinanceAnalysis', getAnalysisPageMeta()),
    forceReadonly: true,
  })
}

async function loadAnalysis() {
  if (!hasValidDateRange.value) return

  isLoading.value = true
  errorMessage.value = ''
  comparisonAnalysis.value = null

  try {
    if (compareWithPreviousYear.value) {
      const previousStartDate = shiftDateByYears(startDate.value, -1)
      const previousEndDate = shiftDateByYears(endDate.value, -1)
      const [currentAnalysis, previousAnalysis] = await Promise.all([
        fetchAnalysisRange(startDate.value, endDate.value),
        fetchAnalysisRange(previousStartDate, previousEndDate),
      ])

      analysis.value = currentAnalysis
      comparisonAnalysis.value = previousAnalysis
      return
    }

    analysis.value = await fetchAnalysisRange(startDate.value, endDate.value)
  } catch (error: any) {
    errorMessage.value = error?.data?.error || error?.message || t('financeAnalysis.loadFailed')
  } finally {
    isLoading.value = false
  }
}

function receiptStatusTone(status: FinanceAnalysisReceiptItem['status']) {
  switch (status) {
    case ReceiptStatus.Draft:
      return 'slate'
    case ReceiptStatus.Open:
      return 'yellow'
    case ReceiptStatus.Paid:
      return 'green'
    case ReceiptStatus.Cancelled:
      return 'red'
    default:
      return 'gray'
  }
}

function receiptStatusDotClass(status: FinanceAnalysisReceiptItem['status']) {
  switch (receiptStatusTone(status)) {
    case 'green':
      return 'bg-emerald-500'
    case 'yellow':
      return 'bg-amber-400'
    case 'red':
      return 'bg-red-500'
    case 'slate':
      return 'bg-slate-400'
    default:
      return 'bg-slate-300'
  }
}

watch(() => ({
  startDate: startDate.value,
  endDate: endDate.value,
  quickYear: quickYear.value,
  quickSemester: quickSemester.value,
  quickMonth: quickMonth.value,
  compareWithPreviousYear: compareWithPreviousYear.value,
  selectedStatuses: [...selectedStatuses.value],
  receiptsExpanded: receiptsExpanded.value,
  cashCountsExpanded: cashCountsExpanded.value,
  selectedCostCentreId: selectedCostCentre.value?.id ?? null,
}), () => {
  persistAnalysisState()
}, { deep: true })

watch(() => ({
  exportGrouping: exportGrouping.value,
  exportSplitByMonth: exportSplitByMonth.value,
  exportSplitByPaymentStatus: exportSplitByPaymentStatus.value,
}), () => {
  persistExportState()
}, { deep: true })

onMounted(async () => {
  await loadCostCentres()
  restoreStoredAnalysisState()
  restoreStoredExportState()
  restoreAnalysisPageMeta()
  await loadAnalysis()
})
</script>
