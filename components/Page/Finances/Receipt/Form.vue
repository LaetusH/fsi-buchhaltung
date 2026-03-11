<template>
  <div class="space-y-6">
    <section class="bg-white rounded-xl shadow-lg p-4 space-y-1">
      <h2 class="text-lg font-semibold">{{ t('receipt.issue') }}</h2>

      <label class="section-title">{{ t('receipt.company') }}</label>

      <!-- Select Company Dropdown -->
      <MenuDropdown v-model="openCompany" :id="0" class="w-full">
        <template #trigger="{ styling }">
          <div class="flex items-center gap-2">
            <input
              v-model="companyQuery"
              :class="[styling, disabled ? 'opacity-70' : '']"
              :placeholder="t('receipt.companyPlaceholder')"
              @input="openCompany = 0"
              :disabled="disabled"
            />

            <button
              v-if="selectedCompany && canEditCompany"
              type="button"
              @click.stop.prevent="openCompanyDrawer"
              class="p-2 h-10 w-10 rounded-md hover:bg-slate-100 text-orange-500 cursor-pointer"
              :title="t('receipt.editCompany')"
            >
              ✏️
            </button>
          </div>
        </template>

        <template #default="{ styling }">
          <button v-if="canEditCompany" type="button" :class="styling" @click="createCompanyFromQuery">
            <div class="flex justify-between w-full">
              <span>"{{ companyQuery }}"</span>
              <span class="text-orange-500 font-semibold">＋ {{ t('actions.createNew') }}</span>
            </div>
          </button>

          <div v-if="canEditCompany" class="border-t"></div>

          <button
            v-for="c in filteredCompanies"
            :key="c.id"
            type="button"
            :class="styling"
            @click="selectCompany(c)"
          >
            {{ c.name }}
          </button>
          <div v-if="filteredCompanies.length === 0" class="px-3 py-2 text-sm text-gray-500">
            {{ t('receipt.noCompanies') }}
          </div>
        </template>
      </MenuDropdown>
    </section>

    <section class="bg-white rounded-xl shadow-lg p-4 grid grid-cols-2 gap-4">
      <div>
        <label class="text-sm font-medium text-slate-600">{{ t('receipt.receiptNumber') }}</label>
        <input v-model="form.receipt_number" class="input" :class="disabled ? 'opacity-70' : ''" :disabled="disabled" />
      </div>

      <div>
        <label class="text-sm font-medium text-slate-600">{{ t('receipt.receiptDate') }}</label>
        <input v-model="form.receipt_date" type="date" class="input" :class="disabled ? 'opacity-70' : ''" :disabled="disabled" />
      </div>
    </section>

    <section class="bg-white rounded-xl shadow-lg p-4 space-y-3">
      <h3 class="font-semibold">{{ t('receipt.positions') }}</h3>

      <div
        v-for="(p, i) in form.positions"
        :key="i"
        class="grid gap-2 items-center"
        :class="form.positions.length > 1 ? 'grid-cols-[3fr_2fr_2fr_2fr_auto]' : 'grid-cols-[3fr_2fr_2fr_3fr]'"
      >
        <!-- Sphere Dropdown -->
        <MenuDropdown v-model="openSphereIndex" :id="i">
          <template #trigger="{ styling }">
            <button :class="[styling, disabled ? 'opacity-70' : 'cursor-pointer']" :disabled="disabled">
              <span class="flex-1 overflow-hidden whitespace-nowrap text-ellipsis">{{ sphereLabel(i) }}</span>
              <Icon v-if="!disabled" name="material-symbols:keyboard-arrow-down-rounded" class="text-lg" />
            </button>
          </template>

          <template #default="{ styling }">
            <button
              v-for="s in spheres"
              :key="s.id"
              :class="styling"
              @click="selectSphere(i, s)"
            >
              {{ s.name }}
            </button>
          </template>
        </MenuDropdown>

        <!-- Cost Centre Dropdown -->
        <MenuDropdown v-model="openCostCentreIndex" :id="i" menu-width="wide">
          <template #trigger="{ styling }">
            <div class="flex items-center gap-2">
              <input
                v-model="costCentreQueries[i]"
                :class="[styling, disabled ? 'opacity-70' : '']"
                :placeholder="t('receipt.costCentrePlaceholder')"
                @input="openCostCentreIndex = i"
              />
            </div>
          </template>

          <template #default="{ styling }">
            <button
              v-for="c in filteredCostCentres(i)"
              :key="c.id"
              type="button"
              :class="styling"
              class="overflow-hidden text-ellipsis"
              @click="selectCostCentre(i, c)"
            >
              {{ c.code }} - {{ c.name }}
            </button>
            <div
              v-if="filteredCostCentres(i).length === 0"
              class="px-3 py-2 text-sm text-gray-500"
            >
              {{ t('receipt.noCostCentres') }}
            </div>
          </template>
        </MenuDropdown>

        <!-- Tax Dropdown -->
        <MenuDropdown v-model="openTaxIndex" :id="i">
          <template #trigger="{ styling }">
            <button :class="[styling, disabled ? 'opacity-70' : 'cursor-pointer']" :disabled="disabled">
              <span>{{ taxLabel(i) }}</span>
              <Icon v-if="!disabled" name="material-symbols:keyboard-arrow-down-rounded" class="text-lg" />
            </button>
          </template>

          <template #default="{ styling }">
            <button :class="styling" @click="selectTax(i, 0)">0%</button>
            <button :class="styling" @click="selectTax(i, 7)">7%</button>
            <button :class="styling" @click="selectTax(i, 19)">19%</button>
          </template>
        </MenuDropdown>

        <input
          type="text"
          class="input text-right"
          :class="disabled ? 'opacity-70' : ''"
          :value="displayAmount(i)"
          inputmode="decimal"
          @focus="onFocus($event, i)"
          @blur="onBlur(i)"
          @input="onInput($event, i)"
          :disabled="disabled"
        />

        <button
          v-if="!disabled && form.positions.length > 1"
          class="text-red-500 cursor-pointer p-2 w-10 rounded-md hover:bg-slate-100"
          @click="removePosition(i)"
        >
          ✕
        </button>
      </div>

      <div class="flex pt-2 items-start gap-6" :class="disabled ? 'justify-end' : 'justify-between'">
        <button
          v-if="!disabled"
          type="button"
          class="flex items-center gap-2 text-orange-500 font-medium cursor-pointer"
          @click="addPosition"
        >
          <span class="text-xl">＋</span> {{ t('actions.addPosition') }}
        </button>

        <div class="text-sm text-right space-y-1 pt-2 min-w-55 w-48">
          <div class="flex justify-between text-slate-500">
            <span>{{ t('receipt.net') }}</span>
            <span>{{ formatCurrency(netTotal) }}</span>
          </div>

          <div
            v-for="(v, tax) in taxBreakdown"
            :key="tax"
            class="flex justify-between text-slate-500 space-y-0.5"
          >
            <span>{{ t('receipt.vat', { tax }) }}</span>
            <span>{{ formatCurrency(v.tax) }}</span>
          </div>

          <div class="flex justify-between font-semibold text-lg border-t pt-1">
            <span>{{ t('receipt.total') }}</span>
            <span>{{ formatCurrency(grossTotal) }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-white rounded-xl shadow-lg p-4 flex items-center gap-4">
      <span class="font-medium">{{ t('receipt.paymentStatus') }}</span>
      <PageFinancesPaymentStatus v-model="form.status" :disabled="disabled" />
    </section>

    <div v-if="!disabled" class="grid grid-cols-2 gap-4">
      <button class="btn-secondary" @click="emit('cancel')">{{ t('actions.cancel') }}</button>

      <button
        v-if="!disabled"
        class="btn-primary"
        :disabled="saveDisabled"
        :class="{ 'opacity-50 cursor-not-allowed': saveDisabled }"
        @click="submit"
      >
        {{ t('actions.save') }}
      </button>
    </div>
    
    <div v-else class="grid">
      <button class="btn-secondary col-span-12" @click="emit('cancel')">{{ t('actions.close') }}</button>
    </div>

    <section
      v-if="validationErrors.length"
      class="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700"
    >
      <p class="font-semibold mb-1">{{ t('common.validationBlocked') }}</p>
      <ul class="list-disc list-inside">
        <li v-for="error in validationErrors" :key="error">{{ error }}</li>
      </ul>
    </section>
  </div>

  <teleport to="body">
    <transition name="fade">
      <div
        v-if="showCompanyDrawer"
        class="fixed inset-0 z-40 bg-black/40"
        @click="closeCompanyDrawer"
      />
    </transition>

    <transition name="slide-over">
      <aside
        v-if="showCompanyDrawer"
        class="fixed right-0 top-0 z-50 h-full w-105 bg-white shadow-xl overflow-y-auto"
        @click.stop
      >
        <div class="flex items-center justify-between px-6 py-4 border-b">
          <h2 class="text-lg font-semibold">{{ t('receipt.companyDrawer') }}</h2>
          <button @click="closeCompanyDrawer" class="text-slate-400 hover:text-slate-600 cursor-pointer">
            ✕
          </button>
        </div>

        <div class="p-6">
          <CompanyForm
            v-if="selectedCompany"
            v-model="selectedCompany"
            @save="savedCompanyDrawer"
            @cancel="closeCompanyDrawer"
          />
        </div>
      </aside>
    </transition>
  </teleport>
</template>
<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import type { CompanyRow, Company } from '~/types/company'
import { ReceiptStatus, type CreateReceiptBody } from '~/types/receipt'
import type { SphereRow } from '~/types/sphere'
import type { CostCentreRow } from '~/types/costCentre'
import CompanyForm from '../CompanyForm.vue'

const props = defineProps<{
  modelValue: CreateReceiptBody
  disabled?: boolean
  hasFile?: boolean
  canEditCompany?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: CreateReceiptBody): void
  (e: 'submit'): void
  (e: 'cancel'): void
}>()

