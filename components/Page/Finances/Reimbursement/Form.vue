<template>
  <div class="space-y-6">
    <section class="bg-white rounded-xl shadow-lg p-4 space-y-4">
      <h2 class="text-lg font-semibold">{{ t('reimbursement.data') }}</h2>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('reimbursement.paidBy') }}</label>
          <MenuDropdown v-model="openPaidBy" :id="0" class="w-full">
            <template #trigger="{ styling }">
              <input
                v-model="paidByQuery"
                :class="styling"
                :placeholder="t('reimbursement.memberSearch')"
                @input="openPaidBy = 0"
              />
            </template>

            <template #default="{ styling }">
              <button
                v-for="member in filteredMembers(paidByQuery)"
                :key="member.id"
                type="button"
                :class="styling"
                @click="selectMember('paid_by', member)"
              >
                {{ memberLabel(member) }}
              </button>
              <div v-if="filteredMembers(paidByQuery).length === 0" class="px-3 py-2 text-sm text-gray-500">
                {{ t('reimbursement.noMatchingMembers') }}
              </div>
            </template>
          </MenuDropdown>
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('reimbursement.submittedAt') }}</label>
          <input v-model="submittedAtDate" type="date" class="input" />
        </div>
      </div>

      <div class="flex items-center justify-between">
        <h3 class="font-medium">{{ t('reimbursement.bankDetails') }}</h3>
        <label class="inline-flex items-center gap-2 text-sm text-slate-700">
          <input v-model="form.cash" type="checkbox" />
          {{ t('reimbursement.cash') }}
        </label>
      </div>

      <div class="grid grid-cols-2 gap-4 transition-opacity" :class="form.cash ? 'opacity-50' : 'opacity-100'">
        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('reimbursement.bankname') }}</label>
          <input v-model="form.bankname" class="input" :disabled="form.cash" />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('reimbursement.accountHolder') }}</label>
          <input v-model="form.account_holder" class="input" :disabled="form.cash" />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('reimbursement.iban') }}</label>
          <input v-model="form.iban" class="input" :disabled="form.cash" />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('reimbursement.bic') }}</label>
          <input v-model="form.bic" class="input" :disabled="form.cash" />
        </div>
      </div>
    </section>

    <section class="bg-white rounded-xl shadow-lg p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">{{ t('reimbursement.receiptsInReimbursement') }}</h3>
        <button class="btn-primary" @click="createNewReceipt">
          ＋ {{ t('reimbursement.createReceipt') }}
        </button>
      </div>

      <div
        v-for="(position, i) in form.positions"
        :key="i"
        class="grid gap-2 items-center"
        :class="form.positions.length > 1 ? 'grid-cols-[3fr_1fr_auto]' : 'grid-cols-[3fr_1fr]'"
      >
        <MenuDropdown v-model="openReceiptIndex" :id="i" menu-width="wide">
          <template #trigger="{ styling }">
            <input
              v-model="receiptQueries[i]"
              :class="styling"
              :placeholder="t('reimbursement.receiptPlaceholder')"
              @input="openReceiptIndex = i"
            />
          </template>

          <template #default="{ styling }">
            <button
              v-for="receipt in filteredReceipts(i)"
              :key="receipt.id"
              type="button"
              :class="styling"
              class="overflow-hidden text-ellipsis"
              @click="selectReceipt(i, receipt)"
            >
              {{ receiptLabel(receipt) }}
            </button>
            <div
              v-if="filteredReceipts(i).length === 0"
              class="px-3 py-2 text-sm text-gray-500"
            >
              {{ t('reimbursement.noMatchingReceipts') }}
            </div>
          </template>
        </MenuDropdown>

        <div class="text-right text-sm text-slate-600">
          {{ selectedReceiptAmount(i) }}
        </div>

        <button
          v-if="form.positions.length > 1"
          type="button"
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
          <span class="text-xl">+</span> {{ t('actions.addPosition') }}
        </button>

        <div class="text-sm text-right space-y-1 pt-2 min-w-55 w-72">
          <div class="flex items-center justify-between gap-3">
            <span class="text-slate-600">{{ t('reimbursement.advance') }}</span>
            <input
              type="text"
              class="input text-right w-42"
              :value="displayAdvance"
              inputmode="decimal"
              @focus="onAdvanceFocus"
              @blur="onAdvanceBlur"
              @input="onAdvanceInput"
            />
          </div>
          <div class="flex justify-between text-slate-500">
            <span>{{ t('reimbursement.receiptsTotal') }}</span>
            <span>{{ formatCurrency(receiptsTotal) }}</span>
          </div>
          <div class="flex justify-between text-slate-500">
            <span>{{ t('reimbursement.advance') }}</span>
            <span>- {{ formatCurrency(Number(form.advance || 0)) }}</span>
          </div>
          <div class="flex justify-between font-semibold text-lg border-t pt-1">
            <span>{{ t('reimbursement.payout') }}</span>
            <span>{{ formatCurrency(payoutTotal) }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-white rounded-xl shadow-lg p-4 space-y-4">
      <h2 class="text-lg font-semibold">{{ t('reimbursement.reviewAndPayout') }}</h2>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('reimbursement.checkedBy') }}</label>
          <MenuDropdown v-model="openCheckedBy" :id="1" class="w-full">
            <template #trigger="{ styling }">
              <input
                v-model="checkedByQuery"
                :class="styling"
                :placeholder="t('reimbursement.memberSearch')"
                @input="openCheckedBy = 1"
              />
            </template>

            <template #default="{ styling }">
              <button
                v-for="member in filteredMembers(checkedByQuery)"
                :key="member.id"
                type="button"
                :class="styling"
                @click="selectMember('checked_by', member)"
              >
                {{ memberLabel(member) }}
              </button>
              <div v-if="filteredMembers(checkedByQuery).length === 0" class="px-3 py-2 text-sm text-gray-500">
                {{ t('reimbursement.noMatchingMembers') }}
              </div>
            </template>
          </MenuDropdown>
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('reimbursement.checkedAt') }}</label>
          <input v-model="checkedAtDate" type="date" class="input" />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('reimbursement.disbursedBy') }}</label>
          <MenuDropdown v-model="openDisbursedBy" :id="2" class="w-full">
            <template #trigger="{ styling }">
              <input
                v-model="disbursedByQuery"
                :class="styling"
                :placeholder="t('reimbursement.memberSearch')"
                @input="openDisbursedBy = 2"
              />
            </template>

            <template #default="{ styling }">
              <button
                v-for="member in filteredMembers(disbursedByQuery)"
                :key="member.id"
                type="button"
                :class="styling"
                @click="selectMember('disbursed_by', member)"
              >
                {{ memberLabel(member) }}
              </button>
              <div v-if="filteredMembers(disbursedByQuery).length === 0" class="px-3 py-2 text-sm text-gray-500">
                {{ t('reimbursement.noMatchingMembers') }}
              </div>
            </template>
          </MenuDropdown>
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('reimbursement.disbursedAt') }}</label>
          <input v-model="disbursedAtDate" type="date" class="input" />
        </div>
      </div>
    </section>

    <div class="grid grid-cols-2 gap-4">
      <button class="btn-secondary" @click="emit('cancel')">
        {{ t('actions.cancel') }}
      </button>

      <button
        class="btn-primary"
        :disabled="saveDisabled"
        :class="{ 'opacity-50 cursor-not-allowed': saveDisabled }"
        @click="emit('submit')"
      >
        {{ t('actions.save') }}
      </button>
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
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import type { Receipt, ReceiptRow } from '~/types/receipt'
import type { CreateReimbursementBody } from '~/types/reimbursement'
import type { MemberListItem } from '~/types/member'
import { usePage } from '~/composables/usePage'

