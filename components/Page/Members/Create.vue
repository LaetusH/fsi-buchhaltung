<template>
  <Page :headline1="t('member.title')" @open-menu="$emit('openMenu')">
    <template #cards>
      <div class="col-span-12 lg:col-span-8 lg:col-start-3">
        <MembersForm
          v-model="form"
          :disabled="!canEdit"
          :can-edit-subjects="canEditSubjects"
          :can-manage-users="canManageUsers"
          :can-manage-subdivisions="canManageSubdivisions"
          :show-account-creation="!isEditMode"
          @submit="submit"
          @cancel="cancel"
        />
      </div>
    </template>
  </Page>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { useToast } from '~/composables/useToast'
import { MemberStatus, type Member, type SaveMemberBody } from '~/types/member'
import { usePage } from '~/composables/usePage'
import MembersForm from './Form.vue'
import { useAuth } from '~/composables/useAuth'

const emit = defineEmits<{
  (e: 'openMenu'): void
}>()

const { setPage, pageMeta } = usePage()
const { t } = useI18n()
const toast = useToast()
const { hasPermission } = useAuth()

const canEdit = computed(() => hasPermission('members.edit'))
const canEditSubjects = computed(() => hasPermission('subjects.edit'))
const canManageUsers = computed(() => hasPermission('users.manage'))
const canManageSubdivisions = computed(() => hasPermission('settings.subdivisions.manage'))

const isEditMode = ref(false)
const memberId = ref<number | null>(null)

const form = ref<SaveMemberBody>({
  account: null,
  new_account: null,
  first_name: '',
  last_name: '',
  birthdate: '',
  street: '',
  street_number: '',
  postal_code: '',
  city: '',
  subject_name: '',
  phone: '',
  email: '',
  notes: null,
  status: MemberStatus.Active,
  honorary: false,
  applied_at: '',
  joined_at: '',
  left_at: null,
  positions: [],
  subdivision_ids: [],
})

onMounted(async () => {
  memberId.value = pageMeta.value?.memberId || null
  if (!memberId.value) return

  isEditMode.value = true

  const res = await $fetch<{ ok: boolean, member?: Member, error?: string }>(`/api/members/${memberId.value}`)
  if (!res.ok || !res.member) {
    isEditMode.value = false
    return
  }

  form.value = {
    account: res.member.account,
    new_account: null,
    first_name: res.member.first_name,
    last_name: res.member.last_name,
    birthdate: res.member.birthdate,
    street: res.member.street,
    street_number: res.member.street_number,
    postal_code: res.member.postal_code,
    city: res.member.city,
    subject_name: res.member.subject_name,
    phone: res.member.phone,
    email: res.member.email,
    notes: res.member.notes,
    status: res.member.status,
    honorary: res.member.honorary,
    applied_at: res.member.applied_at,
    joined_at: res.member.joined_at,
    left_at: res.member.left_at,
    positions: res.member.positions || [],
    subdivision_ids: res.member.subdivisions?.map(subdivision => subdivision.id) || [],
  }
})

async function submit() {
  if (!canEdit.value) {
    toast.error(t('common.notAuthorized'))
    return
  }
  try {
    if (isEditMode.value && memberId.value) {
      const updateRes = await $fetch<{ ok: boolean, error?: string }>(`/api/members/${memberId.value}`, {
        method: 'PUT',
        body: form.value,
      })

      if (!updateRes.ok) throw new Error(updateRes.error || t('member.saved.failedUpdate'))
    } else {
      const createRes = await $fetch<{ ok: boolean, error?: string }>('/api/members/create', {
        method: 'POST',
        body: form.value,
      })

      if (!createRes.ok) throw new Error(createRes.error || t('member.saved.failedCreate'))
    }

    toast.success(isEditMode.value ? t('member.saved.updated') : t('member.saved.created'))
    const returnTo = pageMeta.value?.returnTo || 'MemberList'
    setPage(returnTo)
  } catch (err: any) {
    toast.error(err?.message || t('member.saved.failedSave'))
  }
}

function cancel() {
  const returnTo = pageMeta.value?.returnTo || 'MemberList'
  setPage(returnTo)
}
</script>
