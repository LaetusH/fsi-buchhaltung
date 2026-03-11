<template>
  <div class="space-y-6">
    <section class="bg-white rounded-xl shadow-lg p-4 space-y-3">
      <h2 class="text-lg font-semibold">{{ t('member.masterData') }}</h2>

      <div class="grid md:grid-cols-2 gap-4">
        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('member.firstName') }}</label>
          <input v-model="form.first_name" class="input" :class="disabled ? 'opacity-70' : ''" :disabled="disabled" />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('member.lastName') }}</label>
          <input v-model="form.last_name" class="input" :class="disabled ? 'opacity-70' : ''" :disabled="disabled" />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('member.birthdate') }}</label>
          <input v-model="form.birthdate" type="date" class="input" :class="disabled ? 'opacity-70' : ''" :disabled="disabled" />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('member.status') }}</label>
          <MenuDropdown v-model="openStatus" :id="0">
            <template #trigger="{ styling }">
              <button :class="[styling, disabled ? 'opacity-70' : 'cursor-pointer']" :disabled="disabled">
                <span>{{ statusLabel(form.status) }}</span>
                <Icon v-if="!disabled" name="material-symbols:keyboard-arrow-down-rounded" class="text-lg" />
              </button>
            </template>

            <template #default="{ styling }">
              <button :class="styling" @click="selectStatus(MemberStatus.Active)">{{ t('member.states.active') }}</button>
              <button :class="styling" @click="selectStatus(MemberStatus.Passive)">{{ t('member.states.passive') }}</button>
              <button :class="styling" @click="selectStatus(MemberStatus.Hold)">{{ t('member.states.hold') }}</button>
              <button :class="styling" @click="selectStatus(MemberStatus.Left)">{{ t('member.states.left') }}</button>
            </template>
          </MenuDropdown>
        </div>
      </div>

      <label class="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
        <input v-model="form.honorary" type="checkbox" class="h-4 w-4" :class="disabled ? 'opacity-70' : ''" :disabled="disabled"/>
        {{ t('member.honorary') }}
      </label>
    </section>

    <section class="bg-white rounded-xl shadow-lg p-4 space-y-3">
      <h3 class="font-semibold">{{ t('member.contact') }}</h3>

      <div class="grid md:grid-cols-4 gap-4">
        <div class="md:col-span-3">
          <label class="text-sm font-medium text-slate-600">{{ t('member.street') }}</label>
          <input v-model="form.street" class="input" :class="disabled ? 'opacity-70' : ''" :disabled="disabled" />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('member.streetNumber') }}</label>
          <input v-model="form.street_number" class="input" :class="disabled ? 'opacity-70' : ''" :disabled="disabled" />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('member.postalCode') }}</label>
          <input v-model="form.postal_code" class="input" :class="disabled ? 'opacity-70' : ''" :disabled="disabled" />
        </div>

        <div class="md:col-span-3">
          <label class="text-sm font-medium text-slate-600">{{ t('member.city') }}</label>
          <input v-model="form.city" class="input" :class="disabled ? 'opacity-70' : ''" :disabled="disabled" />
        </div>

        <div class="md:col-span-2">
          <label class="text-sm font-medium text-slate-600">{{ t('member.phone') }}</label>
          <input v-model="form.phone" class="input" :class="disabled ? 'opacity-70' : ''" :disabled="disabled" />
        </div>

        <div class="md:col-span-2">
          <label class="text-sm font-medium text-slate-600">{{ t('member.email') }}</label>
          <input v-model="form.email" type="email" class="input" :class="disabled ? 'opacity-70' : ''" :disabled="disabled" />
        </div>
      </div>
    </section>

    <section class="bg-white rounded-xl shadow-lg p-4 space-y-3">
      <h3 class="font-semibold">{{ t('member.membership') }}</h3>

      <div class="grid md:grid-cols-3 gap-4 items-end">
        <div class="md:col-span-3">
          <label class="text-sm font-medium text-slate-600">{{ t('member.subject') }}</label>
          <MenuDropdown v-model="openSubject" :id="0" class="w-full">
            <template #trigger="{ styling }">
              <input
                v-model="subjectQuery"
                :class="[styling, disabled ? 'opacity-70' : '']"
                :placeholder="canEditSubjects ? t('member.subjectEditablePlaceholder') : t('member.subjectPlaceholder')"
                @input="onSubjectInput"
                :disabled="disabled"
              />
            </template>

            <template #default="{ styling }">
              <button v-if="canEditSubjects" type="button" :class="styling" @click="createSubjectFromQuery" >
                <div class="flex justify-between w-full">
                  <span>"{{ subjectQuery }}"</span>
                  <span class="text-orange-500 font-semibold">+ {{ t('actions.createNew') }}</span>
                </div>
              </button>

              <div v-if="canEditSubjects" class="border-t"></div>

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
                {{ t('member.noSubjects') }}
              </div>
            </template>
          </MenuDropdown>
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('member.appliedAt') }}</label>
          <input v-model="form.applied_at" type="date" class="input" :class="disabled ? 'opacity-70' : ''" :disabled="disabled" />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('member.joinedAt') }}</label>
          <input v-model="form.joined_at" type="date" class="input" :class="disabled ? 'opacity-70' : ''" :disabled="disabled" />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('member.leftAt') }}</label>
          <input v-model="form.left_at" type="date" class="input" :class="disabled ? 'opacity-70' : ''" :disabled="disabled" />
        </div>
      </div>

      <div>
        <label class="text-sm font-medium text-slate-600">{{ t('member.notes') }}</label>
        <textarea v-model="form.notes" rows="3" class="input resize-none" :class="disabled ? 'opacity-70' : ''" :disabled="disabled" />
      </div>
    </section>

    <section class="bg-white rounded-xl shadow-lg p-4 space-y-3">
      <h3 class="font-semibold">{{ t('member.positions') }}</h3>

      <div
        v-for="(assignment, i) in form.positions"
        :key="i"
        class="grid grid-cols-1 md:grid-cols-[3fr_2fr_2fr_auto] gap-2 items-center"
      >
        <MenuDropdown v-model="openPositionIndex" :id="i">
          <template #trigger="{ styling }">
            <input
              v-model="positionQueries[i]"
              :class="[styling, disabled ? 'opacity-70' : '']"
              :placeholder="t('member.positionPlaceholder')"
              @input="onPositionInput(i)"
              :disabled="disabled"
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
              {{ t('member.noPositions') }}
            </div>
          </template>
        </MenuDropdown>

        <input v-model="assignment.since" type="date" class="input" :class="disabled ? 'opacity-70' : ''" :disabled="disabled" />
        <input v-model="assignment.until" type="date" class="input" :class="disabled ? 'opacity-70' : ''" :disabled="disabled" />

        <button
          v-if="!disabled"
          class="text-red-500 cursor-pointer p-2 w-10 rounded-md hover:bg-slate-100"
          type="button"
          @click="removePosition(i)"
        >
          ✕
        </button>
      </div>

      <button
        v-if="!disabled"
        type="button"
        class="flex items-center gap-2 text-orange-500 font-medium cursor-pointer"
        @click="addPosition"
      >
        <span class="text-xl">+</span> {{ t('actions.addPosition') }}
      </button>
    </section>

    <section v-if="canManageUsers && showAccountCreation" class="bg-white rounded-xl shadow-lg p-4 space-y-3">
      <h3 class="font-semibold">{{ t('member.accountTitle') }}</h3>

      <label class="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
        <input v-model="accountCreationEnabled" type="checkbox" class="h-4 w-4" :disabled="disabled" />
        {{ t('member.createAccount') }}
      </label>

      <div v-if="accountCreationEnabled" class="grid md:grid-cols-2 gap-4">
        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('member.accountUsername') }}</label>
          <input
            v-model="form.new_account!.username"
            class="input"
            :class="disabled ? 'opacity-70' : ''"
            :disabled="disabled"
            name="new-account-username"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            data-lpignore="true"
            @input="usernameManuallyEdited = true"
          />
        </div>

        <div>
          <label class="text-sm font-medium text-slate-600">{{ t('member.accountPassword') }}</label>
          <input
            v-model="form.new_account!.password"
            type="password"
            class="input"
            :class="disabled ? 'opacity-70' : ''"
            :disabled="disabled"
            name="new-account-password"
            autocomplete="new-password"
            autocapitalize="off"
            spellcheck="false"
            data-lpignore="true"
          />
        </div>
      </div>

      <label v-if="accountCreationEnabled" class="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
        <input v-model="form.new_account!.is_active" type="checkbox" class="h-4 w-4" :disabled="disabled" />
        {{ t('member.accountActive') }}
      </label>
    </section>

    <div v-if="!disabled" class="grid grid-cols-2 gap-4">
      <button class="btn-secondary" @click="emit('cancel')">{{ t('actions.cancel') }}</button>

      <button
        class="btn-primary"
        :disabled="saveDisabled"
        :class="{ 'opacity-50 cursor-not-allowed': saveDisabled }"
        @click="emit('submit')"
      >
        {{ t('actions.save') }}
      </button>
    </div>

    <div v-else class="grid">
      <button class="btn-secondary col-span-12" @click="emit('cancel')">{{ t('actions.close') }}</button>
    </div>

    <section
      v-if="validationErrors.length"
      class="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700"
    >
      <p class="font-semibold mb-1">{{ t('common.validationBlocked') }}</p>
      <ul class="list-disc list-inside">
        <li v-for="error in validationErrors" :key="error">{{ error }}</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import type { PositionRow } from '~/types/position'
