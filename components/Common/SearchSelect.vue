<template>
  <div ref="rootRef" class="relative w-full">
    <div class="flex items-center gap-2">
      <input
        :value="currentQuery"
        :placeholder="placeholder"
        :disabled="disabled"
        class="input w-full"
        :class="disabled ? 'opacity-70' : ''"
        @focus="open = true"
        @input="onInput"
        @keydown="onKeydown"
      >

      <slot name="after-trigger" />
    </div>

    <transition name="fade">
      <div
        v-if="open"
        class="absolute z-30 mt-1 rounded-md border bg-white shadow-lg min-w-full w-max max-h-50 overflow-y-auto"
        :class="menuWidthClass"
      >
        <button
          v-if="showCreateOption"
          type="button"
          class="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-gray-100 rounded-md cursor-pointer whitespace-nowrap"
          @click="onCreate"
        >
          <span>"{{ currentQuery }}"</span>
          <span class="text-orange-500 font-semibold">{{ createActionLabel }}</span>
        </button>

        <div v-if="showCreateOption" class="border-t" />

        <button
          v-for="option in filteredOptions"
          :key="option.key"
          type="button"
          class="flex w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md cursor-pointer whitespace-nowrap"
          :class="optionClass"
          @click="selectOption(option)"
        >
          <span class="overflow-hidden text-ellipsis">{{ option.label }}</span>
        </button>

        <div v-if="filteredOptions.length === 0" class="px-3 py-2 text-sm text-gray-500">
          {{ emptyText }}
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'

export interface SearchSelectOption<T = unknown> {
  key: string | number
  label: string
  value: T
  searchText?: string
}

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  options: {
    type: Array as PropType<SearchSelectOption[]>,
    required: true,
  },
  placeholder: {
    type: String,
    default: '',
  },
  emptyText: {
    type: String,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  menuWidth: {
    type: String as PropType<'default' | 'wide'>,
    default: 'default',
  },
  selectedLabel: {
    type: String,
    default: '',
  },
  allowCreate: {
    type: Boolean,
    default: false,
  },
  createActionLabel: {
    type: String,
    default: '',
  },
  optionClass: {
    type: String,
    default: '',
  },
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', value: unknown): void
  (e: 'create'): void
  (e: 'clear-selection'): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const open = ref(false)

const currentQuery = computed(() => props.modelValue || '')
const normalizedQuery = computed(() => currentQuery.value.trim().toLowerCase())
const filteredOptions = computed(() => {
  if (!normalizedQuery.value) return props.options

  return props.options.filter((option) => {
    const searchable = `${option.label} ${option.searchText || ''}`.toLowerCase()
    return searchable.includes(normalizedQuery.value)
  })
})
const showCreateOption = computed(() => props.allowCreate && currentQuery.value.trim().length > 0)
const menuWidthClass = computed(() => props.menuWidth === 'wide' ? 'w-full max-w-[48rem]' : 'max-w-[30vw]')

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
  if (props.selectedLabel && value !== props.selectedLabel) emit('clear-selection')
  open.value = true
}

function selectOption(option: SearchSelectOption) {
  emit('update:modelValue', option.label)
  emit('select', option.value)
  open.value = false
}

function onCreate() {
  emit('create')
  open.value = false
}

function tryAutoSelect() {
  if (filteredOptions.value.length === 1) {
    const option = filteredOptions.value[0]
    if (option) selectOption(option)
    return
  }

  if (!normalizedQuery.value) return

  const exactMatch = props.options.find((option) => {
    const searchable = [option.label, option.searchText || '']
      .join(' ')
      .trim()
      .toLowerCase()

    return searchable === normalizedQuery.value || option.label.trim().toLowerCase() === normalizedQuery.value
  })

  if (exactMatch) selectOption(exactMatch)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    open.value = false
    return
  }

  if (event.key === 'Enter' || event.key === 'Tab') {
    tryAutoSelect()
    open.value = false
  }
}

function onDocumentClick(event: MouseEvent) {
  const target = event.target as Node | null
  if (!target || !rootRef.value) return
  if (rootRef.value.contains(target)) return
  open.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentClick)
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.1s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

