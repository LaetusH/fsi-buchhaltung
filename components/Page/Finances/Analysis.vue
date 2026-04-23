<template>
  <Page :headline1="t('financeAnalysis.title')" @open-menu="$emit('openMenu')">
    <template #cards>
      <section class="bg-white rounded-xl shadow-lg p-4 space-y-4 col-span-12 lg:col-span-4 xl:col-span-3">
        <div class="space-y-1">
          <h2 class="text-lg font-semibold">{{ t('financeAnalysis.menuTitle') }}</h2>
        </div>

        <div class="space-y-3 rounded-xl border border-slate-200 p-4">
          <button
            type="button"
            class="flex w-full items-start justify-between gap-3 text-left cursor-pointer"
            @click="periodFiltersExpanded = !periodFiltersExpanded"
          >
            <div>
              <h3 class="font-semibold text-slate-900">{{ t('financeAnalysis.periodFilters') }}</h3>
              <p class="text-xs text-slate-500">{{ t('financeAnalysis.periodFiltersHint') }}</p>
            </div>
            <Icon :name="periodFiltersExpanded ? 'material-symbols:keyboard-arrow-up-rounded' : 'material-symbols:keyboard-arrow-down-rounded'" class="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
          </button>

          <div v-if="periodFiltersExpanded" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="field">
                <label>{{ t('financeAnalysis.startDate') }}</label>
                <CommonDateInput
                  :model-value="startDate"
                  @update:model-value="handleManualDateInput('start', $event)"
                />
              </div>

              <div class="field">
                <label>{{ t('financeAnalysis.endDate') }}</label>
                <CommonDateInput
                  :model-value="endDate"
                  @update:model-value="handleManualDateInput('end', $event)"
                />
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
            </div>
          </div>
        </div>

        <div v-if="hasCostCentreAccess" class="space-y-3 rounded-xl border border-slate-200 p-4">
          <button
            type="button"
            class="flex w-full items-start justify-between gap-3 text-left cursor-pointer"
            @click="costCentreFiltersExpanded = !costCentreFiltersExpanded"
          >
            <div>
              <h3 class="font-semibold text-slate-900">{{ t('financeAnalysis.costCentre') }}</h3>
              <p class="text-xs text-slate-500">{{ t('financeAnalysis.costCentreHint') }}</p>
            </div>
            <Icon :name="costCentreFiltersExpanded ? 'material-symbols:keyboard-arrow-up-rounded' : 'material-symbols:keyboard-arrow-down-rounded'" class="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
          </button>

          <div v-if="costCentreFiltersExpanded" class="field">
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
            <label v-if="selectedCostCentreHasChildren" class="mt-3 flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input v-model="includeChildCostCentres" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500 cursor-pointer">
              <span>{{ t('financeAnalysis.includeChildCostCentres') }}</span>
            </label>
          </div>
        </div>

        <div class="space-y-3 rounded-xl border border-slate-200 p-4">
          <button
            type="button"
            class="flex w-full items-start justify-between gap-3 text-left cursor-pointer"
            @click="receiptFiltersExpanded = !receiptFiltersExpanded"
          >
            <div>
              <h3 class="font-semibold text-slate-900">{{ t('financeAnalysis.receiptStateFilters') }}</h3>
              <p class="text-xs text-slate-500">{{ t('financeAnalysis.receiptStateHint') }}</p>
            </div>
            <Icon :name="receiptFiltersExpanded ? 'material-symbols:keyboard-arrow-up-rounded' : 'material-symbols:keyboard-arrow-down-rounded'" class="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
          </button>

          <div v-if="receiptFiltersExpanded" class="space-y-3">
            <div class="field">
              <label>{{ t('financeAnalysis.receiptDateField') }}</label>
              <MenuDropdown v-model="openFilterDropdown" :id="2">
                <template #trigger="{ styling }">
                  <button :class="[styling, 'cursor-pointer']" type="button">
                    <span class="truncate">{{ selectedReceiptDateFieldLabel }}</span>
                    <Icon name="material-symbols:keyboard-arrow-down-rounded" class="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                  </button>
                </template>

                <template #default="{ styling }">
                  <button
                    v-for="option in receiptDateFieldOptions"
                    :key="option.value"
                    :class="styling"
                    type="button"
                    @click="selectReceiptDateField(option.value)"
                  >
                    {{ option.label }}
                  </button>
                </template>
              </MenuDropdown>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
              <button
                v-for="option in receiptStatusOptions"
                :key="option.value"
                type="button"
                :class="statusButtonClass(option.value, selectedStatuses)"
                @click="toggleReceiptStatus(option.value)"
              >
                {{ option.label }}
              </button>
            </div>

            <p v-if="selectedStatuses.length === 0" class="text-xs text-red-700">
              {{ t('financeAnalysis.noReceiptStatesSelected') }}
            </p>
          </div>
        </div>

        <div class="space-y-3 rounded-xl border border-slate-200 p-4">
          <button
            type="button"
            class="flex w-full items-start justify-between gap-3 text-left cursor-pointer"
            @click="invoiceFiltersExpanded = !invoiceFiltersExpanded"
          >
            <div>
              <h3 class="font-semibold text-slate-900">{{ t('financeAnalysis.invoiceStateFilters') }}</h3>
              <p class="text-xs text-slate-500">{{ t('financeAnalysis.invoiceStateHint') }}</p>
            </div>
            <Icon :name="invoiceFiltersExpanded ? 'material-symbols:keyboard-arrow-up-rounded' : 'material-symbols:keyboard-arrow-down-rounded'" class="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
          </button>

          <div v-if="invoiceFiltersExpanded" class="space-y-3">
            <div class="field">
              <label>{{ t('financeAnalysis.invoiceDateField') }}</label>
              <MenuDropdown v-model="openFilterDropdown" :id="1">
                <template #trigger="{ styling }">
                  <button :class="[styling, 'cursor-pointer']" type="button">
                    <span class="truncate">{{ selectedInvoiceDateFieldLabel }}</span>
                    <Icon name="material-symbols:keyboard-arrow-down-rounded" class="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                  </button>
                </template>

                <template #default="{ styling }">
                  <button
                    v-for="option in invoiceDateFieldOptions"
                    :key="option.value"
                    :class="styling"
                    type="button"
                    @click="selectInvoiceDateField(option.value)"
                  >
                    {{ option.label }}
                  </button>
                </template>
              </MenuDropdown>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
              <button
                v-for="option in invoiceStatusOptions"
                :key="option.value"
                type="button"
                :class="statusButtonClass(option.value, selectedInvoiceStatuses)"
                @click="toggleInvoiceStatus(option.value)"
              >
                {{ option.label }}
              </button>
            </div>

            <p v-if="selectedInvoiceStatuses.length === 0" class="text-xs text-red-700">
              {{ t('financeAnalysis.noInvoiceStatesSelected') }}
            </p>
          </div>
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
            <div ref="exportMenuWrapper" class="relative">
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

              <div v-if="isExportMenuOpen && canExportAnalysis" class="absolute right-0 top-full z-20 mt-2 w-100 rounded-xl border border-slate-200 bg-white p-3 shadow-xl space-y-3">
                <div class="space-y-0.5">
                  <div class="text-sm font-semibold text-slate-900">{{ t('financeAnalysis.exportOptionsTitle') }}</div>
                  <p class="text-xs text-slate-500">{{ t('financeAnalysis.exportOptionsHint') }}</p>
                </div>

                <section v-if="showReportPagesExportOptions" class="space-y-2 rounded-xl border border-slate-200 p-2.5">
                  <div>
                    <div class="text-sm font-semibold text-slate-900">{{ t('financeAnalysis.exportReportPagesTitle') }}</div>
                    <p class="text-[11px] text-slate-500">{{ t('financeAnalysis.exportReportPagesHint') }}</p>
                  </div>

                  <MenuDropdown v-model="openFilterDropdown" :id="3">
                    <template #trigger="{ styling }">
                      <button :class="[styling, 'cursor-pointer']" type="button">
                        <span class="truncate">{{ selectedReportPagesExportLabel }}</span>
                        <Icon name="material-symbols:keyboard-arrow-down-rounded" class="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                      </button>
                    </template>

                    <template #default="{ styling }">
                      <button
                        v-for="option in reportPagesExportOptions"
                        :key="option.value"
                        :class="[
                          styling,
                          option.disabled ? 'cursor-not-allowed text-slate-400 hover:bg-white' : '',
                        ]"
                        type="button"
                        :disabled="option.disabled"
                        @click="selectReportPagesExportMode(option.value)"
                      >
                        {{ option.label }}
                      </button>
                    </template>
                  </MenuDropdown>

                  <div
                    :class="[
                      'rounded-lg px-2.5 py-1.5 text-[11px]',
                      canCompareToBudget
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-slate-100 text-slate-600',
                    ]"
                  >
                    {{ compareToBudgetHint }}
                  </div>

                </section>

                <section class="space-y-2 rounded-xl border border-slate-200 p-2.5">
                  <div>
                    <div class="text-sm font-semibold text-slate-900">{{ t('financeAnalysis.exportOverviewSheetsTitle') }}</div>
                    <p class="text-[11px] text-slate-500">{{ t('financeAnalysis.exportOverviewSheetsHint') }}</p>
                  </div>

                  <div class="space-y-1.5 rounded-lg bg-slate-50 p-2">
                    <div class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ t('financeAnalysis.exportGroupingLabel') }}</div>
                    <div :class="['grid gap-2', showCostCentreGroupingOption ? 'grid-cols-3' : 'grid-cols-2']">
                      <button
                        type="button"
                        :class="exportGroupingButtonClass('none')"
                        @click="setExportGrouping('none')"
                      >
                        {{ t('financeAnalysis.exportGroupingNone') }}
                      </button>
                      <button
                        v-if="showCostCentreGroupingOption"
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

                  <div class="space-y-1.5 rounded-lg bg-slate-50 p-2">
                    <div class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ t('financeAnalysis.exportSplitLabel') }}</div>
                    <div class="grid grid-cols-2 gap-2">
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
                  </div>
                </section>

                <div class="flex items-center justify-between gap-2 pt-1">
                  <button type="button" class="btn-secondary" @click="closeExportMenu">
                    {{ t('actions.cancel') }}
                  </button>
                  <button type="button" class="btn-primary" :disabled="isExporting" @click="exportAnalysisReport">
                    {{ isExporting ? t('financeAnalysis.exportingReport') : t('financeAnalysis.exportNow') }}
                  </button>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-2.25 sm:min-w-fit">
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
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3">
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

            <div class="rounded-xl bg-sky-50 px-4 py-4">
              <div class="text-sm text-sky-700">{{ t('financeAnalysis.cards.invoiceRevenue') }}</div>
              <div class="mt-2 text-2xl font-semibold text-sky-950">{{ formatCurrency(summary.invoice_total) }}</div>
              <div class="mt-1 text-xs text-sky-700">{{ t('financeAnalysis.cards.invoiceCountCount', { count: summary.invoice_count }) }}</div>
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
              <div class="mt-2 text-2xl font-semibold text-slate-900">{{ summary.receipt_count + summary.cash_count_count + summary.invoice_count }}</div>
              <div class="mt-1 text-xs text-slate-600">{{ t('financeAnalysis.cards.registerCount', { count: summary.cash_count_register_total }) }}</div>
            </div>
          </div>

          <section v-if="compareWithPreviousYear && comparisonSummary" class="rounded-xl border border-slate-200 p-4 space-y-4">
            <div class="space-y-1">
              <h3 class="font-semibold">{{ t('financeAnalysis.comparisonTitle') }}</h3>
              <p class="text-sm text-slate-500">{{ t('financeAnalysis.previousYearRange', { start: formatDate(comparisonSummary.start_date), end: formatDate(comparisonSummary.end_date) }) }}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3">
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

          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <section class="w-full sm:col-span-2 rounded-xl border border-slate-200 p-4 space-y-4">
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

              <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-3">
                <div class="rounded-xl bg-slate-100 px-4 py-3">
                  <div class="text-xs text-slate-500">{{ t('financeAnalysis.cashCards.totalBefore') }}</div>
                  <div class="mt-1 font-semibold">{{ formatCurrency(summary.cash_count_total_before) }}</div>
                </div>

                <div class="rounded-xl bg-slate-100 px-4 py-3">
                  <div class="text-xs text-slate-500">{{ t('financeAnalysis.cashCards.totalAfter') }}</div>
                  <div class="mt-1 font-semibold">{{ formatCurrency(summary.cash_count_total_after) }}</div>
                </div>
              </div>
            </section>

            <section class="w-full rounded-xl border border-slate-200 p-4 space-y-4">
              <div>
                <h3 class="font-semibold">{{ t('financeAnalysis.invoicesSectionTitle') }}</h3>
                <p class="text-sm text-slate-500">{{ t('financeAnalysis.invoicesSectionDescription') }}</p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-3">
                <div class="rounded-xl bg-slate-100 px-4 py-3">
                  <div class="text-xs text-slate-500">{{ t('financeAnalysis.cards.invoiceRevenue') }}</div>
                  <div class="mt-1 font-semibold">{{ formatCurrency(summary.invoice_total) }}</div>
                </div>

                <div class="rounded-xl bg-slate-100 px-4 py-3">
                  <div class="text-xs text-slate-500">{{ t('financeAnalysis.cards.invoiceCount') }}</div>
                  <div class="mt-1 font-semibold">{{ summary.invoice_count }}</div>
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
                      <th class="w-[18%] py-2 pr-3">{{ selectedReceiptDateFieldLabel }}</th>
                      <th class="w-[28%] py-2 pr-3">{{ t('receipt.receiptNumber') }}</th>
                      <th class="w-[28%] py-2 pr-3">{{ t('receipt.company') }}</th>
                      <th class="w-[14%] py-2 text-right">{{ t('receipt.grossAmount') }}</th>
                      <th class="w-[6%]" />
                      <th class="w-[6%]" />
                    </tr>
                  </thead>

                  <tbody>
                    <tr v-for="receipt in receipts" :key="receipt.id" class="border-b last:border-b-0">
                      <td class="py-2 pr-3 align-middle whitespace-nowrap">{{ formatReceiptDateByBasis(receipt) }}</td>
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

            <div class="space-y-4">
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
                        <td class="py-2 pl-3 align-middle">
                          <div class="flex items-center justify-end">
                            <button
                              type="button"
                              class="inline-flex items-center justify-center rounded-md p-1 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 cursor-pointer"
                              :title="t('actions.open')"
                              @click="openCashCount(cashCount.id)"
                            >
                              <Icon name="material-symbols:visibility-outline-rounded" class="h-5 w-5" />
                              <span class="sr-only">{{ t('actions.open') }}</span>
                            </button>
                          </div>
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

              <section class="self-start w-full rounded-xl border border-slate-200 p-4 space-y-4">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <h3 class="font-semibold">{{ t('financeAnalysis.invoicesTableTitle') }}</h3>
                    <span class="text-xs text-slate-500">{{ t('financeAnalysis.countLabel', { count: invoices.length }) }}</span>
                  </div>

                  <button
                    type="button"
                    class="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 cursor-pointer"
                    :title="invoicesExpanded ? t('financeAnalysis.collapseSection', { section: t('financeAnalysis.invoiceListSection') }) : t('financeAnalysis.expandSection', { section: t('financeAnalysis.invoiceListSection') })"
                    @click="invoicesExpanded = !invoicesExpanded"
                  >
                    <span>{{ invoicesExpanded ? t('financeAnalysis.collapse') : t('financeAnalysis.expand') }}</span>
                    <Icon :name="invoicesExpanded ? 'material-symbols:keyboard-arrow-up-rounded' : 'material-symbols:keyboard-arrow-down-rounded'" class="h-5 w-5" />
                  </button>
                </div>

                <div v-if="invoicesExpanded" class="overflow-x-auto">
                  <table class="w-full table-fixed text-sm border-collapse">
                    <thead>
                      <tr class="text-left border-b">
                        <th class="w-[20%] py-2 pr-3">{{ selectedInvoiceDateFieldLabel }}</th>
                        <th class="w-[24%] py-2 pr-3">{{ t('invoice.invoiceNumber') }}</th>
                        <th class="w-[24%] py-2 pr-3">{{ t('invoice.company') }}</th>
                        <th class="w-[12%] py-2 text-right">{{ t('receipt.grossAmount') }}</th>
                        <th class="w-[6%]" />
                        <th class="w-[6%]" />
                      </tr>
                    </thead>

                  <tbody>
                    <tr v-for="invoice in invoices" :key="invoice.id" class="border-b last:border-b-0">
                      <td class="py-2 pr-3 align-middle whitespace-nowrap">{{ formatInvoiceDateByBasis(invoice) }}</td>
                      <td class="py-2 pr-3 align-middle whitespace-normal break-words">{{ invoice.invoice_number }}</td>
                      <td class="py-2 pr-3 align-middle whitespace-normal break-words">{{ invoice.company_name || t('invoice.noCompany') }}</td>
                      <td class="py-2 align-middle text-right font-medium whitespace-nowrap">{{ formatCurrency(invoice.total_amount) }}</td>
                      <td class="py-2 pl-3 align-middle">
                        <div class="flex items-center justify-end">
                          <span
                            class="inline-block h-4 w-4 rounded-full"
                            :class="receiptStatusDotClass(invoice.status)"
                            :title="invoiceStatusLabels[invoice.status]"
                            :aria-label="invoiceStatusLabels[invoice.status]"
                          />
                        </div>
                      </td>
                      <td class="py-2 pl-3 align-middle">
                        <div class="flex items-center justify-end">
                          <button
                            type="button"
                            class="inline-flex items-center justify-center rounded-md p-1 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 cursor-pointer"
                            :title="t('actions.open')"
                            @click="openInvoice(invoice.id)"
                          >
                            <Icon name="material-symbols:visibility-outline-rounded" class="h-5 w-5" />
                            <span class="sr-only">{{ t('actions.open') }}</span>
                          </button>
                        </div>
                      </td>
                      </tr>

                      <tr v-if="invoices.length === 0">
                        <td colspan="6" class="py-6 text-center text-slate-500">
                          {{ t('financeAnalysis.noInvoices') }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
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
import type { GetBudgetResponse } from '~/server/api/finances/budgets/[id].get'
import type { BudgetDetail, BudgetListItem } from '~/types/budget'
import type { CostCentreRow } from '~/types/costCentre'
import type { FinanceAnalysisData, FinanceAnalysisReceiptItem } from '~/types/financeAnalysis'
import { InvoiceStatus } from '~/types/invoice'
import { ReceiptStatus } from '~/types/receipt'
import { downloadFinanceAnalysisReport, type FinanceAnalysisExportGrouping } from '~/utils/excel/financeAnalysisReport'

type QuickSemester = '' | 'summer' | 'winter'
type ManualDateField = 'start' | 'end'
type ComparisonValueType = 'currency' | 'count'
type ReceiptDateField = 'receipt_date' | 'reimbursement_submitted_at'
type InvoiceDateField = 'invoice_date' | 'due_date' | 'service_date'
type ReportPagesExportMode = 'none' | 'reportOnly' | 'comparisonOnly' | 'both'
type FinanceAnalysisExportLogo = {
  data: Uint8Array
  extension: 'png' | 'jpeg'
  mimeType: string
  width: number
  height: number
}

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
  receiptDateField?: ReceiptDateField
  selectedInvoiceStatuses?: InvoiceStatus[]
  invoiceDateField?: InvoiceDateField
  periodFiltersExpanded?: boolean
  costCentreFiltersExpanded?: boolean
  receiptFiltersExpanded?: boolean
  invoiceFiltersExpanded?: boolean
  receiptsExpanded?: boolean
  cashCountsExpanded?: boolean
  invoicesExpanded?: boolean
  selectedCostCentreId?: number | null
  includeChildCostCentres?: boolean
}