import { MemberStatus, type SaveMemberBody } from '~/types/member'
import type { SubjectRow } from '~/types/subject'

const props = defineProps<{
  modelValue: SaveMemberBody
  disabled?: boolean
  canEditSubjects?: boolean
  canManageUsers?: boolean
  showAccountCreation?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: SaveMemberBody): void
  (e: 'submit'): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()

const form = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})
const canEditSubjects = computed(() => props.canEditSubjects !== false)
const canManageUsers = computed(() => props.canManageUsers === true)
const showAccountCreation = computed(() => props.showAccountCreation === true)
const usernameManuallyEdited = ref(false)

const accountCreationEnabled = computed({
  get: () => Boolean(form.value.new_account),
  set: (enabled: boolean) => {
    usernameManuallyEdited.value = false
    form.value.new_account = enabled
      ? {
          username: buildDefaultAccountUsername(form.value.first_name, form.value.last_name),
          password: '',
          is_active: true,
        }
      : null
  }
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

  if (!form.value.first_name?.trim()) errors.push(t('member.required.firstName'))
  if (!form.value.last_name?.trim()) errors.push(t('member.required.lastName'))
  if (!form.value.birthdate) errors.push(t('member.required.birthdate'))
  if (!form.value.subject_name?.trim()) errors.push(t('member.required.subject'))
  if (!form.value.street?.trim()) errors.push(t('member.required.street'))
  if (!form.value.street_number?.trim()) errors.push(t('member.required.streetNumber'))
  if (!form.value.postal_code?.trim()) errors.push(t('member.required.postalCode'))
  if (!form.value.city?.trim()) errors.push(t('member.required.city'))
  if (!form.value.phone?.trim()) errors.push(t('member.required.phone'))
  if (!form.value.email?.trim()) errors.push(t('member.required.email'))
  if (!form.value.status?.trim()) errors.push(t('member.required.status'))
  if (!form.value.applied_at) errors.push(t('member.required.appliedAt'))
  if (!form.value.joined_at) errors.push(t('member.required.joinedAt'))
  if (form.value.new_account && !form.value.new_account.username.trim()) errors.push(t('member.required.accountUsername'))
  if (form.value.new_account && !form.value.new_account.password.trim()) errors.push(t('member.required.accountPassword'))
  if (form.value.status === MemberStatus.Left && !form.value.left_at) {
    errors.push(t('member.required.leftDateNeeded'))
  }
  if (form.value.status !== MemberStatus.Left && form.value.left_at) {
    errors.push(t('member.required.leftDateOnlyWhenLeft'))
  }

  form.value.positions.forEach((position, index) => {
    if (!position.position_id || !position.since) {
      errors.push(t('member.required.positionRow', { index: index + 1 }))
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
  if (!canEditSubjects.value) return
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
  if (status === MemberStatus.Active) return t('member.states.active')
  if (status === MemberStatus.Passive) return t('member.states.passive')
  if (status === MemberStatus.Hold) return t('member.states.hold')
  return t('member.states.left')
}

function selectStatus(status: MemberStatus) {
  form.value.status = status
  openStatus.value = null
}

function normalizeUsernamePart(value: string | null | undefined) {
  return (value || '')
    .trim()
    .toLowerCase()
    .replaceAll('\u00E4', 'ae')
    .replaceAll('\u00F6', 'oe')
    .replaceAll('\u00FC', 'ue')
    .replaceAll('\u00DF', 'ss')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9.-]/g, '')
}

function buildDefaultAccountUsername(firstName: string | null | undefined, lastName: string | null | undefined) {
  const first = normalizeUsernamePart(firstName)
  const last = normalizeUsernamePart(lastName)

  if (first && last) return `${first}.${last}`
  return first || last || ''
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

watch(
  () => [form.value.first_name, form.value.last_name, form.value.new_account] as const,
  ([firstName, lastName, newAccount]) => {
    if (!newAccount || usernameManuallyEdited.value) return
    newAccount.username = buildDefaultAccountUsername(firstName, lastName)
  },
  { immediate: true }
)
</script>
