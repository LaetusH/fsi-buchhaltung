<template>
  <div class="flex min-h-0 flex-col space-y-3">
    <CommonSearchSelect
      v-if="!disabled"
      :model-value="query"
      :options="options"
      :placeholder="placeholder"
      :empty-text="emptyText"
      @update:model-value="emit('update:query', $event)"
      @select="emit('select', $event)"
      @clear-selection="emit('clear-selection')"
    />

    <div v-if="items.length > 0" class="min-h-0 rounded-lg border border-slate-200 bg-slate-50">
      <div class="selection-scroll max-h-[min(38vh,20rem)] overflow-y-auto p-2">
        <div
          v-for="item in items"
          :key="item.id"
          class="mb-2 rounded-lg border border-slate-200 bg-white px-3 py-3 last:mb-0"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-slate-800">
                {{ item.label }}
              </p>
              <p v-if="item.meta" class="truncate text-xs text-slate-500">
                {{ item.meta }}
              </p>
            </div>

            <button
              v-if="!disabled"
              type="button"
              class="shrink-0 text-sm text-red-500 hover:underline cursor-pointer"
              @click="emit('remove', item.id)"
            >
              {{ removeLabel }}
            </button>
          </div>

          <div class="mt-3 flex items-center gap-3">
            <label class="text-sm text-slate-600">{{ allocationLabel }}</label>
            <div class="flex items-center gap-2">
              <input
                :value="displayAllocation(item.id, item.allocation)"
                type="text"
                inputmode="decimal"
                class="input w-28 text-right"
                :disabled="disabled"
                @focus="onAllocationFocus(item.id, $event)"
                @blur="onAllocationBlur(item.id)"
                @input="onAllocationInput(item.id, $event)"
              >
              <span class="text-sm text-slate-500">%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
      {{ emptySelectionText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { SearchSelectOption } from '~/components/Common/SearchSelect.vue'
import { focusAndSelectInput, sanitizeCurrencyInput } from '~/composables/useCurrencyInput'
import { useI18n } from '~/composables/useI18n'

export interface AllocationListItem {
  id: string | number
  label: string
  allocation: string
  meta?: string | null
}

const props = defineProps({
  query: {
    type: String,
    required: true,
  },
  options: {
    type: Array as PropType<SearchSelectOption<unknown>[]>,
    required: true,
  },
  items: {
    type: Array as PropType<AllocationListItem[]>,
    required: true,
  },
  placeholder: {
    type: String,
    required: true,
  },
  emptyText: {
    type: String,
    required: true,
  },
  emptySelectionText: {
    type: String,
    required: true,
  },
  removeLabel: {
    type: String,
    required: true,
  },
  allocationLabel: {
    type: String,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const { locale } = useI18n()
const emit = defineEmits<{
  (e: 'update:query', value: string): void
  (e: 'select', value: unknown): void
  (e: 'clear-selection'): void
  (e: 'remove', value: string | number): void
  (e: 'update:allocation', id: string | number, value: string): void
}>()

const focusedItemId = ref<string | number | null>(null)
const draftAllocations = ref<Record<string, string>>({})

function draftKey(id: string | number) {
  return String(id)
}

function formatAllocation(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return ''

  return new Intl.NumberFormat(locale.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed)
}

function displayAllocation(id: string | number, value: string) {
  if (focusedItemId.value === id) {
    return draftAllocations.value[draftKey(id)] ?? sanitizeCurrencyInput(value)
  }
  return formatAllocation(value)
}

function onAllocationFocus(id: string | number, event: FocusEvent) {
  focusedItemId.value = id
  draftAllocations.value[draftKey(id)] = sanitizeCurrencyInput(
    props.items.find(entry => entry.id === id)?.allocation ?? '',
  )
  focusAndSelectInput(event)
}

function onAllocationInput(id: string | number, event: Event) {
  const value = sanitizeCurrencyInput((event.target as HTMLInputElement).value)
  draftAllocations.value[draftKey(id)] = value
  emit('update:allocation', id, value)
  ;(event.target as HTMLInputElement).value = value
}

function onAllocationBlur(id: string | number) {
  const key = draftKey(id)
  const draft = draftAllocations.value[key] ?? props.items.find(entry => entry.id === id)?.allocation ?? ''
  const parsed = parseFloat(draft)
  emit('update:allocation', id, Number.isNaN(parsed) ? '0.00' : Number(parsed.toFixed(2)).toFixed(2))
  delete draftAllocations.value[key]
  focusedItemId.value = null
}
</script>

<style scoped>
.selection-scroll {
  scrollbar-width: auto;
  scrollbar-color: #94a3b8 #e2e8f0;
}

.selection-scroll::-webkit-scrollbar {
  width: 12px;
}

.selection-scroll::-webkit-scrollbar-track {
  background: #e2e8f0;
  border-radius: 9999px;
}

.selection-scroll::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 9999px;
  border: 2px solid #e2e8f0;
}
</style>