interface PersistedFinanceAnalysisExportState {
  exportGrouping?: FinanceAnalysisExportGrouping
  exportSplitByMonth?: boolean
  exportSplitByPaymentStatus?: boolean
  reportPagesExportMode?: ReportPagesExportMode
}

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
const defaultInvoiceStatuses: InvoiceStatus[] = [InvoiceStatus.Open, InvoiceStatus.Paid]
const invoiceStatusOrder: InvoiceStatus[] = [InvoiceStatus.Draft, InvoiceStatus.Open, InvoiceStatus.Paid, InvoiceStatus.Cancelled]
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
const receiptDateField = ref<ReceiptDateField>('receipt_date')
const selectedInvoiceStatuses = ref<InvoiceStatus[]>([...defaultInvoiceStatuses])
const invoiceDateField = ref<InvoiceDateField>('invoice_date')
const periodFiltersExpanded = ref(true)
const costCentreFiltersExpanded = ref(false)
const receiptFiltersExpanded = ref(false)
const invoiceFiltersExpanded = ref(false)
const receiptsExpanded = ref(false)
const cashCountsExpanded = ref(false)
const invoicesExpanded = ref(false)
const costCentres = ref<CostCentreRow[]>([])
const budgets = ref<BudgetListItem[]>([])
const costCentreQuery = ref('')
const selectedCostCentre = ref<CostCentreRow | null>(null)
const includeChildCostCentres = ref(false)
const exportMenuWrapper = ref<HTMLElement | null>(null)
const isExportMenuOpen = ref(false)
const exportGrouping = ref<FinanceAnalysisExportGrouping>('none')
const exportSplitByMonth = ref(false)
const exportSplitByPaymentStatus = ref(false)
const reportPagesExportMode = ref<ReportPagesExportMode>('none')
const openFilterDropdown = ref<number | null>(null)
const hasCostCentreAccess = computed(() => hasPermission('cost_centres.view'))
const hasBudgetAccess = computed(() => hasPermission('budgets.view'))
const sessionAnalysisState = useState<PersistedFinanceAnalysisState | null>('finance-analysis-session-state', () => null)
const sessionExportState = useState<PersistedFinanceAnalysisExportState | null>('finance-analysis-export-session-state', () => null)

