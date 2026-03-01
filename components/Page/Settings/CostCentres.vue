<template>
  <Page headline1="Einstellungen – Kostenstellen" @open-menu="$emit('openMenu')">
    <template #cards>
      <div class="bg-white rounded-xl shadow-lg p-6 space-y-6 col-span-12">

        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold">Kostenstellen</h2>

          <button
            class="btn-primary"
            @click="addCostCentre"
          >
            ＋ Neue Kostenstelle
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-left border-b">
                <th class="py-2">Code</th>
                <th class="py-2">Name</th>
                <th class="py-2 text-right">Aktionen</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="c in costCentres"
                :key="c.id"
                class="border-b last:border-b-0"
              >
                <td class="py-2">{{ c.code }}</td>
                <td class="py-2">{{ c.name }}</td>

                <td class="py-2 text-right space-x-2">
                  <button
                    class="text-blue-600 hover:underline cursor-pointer"
                    @click="editCostCentre(c)"
                  >
                    Bearbeiten
                  </button>

                  <button
                    class="text-red-500 hover:underline cursor-pointer"
                    @click="activateCostCentre(c)"
                  >
                    {{ c.is_active ? 'Deaktivieren' : 'Aktivieren'}}
                  </button>
                </td>
              </tr>
              <tr v-if="costCentres.length === 0">
                <td colspan="3" class="py-6 text-center text-slate-500">
                  Keine Kostenstellen vorhanden
                </td>
              </tr>
            </tbody>              
          </table>
        </div>
      </div>
    </template>
  </Page>

  <div
    v-if="showCostCentreModal"
    class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
  >
    <div class="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
      <h3 class="text-lg font-semibold">
        {{ isNewCostCentre ? 'Neue Kostenstelle' : 'Kostenstelle bearbeiten' }}
      </h3>

      <div class="space-y-3">
        <div class="field">
          <label>Code</label>
          <input v-model="editingCostCentre!.code" class="input" />
        </div>

        <div class="field">
          <label>Name</label>
          <input v-model="editingCostCentre!.name" class="input" />
        </div>

        <div class="field">
          <label>Beschreibung</label>
          <textarea
            v-model="editingCostCentre!.description"
            rows="3"
            class="input resize-none"
          />
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <button
          class="btn-secondary"
          @click="showCostCentreModal = false"
        >
          Abbrechen
        </button>

        <button
          class="btn-primary"
          @click="saveCostCentre"
        >
          Speichern
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { CostCentreRow, SaveCostCentreBody } from '~/types/costCentre'

const emit = defineEmits<{
  (e: 'openMenu'): void
}>()

const costCentres = ref<CostCentreRow[]>([])

const showCostCentreModal = ref(false)
const editingCostCentre = ref<SaveCostCentreBody | null>(null)
const isNewCostCentre = ref(false)

async function loadCostCentres() {
  const res = await $fetch('/api/cost_centres')
  if (res.ok) costCentres.value = res.costCentres
}

function addCostCentre() {
  editingCostCentre.value = {
    code: '',
    name: ''
  }
  isNewCostCentre.value = true
  showCostCentreModal.value = true
}

function editCostCentre(costCentre: CostCentreRow) {
  editingCostCentre.value = { ...costCentre }
  isNewCostCentre.value = false
  showCostCentreModal.value = true
}

async function saveCostCentre() {
  if (!editingCostCentre.value) return

  await $fetch('/api/cost_centres/save', {
    method: 'POST',
    body: editingCostCentre.value
  })

  showCostCentreModal.value = false
  editingCostCentre.value = null
  await loadCostCentres()
}

async function activateCostCentre(costCentre: CostCentreRow) {
  await $fetch('/api/cost_centres/activate', {
    method: 'POST',
    body: { id: costCentre.id, is_active: !costCentre.is_active }
  })

  await loadCostCentres()
}

onMounted(loadCostCentres)
</script>