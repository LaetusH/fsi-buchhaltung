<template>
  <div class="flex min-h-0 flex-col space-y-3">
    <CommonSearchSelect
      :model-value="query"
      :options="options"
      :placeholder="placeholder"
      :empty-text="emptyText"
      :disabled="disabled"
      @update:model-value="emit('update:query', $event)"
      @select="emit('select', $event)"
      @clear-selection="emit('clear-selection')"
    />

    <div v-if="selectedItems.length > 0" class="min-h-0 rounded-lg border border-slate-200 bg-slate-50">
      <div class="selection-scroll max-h-[min(38vh,20rem)] overflow-y-auto p-2">
        <div
          v-for="item in selectedItems"
          :key="item.id"
          class="mb-2 flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 last:mb-0"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-slate-800">
              {{ item.label }}
            </p>
            <p v-if="item.meta" class="truncate text-xs text-slate-500">
              {{ item.meta }}
            </p>
          </div>

          <button
            type="button"
            class="shrink-0 text-sm text-red-500 hover:underline cursor-pointer"
            :disabled="disabled"
            @click="emit('remove', item.id)"
          >
            {{ removeLabel }}
          </button>
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

export interface SelectionListItem {
  id: string | number
  label: string
  meta?: string | null
}

defineProps({
  query: {
    type: String,
    required: true,
  },
  options: {
    type: Array as PropType<SearchSelectOption<unknown>[]>,
    required: true,
  },
  selectedItems: {
    type: Array as PropType<SelectionListItem[]>,
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
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  (e: 'update:query', value: string): void
  (e: 'select', value: unknown): void
  (e: 'clear-selection'): void
  (e: 'remove', value: string | number): void
}>()
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
