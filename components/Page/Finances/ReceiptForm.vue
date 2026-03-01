<template>
  <div class="space-y-6">
    <section class="bg-white rounded-xl shadow-lg p-4 space-y-1">
      <h2 class="text-lg font-semibold">Ausgabe</h2>

      <label class="section-title">Zahlungsempfänger</label>

      <!-- Select Company Dropdown -->
      <MenuDropdown v-model="openCompany" :id="0" class="w-full">
        <template #trigger="{ styling }">
          <div class="flex items-center gap-2">
            <input
              v-model="companyQuery"
              :class="styling"
              placeholder="Firma auswählen"
              @input="openCompany = 0"
            />

            <button
              v-if="selectedCompany"
              type="button"
              @click.stop.prevent="openCompanyDrawer"
              class="p-2 h-10 w-10 rounded-md hover:bg-slate-100 text-orange-500 cursor-pointer"
              title="Firma bearbeiten"
            >
              ✏️
            </button>
          </div>
        </template>

        <template #default="{ styling }">
          <button type="button" :class="styling" @click="createCompanyFromQuery">
            <div class="flex justify-between w-full">
              <span>"{{ companyQuery }}"</span>
              <span class="text-orange-500 font-semibold">＋ neu anlegen</span>
            </div>
          </button>

          <div class="border-t"></div>

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
            Keine bestehenden Firmen
          </div>
        </template>
      </MenuDropdown>

      <p v-if="!form.company_id" class="text-xs text-red-500">
        Dieses Feld darf nicht leer sein
      </p>
    </section>

    <section class="bg-white rounded-xl shadow-lg p-4 grid grid-cols-2 gap-4">
      <div>
        <label class="text-sm font-medium text-slate-600">Beleg-Nr.</label>
        <input v-model="form.receipt_number" class="input"/>
      </div>

      <div>
        <label class="text-sm font-medium text-slate-600">Belegdatum</label>
        <input v-model="form.receipt_date" type="date" class="input"/>
      </div>
    </section>

    <section class="bg-white rounded-xl shadow-lg p-4 space-y-3">
      <h3 class="font-semibold">Positionen</h3>

      <div
        v-for="(p, i) in form.positions"
        :key="i"
        class="grid gap-2 items-center"
        :class="form.positions.length > 1 ? 'grid-cols-[3fr_2fr_2fr_2fr_auto]' : 'grid-cols-[3fr_2fr_2fr_3fr]'"
      >
        <!-- Sphere Dropdown -->
        <MenuDropdown v-model="openSphereIndex" :id="i">
          <template #trigger="{ styling }">
            <button :class="styling" class="cursor-pointer">
              <span class="flex-1 overflow-hidden whitespace-nowrap text-ellipsis">{{ sphereLabel(i) }}</span>
              <Icon name="material-symbols:keyboard-arrow-down-rounded" class="text-lg" />
            </button>
          </template>

          <template #default="{ styling }">
            <button
              v-for="s in spheres"
              :key="s.id"
              :class="styling"
              @click="selectSphere(i,s)"
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
                :class="styling"
                placeholder="Kostenstelle wählen"
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
              @click="selectCostCentre(i,c)"
            >
              {{ c.code }} - {{ c.name }}
            </button>
            <div
              v-if="filteredCostCentres(i).length === 0"
              class="px-3 py-2 text-sm text-gray-500"
            >
              Keine vorhandenen Kostenstellen
            </div>
          </template>
        </MenuDropdown>

        <!-- Tax Dropdown -->
        <MenuDropdown v-model="openTaxIndex" :id="i">
          <template #trigger="{ styling }">
            <button :class="styling" class="cursor-pointer">
              <span>{{ taxLabel(i) }}</span>
              <Icon name="material-symbols:keyboard-arrow-down-rounded" class="text-lg" />
            </button>
          </template>

          <template #default="{ styling }">
            <button :class="styling" @click="selectTax(i,0)">0%</button>
            <button :class="styling" @click="selectTax(i,7)">7%</button>
            <button :class="styling" @click="selectTax(i,19)">19%</button>
          </template>
        </MenuDropdown>

        <input
          type="text"
          class="input text-right"
          :value="displayAmount(i)"
          inputmode="decimal"
          @focus="onFocus($event, i)"
          @blur="onBlur(i)"
          @input="onInput($event, i)"
        />

        <button
          v-if="form.positions.length > 1"
          class="text-red-500 cursor-pointer p-2 w-10 rounded-md hover:bg-slate-100"
          @click="removePosition(i)"
        >
          ✕
        </button>
      </div>

      <div class="flex justify-between pt-2 items-start gap-6">
        <button
          type="button"
          class="flex items-center gap-2 text-orange-500 font-medium cursor-pointer"
          @click="addPosition"
        >
          <span class="text-xl">＋</span> Position
        </button>

        <div class="text-sm text-right space-y-1 pt-2 min-w-55 w-48">
          <div class="flex justify-between text-slate-500">
            <span>Netto</span>
            <span>{{ netTotal.toFixed(2) }} €</span>
          </div>

          <div
            v-for="(v, tax) in taxBreakdown"
            :key="tax"
            class="flex justify-between text-slate-500 space-y-0.5"
          >
            <span>MwSt. ({{ tax }}%)</span>
            <span>{{ v.tax.toFixed(2) }} €</span>
          </div>

          <div class="flex justify-between font-semibold text-lg border-t pt-1">
            <span>Gesamt</span>
            <span>{{ grossTotal.toFixed(2) }} €</span>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-white rounded-xl shadow-lg p-4 flex items-center gap-4">
      <span class="font-medium">Zahlungsstatus</span>
      <PageFinancesPaymentStatus v-model="form.status" />
    </section>

    <div class="grid grid-cols-2 gap-4">
      <button
        class="btn-secondary"
        @click="emit('cancel')"
      >
        Abbrechen
      </button>

      <button
        class="btn-primary"
        @click="emit('submit')"
      >
        Speichern
      </button>
    </div>
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
          <h2 class="text-lg font-semibold">Kontaktdaten</h2>
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
import type { CompanyRow, Company } from '~/types/company'
import { type CreateReceiptBody, ReceiptStatus } from '~/types/receipt'
import type { SphereRow } from '~/types/sphere'
import type { CostCentreRow } from '~/types/costCentre'
import CompanyForm from './CompanyForm.vue'
  
