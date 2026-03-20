<template>
  <PageSettingsEntityManager
    :title="t('settings.entities.costCentres')"
    :singular-label="t('settings.entities.costCentre')"
    :add-label="t('settings.entities.newCostCentre')"
    :empty-label="t('settings.entities.noCostCentres')"
    list-endpoint="/api/cost_centres"
    save-endpoint="/api/cost_centres/save"
    activate-endpoint="/api/cost_centres/activate"
    response-list-key="costCentres"
    :extra-columns="tableColumns"
    :create-item="createItem"
    :map-edit-item="mapEditItem"
    :transform-items="flattenCostCentres"
    :on-error="handleError"
  >
    <template #name-cell="{ item }">
      <div
        class="flex items-center gap-2"
        :style="{ paddingLeft: `${itemDepth(item) * 1.25}rem` }"
      >
        <span v-if="itemDepth(item) > 0" class="text-slate-400">|-</span>
        <span>{{ item.name }}</span>
      </div>
    </template>

    <template #row-extra="{ item, items }">
      <td class="py-2 align-top text-slate-600">
        {{ parentLabel(itemParentId(item), items) }}
      </td>
    </template>

    <template #modal-fields-before-description="{ editingItem, items }">
      <div class="field">
        <label>{{ t('settings.entities.parentCostCentre') }}</label>
        <CommonSearchSelect
          v-model="parentQuery"
          :options="parentSearchOptions(editingItem, items)"
          :selected-label="selectedParentLabel(editingItem, items)"
          :placeholder="t('settings.entities.noParentCostCentre')"
          :empty-text="t('settings.entities.noCostCentres')"
          @select="selectParent($event, editingItem, items)"
          @clear-selection="clearParent(editingItem)"
        />
      </div>
    </template>
  </PageSettingsEntityManager>
</template>

<script setup lang="ts">
import type {
  EntityManagerColumn,
  SaveSettingsEntityBody,
  SettingsEntityRow,
} from '~/components/Page/Settings/EntityManager.vue'
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

const parentQuery = ref('')

const tableColumns = computed<EntityManagerColumn[]>(() => [
  {
    key: 'parent',
    label: t('common.parent'),
  },
])

function sortCostCentres(left: CostCentreRow, right: CostCentreRow) {
  return left.code.localeCompare(right.code, undefined, { numeric: true, sensitivity: 'base' })
    || left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
}

function itemDepth(item: SettingsEntityRow) {
  return (item as CostCentreDisplayRow).depth
}

function itemParentId(item: SettingsEntityRow) {
  return (item as CostCentreRow).parent_id
}

function costCentreBody(editingItem: SaveSettingsEntityBody) {
  return editingItem as SaveCostCentreBody
}

function flattenCostCentres(source: SettingsEntityRow[]) {
  const costCentres = source as CostCentreRow[]
  const itemMap = new Map(costCentres.map(item => [item.id, item]))
  const buckets = new Map<number | null, CostCentreRow[]>()
  const sorted = [...costCentres].sort(sortCostCentres)

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

function parentOptions(editingItem: SaveSettingsEntityBody, items: SettingsEntityRow[]) {
  const costCentres = items as CostCentreRow[]
  const currentId = typeof costCentreBody(editingItem).id === 'number' ? costCentreBody(editingItem).id : null
  const excludedIds = currentId ? collectDescendantIds(currentId, costCentres) : new Set<number>()
  if (currentId) excludedIds.add(currentId)

  return flattenCostCentres(costCentres)
    .filter(item => !excludedIds.has(item.id))
    .map(item => ({
      id: item.id,
      label: `${'-- '.repeat(item.depth)}${item.code} - ${item.name}`,
    }))
}

function parentSearchOptions(editingItem: SaveSettingsEntityBody, items: SettingsEntityRow[]) {
  return parentOptions(editingItem, items).map<SearchSelectOption<number>>(option => ({
    key: option.id,
    label: option.label,
    value: option.id,
    searchText: option.label,
  }))
}

function parentLabel(parentId: number | null | undefined, items: SettingsEntityRow[]) {
  if (parentId === null || parentId === undefined) return t('settings.entities.noParentCostCentre')

  const parent = (items as CostCentreRow[]).find(item => item.id === parentId)
  return parent ? `${parent.code} - ${parent.name}` : t('settings.entities.noParentCostCentre')
}

function selectedParentLabel(editingItem: SaveSettingsEntityBody, items: SettingsEntityRow[]) {
  const parentId = costCentreBody(editingItem).parent_id
  return parentLabel(parentId, items) === t('settings.entities.noParentCostCentre')
    ? ''
    : parentLabel(parentId, items)
}

function createItem(): SaveCostCentreBody {
  parentQuery.value = ''
  return {
    code: '',
    name: '',
    description: '',
    parent_id: null,
  }
}

function mapEditItem(item: SettingsEntityRow): SaveCostCentreBody {
  parentQuery.value = ''
  const costCentre = item as CostCentreRow
  return {
    id: costCentre.id,
    code: costCentre.code,
    name: costCentre.name,
    description: costCentre.description,
    is_active: costCentre.is_active,
    parent_id: costCentre.parent_id,
  }
}

function selectParent(value: unknown, editingItem: SaveSettingsEntityBody, items: SettingsEntityRow[]) {
  const parentId = Number(value)
  if (!Number.isInteger(parentId) || parentId <= 0) return

  const selected = parentOptions(editingItem, items).find(option => option.id === parentId)
  costCentreBody(editingItem).parent_id = parentId
  parentQuery.value = selected?.label || ''
}

function clearParent(editingItem: SaveSettingsEntityBody) {
  costCentreBody(editingItem).parent_id = null
  parentQuery.value = ''
}

function handleError({ phase, message, error }: { phase: 'load' | 'save' | 'toggle', message?: string, error?: unknown }) {
  if (error) console.error(error)

  if (phase === 'load') {
    toast.error(message || 'Failed to load cost centres')
    return
  }

  if (phase === 'save') {
    toast.error(message || 'Failed to save cost centre')
    return
  }

  toast.error(message || 'Failed to update cost centre')
}
</script>
