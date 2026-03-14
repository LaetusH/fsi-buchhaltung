<template>
  <div class="space-y-6">
    <section class="bg-white rounded-xl shadow-lg p-4 space-y-4">
      <h2 class="text-lg font-semibold">{{ t('cashCount.countData') }}</h2>

      <div>
        <label class="text-sm font-medium text-slate-600">{{ t('cashCount.event') }}</label>
        <input
          v-model="form.event_name"
          class="input"
          :class="disabled ? 'opacity-70' : ''"
          :placeholder="t('cashCount.eventPlaceholder')"
          :disabled="disabled"
        >
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('cashCount.countedByFirst') }}</label>
          <CommonSearchSelect
            v-model="countedByFirstQuery"
            :options="memberOptions"
            :selected-label="selectedMemberLabel(form.counted_by_first)"
            :placeholder="t('cashCount.memberSearch')"
            :empty-text="t('reimbursement.noMatchingMembers')"
            :disabled="disabled"
            @select="onCountedByFirstSelect"
            @clear-selection="form.counted_by_first = 0"
          />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('cashCount.countedBySecond') }}</label>
          <CommonSearchSelect
            v-model="countedBySecondQuery"
            :options="memberOptions"
            :selected-label="selectedMemberLabel(form.counted_by_second)"
            :placeholder="t('cashCount.memberSearch')"
            :empty-text="t('reimbursement.noMatchingMembers')"
            :disabled="disabled"
            @select="onCountedBySecondSelect"
            @clear-selection="form.counted_by_second = 0"
          />
        </div>

        <div class="md:col-span-2">
          <label class="text-sm font-medium text-slate-600">{{ t('cashCount.checkedBy') }}</label>
          <CommonSearchSelect
            v-model="checkedByQuery"
            :options="memberOptions"
            :selected-label="selectedMemberLabel(form.checked_by)"
            :placeholder="t('cashCount.memberSearch')"
            :empty-text="t('reimbursement.noMatchingMembers')"
            :disabled="disabled"
            @select="onCheckedBySelect"
            @clear-selection="form.checked_by = 0"
          />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('cashCount.countedBeforeAt') }}</label>
          <input
            v-model="countedBeforeAtInput"
            type="datetime-local"
            class="input"
            :class="disabled ? 'opacity-70' : ''"
            :disabled="disabled"
          >
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('cashCount.countedAfterAt') }}</label>
          <input
            v-model="countedAfterAtInput"
            type="datetime-local"
            class="input"
            :class="disabled ? 'opacity-70' : ''"
            :disabled="disabled"
          >
        </div>
      </div>
    </section>

    <section class="bg-white rounded-xl shadow-lg p-4 space-y-3">
      <div class="flex items-center justify-between gap-4">
        <h3 class="font-semibold">{{ t('cashCount.positions') }}</h3>
        <button
          v-if="!disabled"
          type="button"
          class="flex items-center gap-2 text-orange-500 font-medium cursor-pointer"
          @click="addPosition"
        >
          <span class="text-xl">+</span> {{ t('actions.addPosition') }}
        </button>
      </div>

      <div class="hidden lg:grid grid-cols-[5rem_1fr_1fr_1fr_2fr_auto] gap-3 text-sm font-medium text-slate-500">
        <div>{{ t('cashCount.register') }}</div>
        <div>{{ t('cashCount.amountBefore') }}</div>
        <div>{{ t('cashCount.amountAfter') }}</div>
        <div>{{ t('cashCount.difference') }}</div>
        <div>{{ t('cashCount.notes') }}</div>
        <div />
      </div>

      <div
        v-for="(position, index) in form.positions"
        :key="position.id || index"
        class="rounded-xl border border-slate-200 p-3 lg:p-0 lg:border-0"
      >
        <div class="grid grid-cols-1 lg:grid-cols-[5rem_1fr_1fr_1fr_2fr_auto] gap-3 items-start">
          <div>
            <label class="text-sm font-medium text-slate-500 lg:hidden">{{ t('cashCount.register') }}</label>
            <div class="input bg-slate-50 text-center font-semibold">{{ index + 1 }}</div>
          </div>

          <div>
            <label class="text-sm font-medium text-slate-500 lg:hidden">{{ t('cashCount.amountBefore') }}</label>
            <input
              type="text"
              class="input text-right"
              :class="disabled ? 'opacity-70' : ''"
              :value="displayAmount(index, 'amount_before')"
              inputmode="decimal"
              :disabled="disabled"
              @focus="onAmountFocus($event, index, 'amount_before')"
              @blur="onAmountBlur(index, 'amount_before')"
              @input="onAmountInput($event, index, 'amount_before')"
            >
          </div>

          <div>
            <label class="text-sm font-medium text-slate-500 lg:hidden">{{ t('cashCount.amountAfter') }}</label>
            <input
              type="text"
              class="input text-right"
              :class="disabled ? 'opacity-70' : ''"
              :value="displayAmount(index, 'amount_after')"
              inputmode="decimal"
              :disabled="disabled"
              @focus="onAmountFocus($event, index, 'amount_after')"
              @blur="onAmountBlur(index, 'amount_after')"
              @input="onAmountInput($event, index, 'amount_after')"
            >
          </div>

          <div>
            <label class="text-sm font-medium text-slate-500 lg:hidden">{{ t('cashCount.difference') }}</label>
            <div class="input bg-slate-50 text-right font-medium">
              {{ formatCurrency(positionDifference(position)) }}
            </div>
          </div>

          <div>
            <label class="text-sm font-medium text-slate-500 lg:hidden">{{ t('cashCount.notes') }}</label>
            <input
              v-model="position.notes"
              class="input"
              :class="disabled ? 'opacity-70' : ''"
              :disabled="disabled"
            >
          </div>

          <button
            v-if="!disabled && form.positions.length > 1"
            type="button"
            class="text-red-500 cursor-pointer p-2 w-10 rounded-md hover:bg-slate-100 self-center"
            @click="removePosition(index)"
          >
            x
          </button>
        </div>
      </div>
    </section>

    <section class="bg-white rounded-xl shadow-lg p-4">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <h3 class="font-semibold">{{ t('cashCount.overview') }}</h3>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm min-w-full lg:min-w-0 lg:w-auto">
          <div class="rounded-xl bg-slate-100 px-4 py-3">
            <div class="text-slate-500">{{ t('cashCount.registerCount') }}</div>
            <div class="text-lg font-semibold">{{ form.positions.length }}</div>
          </div>
          <div class="rounded-xl bg-slate-100 px-4 py-3">
            <div class="text-slate-500">{{ t('cashCount.totalBefore') }}</div>
            <div class="text-lg font-semibold">{{ formatCurrency(totalBefore) }}</div>
          </div>
          <div class="rounded-xl bg-slate-100 px-4 py-3">
            <div class="text-slate-500">{{ t('cashCount.totalAfter') }}</div>
            <div class="text-lg font-semibold">{{ formatCurrency(totalAfter) }}</div>
          </div>
          <div class="rounded-xl bg-emerald-100 px-4 py-3">
            <div class="text-emerald-700">{{ t('cashCount.totalDifference') }}</div>
            <div class="text-lg font-semibold text-emerald-800">{{ formatCurrency(totalDifference) }}</div>
          </div>
        </div>
      </div>
    </section>

    <CommonFormActions
      :disabled="disabled"
      :save-disabled="saveDisabled"
      :cancel-label="t('actions.cancel')"
      :submit-label="t('actions.save')"
      :close-label="t('actions.close')"
      @cancel="emit('cancel')"
      @submit="emit('submit')"
    />

    <CommonValidationSummary :errors="validationErrors" :title="t('common.validationBlocked')" />
  </div>
