<template>
  <div class="inline-flex items-center gap-1 relative">
    <button
      type="button"
      class="inline-flex items-center gap-1 hover:text-blue-700 cursor-pointer"
      @click="$emit('toggle-sort')"
    >
      <span>{{ label }}</span>
      <Icon :name="sortIcon" class="w-4 h-4" />
    </button>

    <button
      v-if="filterable"
      ref="triggerRef"
      type="button"
      class="pt-1 pr-1 pl-1 rounded-lg border hover:bg-slate-50 cursor-pointer"
      :class="isFilterActive ? 'border-blue-500 text-blue-600' : 'border-slate-300 text-slate-500'"
      @click.stop="toggleMenu"
    >
      <Icon name="material-symbols:filter-list-rounded" class="w-4 h-4" />
    </button>

    <Teleport defer to="#page-root">
      <div
        v-if="filterable && menuOpen"
        ref="menuRef"
        class="fixed z-100 w-72 rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden"
        :style="{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }"
        @click.stop
      >
        <template v-if="filterType === 'text'">
          <div class="grid grid-cols-[1fr_auto] gap-0">
            <input
              v-model="textSearchInput"
              type="text"
              class="w-full border-0 border-b border-r border-slate-300 rounded-tl-lg px-2 py-2 text-xs"
              :placeholder="t('common.searchFilter')"
              @keydown.enter.prevent="applyTextSearch"
            >
            <button
              type="button"
              class="px-3 py-2 text-xs border-0 border-b border-slate-300 hover:bg-slate-50 cursor-pointer"
              @click="applyTextSearch"
            >
              <Icon name="material-symbols:search-rounded" class="w-4 h-4" />
            </button>
          </div>

          <div class="max-h-54 overflow-y-auto px-2 py-1 space-y-1">
            <label
              v-for="option in visibleTextOptions"
              :key="option"
              class="flex items-center gap-2 text-xs cursor-pointer"
            >
              <input
                type="checkbox"
                class="checkbox"
                :checked="selectedValues.has(option)"
                @change="toggleTextOption(option)"
              >
              <span class="truncate">{{ option }}</span>
            </label>
            <div v-if="filteredTextOptions.length === 0" class="text-xs text-slate-400">
              {{ t('common.noEntries') }}
            </div>
            <div v-else-if="filteredTextOptions.length > MAX_FILTER_OPTIONS" class="text-[11px] text-slate-500 pt-1">
              {{ t('common.firstOptionsShown', { count: MAX_FILTER_OPTIONS }) }}
            </div>
          </div>
        </template>

        <template v-else>
          <div class="px-2 pt-2 space-y-1">
            <label class="text-xs text-slate-600">{{ t('common.from') }}</label>
            <input
              v-model="rangeMin"
              :type="rangeInputType"
              :inputmode="filterType === 'number' ? 'decimal' : undefined"
              class="w-full border border-slate-300 rounded px-2 py-1 text-xs"
              @keydown.enter.prevent="onConfirm"
            >
          </div>
          <div class="px-2 py-2 space-y-1">
            <label class="text-xs text-slate-600">{{ t('common.to') }}</label>
            <input
              v-model="rangeMax"
              :type="rangeInputType"
              :inputmode="filterType === 'number' ? 'decimal' : undefined"
              class="w-full border border-slate-300 rounded px-2 py-1 text-xs"
              @keydown.enter.prevent="onConfirm"
            >
          </div>
        </template>

        <div class="grid grid-cols-2 gap-0 border-t border-slate-300">
          <button
            type="button"
            class="px-3 py-2 border-0 border-r border-slate-300 text-xs hover:bg-slate-50 cursor-pointer"
            @click="onReset"
          >
            {{ t('actions.reset') }}
          </button>
          <button
            type="button"
            class="px-3 py-2 text-xs btn-primary rounded-none"
            @click="onConfirm"
          >
            {{ t('actions.confirm') }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from '~/composables/useI18n'
import type { ColumnFilter, SortDirection, TableFilterType } from '~/composables/useAdvancedTable'

const props = withDefaults(defineProps<{
  label: string
  sortDirection: SortDirection
  filterType?: TableFilterType
  isFilterActive?: boolean
  filter?: ColumnFilter
  filterable?: boolean
  textOptions?: string[]
}>(), {
  filterType: 'text',
  isFilterActive: false,
  filter: () => ({ type: 'text', selected: [] }),
  filterable: true,
})

const emit = defineEmits<{
  (e: 'toggle-sort'): void
  (e: 'apply-text-filter', values: string[]): void
  (e: 'apply-range-filter', payload: { min: string, max: string }): void
  (e: 'reset-filter'): void
}>()

const menuOpen = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const menuPosition = ref({ top: 0, left: 0 })
const textSearchInput = ref('')
const textSearchApplied = ref('')
const selectedValues = ref<Set<string>>(new Set())
const rangeMin = ref('')
const rangeMax = ref('')
const MAX_FILTER_OPTIONS = 200
const { t } = useI18n()

const sortIcon = computed(() => {
  if (props.sortDirection === 'asc') return 'material-symbols:arrow-upward-rounded'
  if (props.sortDirection === 'desc') return 'material-symbols:arrow-downward-rounded'
  return 'material-symbols:unfold-more-rounded'
})
const rangeInputType = computed(() => props.filterType === 'date' ? 'date' : 'text')

const filteredTextOptions = computed(() => {
  const options = props.textOptions ?? []
  const term = textSearchApplied.value.trim().toLocaleLowerCase('de-DE')
  if (!term) return options
  return options.filter(option => option.toLocaleLowerCase('de-DE').includes(term))
})
const visibleTextOptions = computed(() => filteredTextOptions.value.slice(0, MAX_FILTER_OPTIONS))

function syncFromFilter() {
  if (props.filter.type === 'text') {
    selectedValues.value = new Set(props.filter.selected)
    rangeMin.value = ''
    rangeMax.value = ''
    return
  }

  rangeMin.value = props.filter.min
  rangeMax.value = props.filter.max
  selectedValues.value = new Set()
}

async function setMenuPosition() {
  const trigger = triggerRef.value
  const menu = menuRef.value
  if (!trigger || !menu) return

  const triggerRect = trigger.getBoundingClientRect()
  const menuRect = menu.getBoundingClientRect()
  const viewportPadding = 8
  const spacing = 6

  let left = triggerRect.left
  if (left + menuRect.width > window.innerWidth - viewportPadding) {
    left = window.innerWidth - menuRect.width - viewportPadding
  }
  if (left < viewportPadding) left = viewportPadding

  let top = triggerRect.bottom + spacing
  if (top + menuRect.height > window.innerHeight - viewportPadding) {
    top = triggerRect.top - menuRect.height - spacing
  }
  if (top < viewportPadding) top = viewportPadding

  menuPosition.value = { top, left }
}

function onDocumentClick(event: MouseEvent) {
  if (!menuOpen.value) return

  const target = event.target as Node | null
  if (!target) return

  const isInsideMenu = menuRef.value?.contains(target) ?? false
  const isInsideTrigger = triggerRef.value?.contains(target) ?? false
  if (!isInsideMenu && !isInsideTrigger) {
    menuOpen.value = false
  }
}

function onWindowChange() {
  if (!menuOpen.value) return
  setMenuPosition()
}

async function toggleMenu() {
  if (!props.filterable) return
  menuOpen.value = !menuOpen.value
  if (!menuOpen.value) return
  syncFromFilter()
  await nextTick()
  setMenuPosition()
}

function applyTextSearch() {
  textSearchApplied.value = textSearchInput.value
}

function toggleTextOption(option: string) {
  const next = new Set(selectedValues.value)
  if (next.has(option)) next.delete(option)
  else next.add(option)
  selectedValues.value = next
}

function onReset() {
  textSearchInput.value = ''
  textSearchApplied.value = ''
  selectedValues.value = new Set()
  rangeMin.value = ''
  rangeMax.value = ''
  emit('reset-filter')
  menuOpen.value = false
}

function onConfirm() {
  if (props.filterType === 'text') {
    emit('apply-text-filter', Array.from(selectedValues.value))
  } else {
    emit('apply-range-filter', {
      min: rangeMin.value,
      max: rangeMax.value,
    })
  }
  menuOpen.value = false
}

watch(
  () => props.filter,
  () => {
    if (menuOpen.value) syncFromFilter()
  },
  { deep: true },
)

watch(menuOpen, (isOpen) => {
  if (isOpen) {
    document.addEventListener('click', onDocumentClick, true)
    window.addEventListener('resize', onWindowChange)
    window.addEventListener('scroll', onWindowChange, true)
  } else {
    document.removeEventListener('click', onDocumentClick, true)
    window.removeEventListener('resize', onWindowChange)
    window.removeEventListener('scroll', onWindowChange, true)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick, true)
  window.removeEventListener('resize', onWindowChange)
  window.removeEventListener('scroll', onWindowChange, true)
})
</script>
