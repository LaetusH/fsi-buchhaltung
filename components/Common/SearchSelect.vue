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

    <Teleport to="body">
      <transition name="fade">
        <div
          v-if="open"
          ref="menuRef"
          class="search-select-menu fixed z-70 rounded-md border bg-white shadow-lg w-max overflow-y-auto"
          :class="menuWidthClass"
          :style="menuStyle"
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
    </Teleport>
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
const menuRef = ref<HTMLElement | null>(null)
const open = ref(false)
const menuStyle = ref<Record<string, string>>({
  top: '0px',
  left: '0px',
  minWidth: '0px',
  maxHeight: '12.5rem',
})

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

function updateMenuPosition() {
  if (!open.value || !rootRef.value) return

  const viewportPadding = 16
  const preferredMaxHeight = 200
  const rootRect = rootRef.value.getBoundingClientRect()
  const menuRect = menuRef.value?.getBoundingClientRect()
  const topBoundary = viewportPadding
  const bottomBoundary = window.innerHeight - viewportPadding
  const spaceBelow = bottomBoundary - rootRect.bottom
  const spaceAbove = rootRect.top - topBoundary
  const shouldOpenUp = spaceBelow < 200 && spaceAbove > spaceBelow
  const availableSpace = Math.max(shouldOpenUp ? spaceAbove : spaceBelow, 0)
  const measuredWidth = menuRect?.width ?? rootRect.width
  const maxLeft = window.innerWidth - viewportPadding - measuredWidth
  const left = Math.min(Math.max(rootRect.left, viewportPadding), Math.max(viewportPadding, maxLeft))
  const top = shouldOpenUp
    ? Math.max(topBoundary, rootRect.top - Math.min(preferredMaxHeight, availableSpace) - 4)
    : Math.min(bottomBoundary, rootRect.bottom + 4)

  menuStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    minWidth: `${rootRect.width}px`,
    maxHeight: `${Math.min(preferredMaxHeight, availableSpace)}px`,
    maxWidth: props.menuWidth === 'wide' ? '48rem' : '30vw',
  }
}

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
  if (menuRef.value?.contains(target)) return
  open.value = false
}

watch(open, async (isOpen) => {
  if (!isOpen) return
  await nextTick()
  updateMenuPosition()
})

watch(() => filteredOptions.value.length, async () => {
  if (!open.value) return
  await nextTick()
  updateMenuPosition()
})

onMounted(() => {
  document.addEventListener('mousedown', onDocumentClick)
  window.addEventListener('resize', updateMenuPosition)
  document.addEventListener('scroll', updateMenuPosition, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentClick)
  window.removeEventListener('resize', updateMenuPosition)
  document.removeEventListener('scroll', updateMenuPosition, true)
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

.search-select-menu {
  scrollbar-width: none;
}

.search-select-menu::-webkit-scrollbar {
  display: none;
}
</style>
