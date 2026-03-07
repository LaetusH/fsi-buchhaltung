<template>
  <div class="space-y-6">
    <section class="bg-white rounded-xl shadow-lg p-4 space-y-3">
      <h2 class="text-lg font-semibold">Stammdaten</h2>

      <div class="grid md:grid-cols-2 gap-4">
        <div>
          <label class="text-sm font-medium text-slate-600">Vorname</label>
          <input v-model="form.first_name" class="input" />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">Nachname</label>
          <input v-model="form.last_name" class="input" />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">Geburtsdatum</label>
          <input v-model="form.birthdate" type="date" class="input" />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">Status</label>
          <MenuDropdown v-model="openStatus" :id="0">
            <template #trigger="{ styling }">
              <button :class="styling" class="cursor-pointer">
                <span>{{ statusLabel(form.status) }}</span>
                <Icon name="material-symbols:keyboard-arrow-down-rounded" class="text-lg" />
              </button>
            </template>

            <template #default="{ styling }">
              <button :class="styling" @click="selectStatus(MemberStatus.Active)">Aktiv</button>
              <button :class="styling" @click="selectStatus(MemberStatus.Passive)">Passiv</button>
              <button :class="styling" @click="selectStatus(MemberStatus.Left)">Ausgetreten</button>
            </template>
          </MenuDropdown>
        </div>
      </div>

      <label class="inline-flex items-center gap-2 text-sm text-slate-700">
        <input v-model="form.honorary" type="checkbox" class="h-4 w-4" /> Ehrenmitglied
      </label>
    </section>

    <section class="bg-white rounded-xl shadow-lg p-4 space-y-3">
      <h3 class="font-semibold">Kontakt</h3>

      <div class="grid md:grid-cols-4 gap-4">
        <div class="md:col-span-3">
          <label class="text-sm font-medium text-slate-600">Straße</label>
          <input v-model="form.street" class="input" />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">Nr.</label>
          <input v-model="form.street_number" class="input" />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">PLZ</label>
          <input v-model="form.postal_code" class="input" />
        </div>

        <div class="md:col-span-3">
          <label class="text-sm font-medium text-slate-600">Ort</label>
          <input v-model="form.city" class="input" />
        </div>

        <div class="md:col-span-2">
          <label class="text-sm font-medium text-slate-600">Telefon</label>
          <input v-model="form.phone" class="input" />
        </div>

        <div class="md:col-span-2">
          <label class="text-sm font-medium text-slate-600">E-Mail</label>
          <input v-model="form.email" type="email" class="input" />
        </div>
      </div>
    </section>

    <section class="bg-white rounded-xl shadow-lg p-4 space-y-3">
      <h3 class="font-semibold">Mitgliedschaft</h3>

      <div class="grid md:grid-cols-3 gap-4 items-end">
        <div class="md:col-span-3">
          <label class="text-sm font-medium text-slate-600">Fach</label>
          <MenuDropdown v-model="openSubject" :id="0" class="w-full">
            <template #trigger="{ styling }">
              <input
                v-model="subjectQuery"
                :class="styling"
                placeholder="Fach wählen oder neu eingeben"
                @input="onSubjectInput"
              />
            </template>

            <template #default="{ styling }">
              <button type="button" :class="styling" @click="createSubjectFromQuery">
                <div class="flex justify-between w-full">
                  <span>"{{ subjectQuery }}"</span>
                  <span class="text-orange-500 font-semibold">+ neu anlegen</span>
                </div>
              </button>

              <div class="border-t"></div>

              <button
                v-for="subject in filteredSubjects"
                :key="subject.id"
                type="button"
                :class="styling"
                @click="selectSubject(subject.name)"
              >
                {{ subject.name }}
              </button>
              <div v-if="filteredSubjects.length === 0" class="px-3 py-2 text-sm text-gray-500">
                Keine vorhandenen Fächer
              </div>
            </template>
          </MenuDropdown>
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">Antrag am</label>
          <input v-model="form.applied_at" type="date" class="input" />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">Eintritt am</label>
          <input v-model="form.joined_at" type="date" class="input" />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">Austritt am</label>
          <input v-model="form.left_at" type="date" class="input" />
        </div>
      </div>

      <div>
        <label class="text-sm font-medium text-slate-600">Notizen</label>
        <textarea v-model="form.notes" rows="3" class="input resize-none" />
      </div>
    </section>

    <section class="bg-white rounded-xl shadow-lg p-4 space-y-3">
      <h3 class="font-semibold">Positionen</h3>

      <div
        v-for="(assignment, i) in form.positions"
        :key="i"
        class="grid grid-cols-1 md:grid-cols-[3fr_2fr_2fr_auto] gap-2 items-center"
      >
        <MenuDropdown v-model="openPositionIndex" :id="i">
          <template #trigger="{ styling }">
            <input
              v-model="positionQueries[i]"
              :class="styling"
              placeholder="Position wählen"
              @input="onPositionInput(i)"
            />
          </template>

          <template #default="{ styling }">
            <button
              v-for="position in filteredPositions(i)"
              :key="position.id"
              type="button"
              :class="styling"
              @click="selectPosition(i, position.id)"
            >
              {{ position.code }} - {{ position.name }}
            </button>
            <div
              v-if="filteredPositions(i).length === 0"
              class="px-3 py-2 text-sm text-gray-500"
            >
              Keine vorhandenen Positionen
            </div>
          </template>
        </MenuDropdown>

        <input v-model="assignment.since" type="date" class="input" />
        <input v-model="assignment.until" type="date" class="input" />

        <button
          class="text-red-500 cursor-pointer p-2 w-10 rounded-md hover:bg-slate-100"
          type="button"
          @click="removePosition(i)"
        >
          ✕
        </button>
      </div>

      <button
        type="button"
        class="flex items-center gap-2 text-orange-500 font-medium cursor-pointer"
        @click="addPosition"
      >
        <span class="text-xl">+</span> Position
      </button>
    </section>

    <div class="grid grid-cols-2 gap-4">
      <button class="btn-secondary" @click="emit('cancel')">Abbrechen</button>

      <button
        class="btn-primary"
        :disabled="saveDisabled"
        :class="{ 'opacity-50 cursor-not-allowed': saveDisabled }"
        @click="emit('submit')"
      >
        Speichern
      </button>
    </div>

    <section
      v-if="validationErrors.length"
      class="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700"
    >
      <p class="font-semibold mb-1">Speichern derzeit nicht moeglich:</p>
      <ul class="list-disc list-inside">
        <li v-for="error in validationErrors" :key="error">{{ error }}</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { PositionRow } from '~/types/position'
