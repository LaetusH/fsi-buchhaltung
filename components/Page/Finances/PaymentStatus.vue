<template>
  <div class="flex items-center gap-3">
    <MenuDropdown v-model="open" :id="0">
      <template #trigger="{ styling }">
        <button :class="[styling, statusClasses[modelValue]]" class="border-0 px-3 cursor-pointer shadow-none">
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
import { ReceiptStatus } from '~/types/receipt'

const props = defineProps<{
  modelValue: ReceiptStatus
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: ReceiptStatus): void
}>()

const open = ref<number | null>(null)

const statusLabels: Record<ReceiptStatus, string> = {
  draft: 'ENTWURF',
  open: 'OFFEN',
  paid: 'BEZAHLT',
  cancelled: 'STORNIERT',
}

const statusClasses: Record<ReceiptStatus, string> = {
  draft: 'bg-slate-300 text-slate-900',
  open: 'bg-yellow-300 text-yellow-900',
  paid: 'bg-green-300 text-green-900',
  cancelled: 'bg-red-300 text-red-900 line-through',
}

const transitions: Record<ReceiptStatus, ReceiptStatus[]> = {
  draft: [ReceiptStatus.Open, ReceiptStatus.Cancelled],
  open: [ReceiptStatus.Paid, ReceiptStatus.Cancelled, ReceiptStatus.Draft],
  paid: [ReceiptStatus.Open],
  cancelled: [ReceiptStatus.Draft],
}

const allowedTargets = computed(() =>
  transitions[props.modelValue] ?? []
)

function select(status: ReceiptStatus) {
  emit('update:modelValue', status)
  open.value = null
}
</script>