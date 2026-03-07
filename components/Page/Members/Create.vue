<template>
  <Page headline1="Mitglied" @open-menu="$emit('openMenu')">
    <template #cards>
      <div class="col-span-12 lg:col-span-8 lg:col-start-3">
        <MembersForm
          v-model="form"
          @submit="submit"
          @cancel="cancel"
        />
      </div>
    </template>
  </Page>
</template>

<script setup lang="ts">
import { MemberStatus, type Member, type SaveMemberBody } from '~/types/member'
import { usePage } from '~/composables/usePage'
import MembersForm from './Form.vue'

const emit = defineEmits<{
  (e: 'openMenu'): void
}>()

const { setPage, pageMeta } = usePage()

const isEditMode = ref(false)
const memberId = ref<number | null>(null)

const form = ref<SaveMemberBody>({
  account: null,
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
  positions: []
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
  }
})

async function submit() {
  try {
    if (isEditMode.value && memberId.value) {
      const updateRes = await $fetch<{ ok: boolean, error?: string }>(`/api/members/${memberId.value}`, {
        method: 'PUT',
        body: form.value,
      })

      if (!updateRes.ok) throw new Error(updateRes.error || 'Failed to update member')
    } else {
      const createRes = await $fetch<{ ok: boolean, error?: string }>('/api/members/create', {
        method: 'POST',
        body: form.value,
      })

      if (!createRes.ok) throw new Error(createRes.error || 'Failed to create member')
    }

    alert(isEditMode.value ? 'Member updated successfully!' : 'Member created successfully!')
    const returnTo = pageMeta.value?.returnTo || 'MemberList'
    setPage(returnTo)
  } catch (err: any) {
    alert(err?.message || 'Failed to save member.')
  }
}

function cancel() {
  const returnTo = pageMeta.value?.returnTo || 'MemberList'
  setPage(returnTo)
}
</script>