const yearOptions = computed(() => {
  return Array.from({ length: 11 }, (_, index) => currentYear + 1 - index)
})

const costCentreOptions = computed<SearchSelectOption<CostCentreRow>[]>(() => {
  return costCentres.value.map(costCentre => ({
    key: costCentre.id,
    label: costCentreOptionLabel(costCentre),
    value: costCentre,
    searchText: `${costCentre.code} ${costCentre.name}`,
  }))
})

const selectedCostCentreLabel = computed(() => {
  if (!selectedCostCentre.value) return ''
  return costCentreOptionLabel(selectedCostCentre.value)
})
const selectedCostCentreHasChildren = computed(() => {
  if (!selectedCostCentre.value) return false
  return costCentres.value.some(costCentre => costCentre.parent_id === selectedCostCentre.value?.id)
})
const hasSingleSelectedCostCentre = computed(() => {
  return Boolean(selectedCostCentre.value) && !includeChildCostCentres.value
})
const showReportPagesExportOptions = computed(() => !hasSingleSelectedCostCentre.value)
const showCostCentreGroupingOption = computed(() => !hasSingleSelectedCostCentre.value)

function addOneDay(dateString: string) {
  const parts = dateString.split('-').map(Number)
  if (parts.length !== 3 || parts.some(value => Number.isNaN(value))) return dateString

  const [year, month, day] = parts as [number, number, number]
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function budgetOptionLabel(budget: BudgetListItem) {
  return `${budget.year} · ${budget.semester === 'summer' ? t('budget.semesters.summer') : t('budget.semesters.winter')}`
}

function findCoveringBudgets(periodStartDate: string, periodEndDate: string, items: BudgetListItem[]) {
  const budgetsByStart = new Map<string, BudgetListItem>()
  for (const budget of items) budgetsByStart.set(budget.start_date, budget)

  const matched: BudgetListItem[] = []
  let cursor = periodStartDate

  while (cursor <= periodEndDate) {
    const budget = budgetsByStart.get(cursor)
    if (!budget) return null
    matched.push(budget)

    if (budget.end_date === periodEndDate) return matched
    if (budget.end_date > periodEndDate) return null
    cursor = addOneDay(budget.end_date)
  }

  return null
}

const coveringBudgets = computed(() => findCoveringBudgets(startDate.value, endDate.value, budgets.value))
const canCompareToBudget = computed(() => hasBudgetAccess.value && Boolean(coveringBudgets.value?.length))
const comparisonBudgetLabel = computed(() => coveringBudgets.value?.map(budgetOptionLabel).join(', ') ?? '')
const reportPagesExportOptions = computed<Array<{ value: ReportPagesExportMode, label: string, disabled: boolean }>>(() => [
  {
    value: 'none',
    label: t('financeAnalysis.exportReportPageModes.none'),
    disabled: false,
  },
  {
    value: 'reportOnly',
    label: t('financeAnalysis.exportReportPageModes.reportOnly'),
    disabled: false,
  },
  {
    value: 'comparisonOnly',
    label: t('financeAnalysis.exportReportPageModes.comparisonOnly'),
    disabled: !canCompareToBudget.value,
  },
  {
    value: 'both',
    label: t('financeAnalysis.exportReportPageModes.both'),
    disabled: !canCompareToBudget.value,
  },
])
const selectedReportPagesExportLabel = computed(() => {
  return reportPagesExportOptions.value.find(option => option.value === reportPagesExportMode.value)?.label
    || t('financeAnalysis.exportReportPageModes.none')
})
const exportIncludesAnnualClosing = computed(() => (
  reportPagesExportMode.value === 'reportOnly' || reportPagesExportMode.value === 'both'
))
const exportIncludesBudgetComparison = computed(() => (
  (reportPagesExportMode.value === 'comparisonOnly' || reportPagesExportMode.value === 'both') && canCompareToBudget.value
))
const compareToBudgetHint = computed(() => {
  if (!hasBudgetAccess.value) return t('financeAnalysis.exportCompareToBudgetNeedsBudgetPermission')
  if (!coveringBudgets.value?.length) return t('financeAnalysis.exportCompareToBudgetUnavailable')
  return t('financeAnalysis.exportCompareToBudgetAvailable', { budgets: comparisonBudgetLabel.value })
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

const receiptDateFieldOptions = computed<Array<{ value: ReceiptDateField, label: string }>>(() => [
  { value: 'receipt_date', label: t('financeAnalysis.receiptDateFieldOptions.receiptDate') },
  { value: 'reimbursement_submitted_at', label: t('financeAnalysis.receiptDateFieldOptions.reimbursementSubmittedAt') },
])

const selectedReceiptDateFieldLabel = computed(() => {
  return receiptDateFieldOptions.value.find(option => option.value === receiptDateField.value)?.label || t('financeAnalysis.receiptDateFieldOptions.receiptDate')
})

const invoiceStatusLabels = computed<Record<InvoiceStatus, string>>(() => ({
  draft: t('invoice.states.draft'),
  open: t('invoice.states.open'),
  paid: t('invoice.states.paid'),
  cancelled: t('invoice.states.cancelled'),
}))

const invoiceStatusOptions = computed(() => {
  return [
    { value: InvoiceStatus.Draft, label: invoiceStatusLabels.value[InvoiceStatus.Draft] },
    { value: InvoiceStatus.Open, label: invoiceStatusLabels.value[InvoiceStatus.Open] },
    { value: InvoiceStatus.Paid, label: invoiceStatusLabels.value[InvoiceStatus.Paid] },
    { value: InvoiceStatus.Cancelled, label: invoiceStatusLabels.value[InvoiceStatus.Cancelled] },
  ]
})

const invoiceDateFieldOptions = computed<Array<{ value: InvoiceDateField, label: string }>>(() => [
  { value: 'invoice_date', label: t('financeAnalysis.invoiceDateFieldOptions.invoiceDate') },
  { value: 'due_date', label: t('financeAnalysis.invoiceDateFieldOptions.dueDate') },
  { value: 'service_date', label: t('financeAnalysis.invoiceDateFieldOptions.serviceDate') },
])

const selectedInvoiceDateFieldLabel = computed(() => {
  return invoiceDateFieldOptions.value.find(option => option.value === invoiceDateField.value)?.label || t('financeAnalysis.invoiceDateFieldOptions.invoiceDate')
})

const summary = computed(() => analysis.value?.summary ?? null)
const comparisonSummary = computed(() => comparisonAnalysis.value?.summary ?? null)
const receipts = computed(() => analysis.value?.receipts ?? [])
const cashCounts = computed(() => analysis.value?.cashCounts ?? [])
const invoices = computed(() => analysis.value?.invoices ?? [])
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

  const cards: Array<{
    key: string
    label: string
    current: number
    previous: number
    difference: number
    type: ComparisonValueType
  }> = [
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
      current: summary.value.receipt_count + summary.value.cash_count_count + summary.value.invoice_count,
      previous: comparisonSummary.value.receipt_count + comparisonSummary.value.cash_count_count + comparisonSummary.value.invoice_count,
      difference: (summary.value.receipt_count + summary.value.cash_count_count + summary.value.invoice_count) - (comparisonSummary.value.receipt_count + comparisonSummary.value.cash_count_count + comparisonSummary.value.invoice_count),
      type: 'count' as ComparisonValueType,
    },
  ]

  cards.splice(2, 0, {
    key: 'invoiceRevenue',
    label: t('financeAnalysis.cards.invoiceRevenue'),
    current: summary.value.invoice_total,
    previous: comparisonSummary.value.invoice_total,
    difference: Number((summary.value.invoice_total - comparisonSummary.value.invoice_total).toFixed(2)),
    type: 'currency' as ComparisonValueType,
  })

  return cards
})