type MemberField = 'paid_by' | 'checked_by' | 'disbursed_by'

const props = defineProps<{
  modelValue: CreateReimbursementBody
  disabled?: boolean
  hasFile?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: CreateReimbursementBody): void
  (e: 'submit'): void
  (e: 'cancel'): void
}>()

const { setPage, pageMeta } = usePage()
const { locale, t } = useI18n()

const form = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const disabled = computed(() => Boolean(props.disabled))

const validationErrors = computed(() => {
  const errors: string[] = []
  if (!form.value.paid_by) errors.push(t('reimbursement.required.paidBy'))
  if (!form.value.submitted_at) errors.push(t('reimbursement.required.submittedAt'))
  if (!Array.isArray(form.value.positions) || form.value.positions.length === 0) errors.push(t('reimbursement.required.oneReceipt'))
  if (form.value.positions.some(position => !position.receipt_id && !position.receipt?.id)) errors.push(t('reimbursement.required.eachReceipt'))

  const receiptIds = form.value.positions
    .map(position => Number(position.receipt_id || position.receipt?.id || 0))
    .filter(id => Boolean(id))
  if (new Set(receiptIds).size !== receiptIds.length) errors.push(t('reimbursement.required.uniqueReceipt'))

  const currentReimbursementId = Number(pageMeta.value?.reimbursementId || 0)
  const assignmentMap = new Map(receiptAssignments.value.map(assignment => [assignment.receipt_id, assignment.reimbursement_id]))
  const assignedElsewhere = receiptIds.some(receiptId => {
    const assignedReimbursementId = assignmentMap.get(receiptId)
    return Boolean(assignedReimbursementId && assignedReimbursementId !== currentReimbursementId)
  })
  if (assignedElsewhere) errors.push(t('reimbursement.required.assignedElsewhere'))

  if (!props.hasFile) errors.push(t('reimbursement.required.file'))
  if (!form.value.cash) {
    if (!form.value.bankname?.trim()) errors.push(t('reimbursement.required.bankname'))
    if (!form.value.iban?.trim()) errors.push(t('reimbursement.required.iban'))
  }

  const hasCheckedBy = Boolean(form.value.checked_by)
  const hasCheckedAt = Boolean(form.value.checked_at)
  if (hasCheckedBy !== hasCheckedAt) errors.push(t('reimbursement.required.checkedPair'))

  const hasDisbursedBy = Boolean(form.value.disbursed_by)
  const hasDisbursedAt = Boolean(form.value.disbursed_at)
  if (hasDisbursedBy !== hasDisbursedAt) errors.push(t('reimbursement.required.disbursedPair'))

  return errors
})