const { locale, t } = useI18n()

const form = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})
const canEditCompany = computed(() => props.canEditCompany === true)

const validationErrors = computed(() => {
  const errors: string[] = []
  if (companyQuery.value.trim().length < 1) errors.push(t('receipt.required.company'))
  if (!form.value.receipt_date) errors.push(t('receipt.required.receiptDate'))
  if (!form.value.status) errors.push(t('receipt.required.status'))
  if (!Array.isArray(form.value.positions) || form.value.positions.length === 0) errors.push(t('receipt.required.positions'))
  if (form.value.positions.some(p => !p.sphere || !p.cost_centre || p.amount === null || p.amount === undefined)) {
    errors.push(t('receipt.required.completePosition'))
  }
  const requiresFile = form.value.status === ReceiptStatus.Open || form.value.status === ReceiptStatus.Paid
  if (requiresFile && !props.hasFile) errors.push(t('receipt.required.fileForStatus'))
  return errors
})

const saveDisabled = computed(() => Boolean(props.disabled) || validationErrors.value.length > 0)
const companies = ref<CompanyRow[]>([])
const companyQuery = ref('')
const openCompany = ref<number | null>(null)
const selectedCompany = ref<Company | null>(null)
const filteredCompanies = computed(() => {
  const q = companyQuery.value.toLowerCase().trim()
  if (!q) return companies.value
  return companies.value.filter(c => c.name.toLowerCase().includes(q))
})
const spheres = ref<SphereRow[]>([])
const openSphereIndex = ref<number | null>(null)
const costCentres = ref<CostCentreRow[]>([])
const openCostCentreIndex = ref<number | null>(null)
const costCentreQueries = ref<Record<number, string>>({})
const focusedIndex = ref<number | null>(null)
const openTaxIndex = ref<number | null>(null)
const showCompanyDrawer = ref(false)