import { MemberStatus, type SaveMemberBody } from '~/types/member'
import type { SubjectRow } from '~/types/subject'

const props = defineProps<{
  modelValue: SaveMemberBody
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: SaveMemberBody): void
  (e: 'submit'): void
  (e: 'cancel'): void
}>()

const form = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const subjects = ref<SubjectRow[]>([])
const subjectQuery = ref('')
const openSubject = ref<number | null>(null)

const positions = ref<PositionRow[]>([])
const openPositionIndex = ref<number | null>(null)
const positionQueries = ref<Record<number, string>>({})
const openStatus = ref<number | null>(null)

const filteredSubjects = computed(() => {
  const q = subjectQuery.value.trim().toLowerCase()
  if (!q) return subjects.value

  return subjects.value.filter(subject =>
    subject.name.toLowerCase().includes(q)
  )
})

const validationErrors = computed(() => {
  const errors: string[] = []

  if (!form.value.first_name?.trim()) errors.push('Vorname ist ein Pflichtfeld.')
  if (!form.value.last_name?.trim()) errors.push('Nachname ist ein Pflichtfeld.')
  if (!form.value.birthdate) errors.push('Geburtsdatum ist ein Pflichtfeld.')
  if (!form.value.subject_name?.trim()) errors.push('Fach ist ein Pflichtfeld.')
  if (!form.value.street?.trim()) errors.push('Straße ist ein Pflichtfeld.')
  if (!form.value.street_number?.trim()) errors.push('Hausnummer ist ein Pflichtfeld.')
  if (!form.value.postal_code?.trim()) errors.push('PLZ ist ein Pflichtfeld.')
  if (!form.value.city?.trim()) errors.push('Ort ist ein Pflichtfeld.')
  if (!form.value.phone?.trim()) errors.push('Telefon ist ein Pflichtfeld.')
  if (!form.value.email?.trim()) errors.push('E-Mail ist ein Pflichtfeld.')
  if (!form.value.status?.trim()) errors.push('Status ist ein Pflichtfeld.')
  if (!form.value.applied_at) errors.push('Antragsdatum ist ein Pflichtfeld.')
  if (!form.value.joined_at) errors.push('Eintrittsdatum ist ein Pflichtfeld.')
  if (form.value.status === MemberStatus.Left && !form.value.left_at) {
    errors.push('Status AUSGETRETEN erfordert ein Austrittsdatum.')
  }
  if (form.value.status !== MemberStatus.Left && form.value.left_at) {
    errors.push('Ein Austrittsdatum ist nur mit Status AUSGETRETEN erlaubt.')
  }

  form.value.positions.forEach((position, index) => {
    if (!position.position_id || !position.since) {
      errors.push(`Position ${index + 1} benötigt Position und Beginn.`)
    }
  })

  return errors
})

const saveDisabled = computed(() => Boolean(props.disabled) || validationErrors.value.length > 0)

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  loadSubjects()
  loadPositions()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})