function restoreSelectedCostCentre(costCentreId: number | null | undefined) {
  if (typeof costCentreId !== 'number') {
    selectedCostCentre.value = null
    costCentreQuery.value = ''
    includeChildCostCentres.value = false
    return
  }

  const restoredCostCentre = costCentres.value.find(costCentre => costCentre.id === costCentreId) || null
  selectedCostCentre.value = restoredCostCentre
  costCentreQuery.value = restoredCostCentre ? costCentreOptionLabel(restoredCostCentre) : ''
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
  if (state.receiptDateField === 'receipt_date' || state.receiptDateField === 'reimbursement_submitted_at') {
    receiptDateField.value = state.receiptDateField
  }
  if (Array.isArray(state.selectedInvoiceStatuses)) {
    selectedInvoiceStatuses.value = state.selectedInvoiceStatuses.filter((status): status is InvoiceStatus => invoiceStatusOrder.includes(status as InvoiceStatus))
  }
  if (state.invoiceDateField === 'invoice_date' || state.invoiceDateField === 'due_date' || state.invoiceDateField === 'service_date') {
    invoiceDateField.value = state.invoiceDateField
  }
  if (typeof state.periodFiltersExpanded === 'boolean') periodFiltersExpanded.value = state.periodFiltersExpanded
  if (typeof state.costCentreFiltersExpanded === 'boolean') costCentreFiltersExpanded.value = state.costCentreFiltersExpanded
  if (typeof state.receiptFiltersExpanded === 'boolean') receiptFiltersExpanded.value = state.receiptFiltersExpanded
  if (typeof state.invoiceFiltersExpanded === 'boolean') invoiceFiltersExpanded.value = state.invoiceFiltersExpanded
  if (typeof state.receiptsExpanded === 'boolean') receiptsExpanded.value = state.receiptsExpanded
  if (typeof state.cashCountsExpanded === 'boolean') cashCountsExpanded.value = state.cashCountsExpanded
  if (typeof state.invoicesExpanded === 'boolean') invoicesExpanded.value = state.invoicesExpanded
  if (typeof state.includeChildCostCentres === 'boolean') includeChildCostCentres.value = state.includeChildCostCentres
  restoreSelectedCostCentre(state.selectedCostCentreId)
}

