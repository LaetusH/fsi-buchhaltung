<template>
  <CommonPageTableCard
    v-if="canManage"
    :title="title"
    :search-value="globalSearchInput"
    :can-create="true"
    :create-label="`+ ${addLabel}`"
    @update:search-value="globalSearchInput = $event"
    @create="addItem"
  >
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="text-left border-b">
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('common.code')"
                :sort-direction="columnSortDirection('code')"
                :filterable="false"
                @toggle-sort="toggleSort('code')"
              />
            </th>
            <th class="py-2">
              <CommonTableColumnControl
                :label="t('common.name')"
                :sort-direction="columnSortDirection('name')"
                :filterable="false"
                @toggle-sort="toggleSort('name')"
              />
            </th>
            <th
              v-for="column in extraColumns"
              :key="column.key"
              :class="['py-2', column.headerClass]"
            >
              <CommonTableColumnControl
                v-if="column.filterable === false"
                :label="column.label"
                :sort-direction="columnSortDirection(column.key)"
                :filterable="false"
                @toggle-sort="toggleSort(column.key)"
              />
              <CommonTableColumnControl
                v-else
                :label="column.label"
                :filter-type="column.filterType || 'text'"
                :sort-direction="columnSortDirection(column.key)"
                :is-filter-active="isFilterActive(column.key)"
                :filter="getFilter(column.key)"
                :text-options="column.filterType === 'number' || column.filterType === 'date' ? undefined : textOptionsByColumn[column.key]"
                @toggle-sort="toggleSort(column.key)"
                @apply-text-filter="setTextFilter(column.key, $event)"
                @apply-range-filter="setRangeFilter(column.key, $event.min, $event.max)"
                @reset-filter="resetFilter(column.key)"
              />
            </th>
            <th class="py-2 text-right">{{ t('common.actions') }}</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="item in processedRows"
            :key="item.id"
            class="border-b last:border-b-0"
          >
            <td class="py-2 align-top">
              <slot
                name="code-cell"
                :item="item"
                :items="items"
                :display-items="processedRows"
              >
                {{ item.code }}
              </slot>
            </td>

            <td class="py-2 align-top">
              <slot
                name="name-cell"
                :item="item"
                :items="items"
                :display-items="processedRows"
              >
                {{ item.name }}
              </slot>
            </td>

            <slot
              name="row-extra"
              :item="item"
              :items="items"
              :display-items="processedRows"
            />

            <td class="py-2 text-right space-x-2 align-top">
              <slot
                name="actions"
                :item="item"
                :items="items"
                :display-items="processedRows"
                :edit="() => editItem(item)"
                :toggle="() => toggleActive(item)"
                :reload="loadItems"
              >
                <button class="text-blue-600 hover:underline cursor-pointer" @click="editItem(item)">
                  {{ t('actions.edit') }}
                </button>

                <button
                  class="hover:underline cursor-pointer"
                  :class="item.is_active ? 'text-red-500' : 'text-gray-500'"
                  @click="toggleActive(item)"
                >
                  {{ item.is_active ? t('actions.deactivate') : t('actions.activate') }}
                </button>
              </slot>
            </td>
          </tr>
          <tr v-if="processedRows.length === 0">
            <td :colspan="extraColumns.length + 3" class="py-6 text-center text-slate-500">
              {{ emptyLabel }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </CommonPageTableCard>

  <CommonModal
    v-if="editingItem"
    v-model="showModal"
    :title="isNewItem ? t('settings.entities.newItem', { label: singularLabel }) : t('settings.entities.editItem', { label: singularLabel })"
    :width-class="modalWidthClass"
    @close="closeModal"
  >
    <div class="field">
      <label>{{ t('common.code') }}</label>
      <input v-model="editingItem.code" class="input" />
    </div>

    <div class="field">
      <label>{{ t('common.name') }}</label>
      <input v-model="editingItem.name" class="input" />
    </div>

    <slot
      name="modal-fields-before-description"
      :editing-item="editingItem"
      :is-new-item="isNewItem"
      :items="items"
      :display-items="displayItems"
    />

    <div v-if="showDescriptionField" class="field">
      <label>{{ t('common.description') }}</label>
      <textarea
        v-model="editingItem.description"
        rows="3"
        class="input resize-none"
      />
    </div>

    <slot
      name="modal-fields-after-description"
      :editing-item="editingItem"
      :is-new-item="isNewItem"
      :items="items"
      :display-items="displayItems"
    />

    <template #footer>
      <button class="btn-secondary" @click="closeModal">
        {{ t('actions.cancel') }}
      </button>

      <button class="btn-primary" :disabled="isSaving" :class="{ 'opacity-50 cursor-not-allowed': isSaving }" @click="saveItem">
        {{ t('actions.save') }}
      </button>
    </template>
  </CommonModal>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { useAdvancedTable, type TableFilterType } from '~/composables/useAdvancedTable'

export interface SettingsEntityRow {
  id: number
  code: string
  name: string
  is_active: boolean
  description?: string | null
}

export interface SaveSettingsEntityBody {
  id?: number
  code: string
  name: string
  is_active?: boolean
  description?: string | null
}

export interface EntityManagerColumn {
  key: string
  label: string
  headerClass?: string
  filterType?: TableFilterType
  sortable?: boolean
  filterable?: boolean
  globalSearchable?: boolean
  getValue?: (item: SettingsEntityRow, items: SettingsEntityRow[]) => unknown
}

interface EntityManagerErrorContext {
  phase: 'load' | 'save' | 'toggle'
  message?: string
  error?: unknown
}

const props = withDefaults(defineProps<{
  title: string
  singularLabel: string
  addLabel: string
  emptyLabel: string
  listEndpoint: string
  saveEndpoint: string
  activateEndpoint: string
  responseListKey: string
  extraColumns?: EntityManagerColumn[]
  canManage?: boolean
  showDescriptionField?: boolean
  createItem?: () => SaveSettingsEntityBody
  mapEditItem?: (item: SettingsEntityRow) => SaveSettingsEntityBody
  transformItems?: (items: SettingsEntityRow[]) => SettingsEntityRow[]
  onError?: (context: EntityManagerErrorContext) => void
  modalWidthClass?: string
}>(), {
  extraColumns: () => [],
  canManage: true,
  showDescriptionField: true,
  createItem: () => ({
    code: '',
    name: '',
    description: '',
  }),
  mapEditItem: (item: SettingsEntityRow) => ({ ...item }),
  transformItems: (items: SettingsEntityRow[]) => items,
  onError: undefined,
  modalWidthClass: 'max-w-lg',
})

defineSlots<{
  'code-cell'?: (props: {
    item: SettingsEntityRow
    items: SettingsEntityRow[]
    displayItems: SettingsEntityRow[]
  }) => any
  'name-cell'?: (props: {
    item: SettingsEntityRow
    items: SettingsEntityRow[]
    displayItems: SettingsEntityRow[]
  }) => any
  'row-extra'?: (props: {
    item: SettingsEntityRow
    items: SettingsEntityRow[]
    displayItems: SettingsEntityRow[]
  }) => any
  'actions'?: (props: {
    item: SettingsEntityRow
    items: SettingsEntityRow[]
    displayItems: SettingsEntityRow[]
    edit: () => void
    toggle: () => Promise<void>
    reload: () => Promise<void>
  }) => any
  'modal-fields-before-description'?: (props: {
    editingItem: SaveSettingsEntityBody
    isNewItem: boolean
    items: SettingsEntityRow[]
    displayItems: SettingsEntityRow[]
  }) => any
  'modal-fields-after-description'?: (props: {
    editingItem: SaveSettingsEntityBody
    isNewItem: boolean
    items: SettingsEntityRow[]
    displayItems: SettingsEntityRow[]
  }) => any
}>()

const { t } = useI18n()
const items = ref<SettingsEntityRow[]>([])
const displayItems = computed(() => props.transformItems(items.value))

function getFallbackColumnValue(item: SettingsEntityRow, key: string) {
  return (item as unknown as Record<string, unknown>)[key] ?? '-'
}

const tableColumns = computed(() => [
  {
    key: 'code',
    filterable: false,
    globalSearchable: true,
    getValue: (item: SettingsEntityRow) => item.code,
  },
  {
    key: 'name',
    filterable: false,
    globalSearchable: true,
    getValue: (item: SettingsEntityRow) => item.name,
  },
  ...props.extraColumns.map(column => ({
    key: column.key,
    filterType: column.filterType || ('text' as const),
    sortable: column.sortable,
    filterable: column.filterable,
    globalSearchable: column.globalSearchable ?? true,
    getValue: (item: SettingsEntityRow) => column.getValue?.(item, items.value) ?? getFallbackColumnValue(item, column.key),
  })),
])
const {
  sortKey,
  sortDirection,
  textOptionsByColumn,
  globalSearchInput,
  processedRows,
  getFilter,
  isFilterActive,
  toggleSort,
  setTextFilter,
  setRangeFilter,
  resetFilter,
} = useAdvancedTable<SettingsEntityRow, string>(displayItems, tableColumns.value)
const showModal = ref(false)
const editingItem = ref<SaveSettingsEntityBody | null>(null)
const isNewItem = ref(false)
const isSaving = ref(false)

function columnSortDirection(key: string) {
  return sortKey.value === key ? sortDirection.value : null
}

function reportError(phase: EntityManagerErrorContext['phase'], message?: string, error?: unknown) {
  if (props.onError) {
    props.onError({ phase, message, error })
    return
  }

  if (error) {
    console.error(error)
    return
  }

  if (message) {
    console.error(message)
  }
}

async function loadItems() {
  try {
    const res = await $fetch<Record<string, any>>(props.listEndpoint)
    if (res.ok) {
      items.value = (res[props.responseListKey] ?? []) as SettingsEntityRow[]
      return
    }

    reportError('load', res.error)
  } catch (error) {
    reportError('load', undefined, error)
  }
}

function addItem() {
  editingItem.value = props.createItem()
  isNewItem.value = true
  showModal.value = true
}

function editItem(item: SettingsEntityRow) {
  editingItem.value = props.mapEditItem(item)
  isNewItem.value = false
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingItem.value = null
}

async function saveItem() {
  if (!editingItem.value || isSaving.value) return

  try {
    isSaving.value = true
    const res = await $fetch<{ ok: boolean, error?: string }>(props.saveEndpoint, {
      method: 'POST',
      body: editingItem.value,
    })
    if (!res.ok) {
      reportError('save', res.error)
      return
    }

    closeModal()
    await loadItems()
  } catch (error) {
    reportError('save', undefined, error)
  } finally {
    isSaving.value = false
  }
}

async function toggleActive(item: SettingsEntityRow) {
  try {
    const res = await $fetch<{ ok: boolean, error?: string }>(props.activateEndpoint, {
      method: 'POST',
      body: { id: item.id, is_active: !item.is_active },
    })
    if (!res.ok) {
      reportError('toggle', res.error)
      return
    }

    await loadItems()
  } catch (error) {
    reportError('toggle', undefined, error)
  }
}

watch(() => props.canManage, async (canManage) => {
  if (!canManage) {
    items.value = []
    closeModal()
    return
  }

  await loadItems()
}, { immediate: true })

defineExpose({
  loadItems,
})
</script>