function filteredCostCentres(i: number) {
  const q = costCentreQueries.value[i]?.toLowerCase().trim()
  if (!q) return costCentres.value
  const filtered = costCentres.value.filter(c => c.code.toLowerCase().includes(q))
  if (filtered.length > 0) return filtered
  return costCentres.value.filter(c => c.name.toLowerCase().includes(q))
}

async function loadSpheres() {
  const res = await $fetch('/api/spheres', { method: 'GET' })
  if (res.ok) spheres.value = res.spheres.filter(s => s.is_active)
}

async function loadCostCentres() {
  const res = await $fetch('/api/cost_centres', { method: 'GET' })
  if (res.ok) costCentres.value = res.costCentres.filter(c => c.is_active)
}

async function loadCompanies() {
  const res = await $fetch('/api/companies', { method: 'GET' })
  if (res.ok) companies.value = res.companies
}

async function submit() {
  const newCompanyName = companyQuery.value.trim()
  if (newCompanyName.length > 0) createCompanyFromQuery()
  emit('submit')
}

async function createCompanyFromQuery() {
  if (!canEditCompany.value) return
  const newCompanyName = companyQuery.value.trim()
  if (newCompanyName.length > 0) {
    const res = await $fetch('/api/companies/create', {
      method: 'POST',
      body: { name: newCompanyName }
    })
    if (res.ok) {
      selectedCompany.value = { id: res.id, name: newCompanyName }
      form.value.company_id = res.id
    }
  }
  openCompany.value = null
  loadCompanies()
}

