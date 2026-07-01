<template>
  <Page :headline1="t('budget.title')" @open-menu="$emit('openMenu')">
    <template #cards>
      <section class="col-span-12 rounded-xl bg-white p-4 md:p-6 shadow-lg space-y-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 class="text-lg font-semibold">{{ t('budget.title') }}</h2>
            <p class="text-sm text-slate-500">{{ t('budget.editorHint') }}</p>
          </div>

          <div class="flex flex-wrap gap-3">
            <button
              v-if="form.id"
              type="button"
              class="btn-secondary"
              :disabled="isSaving || isDownloadingPdf"
              @click="downloadPdf"
            >
              {{ isDownloadingPdf ? t('budget.downloading') : t('budget.downloadPdf') }}
            </button>
            <button
              type="button"
              class="btn-secondary"
              :disabled="isSaving"
              @click="cancel"
            >
              {{ t('actions.cancel') }}
            </button>
            <button
              v-if="canEdit"
              type="button"
              class="btn-secondary"
              :disabled="isSaving"
              @click="resetCurrentBudget"
            >
              {{ t('actions.reset') }}
            </button>
            <button
              v-if="canEdit"
              type="button"
              class="btn-primary"
              :class="isSaving ? 'cursor-not-allowed opacity-70' : ''"
              :disabled="isSaving || !hasValidPeriod"
              @click="saveBudget"
            >
              {{ isSaving ? t('budget.saving') : t('actions.save') }}
            </button>
          </div>
        </div>

        <div v-if="isLoadingBudget" class="rounded-xl border border-slate-200 px-4 py-6 text-sm text-slate-500">
          {{ t('budget.loading') }}
        </div>

        <template v-else>
          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div class="field">
              <label>{{ t('budget.year') }}</label>
              <select v-model="form.year" class="input" :disabled="!canEdit">
                <option v-for="year in yearOptions" :key="year" :value="String(year)">
                  {{ year }}
                </option>
              </select>
            </div>

            <div class="field">
              <label>{{ t('budget.semester') }}</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  :class="semesterButtonClass('summer')"
                  :disabled="!canEdit"
                  @click="form.semester = 'summer'"
                >
                  {{ t('budget.semesters.summer') }}
                </button>
                <button
                  type="button"
                  :class="semesterButtonClass('winter')"
                  :disabled="!canEdit"
                  @click="form.semester = 'winter'"
                >
                  {{ t('budget.semesters.winter') }}
                </button>
              </div>
            </div>

            <div class="field">
              <label>{{ t('budget.startDate') }}</label>
              <input :value="periodBounds.startDate" type="date" class="input bg-slate-50" disabled>
            </div>

            <div class="field">
              <label>{{ t('budget.endDate') }}</label>
              <input :value="periodBounds.endDate" type="date" class="input bg-slate-50" disabled>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div class="text-sm text-slate-500">{{ t('budget.totalExpenses') }}</div>
              <div class="mt-1 text-xl font-semibold text-slate-900">{{ formatCurrency(totalSummary.totalExpense) }}</div>
            </div>

            <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div class="text-sm text-slate-500">{{ t('budget.totalIncome') }}</div>
              <div class="mt-1 text-xl font-semibold text-slate-900">{{ formatCurrency(totalSummary.totalIncome) }}</div>
            </div>

            <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div class="text-sm text-slate-500">{{ t('budget.totalSaldo') }}</div>
              <div :class="saldoTextClass(totalSummary.totalSaldo)" class="mt-1 text-xl font-semibold">
                {{ formatCurrency(totalSummary.totalSaldo) }}
              </div>
            </div>
          </div>

          <div class="field">
            <label>{{ t('budget.notes') }}</label>
            <textarea
              v-model="form.notes"
              :ref="setGeneralNotesRef"
              rows="1"
              class="input min-h-9 overflow-hidden resize-none"
              :disabled="!canEdit"
              :placeholder="t('budget.notesPlaceholder')"
              @input="autoResizeTextarea($event)"
            />
          </div>

          <div class="overflow-hidden rounded-xl border border-slate-200">
            <div class="border-b border-slate-200 px-4 py-3">
              <h3 class="font-semibold text-slate-900">{{ t('budget.costCentreBudgets') }}</h3>
              <p class="text-sm text-slate-500">{{ t('budget.structureHint') }}</p>
            </div>

            <div>
              <div
                v-for="costCentre in orderedCostCentres"
                :key="costCentre.id"
                class="border-b last:border-b-0"
                :class="[
                  costCentre.hasChildren ? 'bg-slate-50/70' : 'bg-white',
                  !costCentre.is_active ? 'bg-amber-50/70' : '',
                ]"
              >
                <div class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div class="space-y-3">
                    <div
                      class="space-y-1"
                      :style="{ paddingLeft: `${costCentre.depth * 1}rem` }"
                    >
                      <div class="flex items-start gap-2">
                        <span v-if="costCentre.depth > 0" class="mt-0.5 text-slate-400">|-</span>
                        <div>
                          <div class="font-medium text-slate-900">{{ costCentre.code }} - {{ costCentre.name }}</div>
                          <div v-if="!costCentre.is_active" class="text-xs text-amber-700">
                            {{ t('budget.inactiveCostCentreNotice') }}
                          </div>
                          <div v-if="costCentre.hasChildren" class="text-xs text-slate-500">{{ t('budget.includesChildBudgets') }}</div>
                        </div>
                      </div>
                    </div>

                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div class="field">
                        <label>{{ t('budget.expenses') }}</label>
                        <input
                          :value="displayCurrencyField(costCentre.id, 'expense_amount')"
                          type="text"
                          class="input text-right"
                          inputmode="decimal"
                          :disabled="!canEdit"
                          @focus="onCurrencyFocus($event, costCentre.id, 'expense_amount')"
                          @blur="onCurrencyBlur(costCentre.id, 'expense_amount')"
                          @input="onCurrencyInput($event, costCentre.id, 'expense_amount')"
                        >
                      </div>

                      <div class="field">
                        <label>{{ t('budget.income') }}</label>
                        <input
                          :value="displayCurrencyField(costCentre.id, 'income_amount')"
                          type="text"
                          class="input text-right"
                          inputmode="decimal"
                          :disabled="!canEdit"
                          @focus="onCurrencyFocus($event, costCentre.id, 'income_amount')"
                          @blur="onCurrencyBlur(costCentre.id, 'income_amount')"
                          @input="onCurrencyInput($event, costCentre.id, 'income_amount')"
                        >
                      </div>
                    </div>

                    <div class="field">
                      <label>{{ t('budget.notes') }}</label>
                      <textarea
                        v-model="ownLine(costCentre.id).notes"
                        :ref="element => setLineNotesRef(element, costCentre.id)"
                        rows="1"
                        class="input min-h-9 overflow-hidden resize-none"
                        :disabled="!canEdit"
                        :placeholder="t('budget.lineNotesPlaceholder')"
                        @input="autoResizeTextarea($event)"
                      />
                    </div>
                  </div>

                  <div class="grid gap-3 sm:col-span-1 lg:col-span-2 md:grid-cols-1 lg:grid-cols-3">
                    <div class="rounded-lg border border-slate-200 bg-white">
                      <div class="border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">{{ t('budget.ownBudget') }}</div>
                      <div class="space-y-2 px-3 py-3 text-sm">
                        <div class="flex items-center justify-between gap-3">
                          <span class="text-slate-500">{{ t('budget.expenses') }}</span>
                          <span class="text-right text-slate-900">{{ formatCurrency(summaryByCostCentre[costCentre.id]?.ownExpense ?? 0) }}</span>
                        </div>
                        <div class="flex items-center justify-between gap-3">
                          <span class="text-slate-500">{{ t('budget.income') }}</span>
                          <span class="text-right text-slate-900">{{ formatCurrency(summaryByCostCentre[costCentre.id]?.ownIncome ?? 0) }}</span>
                        </div>
                        <div class="flex items-center justify-between gap-3 border-t border-slate-100 pt-2 font-medium">
                          <span class="text-slate-600">{{ t('budget.saldo') }}</span>
                          <span class="text-right" :class="saldoTextClass(summaryByCostCentre[costCentre.id]?.ownSaldo ?? 0)">
                            {{ formatCurrency(summaryByCostCentre[costCentre.id]?.ownSaldo ?? 0) }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="rounded-lg border border-slate-200 bg-white">
                      <div class="border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">{{ t('budget.childBudgets') }}</div>
                      <div class="space-y-2 px-3 py-3 text-sm">
                        <div class="flex items-center justify-between gap-3">
                          <span class="text-slate-500">{{ t('budget.expenses') }}</span>
                          <span class="text-right text-slate-900">
                            {{ costCentre.hasChildren ? formatCurrency(summaryByCostCentre[costCentre.id]?.childExpense ?? 0) : commonNotAvailable }}
                          </span>
                        </div>
                        <div class="flex items-center justify-between gap-3">
                          <span class="text-slate-500">{{ t('budget.income') }}</span>
                          <span class="text-right text-slate-900">
                            {{ costCentre.hasChildren ? formatCurrency(summaryByCostCentre[costCentre.id]?.childIncome ?? 0) : commonNotAvailable }}
                          </span>
                        </div>
                        <div class="flex items-center justify-between gap-3 border-t border-slate-100 pt-2 font-medium">
                          <span class="text-slate-600">{{ t('budget.saldo') }}</span>
                          <span class="text-right" :class="saldoTextClass(summaryByCostCentre[costCentre.id]?.childSaldo ?? 0)">
                            {{ costCentre.hasChildren ? formatCurrency(summaryByCostCentre[costCentre.id]?.childSaldo ?? 0) : commonNotAvailable }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="rounded-lg border border-slate-200 bg-white">
                      <div class="border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">{{ t('budget.totalBudget') }}</div>
                      <div class="space-y-2 px-3 py-3 text-sm">
                        <div class="flex items-center justify-between gap-3">
                          <span class="text-slate-500">{{ t('budget.expenses') }}</span>
                          <span class="text-right text-slate-900">{{ formatCurrency(summaryByCostCentre[costCentre.id]?.totalExpense ?? 0) }}</span>
                        </div>
                        <div class="flex items-center justify-between gap-3">
                          <span class="text-slate-500">{{ t('budget.income') }}</span>
                          <span class="text-right text-slate-900">{{ formatCurrency(summaryByCostCentre[costCentre.id]?.totalIncome ?? 0) }}</span>
                        </div>
                        <div class="flex items-center justify-between gap-3 border-t border-slate-100 pt-2 font-semibold">
                          <span class="text-slate-600">{{ t('budget.saldo') }}</span>
                          <span class="text-right" :class="saldoTextClass(summaryByCostCentre[costCentre.id]?.totalSaldo ?? 0)">
                            {{ formatCurrency(summaryByCostCentre[costCentre.id]?.totalSaldo ?? 0) }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </template>
      </section>
    </template>
  </Page>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { focusAndSelectInput, sanitizeCurrencyInput } from '~/composables/useCurrencyInput'
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import { usePage } from '~/composables/usePage'
import { useReturnTarget } from '~/composables/useReturnTarget'
import { useToast } from '~/composables/useToast'
import type { GetBudgetResponse } from '~/server/api/finances/budgets/[id].get'
import type { BudgetCostCentreLine, BudgetDetail, BudgetSemester, SaveBudgetBody } from '~/types/budget'
import type { CostCentreRow } from '~/types/costCentre'
import { downloadBudgetPlanPdf } from '~/utils/budgetPdfDownload'

defineEmits<{
  (e: 'openMenu'): void
}>()

interface BudgetEditorLine extends BudgetCostCentreLine {
  notes: string
}

interface BudgetEditorForm {
  id?: number
  year: string
  semester: BudgetSemester
  notes: string
  lines: BudgetEditorLine[]
}

interface DisplayCostCentre extends CostCentreRow {
  depth: number
  hasChildren: boolean
}

interface CostCentreSummary {
  ownExpense: number
  ownIncome: number
  ownSaldo: number
  childExpense: number
  childIncome: number
  childSaldo: number
  totalExpense: number
  totalIncome: number
  totalSaldo: number
}

type BudgetAmountField = 'expense_amount' | 'income_amount'

const { hasPermission } = useAuth()
const { t } = useI18n()
const { formatCurrency } = useLocaleFormatters()
const { pageMeta } = usePage()
const { goToReturnTarget } = useReturnTarget('BudgetList')
const toast = useToast()

const canEdit = computed(() => !pageMeta.value?.forceReadonly && hasPermission('budgets.edit'))
const costCentres = ref<CostCentreRow[]>([])
const isLoadingBudget = ref(false)
const isSaving = ref(false)
const isDownloadingPdf = ref(false)
const form = ref<BudgetEditorForm>(createEmptyBudgetForm())
const focusedField = ref<string | null>(null)
const generalNotesRef = ref<HTMLTextAreaElement | null>(null)
const lineNotesRefs = ref<Record<number, HTMLTextAreaElement | null>>({})

const currentYear = new Date().getFullYear()
const commonNotAvailable = computed(() => t('common.notAvailable'))
const yearOptions = computed(() => Array.from({ length: 11 }, (_, index) => currentYear + 1 - index))

const orderedCostCentres = computed<DisplayCostCentre[]>(() => {
  const itemMap = new Map(costCentres.value.map(item => [item.id, item]))
  const buckets = new Map<number | null, CostCentreRow[]>()
  const sorted = [...costCentres.value].sort((left, right) => {
    return left.code.localeCompare(right.code, undefined, { numeric: true, sensitivity: 'base' })
      || left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
  })

  for (const item of sorted) {
    const parentId = item.parent_id !== null && item.parent_id !== item.id && itemMap.has(item.parent_id)
      ? item.parent_id
      : null
    const bucket = buckets.get(parentId) ?? []
    bucket.push(item)
    buckets.set(parentId, bucket)
  }

  const ordered: DisplayCostCentre[] = []
  const visited = new Set<number>()

  const visit = (parentId: number | null, depth: number) => {
    const children = buckets.get(parentId) ?? []

    for (const child of children) {
      if (visited.has(child.id)) continue

      visited.add(child.id)
      ordered.push({
        ...child,
        depth,
        hasChildren: (buckets.get(child.id)?.length ?? 0) > 0,
      })
      visit(child.id, depth + 1)
    }
  }

  visit(null, 0)

  for (const item of sorted) {
    if (visited.has(item.id)) continue
    ordered.push({
      ...item,
      depth: 0,
      hasChildren: (buckets.get(item.id)?.length ?? 0) > 0,
    })
    visit(item.id, 1)
  }

  return ordered.filter(costCentre => shouldDisplayBudgetCostCentre(costCentre.id))
})

const childrenByParent = computed(() => {
  const map = new Map<number | null, number[]>()

  for (const costCentre of costCentres.value) {
    const parentId = costCentre.parent_id ?? null
    const bucket = map.get(parentId) ?? []
    bucket.push(costCentre.id)
    map.set(parentId, bucket)
  }

  return map
})

const lineMap = computed(() => new Map(form.value.lines.map(line => [line.cost_centre_id, line])))

function costCentreLineHasContent(costCentreId: number) {
  const line = lineMap.value.get(costCentreId)
  if (!line) return false

  return Number(line.expense_amount || 0) !== 0
    || Number(line.income_amount || 0) !== 0
    || Boolean(String(line.notes || '').trim())
}

function shouldDisplayBudgetCostCentre(costCentreId: number): boolean {
  const costCentre = costCentres.value.find(entry => entry.id === costCentreId)
  if (!costCentre) return false
  if (Boolean(costCentre.is_active)) return true
  if (costCentreLineHasContent(costCentreId)) return true

  const childIds = childrenByParent.value.get(costCentreId) ?? []
  return childIds.some(childId => shouldDisplayBudgetCostCentre(childId))
}

const summaryByCostCentre = computed<Record<number, CostCentreSummary>>(() => {
  const cache = new Map<number, CostCentreSummary>()

  const computeFor = (costCentreId: number): CostCentreSummary => {
    if (cache.has(costCentreId)) return cache.get(costCentreId)!

    const line = lineMap.value.get(costCentreId)
    const ownExpense = Number((line?.expense_amount ?? 0).toFixed(2))
    const ownIncome = Number((line?.income_amount ?? 0).toFixed(2))
    const ownSaldo = Number((ownIncome - ownExpense).toFixed(2))
    const childIds = childrenByParent.value.get(costCentreId) ?? []

    let childExpense = 0
    let childIncome = 0

    for (const childId of childIds) {
      const childSummary = computeFor(childId)
      childExpense += childSummary.totalExpense
      childIncome += childSummary.totalIncome
    }

    childExpense = Number(childExpense.toFixed(2))
    childIncome = Number(childIncome.toFixed(2))

    const summary = {
      ownExpense,
      ownIncome,
      ownSaldo,
      childExpense,
      childIncome,
      childSaldo: Number((childIncome - childExpense).toFixed(2)),
      totalExpense: Number((ownExpense + childExpense).toFixed(2)),
      totalIncome: Number((ownIncome + childIncome).toFixed(2)),
      totalSaldo: Number(((ownIncome + childIncome) - (ownExpense + childExpense)).toFixed(2)),
    }

    cache.set(costCentreId, summary)
    return summary
  }

  const result: Record<number, CostCentreSummary> = {}
  for (const costCentre of costCentres.value) result[costCentre.id] = computeFor(costCentre.id)
  return result
})

const totalSummary = computed(() => {
  const rootIds = childrenByParent.value.get(null) ?? []
  let totalExpense = 0
  let totalIncome = 0

  for (const rootId of rootIds) {
    const summary = summaryByCostCentre.value[rootId]
    if (!summary) continue
    totalExpense += summary.totalExpense
    totalIncome += summary.totalIncome
  }

  return {
    totalExpense: Number(totalExpense.toFixed(2)),
    totalIncome: Number(totalIncome.toFixed(2)),
    totalSaldo: Number((totalIncome - totalExpense).toFixed(2)),
  }
})

const periodBounds = computed(() => getPeriodBounds(Number(form.value.year), form.value.semester))
const hasValidPeriod = computed(() => Number.isInteger(Number(form.value.year)) && Number(form.value.year) >= 2000)

onMounted(async () => {
  await loadCostCentres()

  const budgetId = Number(pageMeta.value?.budgetId)
  if (Number.isInteger(budgetId) && budgetId > 0) {
    await loadBudget(budgetId)
    return
  }

  resetCurrentBudget()
  await nextTick()
  resizeAllNotes()
})

useAppRefresh().onRefresh(loadCostCentres)

function resolveDefaultPeriod() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  if (month >= 4 && month <= 9) return { year, semester: 'summer' as BudgetSemester }
  if (month >= 10) return { year, semester: 'winter' as BudgetSemester }
  return { year: year - 1, semester: 'winter' as BudgetSemester }
}

function createEmptyBudgetForm(): BudgetEditorForm {
  const period = resolveDefaultPeriod()
  return {
    year: String(period.year),
    semester: period.semester,
    notes: '',
    lines: [],
  }
}

function createEditorLines(detailLines?: BudgetCostCentreLine[]) {
  const lineByCostCentre = new Map((detailLines ?? []).map(line => [line.cost_centre_id, line]))

  return costCentres.value.map(costCentre => {
    const existing = lineByCostCentre.get(costCentre.id)
    return {
      cost_centre_id: costCentre.id,
      expense_amount: Number(existing?.expense_amount ?? 0),
      income_amount: Number(existing?.income_amount ?? 0),
      notes: existing?.notes ?? '',
    }
  })
}

function applyBudgetDetail(budget: BudgetDetail) {
  form.value = {
    id: budget.id,
    year: String(budget.year),
    semester: budget.semester,
    notes: budget.notes ?? '',
    lines: createEditorLines(budget.lines),
  }
}

function resetCurrentBudget() {
  const empty = createEmptyBudgetForm()
  form.value = {
    ...empty,
    lines: createEditorLines(),
  }

  nextTick().then(() => {
    resizeAllNotes()
  })
}

function ownLine(costCentreId: number) {
  const existing = form.value.lines.find(line => line.cost_centre_id === costCentreId)
  if (existing) return existing

  const created = { cost_centre_id: costCentreId, expense_amount: 0, income_amount: 0, notes: '' }
  form.value.lines.push(created)
  return created
}

function fieldFocusKey(costCentreId: number, field: BudgetAmountField) {
  return `${costCentreId}:${field}`
}

function displayCurrencyField(costCentreId: number, field: BudgetAmountField) {
  const value = ownLine(costCentreId)[field]
  if (focusedField.value === fieldFocusKey(costCentreId, field)) return String(value)
  return formatCurrency(value)
}

function onCurrencyFocus(event: FocusEvent, costCentreId: number, field: BudgetAmountField) {
  focusedField.value = fieldFocusKey(costCentreId, field)
  focusAndSelectInput(event)
}

function onCurrencyInput(event: Event, costCentreId: number, field: BudgetAmountField) {
  const value = sanitizeCurrencyInput((event.target as HTMLInputElement).value)
  const parsed = parseFloat(value)
  ownLine(costCentreId)[field] = Number.isNaN(parsed) ? 0 : parsed
  ;(event.target as HTMLInputElement).value = value
}

function onCurrencyBlur(costCentreId: number, field: BudgetAmountField) {
  focusedField.value = null
  const line = ownLine(costCentreId)
  line[field] = Number(Number(line[field]).toFixed(2))
}

function getPeriodBounds(year: number, semester: BudgetSemester) {
  if (!Number.isInteger(year) || year < 2000) return { startDate: '', endDate: '' }

  if (semester === 'summer') {
    return { startDate: `${year}-04-01`, endDate: `${year}-09-30` }
  }

  return { startDate: `${year}-10-01`, endDate: `${year + 1}-03-31` }
}

function saldoTextClass(value: number) {
  if (value > 0) return 'text-green-700'
  if (value < 0) return 'text-red-700'
  return 'text-slate-700'
}

function semesterButtonClass(value: BudgetSemester) {
  const selected = form.value.semester === value
  return [
    'rounded-lg border px-3 py-2 text-sm font-medium transition cursor-pointer',
    selected ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    !canEdit.value ? 'cursor-not-allowed opacity-70' : '',
  ]
}

async function loadCostCentres() {
  const response = await $fetch<{ ok: boolean, costCentres?: CostCentreRow[], error?: string }>('/api/cost_centres')
  if (!response.ok || !response.costCentres) {
    toast.error(response.error || t('budget.loadFailed'))
    return
  }

  costCentres.value = response.costCentres
  form.value.lines = createEditorLines(form.value.lines)
  await nextTick()
  resizeAllNotes()
}

async function loadBudget(budgetId: number) {
  isLoadingBudget.value = true

  try {
    const response = await $fetch<GetBudgetResponse>(`/api/finances/budgets/${budgetId}`)
    if (!response.ok) {
      toast.error(response.error || t('budget.loadFailed'))
      return
    }

    applyBudgetDetail(response.budget)
    await nextTick()
    resizeAllNotes()
  } finally {
    isLoadingBudget.value = false
  }
}

async function saveBudget() {
  if (isSaving.value) return
  if (!canEdit.value) {
    toast.error(t('common.notAuthorized'))
    return
  }

  if (!hasValidPeriod.value) {
    toast.error(t('budget.required.period'))
    return
  }

  isSaving.value = true

  try {
    const isEditMode = Boolean(form.value.id)
    const payload: SaveBudgetBody = {
      id: form.value.id,
      year: Number(form.value.year),
      semester: form.value.semester,
      notes: form.value.notes.trim() || null,
      lines: form.value.lines.map(line => ({
        cost_centre_id: line.cost_centre_id,
        expense_amount: Number(line.expense_amount || 0),
        income_amount: Number(line.income_amount || 0),
        notes: line.notes.trim() || null,
      })),
    }

    const response = await $fetch<{ ok: boolean, id?: number, error?: string }>('/api/finances/budgets/save', {
      method: 'POST',
      body: payload,
    })

    if (!response.ok || !response.id) throw new Error(response.error || t('budget.saveFailed'))

    toast.success(isEditMode ? t('budget.saved.updated') : t('budget.saved.created'))
    goToReturnTarget()
  } catch (error: any) {
    toast.error(error?.message || t('budget.saveFailed'))
  } finally {
    isSaving.value = false
  }
}

async function downloadPdf() {
  const budgetId = form.value.id
  if (!budgetId || isDownloadingPdf.value) return

  isDownloadingPdf.value = true

  try {
    const result = await downloadBudgetPlanPdf({
      id: budgetId,
      year: Number(form.value.year),
      semester: form.value.semester,
    })
    if (!result.ok) toast.error(result.error || t('budget.downloadFailed'))
  } catch {
    toast.error(t('budget.downloadFailed'))
  } finally {
    isDownloadingPdf.value = false
  }
}

function cancel() {
  goToReturnTarget()
}

function setGeneralNotesRef(element: Element | ComponentPublicInstance | null) {
  generalNotesRef.value = element instanceof HTMLTextAreaElement ? element : null
}

function setLineNotesRef(element: Element | ComponentPublicInstance | null, costCentreId: number) {
  lineNotesRefs.value[costCentreId] = element instanceof HTMLTextAreaElement ? element : null
}

function autoResizeTextarea(event: Event) {
  const textarea = event.target as HTMLTextAreaElement | null
  if (!textarea) return
  textarea.style.height = 'auto'
  textarea.style.height = `${textarea.scrollHeight}px`
}

function resizeAllNotes() {
  const textareas = [generalNotesRef.value, ...Object.values(lineNotesRefs.value)]
  textareas.forEach((textarea) => {
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  })
}
</script>