function restoreStoredAnalysisState() {
  applyAnalysisState(sessionAnalysisState.value)
}

function restoreStoredExportState() {
  const state = sessionExportState.value
  if (!state) return

  if (state.exportGrouping === 'none' || state.exportGrouping === 'costCentres' || state.exportGrouping === 'spheres') {
    exportGrouping.value = state.exportGrouping
  }
  if (typeof state.exportSplitByMonth === 'boolean') exportSplitByMonth.value = state.exportSplitByMonth
  if (typeof state.exportSplitByPaymentStatus === 'boolean') exportSplitByPaymentStatus.value = state.exportSplitByPaymentStatus
  if (state.reportPagesExportMode === 'none' || state.reportPagesExportMode === 'reportOnly' || state.reportPagesExportMode === 'comparisonOnly' || state.reportPagesExportMode === 'both') {
    reportPagesExportMode.value = state.reportPagesExportMode
  }
}

function persistAnalysisState() {
  sessionAnalysisState.value = {
    startDate: startDate.value,
    endDate: endDate.value,
    quickYear: quickYear.value,
    quickSemester: quickSemester.value,
    quickMonth: quickMonth.value,
    compareWithPreviousYear: compareWithPreviousYear.value,
    selectedStatuses: [...selectedStatuses.value],
    receiptDateField: receiptDateField.value,
    selectedInvoiceStatuses: [...selectedInvoiceStatuses.value],
    invoiceDateField: invoiceDateField.value,
    periodFiltersExpanded: periodFiltersExpanded.value,
    costCentreFiltersExpanded: costCentreFiltersExpanded.value,
    receiptFiltersExpanded: receiptFiltersExpanded.value,
    invoiceFiltersExpanded: invoiceFiltersExpanded.value,
    receiptsExpanded: receiptsExpanded.value,
    cashCountsExpanded: cashCountsExpanded.value,
    invoicesExpanded: invoicesExpanded.value,
    selectedCostCentreId: selectedCostCentre.value?.id ?? null,
    includeChildCostCentres: includeChildCostCentres.value,
  } satisfies PersistedFinanceAnalysisState
}