const props = defineProps<{
  modelValue: CreateReceiptBody
  disabled?: boolean
}>()
  
const emit = defineEmits<{
  (e: 'update:modelValue', v: CreateReceiptBody): void
  (e: 'submit'): void
  (e: 'cancel'): void
}>()

const companies = ref<CompanyRow[]>([])

const companyQuery = ref('')
const openCompany = ref<number | null>(null)
const selectedCompany = ref<Company | null>(null)

const filteredCompanies = computed(() => {
  const q = companyQuery.value.toLowerCase().trim()
  if (!q) return companies.value

  return companies.value.filter(c =>
    c.name.toLowerCase().includes(q)
  )
})

const spheres = ref<SphereRow[]>([])
const openSphereIndex = ref<number | null>(null)

const costCentres = ref<CostCentreRow[]>([])

const openCostCentreIndex = ref<number | null>(null)
const costCentreQueries = ref<Record<number, string>>({})

const focusedIndex = ref<number | null>(null)

function filteredCostCentres(i: number) {
  const q = costCentreQueries.value[i]?.toLowerCase().trim()
  if (!q) return costCentres.value

  const filtered = costCentres.value.filter(c =>
    c.code.toLowerCase().includes(q)
  )

  if (filtered.length > 0) return filtered

  return costCentres.value.filter(c =>
    c.name.toLowerCase().includes(q)
  )
}

const openTaxIndex = ref<number | null>(null)

async function loadSpheres() {
  const res = await $fetch('/api/spheres', { method: 'GET' })
  if (res.ok) {
    spheres.value = res.spheres.filter(s => s.is_active)
  }
}

async function loadCostCentres() {
  const res = await $fetch('/api/cost_centres', { method: 'GET' })
  if (res.ok) {
    costCentres.value = res.costCentres.filter(c => c.is_active)
  }
}

async function loadCompanies() {
  const res = await $fetch('/api/companies', { method: 'GET' })
  if (res.ok) companies.value = res.companies
}

async function createCompanyFromQuery() {
  const newCompanyName = companyQuery.value.trim()
  if (newCompanyName.length > 0) {
    const res = await $fetch('/api/companies/create', {
      method: 'POST',
      body: { 
        name: newCompanyName 
      }
    })
    if (res.ok) {
      selectedCompany.value = {
        id: res.id,
        name: newCompanyName
      }
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

const showCompanyDrawer = ref(false)

function openCompanyDrawer() {
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

  if (filteredCompanies.value.length === 1) {
    if (filteredCompanies.value[0]) selectCompany(filteredCompanies.value[0])
  }

  const q = companyQuery.value.trim().toLowerCase()
  if (!q) return

  const exactMatches = companies.value.filter(
    c => c.name.toLowerCase() === q
  )

  if (exactMatches.length === 1) {
    if (exactMatches[0]) selectCompany(exactMatches[0])
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

  const exactMatchesCode = costCentres.value.filter(
    c => c.code.toLowerCase() === q
  )

  if (exactMatchesCode.length === 1) {
    if (exactMatchesCode[0]) selectCostCentre(openCostCentreIndex.value, exactMatchesCode[0])
  }

  const exactMatchesName = costCentres.value.filter(
    c => c.name.toLowerCase() === q
  )

  if (exactMatchesName.length === 1) {
    if (exactMatchesName[0]) selectCostCentre(openCostCentreIndex.value, exactMatchesName[0])
  }
}

watch(companyQuery, (newVal) => {
  if (selectedCompany.value && newVal !== selectedCompany.value.name) {
    clearSelectedCompany()
  }
})

const form = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})
  
function addPosition() {
  form.value.positions.push({
    sphere: 0,
    cost_centre: 0,
    amount: 0.0,
    tax: 19
  })
}
  
function removePosition(i: number) {
  form.value.positions.splice(i, 1)
  delete costCentreQueries.value[i]
}

function sphereLabel(index: number) {
  const sphereId = form.value.positions[index]?.sphere
  if (!sphereId) return 'Sphäre auswählen'

  const sphere = spheres.value?.find(s => s.id === sphereId)
  return sphere?.name ?? 'Sphäre auswählen'
}

function taxLabel(index: number) {
  const tax = form.value.positions[index]?.tax
  return `${tax}%`
}

function displayAmount(i: number) {
  const value = form.value.positions[i]?.amount ?? null

  if (focusedIndex.value === i) {
    return value !== null ? String(value) : ''
  }

  if (value === null) return ''

  return new Intl.NumberFormat('de-DE', {
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
  if (parts.length > 2) {
    value = parts[0] + '.' + parts.slice(1).join('')
  }

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
    if (!map[p.tax]) {
      map[p.tax] = { tax: 0 }
    }

    const entry = map[p.tax]

    const netto = nettoOf(p)

    if (!entry) return
    entry.tax += p.amount - netto
  }

  return map
})

const netTotal = computed(() => 
  form.value.positions.reduce((s, p) => s + p.amount / (1 + (p.tax / 100)), 0) 
)
  
const grossTotal = computed(() => 
  form.value.positions.reduce((s, p) => s + p.amount, 0)
)
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