</template>

<script setup lang="ts">
import type { SearchSelectOption } from '~/components/Common/SearchSelect.vue'
import { useI18n } from '~/composables/useI18n'
import { focusAndSelectInput, sanitizeCurrencyInput } from '~/composables/useCurrencyInput'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import type { MemberListItem } from '~/types/member'
import type { CreateCashCountBody, CreateCashCountPositionBody } from '~/types/cashCount'

type MemberField = 'counted_by_first' | 'counted_by_second' | 'checked_by'
type AmountField = 'amount_before' | 'amount_after'

const props = defineProps<{
  modelValue: CreateCashCountBody
  disabled?: boolean
  hasFile?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: CreateCashCountBody): void
  (e: 'submit'): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()
const { formatCurrency } = useLocaleFormatters()

const form = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const disabled = computed(() => Boolean(props.disabled))
const members = ref<MemberListItem[]>([])
const countedByFirstQuery = ref('')
const countedBySecondQuery = ref('')
const checkedByQuery = ref('')
const focusedAmountField = ref<{ index: number, field: AmountField } | null>(null)

const memberOptions = computed<SearchSelectOption<MemberListItem>[]>(() => members.value.map(member => ({
  key: member.id,
  label: memberLabel(member),
  value: member,
})))

const validationErrors = computed(() => {
  const errors: string[] = []

  if (!form.value.event_name.trim()) errors.push(t('cashCount.required.event'))
  if (!form.value.counted_by_first) errors.push(t('cashCount.required.countedByFirst'))
  if (!form.value.counted_by_second) errors.push(t('cashCount.required.countedBySecond'))
  if (!form.value.checked_by) errors.push(t('cashCount.required.checkedBy'))
  if (hasAllMembers() && !hasDistinctMembers()) errors.push(t('cashCount.required.distinctMembers'))
  if (!form.value.counted_before_at) errors.push(t('cashCount.required.countedBeforeAt'))
  if (!form.value.counted_after_at) errors.push(t('cashCount.required.countedAfterAt'))
  if (form.value.counted_before_at && form.value.counted_after_at && !hasValidDateOrder()) {
    errors.push(t('cashCount.required.order'))
  }
  if (!Array.isArray(form.value.positions) || form.value.positions.length === 0) errors.push(t('cashCount.required.positions'))
  if (form.value.positions.some(position => !hasValidAmount(position.amount_before) || !hasValidAmount(position.amount_after))) {
    errors.push(t('cashCount.required.completePosition'))
  }
  if (!props.hasFile) errors.push(t('cashCount.required.file'))

  return errors
})

