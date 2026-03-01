<template>
  <div class="bg-white rounded-b-xl rounded-tl-xl shadow-lg p-6 space-y-6 col-span-12">
    <div class="flex justify-between items-center">
      <h2 class="text-lg font-semibold">Sphären</h2>

      <button
        class="btn-primary"
        @click="addSphere"
      >
        ＋ Neue Sphäre
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
            v-for="sphere in spheres"
            :key="sphere.id"
            class="border-b last:border-b-0"
          >
            <td class="py-2">{{ sphere.code }}</td>
            <td class="py-2">{{ sphere.name }}</td>

            <td class="py-2 text-right space-x-2">
              <button
                class="text-blue-600 hover:underline cursor-pointer"
                @click="editSphere(sphere)"
              >
                Bearbeiten
              </button>

              <button
                class="text-red-500 hover:underline cursor-pointer"
                @click="activateSphere(sphere)"
              >
                {{ sphere.is_active ? 'Deaktivieren' : 'Aktivieren'}}
              </button>
            </td>
          </tr>
          <tr v-if="spheres.length === 0">
            <td colspan="3" class="py-6 text-center text-slate-500">
              Keine Sphären vorhanden
            </td>
          </tr>
        </tbody>              
      </table>
    </div>
  </div>

  <div
    v-if="showSphereModal"
    class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
  >
    <div class="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
      <h3 class="text-lg font-semibold">
        {{ isNewSphere ? 'Neue Sphäre' : 'Sphäre bearbeiten' }}
      </h3>

      <div class="space-y-3">
        <div class="field">
          <label>Code</label>
          <input v-model="editingSphere!.code" class="input" />
        </div>

        <div class="field">
          <label>Name</label>
          <input v-model="editingSphere!.name" class="input" />
        </div>

        <div class="field">
          <label>Beschreibung</label>
          <textarea
            v-model="editingSphere!.description"
            rows="3"
            class="input resize-none"
          />
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <button
          class="btn-secondary"
          @click="showSphereModal = false"
        >
          Abbrechen
        </button>

        <button
          class="btn-primary"
          @click="saveSphere"
        >
          Speichern
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { SphereRow, SaveSphereBody } from '~/types/sphere'

const emit = defineEmits<{
  (e: 'openMenu'): void
}>()

const spheres = ref<SphereRow[]>([])

const showSphereModal = ref(false)
const editingSphere = ref<SaveSphereBody | null>(null)
const isNewSphere = ref(false)

async function loadSpheres() {
  const res = await $fetch('/api/spheres')
  if (res.ok) spheres.value = res.spheres
}

function addSphere() {
  editingSphere.value = {
    code: '',
    name: ''
  }
  isNewSphere.value = true
  showSphereModal.value = true
}

function editSphere(sphere: SphereRow) {
  editingSphere.value = { ...sphere }
  isNewSphere.value = false
  showSphereModal.value = true
}

async function saveSphere() {
  if (!editingSphere.value) return

  await $fetch('/api/spheres/save', {
    method: 'POST',
    body: editingSphere.value
  })

  showSphereModal.value = false
  editingSphere.value = null
  await loadSpheres()
}

async function activateSphere(sphere: SphereRow) {
  await $fetch('/api/spheres/activate', {
    method: 'POST',
    body: { id: sphere.id, is_active: !sphere.is_active }
  })

  await loadSpheres()
}

onMounted(loadSpheres)
</script>