watch(
  () => form.value.subject_name,
  (newValue) => {
    subjectQuery.value = newValue || ''
  },
  { immediate: true }
)

async function loadSubjects() {
  const res = await $fetch<{ ok: boolean, subjects?: SubjectRow[] }>('/api/subjects')
  if (res.ok && res.subjects) subjects.value = res.subjects
}

async function loadPositions() {
  const res = await $fetch<{ ok: boolean, positions?: PositionRow[] }>('/api/positions')
  if (res.ok && res.positions) {
    positions.value = res.positions.filter(position => position.is_active)
  }
}

function filteredPositions(index: number) {
  const q = positionQueries.value[index]?.toLowerCase().trim()
  if (!q) return positions.value

  const byCode = positions.value.filter(position =>
    position.code.toLowerCase().includes(q)
  )
  if (byCode.length) return byCode

  return positions.value.filter(position =>
    position.name.toLowerCase().includes(q)
  )
}

async function createSubjectFromQuery() {
  const name = subjectQuery.value.trim()
  if (!name) return

  const res = await $fetch<{ ok: boolean, id?: number }>('/api/subjects/create', {
    method: 'POST',
    body: { name }
  })

  if (!res.ok) return

  form.value.subject_name = name
  subjectQuery.value = name
  openSubject.value = null
  await loadSubjects()
}

function selectSubject(name: string) {
  form.value.subject_name = name
  subjectQuery.value = name
  openSubject.value = null
}

function onSubjectInput() {
  openSubject.value = 0
  if (!subjectQuery.value.trim()) {
    form.value.subject_name = ''
  }
}

function onPositionInput(index: number) {
  openPositionIndex.value = index
  if (!positionQueries.value[index]?.trim() && form.value.positions[index]) {
    form.value.positions[index]!.position_id = 0
  }
}

function addPosition() {
  form.value.positions.push({
    position_id: 0,
    since: '',
    until: null,
  })
}

function removePosition(index: number) {
  form.value.positions.splice(index, 1)
}

function selectPosition(index: number, positionId: number) {
  if (!form.value.positions[index]) return
  form.value.positions[index]!.position_id = positionId
  const selected = positions.value.find(position => position.id === positionId)
  positionQueries.value[index] = selected ? `${selected.code} - ${selected.name}` : ''
  openPositionIndex.value = null
}

function tryAutoSelectSubject() {
  if (filteredSubjects.value.length === 1) {
    const subject = filteredSubjects.value[0]
    if (subject) selectSubject(subject.name)
    return
  }

  const q = subjectQuery.value.trim().toLowerCase()
  if (!q) return

  const exact = subjects.value.filter(subject => subject.name.toLowerCase() === q)
  if (exact.length === 1) {
    const subject = exact[0]
    if (subject) selectSubject(subject.name)
  }
}

function tryAutoSelectPosition() {
  if (openPositionIndex.value === null) return
  const index = openPositionIndex.value

  const filtered = filteredPositions(index)
  if (filtered.length === 1) {
    const position = filtered[0]
    if (position) selectPosition(index, position.id)
    return
  }

  const q = positionQueries.value[index]?.trim().toLowerCase()
  if (!q) return

  const byCode = positions.value.filter(position => position.code.toLowerCase() === q)
  if (byCode.length === 1) {
    const position = byCode[0]
    if (position) selectPosition(index, position.id)
    return
  }

  const byName = positions.value.filter(position => position.name.toLowerCase() === q)
  if (byName.length === 1) {
    const position = byName[0]
    if (position) selectPosition(index, position.id)
  }
}

function onKeydown(e: KeyboardEvent) {
  if (openSubject.value !== null) {
    if (e.key === 'Escape') openSubject.value = null
    if (e.key === 'Enter' || e.key === 'Tab') {
      tryAutoSelectSubject()
      openSubject.value = null
    }
  }

  if (openPositionIndex.value !== null) {
    if (e.key === 'Escape') openPositionIndex.value = null
    if (e.key === 'Enter' || e.key === 'Tab') {
      tryAutoSelectPosition()
      openPositionIndex.value = null
    }
  }
}

function statusLabel(status: MemberStatus) {
  if (status === MemberStatus.Active) return 'Aktiv'
  if (status === MemberStatus.Passive) return 'Passiv'
  return 'Ausgetreten'
}

function selectStatus(status: MemberStatus) {
  form.value.status = status
  openStatus.value = null
}

watch(
  [positions, () => form.value.positions],
  () => {
    form.value.positions.forEach((assignment, index) => {
      if (!assignment.position_id) return

      const selected = positions.value.find(position => position.id === assignment.position_id)
      if (!selected) return

      positionQueries.value[index] = `${selected.code} - ${selected.name}`
    })
  },
  { immediate: true, deep: true }
)
</script>
