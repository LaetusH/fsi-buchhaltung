<template>
  <div class="bg-white rounded-b-xl rounded-tl-xl shadow-lg p-6 space-y-6 col-span-12">
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
            <th class="py-2 text-right">{{ t('common.actions') }}</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="item in items"
            :key="item.id"
            class="border-b last:border-b-0"
          >
            <td class="py-2">{{ item.code }}</td>
            <td class="py-2">{{ item.name }}</td>

            <td class="py-2 text-right space-x-2">
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
          <tr v-if="items.length === 0">
            <td colspan="3" class="py-6 text-center text-slate-500">
              {{ emptyLabel }}
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
        {{ isNewItem ? t('settings.entities.newItem', { label: singularLabel }) : t('settings.entities.editItem', { label: singularLabel }) }}
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
          <label>{{ t('common.description') }}</label>
          <textarea
            v-model="editingItem!.description"
            rows="3"
            class="input resize-none"
          />
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <button class="btn-secondary" @click="showModal = false">
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

interface SettingsEntityRow {
  id: number
  code: string
  name: string
  is_active: boolean
  description?: string
}

interface SaveSettingsEntityBody {
  id?: number
  code: string
  name: string
  is_active?: boolean
  description?: string
}

const props = defineProps<{
  title: string
  singularLabel: string
  addLabel: string
  emptyLabel: string
  listEndpoint: string
  saveEndpoint: string
  activateEndpoint: string
  responseListKey: string
}>()

const { t } = useI18n()
const items = ref<SettingsEntityRow[]>([])
const showModal = ref(false)
const editingItem = ref<SaveSettingsEntityBody | null>(null)
const isNewItem = ref(false)

async function loadItems() {
  const res = await $fetch<Record<string, any>>(props.listEndpoint)
  if (res.ok) {
    items.value = (res[props.responseListKey] ?? []) as SettingsEntityRow[]
  } else {
    console.log(res.error)
  }
}

function addItem() {
  editingItem.value = {
    code: '',
    name: ''
  }
  isNewItem.value = true
  showModal.value = true
}

function editItem(item: SettingsEntityRow) {
  editingItem.value = { ...item }
  isNewItem.value = false
  showModal.value = true
}

async function saveItem() {
  if (!editingItem.value) return

  const res = await $fetch<{ ok: boolean, error?: string }>(props.saveEndpoint, {
    method: 'POST',
    body: editingItem.value
  })
  if (!res.ok) console.log(res.error)

  showModal.value = false
  editingItem.value = null
  await loadItems()
}

async function toggleActive(item: SettingsEntityRow) {
  const res = await $fetch<{ ok: boolean, error?: string }>(props.activateEndpoint, {
    method: 'POST',
    body: { id: item.id, is_active: !item.is_active }
  })
  if (!res.ok) console.log(res.error)

  await loadItems()
}

onMounted(loadItems)
</script>