const saveDisabled = computed(() => disabled.value || validationErrors.value.length > 0)
const countedBeforeAtInput = computed({
  get: () => toDateTimeLocal(form.value.counted_before_at),
  set: (value: string) => {
    form.value.counted_before_at = value || ''
  },
})
const countedAfterAtInput = computed({
  get: () => toDateTimeLocal(form.value.counted_after_at),
  set: (value: string) => {
    form.value.counted_after_at = value || ''
  },
})

const totalBefore = computed(() => form.value.positions.reduce((sum, position) => sum + Number(position.amount_before || 0), 0))
const totalAfter = computed(() => form.value.positions.reduce((sum, position) => sum + Number(position.amount_after || 0), 0))
const totalDifference = computed(() => totalAfter.value - totalBefore.value)

function toDateTimeLocal(value: string | null) {
  if (!value) return ''
  return String(value).slice(0, 16)
}

function hasValidAmount(value: unknown) {
  return Number.isFinite(Number(value))
}

function hasAllMembers() {
  return Boolean(form.value.counted_by_first && form.value.counted_by_second && form.value.checked_by)
}

function hasDistinctMembers() {
  return new Set([
    Number(form.value.counted_by_first || 0),
    Number(form.value.counted_by_second || 0),
    Number(form.value.checked_by || 0),
  ]).size === 3
}

