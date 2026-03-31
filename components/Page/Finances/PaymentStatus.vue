<template>
  <div class="flex items-center gap-3">
    <MenuDropdown v-model="open" :id="0">
      <template #trigger="{ styling }">
        <button :class="[styling, disabled ? 'opacity-70' : 'cursor-pointer', statusClasses[modelValue]]" class="h-9.5 px-3" :disabled="disabled">
          {{ statusLabels[modelValue] }}
        </button>
      </template>

      <template #default="{ styling }">
        <button
          v-for="s in allowedTargets"
          :key="s"
          :class="[styling, statusClasses[s]]"
          class="hover:text-black hover:bg-slate-300"
          @click="select(s)"
        >
          {{ statusLabels[s] }}
        </button>
      </template>
    </MenuDropdown>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { ReceiptStatus } from '~/types/receipt'
import { InvoiceStatus } from '~/types/invoice'

type PaymentStatusValue = ReceiptStatus | InvoiceStatus

const props = defineProps<{
  modelValue: PaymentStatusValue
  disabled?: boolean
  i18nKeyPrefix?: 'receipt' | 'invoice'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: PaymentStatusValue): void
}>()

const open = ref<number | null>(null)
const { t } = useI18n()
const i18nKeyPrefix = computed(() => props.i18nKeyPrefix ?? 'receipt')

const statusLabels = computed<Record<PaymentStatusValue, string>>(() => ({
  draft: t(`${i18nKeyPrefix.value}.states.draft`),
  open: t(`${i18nKeyPrefix.value}.states.open`),
  paid: t(`${i18nKeyPrefix.value}.states.paid`),
  cancelled: t(`${i18nKeyPrefix.value}.states.cancelled`),
}))

const statusClasses: Record<PaymentStatusValue, string> = {
  draft: 'bg-slate-300 text-slate-900',
  open: 'bg-yellow-300 text-yellow-900',
  paid: 'bg-green-300 text-green-900',
  cancelled: 'bg-red-300 text-red-900 line-through',
}

const transitions: Record<PaymentStatusValue, PaymentStatusValue[]> = {
  draft: [ReceiptStatus.Open, ReceiptStatus.Cancelled],
  open: [ReceiptStatus.Paid, ReceiptStatus.Cancelled, ReceiptStatus.Draft],
  paid: [ReceiptStatus.Open],
  cancelled: [ReceiptStatus.Draft],
}

const allowedTargets = computed(() =>
  transitions[props.modelValue] ?? []
)

function select(status: PaymentStatusValue) {
  emit('update:modelValue', status)
  open.value = null
}
</script>