function onKeydown(e: KeyboardEvent) {
  if (openCompany.value !== null) {
    if (e.key === 'Escape') openCompany.value = null
    if (e.key === 'Enter' || e.key === 'Tab') {
      tryAutoSelectCompany()
      openCompany.value = null
    }
  }
  if (openCostCentreIndex.value !== null) {
    if (e.key === 'Escape') openCostCentreIndex.value = null
    if (e.key === 'Enter' || e.key === 'Tab') {
      tryAutoSelectCostCentre()
      openCostCentreIndex.value = null
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  loadCompanies()
  loadSpheres()
  loadCostCentres()
})

watch([companies, () => form.value.company_id], () => {
  if (!form.value.company_id) return
  const company = companies.value.find(c => c.id === form.value.company_id)
  if (company) {
    selectedCompany.value = company
    companyQuery.value = company.name
  }
}, { immediate: true })

watch([costCentres, () => form.value.positions], () => {
  form.value.positions.forEach((p, index) => {
    if (!p.cost_centre) return
    const cc = costCentres.value.find(c => c.id === p.cost_centre)
    if (cc) costCentreQueries.value[index] = cc.code
  })
}, { immediate: true, deep: true })

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})

function selectCompany(company: Company) {
  selectedCompany.value = company
  form.value.company_id = company.id
  companyQuery.value = company.name
  openCompany.value = null
}

function selectSphere(index: number, sphere: SphereRow) {
  form.value.positions[index]!.sphere = sphere.id
  openSphereIndex.value = null
}

function selectCostCentre(index: number, costCentre: CostCentreRow) {
  form.value.positions[index]!.cost_centre = costCentre.id
  costCentreQueries.value[index] = costCentre.code
  openCostCentreIndex.value = null
}

function selectTax(index: number, tax: number) {
  form.value.positions[index]!.tax = tax
  openTaxIndex.value = null
}

function openCompanyDrawer() {
  if (!canEditCompany.value) return
  openCompany.value = null
  openSphereIndex.value = null
  openCostCentreIndex.value = null
  openTaxIndex.value = null
  showCompanyDrawer.value = true
}

function closeCompanyDrawer() {
  showCompanyDrawer.value = false
}

function savedCompanyDrawer() {
  loadCompanies()
  if (selectedCompany.value) companyQuery.value = selectedCompany.value.name
  showCompanyDrawer.value = false
}

function clearSelectedCompany() {
  selectedCompany.value = null
  form.value.company_id = null
}

function tryAutoSelectCompany() {
  if (selectedCompany.value) return
  if (filteredCompanies.value.length === 1 && filteredCompanies.value[0]) {
    selectCompany(filteredCompanies.value[0])
  }
  const q = companyQuery.value.trim().toLowerCase()
  if (!q) return
  const exactMatches = companies.value.filter(c => c.name.toLowerCase() === q)
  if (exactMatches.length === 1 && exactMatches[0]) {
    selectCompany(exactMatches[0])
  }
}

