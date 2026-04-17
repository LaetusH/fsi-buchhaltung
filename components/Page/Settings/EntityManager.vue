<template>
  <div v-if="canManage" class="bg-white rounded-xl shadow-lg p-6 space-y-6 col-span-12">
    <div class="flex justify-between items-center">
      <h2 class="text-lg font-semibold">{{ title }}</h2>

      <button class="btn-primary" @click="addItem">
        + {{ addLabel }}
      </button>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="text-left border-b">
            <th class="py-2">{{ t('common.code') }}</th>
            <th class="py-2">{{ t('common.name') }}</th>
            <th
              v-for="column in extraColumns"
              :key="column.key"
              :class="['py-2', column.headerClass]"
            >
              {{ column.label }}
            </th>
            <th class="py-2 text-right">{{ t('common.actions') }}</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="item in displayItems"
            :key="item.id"
            class="border-b last:border-b-0"
          >
            <td class="py-2 align-top">
              <slot
                name="code-cell"
                :item="item"
                :items="items"
                :display-items="displayItems"
              >
                {{ item.code }}
              </slot>
            </td>

            <td class="py-2 align-top">
              <slot
                name="name-cell"
                :item="item"
                :items="items"
                :display-items="displayItems"
              >
                {{ item.name }}
              </slot>
            </td>

            <slot
              name="row-extra"
              :item="item"
              :items="items"
              :display-items="displayItems"
            />

            <td class="py-2 text-right space-x-2 align-top">
              <slot
                name="actions"
                :item="item"
                :items="items"
                :display-items="displayItems"
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
          <tr v-if="displayItems.length === 0">
            <td :colspan="extraColumns.length + 3" class="py-6 text-center text-slate-500">
              {{ emptyLabel }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div
    v-if="showModal && editingItem"
    class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
  >
    <div :class="['bg-white rounded-xl w-full p-6 space-y-4 max-h-[calc(100vh-2rem)] overflow-hidden', modalWidthClass]">
      <h3 class="text-lg font-semibold">
        {{ isNewItem ? t('settings.entities.newItem', { label: singularLabel }) : t('settings.entities.editItem', { label: singularLabel }) }}
      </h3>

      <div class="space-y-3">
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
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <button class="btn-secondary" @click="closeModal">
          {{ t('actions.cancel') }}
        </button>

        <button class="btn-primary" @click="saveItem">
          {{ t('actions.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'

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
const showModal = ref(false)
const editingItem = ref<SaveSettingsEntityBody | null>(null)
const isNewItem = ref(false)

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
  if (!editingItem.value) return

  try {
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
