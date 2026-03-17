<template>
  <div class="bg-white rounded-b-xl rounded-tl-xl shadow-lg p-6 space-y-6 col-span-12">
    <div class="flex justify-between items-center">
      <h2 class="text-lg font-semibold">{{ t('settings.entities.costCentres') }}</h2>

      <button class="btn-primary" @click="addItem">
        + {{ t('settings.entities.newCostCentre') }}
      </button>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="text-left border-b">
            <th class="py-2">{{ t('common.code') }}</th>
            <th class="py-2">{{ t('common.name') }}</th>
            <th class="py-2">{{ t('common.parent') }}</th>
            <th class="py-2 text-right">{{ t('common.actions') }}</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="item in displayItems"
            :key="item.id"
            class="border-b last:border-b-0"
          >
            <td class="py-2 align-top">{{ item.code }}</td>

            <td class="py-2 align-top">
              <div
                class="flex items-center gap-2"
                :style="{ paddingLeft: `${item.depth * 1.25}rem` }"
              >
                <span v-if="item.depth > 0" class="text-slate-400">|-</span>
                <span>{{ item.name }}</span>
              </div>
            </td>

            <td class="py-2 align-top text-slate-600">
              {{ parentLabel(item.parent_id) }}
            </td>

            <td class="py-2 text-right space-x-2 align-top">
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
            </td>
          </tr>

          <tr v-if="displayItems.length === 0">
            <td colspan="4" class="py-6 text-center text-slate-500">
              {{ t('settings.entities.noCostCentres') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div
    v-if="showModal"
    class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
  >
    <div class="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
      <h3 class="text-lg font-semibold">
        {{ isNewItem ? t('settings.entities.newItem', { label: t('settings.entities.costCentre') }) : t('settings.entities.editItem', { label: t('settings.entities.costCentre') }) }}
      </h3>

      <div class="space-y-3">
        <div class="field">
          <label>{{ t('common.code') }}</label>
          <input v-model="editingItem!.code" class="input" />
        </div>

        <div class="field">
          <label>{{ t('common.name') }}</label>
          <input v-model="editingItem!.name" class="input" />
        </div>

        <div class="field">
          <label>{{ t('settings.entities.parentCostCentre') }}</label>
          <CommonSearchSelect
            v-model="parentQuery"
            :options="parentSearchOptions"
            :selected-label="selectedParentLabel"
            :placeholder="t('settings.entities.noParentCostCentre')"
            :empty-text="t('settings.entities.noCostCentres')"
            @select="selectParent"
            @clear-selection="clearParent"
          />
        </div>

        <div class="field">
          <label>{{ t('common.description') }}</label>
          <textarea
            v-model="editingItem!.description"
            rows="3"
            class="input resize-none"
          />
        </div>
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
import type { SearchSelectOption } from '~/components/Common/SearchSelect.vue'
import { useI18n } from '~/composables/useI18n'
import { useToast } from '~/composables/useToast'
import type { CostCentreRow, SaveCostCentreBody } from '~/types/costCentre'

interface CostCentreDisplayRow extends CostCentreRow {
  depth: number
}

interface ParentOption {
  id: number
  label: string
}

const { t } = useI18n()
const toast = useToast()

const items = ref<CostCentreRow[]>([])
const showModal = ref(false)
const editingItem = ref<SaveCostCentreBody | null>(null)
const isNewItem = ref(false)
const parentQuery = ref('')

const itemsById = computed(() => {
  return new Map(items.value.map(item => [item.id, item]))
})

const displayItems = computed<CostCentreDisplayRow[]>(() => flattenCostCentres(items.value))

const parentOptions = computed<ParentOption[]>(() => {
  const excludedIds = editingItem.value?.id ? collectDescendantIds(editingItem.value.id, items.value) : new Set<number>()
  if (editingItem.value?.id) excludedIds.add(editingItem.value.id)

  return displayItems.value
    .filter(item => !excludedIds.has(item.id))
    .map(item => ({
      id: item.id,
      label: `${'-- '.repeat(item.depth)}${item.code} - ${item.name}`,
    }))
})
const parentSearchOptions = computed<SearchSelectOption<number>[]>(() => parentOptions.value.map(option => ({
  key: option.id,
  label: option.label,
  value: option.id,
  searchText: option.label,
})))
const selectedParentLabel = computed(() => {
  if (!editingItem.value?.parent_id) return ''
  const selected = parentOptions.value.find(option => option.id === editingItem.value?.parent_id)
  return selected?.label || ''
})

function sortCostCentres(left: CostCentreRow, right: CostCentreRow) {
  return left.code.localeCompare(right.code, undefined, { numeric: true, sensitivity: 'base' })
    || left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
}

function flattenCostCentres(source: CostCentreRow[]): CostCentreDisplayRow[] {
  const itemMap = new Map(source.map(item => [item.id, item]))
  const buckets = new Map<number | null, CostCentreRow[]>()
  const sorted = [...source].sort(sortCostCentres)

  for (const item of sorted) {
    const parentId = item.parent_id !== null && item.parent_id !== item.id && itemMap.has(item.parent_id)
      ? item.parent_id
      : null
    const bucket = buckets.get(parentId) ?? []
    bucket.push(item)
    buckets.set(parentId, bucket)
  }

  const ordered: CostCentreDisplayRow[] = []
  const visited = new Set<number>()

  const visit = (parentId: number | null, depth: number) => {
    const children = buckets.get(parentId) ?? []

    for (const child of children) {
      if (visited.has(child.id)) continue

      visited.add(child.id)
      ordered.push({ ...child, depth })
      visit(child.id, depth + 1)
    }
  }

  visit(null, 0)

  for (const item of sorted) {
    if (visited.has(item.id)) continue
    ordered.push({ ...item, depth: 0 })
    visit(item.id, 1)
  }

  return ordered
}

function collectDescendantIds(rootId: number, source: CostCentreRow[]) {
  const byParent = new Map<number, number[]>()

  for (const item of source) {
    if (item.parent_id === null) continue
    const bucket = byParent.get(item.parent_id) ?? []
    bucket.push(item.id)
    byParent.set(item.parent_id, bucket)
  }

  const descendants = new Set<number>()
  const stack = [...(byParent.get(rootId) ?? [])]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current || descendants.has(current)) continue

    descendants.add(current)
    stack.push(...(byParent.get(current) ?? []))
  }

  return descendants
}