function tryAutoSelectCostCentre() {
  if (openCostCentreIndex.value === null) return
  if (filteredCostCentres(openCostCentreIndex.value).length === 1) {
    const filter = filteredCostCentres(openCostCentreIndex.value)[0]
    if (filter) selectCostCentre(openCostCentreIndex.value, filter)
  }
  const q = costCentreQueries.value[openCostCentreIndex.value]?.trim().toLowerCase()
  if (!q) return
  const exactMatchesCode = costCentres.value.filter(c => c.code.toLowerCase() === q)
  if (exactMatchesCode.length === 1 && exactMatchesCode[0]) {
    selectCostCentre(openCostCentreIndex.value, exactMatchesCode[0])
  }
  const exactMatchesName = costCentres.value.filter(c => c.name.toLowerCase() === q)
  if (exactMatchesName.length === 1 && exactMatchesName[0]) {
    selectCostCentre(openCostCentreIndex.value, exactMatchesName[0])
  }
}

watch(companyQuery, (newVal) => {
  if (selectedCompany.value && newVal !== selectedCompany.value.name) {
    clearSelectedCompany()
  }
})

function addPosition() {
  form.value.positions.push({ sphere: 0, cost_centre: 0, amount: 0.0, tax: 19 })
}

function removePosition(i: number) {
  form.value.positions.splice(i, 1)
  delete costCentreQueries.value[i]
}

function sphereLabel(index: number) {
  const sphereId = form.value.positions[index]?.sphere
  if (!sphereId) return t('receipt.chooseSphere')
  const sphere = spheres.value?.find(s => s.id === sphereId)
  return sphere?.name ?? t('receipt.chooseSphere')
}

function taxLabel(index: number) {
  const tax = form.value.positions[index]?.tax
  return `${tax}%`
}

function displayAmount(i: number) {
  const value = form.value.positions[i]?.amount ?? null
  if (focusedIndex.value === i) return value !== null ? String(value) : ''
  if (value === null) return ''
  return formatCurrency(value)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function onFocus(e: FocusEvent, i: number) {
  focusedIndex.value = i
  nextTick(() => {
    const input = e.target as HTMLInputElement
    input.select()
  })
}

function onInput(e: Event, i: number) {
  let value = (e.target as HTMLInputElement).value
  value = value.replace(/[^0-9.,]/g, '')
  value = value.replace(',', '.')
  const parts = value.split('.')
  if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('')
  const parsed = parseFloat(value)
  if (!form.value.positions[i]) return
  form.value.positions[i].amount = isNaN(parsed) ? 0 : parsed
  ;(e.target as HTMLInputElement).value = value
}

function onBlur(i: number) {
  focusedIndex.value = null
  if (!form.value.positions[i]) return
  const value = form.value.positions[i].amount
  if (value !== null && value !== undefined) {
    form.value.positions[i].amount = Number(value.toFixed(2))
  }
}

function nettoOf(p: { amount: number; tax: number }) {
  return p.amount / (1 + p.tax / 100)
}

const taxBreakdown = computed(() => {
  const map: Record<number, { tax: number }> = {}
  for (const p of form.value.positions) {
    if (!map[p.tax]) map[p.tax] = { tax: 0 }
    const entry = map[p.tax]
    const netto = nettoOf(p)
    if (!entry) return
    entry.tax += Number(p.amount - netto)
  }
  return map
})

const netTotal = computed(() => form.value.positions.reduce((s, p) => s + Number(p.amount) / (1 + (Number(p.tax) / 100)), 0))
const grossTotal = computed(() => form.value.positions.reduce((s, p) => s + Number(p.amount), 0))
</script>
<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-over-enter-active,
.slide-over-leave-active {
  transition: transform 0.25s ease;
}
.slide-over-enter-from,
.slide-over-leave-to {
  transform: translateX(100%);
}
</style>