const saveDisabled = computed(() => disabled.value || validationErrors.value.length > 0)
const members = ref<MemberListItem[]>([])
const receipts = ref<ReceiptRow[]>([])
const receiptAssignments = ref<{ receipt_id: number, reimbursement_id: number }[]>([])
const openPaidBy = ref<number | null>(null)
const openCheckedBy = ref<number | null>(null)
const openDisbursedBy = ref<number | null>(null)
const paidByQuery = ref('')
const checkedByQuery = ref('')
const disbursedByQuery = ref('')
const openReceiptIndex = ref<number | null>(null)
const receiptQueries = ref<Record<number, string>>({})
const advanceFocused = ref(false)

function toDateOnly(value: string | null) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

const submittedAtDate = computed({
  get: () => toDateOnly(form.value.submitted_at),
  set: (v: string) => {
    form.value.submitted_at = v || ''
  }
})

const checkedAtDate = computed({
  get: () => toDateOnly(form.value.checked_at),
  set: (v: string) => {
    form.value.checked_at = v || null
  }
})

const disbursedAtDate = computed({
  get: () => toDateOnly(form.value.disbursed_at),
  set: (v: string) => {
    form.value.disbursed_at = v || null
  }
})

async function loadMembers() {
  const res = await $fetch('/api/members', { method: 'GET' })
  if (res.ok) members.value = res.members
}

async function loadReceipts() {
  const res = await $fetch('/api/receipts', { method: 'GET' })
  if (res.ok) receipts.value = res.receipts
}

async function loadReceiptAssignments() {
  const res = await $fetch('/api/reimbursements/receipt_assignments', { method: 'GET' })
  if (res.ok) receiptAssignments.value = res.assignments
}

function memberLabel(member: MemberListItem) {
  return `${member.first_name} ${member.last_name}`
}

function filteredMembers(query: string) {
  const q = query.toLowerCase().trim()
  if (!q) return members.value
  return members.value.filter(member => memberLabel(member).toLowerCase().includes(q))
}

function selectMember(field: MemberField, member: MemberListItem) {
  if (field === 'paid_by') {
    form.value.paid_by = member.id
    paidByQuery.value = memberLabel(member)
    openPaidBy.value = null
    return
  }
  if (field === 'checked_by') {
    form.value.checked_by = member.id
    checkedByQuery.value = memberLabel(member)
    openCheckedBy.value = null
    return
  }
  form.value.disbursed_by = member.id
  disbursedByQuery.value = memberLabel(member)
  openDisbursedBy.value = null
}