function parentLabel(parentId: number | null) {
  if (parentId === null) return t('settings.entities.noParentCostCentre')
  const parent = itemsById.value.get(parentId)
  return parent ? `${parent.code} - ${parent.name}` : t('settings.entities.noParentCostCentre')
}

async function loadItems() {
  try {
    const res = await $fetch<{ ok: boolean, costCentres?: CostCentreRow[], error?: string }>('/api/cost_centres')
    if (!res.ok) {
      toast.error(res.error || 'Failed to load cost centres')
      return
    }

    items.value = res.costCentres ?? []
  } catch (error) {
    console.error(error)
    toast.error('Failed to load cost centres')
  }
}

function addItem() {
  editingItem.value = {
    code: '',
    name: '',
    description: '',
    parent_id: null,
  }
  parentQuery.value = ''
  isNewItem.value = true
  showModal.value = true
}

function editItem(item: CostCentreRow) {
  editingItem.value = {
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description,
    is_active: item.is_active,
    parent_id: item.parent_id,
  }
  parentQuery.value = parentLabel(item.parent_id)
  if (item.parent_id === null) parentQuery.value = ''
  isNewItem.value = false
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingItem.value = null
  parentQuery.value = ''
}

function selectParent(value: unknown) {
  if (!editingItem.value) return

  const parentId = value as number
  const selected = parentOptions.value.find(option => option.id === parentId)

  editingItem.value.parent_id = parentId
  parentQuery.value = selected?.label || ''
}

function clearParent() {
  if (!editingItem.value) return
  editingItem.value.parent_id = null
  parentQuery.value = ''
}

async function saveItem() {
  if (!editingItem.value) return

  try {
    const res = await $fetch<{ ok: boolean, error?: string }>('/api/cost_centres/save', {
      method: 'POST',
      body: editingItem.value,
    })

    if (!res.ok) {
      toast.error(res.error || 'Failed to save cost centre')
      return
    }

    closeModal()
    await loadItems()
  } catch (error) {
    console.error(error)
    toast.error('Failed to save cost centre')
  }
}

async function toggleActive(item: CostCentreRow) {
  try {
    const res = await $fetch<{ ok: boolean, error?: string }>('/api/cost_centres/activate', {
      method: 'POST',
      body: { id: item.id, is_active: !item.is_active },
    })

    if (!res.ok) {
      toast.error(res.error || 'Failed to update cost centre')
      return
    }

    await loadItems()
  } catch (error) {
    console.error(error)
    toast.error('Failed to update cost centre')
  }
}

onMounted(loadItems)
</script>