function hasValidDateOrder() {
  const beforeTs = Date.parse(form.value.counted_before_at)
  const afterTs = Date.parse(form.value.counted_after_at)
  return Number.isFinite(beforeTs) && Number.isFinite(afterTs) && afterTs > beforeTs
}

function memberLabel(member: MemberListItem) {
  return `${member.first_name} ${member.last_name}`
}

function selectedMemberLabel(memberId: number) {
  const member = members.value.find(entry => entry.id === memberId)
  return member ? memberLabel(member) : ''
}

function selectMember(field: MemberField, member: MemberListItem) {
  if (field === 'counted_by_first') {
    form.value.counted_by_first = member.id
    countedByFirstQuery.value = memberLabel(member)
    return
  }

  if (field === 'counted_by_second') {
    form.value.counted_by_second = member.id
    countedBySecondQuery.value = memberLabel(member)
    return
  }

  form.value.checked_by = member.id
  checkedByQuery.value = memberLabel(member)
}

function onCountedByFirstSelect(value: unknown) {
  selectMember('counted_by_first', value as MemberListItem)
}

function onCountedBySecondSelect(value: unknown) {
  selectMember('counted_by_second', value as MemberListItem)
}

function onCheckedBySelect(value: unknown) {
  selectMember('checked_by', value as MemberListItem)
}

async function loadMembers() {
  const res = await $fetch('/api/members', { method: 'GET' })
  if (res.ok) members.value = res.members
}

function addPosition() {
  form.value.positions.push({ amount_before: 0, amount_after: 0, notes: null })
}

function removePosition(index: number) {
  form.value.positions.splice(index, 1)
  if (focusedAmountField.value?.index === index) focusedAmountField.value = null
  if (focusedAmountField.value && focusedAmountField.value.index > index) {
    focusedAmountField.value = {
      ...focusedAmountField.value,
      index: focusedAmountField.value.index - 1,
    }
  }
}

function positionDifference(position: CreateCashCountPositionBody) {
  return Number(position.amount_after || 0) - Number(position.amount_before || 0)
}

function isAmountFocused(index: number, field: AmountField) {
  return focusedAmountField.value?.index === index && focusedAmountField.value?.field === field
}

function displayAmount(index: number, field: AmountField) {
  const position = form.value.positions[index]
  if (!position) return ''

  const value = position[field]
  if (isAmountFocused(index, field)) return value !== null && value !== undefined ? String(value) : ''
  if (value === null || value === undefined) return ''

  return formatCurrency(Number(value))
}

function onAmountFocus(event: FocusEvent, index: number, field: AmountField) {
  focusedAmountField.value = { index, field }
  focusAndSelectInput(event)
}

function onAmountInput(event: Event, index: number, field: AmountField) {
  const value = sanitizeCurrencyInput((event.target as HTMLInputElement).value)
  const parsed = parseFloat(value)
  const position = form.value.positions[index]
  if (!position) return

  position[field] = Number.isNaN(parsed) ? 0 : parsed
  ;(event.target as HTMLInputElement).value = value
}

function onAmountBlur(index: number, field: AmountField) {
  if (isAmountFocused(index, field)) focusedAmountField.value = null

  const position = form.value.positions[index]
  if (!position) return

  const value = position[field]
  if (value !== null && value !== undefined) {
    position[field] = Number(Number(value).toFixed(2))
  }
}

watch([members, () => form.value.counted_by_first, () => form.value.counted_by_second, () => form.value.checked_by], () => {
  countedByFirstQuery.value = selectedMemberLabel(Number(form.value.counted_by_first || 0))
  countedBySecondQuery.value = selectedMemberLabel(Number(form.value.counted_by_second || 0))
  checkedByQuery.value = selectedMemberLabel(Number(form.value.checked_by || 0))
}, { immediate: true })

onMounted(() => {
  if (!form.value.positions.length) addPosition()
  loadMembers()
})
</script>