function persistExportState() {
  sessionExportState.value = {
    exportGrouping: exportGrouping.value,
    exportSplitByMonth: exportSplitByMonth.value,
    exportSplitByPaymentStatus: exportSplitByPaymentStatus.value,
    reportPagesExportMode: reportPagesExportMode.value,
  } satisfies PersistedFinanceAnalysisExportState
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

function applyQuickSelectionRange() {
  const year = ensureQuickYear()

  if (quickMonth.value) {
    const month = Number(quickMonth.value)
    const lastDay = new Date(year, month, 0).getDate()
    setRange(`${year}-${pad(month)}-01`, `${year}-${pad(month)}-${pad(lastDay)}`)
    return
  }

  if (quickSemester.value === 'summer') {
    setRange(`${year}-04-01`, `${year}-09-30`)
    return
  }

  if (quickSemester.value === 'winter') {
    setRange(`${year}-10-01`, `${year + 1}-03-31`)
    return
  }

  applyFullYearRange(year)
}

function ensureQuickYear() {
  if (!quickYear.value) quickYear.value = String(currentYear)
  return Number(quickYear.value)
}

function applyYearShortcut() {
  if (!quickYear.value) return
  applyQuickSelectionRange()
}

function applySemesterShortcut() {
  quickMonth.value = ''
  applyQuickSelectionRange()
}

function toggleSemesterShortcut(value: Exclude<QuickSemester, ''>) {
  quickSemester.value = quickSemester.value === value ? '' : value
  applySemesterShortcut()
}

function applyMonthShortcut() {
  quickSemester.value = ''
  applyQuickSelectionRange()
}

function toggleMonthShortcut(value: string) {
  quickMonth.value = quickMonth.value === value ? '' : value
  applyMonthShortcut()
}

function handleManualDateInput(field: ManualDateField, value: string | null) {
  if (field === 'start') startDate.value = value || ''
  if (field === 'end') endDate.value = value || ''

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
  receiptDateField.value = 'receipt_date'
  selectedInvoiceStatuses.value = [...defaultInvoiceStatuses]
  invoiceDateField.value = 'invoice_date'
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

function toggleInvoiceStatus(status: InvoiceStatus) {
  if (selectedInvoiceStatuses.value.includes(status)) {
    selectedInvoiceStatuses.value = selectedInvoiceStatuses.value.filter(value => value !== status)
    return
  }

  selectedInvoiceStatuses.value = [...selectedInvoiceStatuses.value, status].sort((left, right) => {
    return invoiceStatusOrder.indexOf(left) - invoiceStatusOrder.indexOf(right)
  })
}

function selectReceiptDateField(value: ReceiptDateField) {
  receiptDateField.value = value
  openFilterDropdown.value = null
}

function selectInvoiceDateField(value: InvoiceDateField) {
  invoiceDateField.value = value
  openFilterDropdown.value = null
}

function statusButtonClass(status: ReceiptStatus | InvoiceStatus, selectedValues: Array<ReceiptStatus | InvoiceStatus>) {
  const selected = selectedValues.includes(status)
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
    'rounded-lg border px-2.5 py-1.5 text-xs font-medium leading-tight transition cursor-pointer',
    selected
      ? 'border-orange-400 bg-orange-50 text-orange-700'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  ]
}

function exportToggleButtonClass(selected: boolean) {
  return [
    'w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium leading-tight transition cursor-pointer',
    selected
      ? 'border-orange-400 bg-orange-50 text-orange-700'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  ]
}

function setExportGrouping(value: FinanceAnalysisExportGrouping) {
  exportGrouping.value = value
}

function selectReportPagesExportMode(value: ReportPagesExportMode) {
  const option = reportPagesExportOptions.value.find(item => item.value === value)
  if (!option || option.disabled) return
  reportPagesExportMode.value = value
  openFilterDropdown.value = null
}

function closeExportMenu() {
  isExportMenuOpen.value = false
  openFilterDropdown.value = null
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

function formatInvoiceDateByBasis(invoice: FinanceAnalysisData['invoices'][number]) {
  if (invoiceDateField.value === 'due_date') {
    return invoice.due_date ? formatDate(invoice.due_date) : t('common.notAvailable')
  }

  if (invoiceDateField.value === 'service_date') {
    return invoice.service_date ? formatDate(invoice.service_date) : t('common.notAvailable')
  }

  return formatDate(invoice.invoice_date)
}

function formatReceiptDateByBasis(receipt: FinanceAnalysisReceiptItem) {
  if (receiptDateField.value === 'reimbursement_submitted_at') {
    return receipt.reimbursement_submitted_at ? formatDate(receipt.reimbursement_submitted_at) : formatDate(receipt.receipt_date)
  }

  return formatDate(receipt.receipt_date)
}

function comparisonDifferenceClass(value: number) {
  if (value > 0) return 'text-emerald-700'
  if (value < 0) return 'text-red-700'
  return 'text-slate-600'
}

async function loadExportLogo(): Promise<FinanceAnalysisExportLogo | null> {
  try {
    const response = await fetch('/api/settings/association/logo', {
      credentials: 'same-origin',
    })

    if (!response.ok) return null

    const blob = await response.blob()
    const mimeType = blob.type.toLowerCase()
    const extension = mimeType === 'image/png'
      ? 'png'
      : mimeType === 'image/jpeg' || mimeType === 'image/jpg'
        ? 'jpeg'
        : null

    if (!extension) return null

    const data = new Uint8Array(await blob.arrayBuffer())
    const dimensions = extension === 'png'
      ? readPngDimensions(data)
      : readJpegDimensions(data)

    if (!dimensions) return null

    return {
      data,
      extension,
      mimeType: extension === 'png' ? 'image/png' : 'image/jpeg',
      width: dimensions.width,
      height: dimensions.height,
    }
  } catch {
    return null
  }
}

function readPngDimensions(bytes: Uint8Array) {
  if (bytes.length < 24) return null
  const signatureMatches = bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4E
    && bytes[3] === 0x47

  if (!signatureMatches) return null

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const width = view.getUint32(16)
  const height = view.getUint32(20)
  if (width <= 0 || height <= 0) return null
  return { width, height }
}

function readJpegDimensions(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) return null

  let offset = 2
  while (offset + 8 < bytes.length) {
    const prefix = bytes[offset]
    const marker = bytes[offset + 1]
    const lengthHigh = bytes[offset + 2]
    const lengthLow = bytes[offset + 3]

    if (
      prefix === undefined
      || marker === undefined
      || lengthHigh === undefined
      || lengthLow === undefined
    ) return null

    if (prefix !== 0xFF) {
      offset += 1
      continue
    }

    if (marker === 0xD9 || marker === 0xDA) break

    const segmentLength = (lengthHigh << 8) | lengthLow
    if (segmentLength < 2 || offset + 2 + segmentLength > bytes.length) return null

    const isStartOfFrame = marker >= 0xC0
      && marker <= 0xCF
      && marker !== 0xC4
      && marker !== 0xC8
      && marker !== 0xCC

    if (isStartOfFrame) {
      const heightHigh = bytes[offset + 5]
      const heightLow = bytes[offset + 6]
      const widthHigh = bytes[offset + 7]
      const widthLow = bytes[offset + 8]

      if (
        heightHigh === undefined
        || heightLow === undefined
        || widthHigh === undefined
        || widthLow === undefined
      ) return null

      const height = (heightHigh << 8) | heightLow
      const width = (widthHigh << 8) | widthLow
      if (width <= 0 || height <= 0) return null
      return { width, height }
    }

    offset += 2 + segmentLength
  }

  return null
}

async function exportAnalysisReport() {
  if (!summary.value || isExporting.value) return

  isExporting.value = true

  try {
    let comparisonBudget: BudgetDetail[] = []
    const logo = await loadExportLogo()

    if (exportIncludesBudgetComparison.value && coveringBudgets.value?.length) {
      const budgetResponses = await Promise.all(
        coveringBudgets.value.map(budget => $fetch<GetBudgetResponse>(`/api/finances/budgets/${budget.id}`)),
      )

      comparisonBudget = budgetResponses
        .filter((response): response is { ok: true, budget: BudgetDetail } => response.ok)
        .map(response => response.budget)
    }

    downloadFinanceAnalysisReport({
      t,
      locale: locale.value,
      analysis: analysis.value as FinanceAnalysisData,
      comparisonAnalysis: comparisonAnalysis.value,
      startDate: startDate.value,
      endDate: endDate.value,
      includeComparison: compareWithPreviousYear.value,
      selectedStatuses: selectedStatuses.value,
      receiptDateField: receiptDateField.value,
      selectedInvoiceStatuses: selectedInvoiceStatuses.value,
      receiptStatusLabels: receiptStatusLabels.value,
      invoiceDateField: invoiceDateField.value,
      costCentres: costCentres.value,
      selectedCostCentre: selectedCostCentre.value,
      includeChildCostCentres: includeChildCostCentres.value,
      annualClosing: exportIncludesAnnualClosing.value,
      compareToBudget: exportIncludesBudgetComparison.value && comparisonBudget.length > 0,
      budgetComparisonExportMode: reportPagesExportMode.value === 'both' ? 'annualAndComparison' : 'comparisonOnly',
      comparisonBudgetLabel: comparisonBudgetLabel.value || null,
      comparisonBudgetLines: comparisonBudget.flatMap(budget => budget.lines),
      exportGrouping: exportGrouping.value,
      exportSplitByMonth: exportSplitByMonth.value,
      exportSplitByPaymentStatus: exportSplitByPaymentStatus.value,
      logo,
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
      receiptDateField: receiptDateField.value,
      invoiceStatuses: selectedInvoiceStatuses.value,
      invoiceDateField: invoiceDateField.value,
      costCentreId: selectedCostCentre.value?.id || undefined,
      includeChildCostCentres: selectedCostCentre.value ? includeChildCostCentres.value : undefined,
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
      receiptDateField: receiptDateField.value,
      selectedInvoiceStatuses: [...selectedInvoiceStatuses.value],
      invoiceDateField: invoiceDateField.value,
      periodFiltersExpanded: periodFiltersExpanded.value,
      costCentreFiltersExpanded: costCentreFiltersExpanded.value,
      receiptFiltersExpanded: receiptFiltersExpanded.value,
      invoiceFiltersExpanded: invoiceFiltersExpanded.value,
      receiptsExpanded: receiptsExpanded.value,
      cashCountsExpanded: cashCountsExpanded.value,
      invoicesExpanded: invoicesExpanded.value,
      selectedCostCentreId: selectedCostCentre.value?.id ?? null,
      includeChildCostCentres: includeChildCostCentres.value,
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
    costCentres.value = response.costCentres
  } catch {
    costCentres.value = []
  }
}

async function loadBudgets() {
  if (!hasBudgetAccess.value) return

  try {
    const response = await $fetch<{ ok: true, budgets: BudgetListItem[] } | { ok: false, error: string }>('/api/finances/budgets', {
      method: 'GET',
    })

    if (!response.ok) return
    budgets.value = response.budgets
  } catch {
    budgets.value = []
  }
}

function selectCostCentre(costCentre: CostCentreRow) {
  selectedCostCentre.value = costCentre
  costCentreQuery.value = costCentreOptionLabel(costCentre)
}

function costCentreOptionLabel(costCentre: CostCentreRow) {
  const baseLabel = `${costCentre.code} - ${costCentre.name}`
  return Boolean(costCentre.is_active) ? baseLabel : `${baseLabel} (${t('common.inactive')})`
}

function selectCostCentreFromOption(value: unknown) {
  selectCostCentre(value as CostCentreRow)
}

function clearSelectedCostCentre() {
  selectedCostCentre.value = null
  costCentreQuery.value = ''
  includeChildCostCentres.value = false
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

function openInvoice(id: number) {
  setPage('InvoiceCreate', {
    invoiceId: id,
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

function receiptStatusTone(status: ReceiptStatus | InvoiceStatus) {
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

function receiptStatusDotClass(status: ReceiptStatus | InvoiceStatus) {
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

function handleExportMenuClickOutside(event: MouseEvent) {
  if (!isExportMenuOpen.value) return
  if (!exportMenuWrapper.value) return
  if (exportMenuWrapper.value.contains(event.target as Node)) return
  closeExportMenu()
}

watch(() => ({
  startDate: startDate.value,
  endDate: endDate.value,
  quickYear: quickYear.value,
  quickSemester: quickSemester.value,
  quickMonth: quickMonth.value,
  compareWithPreviousYear: compareWithPreviousYear.value,
  selectedStatuses: [...selectedStatuses.value],
  receiptDateField: receiptDateField.value,
  selectedInvoiceStatuses: [...selectedInvoiceStatuses.value],
  invoiceDateField: invoiceDateField.value,
  periodFiltersExpanded: periodFiltersExpanded.value,
  costCentreFiltersExpanded: costCentreFiltersExpanded.value,
  receiptFiltersExpanded: receiptFiltersExpanded.value,
  invoiceFiltersExpanded: invoiceFiltersExpanded.value,
  receiptsExpanded: receiptsExpanded.value,
  cashCountsExpanded: cashCountsExpanded.value,
  invoicesExpanded: invoicesExpanded.value,
  selectedCostCentreId: selectedCostCentre.value?.id ?? null,
  includeChildCostCentres: includeChildCostCentres.value,
}), () => {
  persistAnalysisState()
}, { deep: true })

watch(() => ({
  exportGrouping: exportGrouping.value,
  exportSplitByMonth: exportSplitByMonth.value,
  exportSplitByPaymentStatus: exportSplitByPaymentStatus.value,
  reportPagesExportMode: reportPagesExportMode.value,
}), () => {
  persistExportState()
}, { deep: true })

watch(canCompareToBudget, (value) => {
  if (!value && (reportPagesExportMode.value === 'comparisonOnly' || reportPagesExportMode.value === 'both')) {
    reportPagesExportMode.value = exportIncludesAnnualClosing.value ? 'reportOnly' : 'none'
  }
})

watch(selectedCostCentreHasChildren, (value) => {
  if (!value) includeChildCostCentres.value = false
})

watch(showReportPagesExportOptions, (value) => {
  if (!value) reportPagesExportMode.value = 'none'
})

watch(showCostCentreGroupingOption, (value) => {
  if (!value && exportGrouping.value === 'costCentres') exportGrouping.value = 'none'
})

onMounted(async () => {
  document.addEventListener('mousedown', handleExportMenuClickOutside)
  await loadCostCentres()
  await loadBudgets()
  restoreStoredAnalysisState()
  restoreStoredExportState()
  restoreAnalysisPageMeta()
  await loadAnalysis()
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleExportMenuClickOutside)
})
</script>