function tryAutoSelectMember(field: MemberField) {
  let query = ''
  if (field === 'paid_by') query = paidByQuery.value
  if (field === 'checked_by') query = checkedByQuery.value
  if (field === 'disbursed_by') query = disbursedByQuery.value

  const filtered = filteredMembers(query)
  if (filtered.length === 1) {
    const member = filtered[0]
    if (member) selectMember(field, member)
    return
  }

  const q = query.trim().toLowerCase()
  if (!q) return

  const exactMatches = members.value.filter(member => memberLabel(member).toLowerCase() === q)
  if (exactMatches.length === 1) {
    const member = exactMatches[0]
    if (member) selectMember(field, member)
  }
}

function syncMemberQuery(field: MemberField, memberId: number | null) {
  const member = members.value.find(m => m.id === memberId)
  const name = member ? memberLabel(member) : ''
  if (field === 'paid_by') paidByQuery.value = name
  if (field === 'checked_by') checkedByQuery.value = name
  if (field === 'disbursed_by') disbursedByQuery.value = name
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(locale.value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function receiptLabel(receipt: Pick<ReceiptRow, 'receipt_date' | 'receipt_number' | 'company_name' | 'total_amount'>) {
  const number = receipt.receipt_number || t('receipt.noNumber')
  const company = receipt.company_name || t('receipt.noCompany')
  return `${formatDate(receipt.receipt_date)} - ${number} - ${company} (${formatCurrency(receipt.total_amount)})`
}

function filteredReceipts(index: number) {
  const q = receiptQueries.value[index]?.toLowerCase().trim()
  if (!q) return receipts.value
  return receipts.value.filter(receipt => {
    const haystack = [
      String(receipt.id),
      receipt.receipt_number || '',
      receipt.company_name || '',
      receipt.description || '',
      receipt.receipt_date,
    ].join(' ').toLowerCase()
    return haystack.includes(q)
  })
}

function selectReceipt(index: number, receipt: ReceiptRow) {
  const position = form.value.positions[index]
  if (!position) return

  position.receipt_id = receipt.id
  position.receipt = {
    id: receipt.id,
    receipt_date: receipt.receipt_date,
    receipt_number: receipt.receipt_number,
    description: receipt.description,
    company_id: receipt.company_id,
    company_name: receipt.company_name,
    status: receipt.status,
    positions: [],
  } as Receipt

  receiptQueries.value[index] = receiptLabel(receipt)
  openReceiptIndex.value = null
}

function tryAutoSelectReceipt() {
  if (openReceiptIndex.value === null) return
  const index = openReceiptIndex.value
  const filtered = filteredReceipts(index)

  if (filtered.length === 1) {
    const receipt = filtered[0]
    if (receipt) selectReceipt(index, receipt)
    return
  }

  const q = receiptQueries.value[index]?.trim().toLowerCase()
  if (!q) return
  const exactMatchesId = receipts.value.filter(receipt => String(receipt.id) === q)
  if (exactMatchesId.length === 1) {
    const receipt = exactMatchesId[0]
    if (receipt) selectReceipt(index, receipt)
    return
  }

  const exactMatchesNumber = receipts.value.filter(receipt => (receipt.receipt_number || '').toLowerCase() === q)
  if (exactMatchesNumber.length === 1) {
    const receipt = exactMatchesNumber[0]
    if (receipt) selectReceipt(index, receipt)
  }
}

function selectedReceipt(index: number) {
  const position = form.value.positions[index]
  if (!position) return null
  const listed = receipts.value.find(receipt => receipt.id === position.receipt_id)
  if (listed) return listed
  const embedded = position.receipt
  if (!embedded) return null
  return {
    id: embedded.id,
    receipt_date: embedded.receipt_date,
    receipt_number: embedded.receipt_number,
    company_name: embedded.company_name,
    company_id: embedded.company_id,
    description: embedded.description,
    status: embedded.status,
    total_amount: embedded.positions.reduce((sum, p) => sum + Number(p.amount || 0), 0),
  } as ReceiptRow
}

function selectedReceiptAmount(index: number) {
  const receipt = selectedReceipt(index)
  if (!receipt) return '---'
  return formatCurrency(Number(receipt.total_amount || 0))
}

function addPosition() {
  form.value.positions.push({ receipt_id: 0 })
}

function removePosition(index: number) {
  form.value.positions.splice(index, 1)
  delete receiptQueries.value[index]
}

function onAdvanceFocus(e: FocusEvent) {
  advanceFocused.value = true
  nextTick(() => (e.target as HTMLInputElement).select())
}

function onAdvanceInput(e: Event) {
  let value = (e.target as HTMLInputElement).value
  value = value.replace(/[^0-9.,]/g, '')
  value = value.replace(',', '.')
  const parts = value.split('.')
  if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('')
  const parsed = parseFloat(value)
  form.value.advance = isNaN(parsed) ? 0 : parsed
  ;(e.target as HTMLInputElement).value = value
}

function onAdvanceBlur() {
  advanceFocused.value = false
  const value = form.value.advance
  form.value.advance = Number((value || 0).toFixed(2))
}

const displayAdvance = computed(() => {
  const value = form.value.advance ?? 0
  if (advanceFocused.value) return String(value)
  return formatCurrency(value)
})

function buildDraftMeta() {
  return JSON.parse(JSON.stringify(form.value))
}

function createNewReceipt() {
  const returnToMeta: Record<string, any> = {
    reimbursementDraft: buildDraftMeta(),
  }
  if (pageMeta.value?.reimbursementId) returnToMeta.reimbursementId = pageMeta.value.reimbursementId
  setPage('ReceiptCreate', {
    returnTo: 'ReimbursementCreate',
    returnToMeta,
  })
}

function onKeydown(e: KeyboardEvent) {
  if (openPaidBy.value !== null) {
    if (e.key === 'Escape') openPaidBy.value = null
    if (e.key === 'Enter' || e.key === 'Tab') {
      tryAutoSelectMember('paid_by')
      openPaidBy.value = null
    }
  }

  if (openCheckedBy.value !== null) {
    if (e.key === 'Escape') openCheckedBy.value = null
    if (e.key === 'Enter' || e.key === 'Tab') {
      tryAutoSelectMember('checked_by')
      openCheckedBy.value = null
    }
  }

  if (openDisbursedBy.value !== null) {
    if (e.key === 'Escape') openDisbursedBy.value = null
    if (e.key === 'Enter' || e.key === 'Tab') {
      tryAutoSelectMember('disbursed_by')
      openDisbursedBy.value = null
    }
  }

  if (openReceiptIndex.value !== null) {
    if (e.key === 'Escape') openReceiptIndex.value = null
    if (e.key === 'Enter' || e.key === 'Tab') {
      tryAutoSelectReceipt()
      openReceiptIndex.value = null
    }
  }
}

const receiptsTotal = computed(() => form.value.positions.reduce((sum, _, index) => {
  const receipt = selectedReceipt(index)
  return sum + Number(receipt?.total_amount || 0)
}, 0))

const payoutTotal = computed(() => Math.max(0, receiptsTotal.value - Number(form.value.advance || 0)))

watch([members, () => form.value.paid_by, () => form.value.checked_by, () => form.value.disbursed_by], () => {
  syncMemberQuery('paid_by', form.value.paid_by)
  syncMemberQuery('checked_by', form.value.checked_by)
  syncMemberQuery('disbursed_by', form.value.disbursed_by)
}, { immediate: true })

watch(paidByQuery, (v) => {
  const selected = members.value.find(m => m.id === form.value.paid_by)
  if (selected && v !== memberLabel(selected)) form.value.paid_by = 0
})

watch(checkedByQuery, (v) => {
  const selected = members.value.find(m => m.id === form.value.checked_by)
  if (selected && v !== memberLabel(selected)) form.value.checked_by = null
})

watch(disbursedByQuery, (v) => {
  const selected = members.value.find(m => m.id === form.value.disbursed_by)
  if (selected && v !== memberLabel(selected)) form.value.disbursed_by = null
})

watch(() => receiptQueries.value, (queries) => {
  form.value.positions.forEach((position, index) => {
    const query = (queries[index] || '').trim()
    if (query !== '') return
    if (!position.receipt_id && !position.receipt) return
    position.receipt_id = 0
    if ('receipt' in position) delete position.receipt
  })
}, { deep: true })

watch([receipts, () => form.value.positions], () => {
  form.value.positions.forEach((_, index) => {
    const receipt = selectedReceipt(index)
    if (receipt) receiptQueries.value[index] = receiptLabel(receipt)
  })
}, { immediate: true, deep: true })

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  if (!form.value.submitted_at) form.value.submitted_at = new Date().toISOString().slice(0, 10)
  if (!form.value.positions.length) form.value.positions.push({ receipt_id: 0 })
  loadMembers()
  loadReceipts()
  loadReceiptAssignments()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>
