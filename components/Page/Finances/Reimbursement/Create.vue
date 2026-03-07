<template>
  <Page headline1="Erstattung Ausgaben/Auslagen" @open-menu="$emit('openMenu')">
    <template #cards>
      <div class="col-span-6">
        <ClientOnly>
          <FileDrop 
            v-model:model-value="file" 
            :existing-file="existingFile"
            @remove-existing="onRemoveFile"
          />
        </ClientOnly>
      </div>

      <div class="col-span-6">
        <ReimbursementForm
          v-model="form"
          :has-file="!!file || (!!existingFile && !removeExistingFile)"
          @submit="submit"
          @cancel="cancel"
        />
      </div>
    </template>
  </Page>
</template>

<script setup lang="ts">
import Page from '~/components/Page.vue'
import FileDrop from '../FileDrop.vue'
import ReimbursementForm from './Form.vue'
import { usePage } from '~/composables/usePage'
import type { CreateReimbursementBody } from '~/types/reimbursement'
import type { GetReimbursementResponse } from '~/server/api/reimbursements/[id].get'

const emit = defineEmits<{
  (e: 'openMenu'): void
}>()

const { setPage, pageMeta } = usePage()

const isEditMode = ref(false)
const reimbursementId = ref<number | null>(null)

const file = ref<File | null>(null)
const existingFile = ref<{
    id: number
    url: string
    name: string
    mime_type: string
    size: number
  } | null>(null)
const removeExistingFile = ref(false)

const form = ref<CreateReimbursementBody>({
  paid_by: 0,
  bankname: null,
  account_holder: null,
  iban: null,
  bic: null,
  advance: 0,
  cash: true,
  submitted_at: '',
  checked_at: null,
  checked_by: null,
  disbursed_at: null,
  disbursed_by: null,
  positions: []
})

function mergeNewReceiptIntoForm(newReceiptId: number) {
  const alreadyPresent = form.value.positions.some(position =>
    (position.receipt_id || position.receipt?.id) === newReceiptId
  )

  if (!alreadyPresent) {
    form.value.positions.push({ receipt_id: newReceiptId })
  }
}

function applyDraft(draft: Partial<CreateReimbursementBody>) {
  form.value = {
    paid_by: Number(draft.paid_by || 0),
    bankname: draft.bankname ?? null,
    account_holder: draft.account_holder ?? null,
    iban: draft.iban ?? null,
    bic: draft.bic ?? null,
    advance: Number(draft.advance || 0),
    cash: draft.cash ?? true,
    submitted_at: draft.submitted_at || '',
    checked_at: draft.checked_at ?? null,
    checked_by: draft.checked_by ?? null,
    disbursed_at: draft.disbursed_at ?? null,
    disbursed_by: draft.disbursed_by ?? null,
    positions: Array.isArray(draft.positions) ? draft.positions.map(position => ({
      receipt_id: Number(position.receipt_id || position.receipt?.id || 0),
      receipt: position.receipt
    })) : [],
  }
}

onMounted(async () => {
  reimbursementId.value = pageMeta.value?.reimbursementId || null

  if (pageMeta.value?.reimbursementDraft) {
    applyDraft(pageMeta.value.reimbursementDraft as Partial<CreateReimbursementBody>)

    if (reimbursementId.value) {
      isEditMode.value = true
      const res = await $fetch<GetReimbursementResponse>(`/api/reimbursements/${reimbursementId.value}`, { method: 'GET'})
      if (res.ok && res.file) {
        existingFile.value = {
          id: res.file.id,
          url: `/api/files/${res.file.id}`,
          name: res.file.original_name,
          mime_type: res.file.mime_type,
          size: res.file.file_size
        }
      }
    }

    if (pageMeta.value?.newReceiptId) {
      mergeNewReceiptIntoForm(Number(pageMeta.value.newReceiptId))
    }
    return
  }

  if (!reimbursementId.value) {
    if (pageMeta.value?.newReceiptId) {
      mergeNewReceiptIntoForm(Number(pageMeta.value.newReceiptId))
    }
    return
  }

  isEditMode.value = true

  const res = await $fetch<GetReimbursementResponse>(`/api/reimbursements/${reimbursementId.value}`, { method: 'GET'})

  if (!res.ok) {
    isEditMode.value = false
    return
  }

  form.value = {
    ...res.reimbursement,
    positions: res.reimbursement.positions.map(position => ({
      receipt_id: position.receipt.id,
      receipt: position.receipt
    }))
  }

  if (pageMeta.value?.newReceiptId) {
    mergeNewReceiptIntoForm(Number(pageMeta.value.newReceiptId))
  }

  if (!res.file) return
  existingFile.value = {
    id: res.file.id,
    url: `/api/files/${res.file.id}`,
    name: res.file.original_name,
    mime_type: res.file.mime_type,
    size: res.file.file_size
  }
  file.value = null
  removeExistingFile.value = false
})

function onRemoveFile() {
  existingFile.value = null
  removeExistingFile.value = true
}

async function submit() {
  if (!form.value.paid_by) {
    alert('Please select who paid the reimbursement.')
    return
  }

  if (!form.value.submitted_at) {
    alert('Please enter a submitted date.')
    return
  }

  if (!form.value.positions.length) {
    alert('Please add at least one receipt to this reimbursement.')
    return
  }

  const hasFile = !!file.value || (!!existingFile.value && !removeExistingFile.value)
  if (!hasFile) {
    alert('A file is required for reimbursements.')
    return
  }

  const hasCheckedPair = Boolean(form.value.checked_by) === Boolean(form.value.checked_at)
  if (!hasCheckedPair) {
    alert('checked_by and checked_at must both be set or both be empty.')
    return
  }

  const hasDisbursedPair = Boolean(form.value.disbursed_by) === Boolean(form.value.disbursed_at)
  if (!hasDisbursedPair) {
    alert('disbursed_by and disbursed_at must both be set or both be empty.')
    return
  }

  if (!form.value.cash) {
    if (!form.value.bankname?.trim()) {
      alert('Bankname is required when cash is false.')
      return
    }
    if (!form.value.iban?.trim()) {
      alert('IBAN is required when cash is false.')
      return
    }
  }

  const body = new FormData()

  if(file.value) body.append('file', file.value)

  if (form.value.positions.some(position => !position.receipt_id && !position.receipt?.id)) {
    alert('At least one reimbursement position has no receipt id.')
    return
  }

  const payload: CreateReimbursementBody = {
    ...form.value,
    positions: form.value.positions.map(position => ({
      receipt_id: position.receipt_id || position.receipt!.id
    }))
  }

  body.append('reimbursement', JSON.stringify(payload))

  try {
    if (isEditMode.value) {
      body.append('removeExistingFile', String(removeExistingFile.value))
      const updateRes = await $fetch<{ ok: boolean, error?: string }>(`/api/reimbursements/${reimbursementId.value}`, {
        method: 'PUT',
        body,
      })
      if (!updateRes.ok) throw new Error(updateRes.error || 'Failed to update reimbursement')
    } else {
      const createRes = await $fetch<{ ok: boolean, error?: string }>('/api/reimbursements/create', {
        method: 'POST',
        body,
      })
      if (!createRes.ok) throw new Error(createRes.error || 'Failed to create reimbursement')
    }

    alert(isEditMode.value ? 'Reimbursement updated successfully!' : 'Reimbursement created successfully!')
    const returnTo = pageMeta.value?.returnTo || 'ReimbursementList'
    setPage(returnTo)
  } catch (err: any) {
    alert(err?.message || 'Failed to save reimbursement.')
  }
}

function cancel() {
  const returnTo = pageMeta.value?.returnTo || 'ReimbursementList'
  setPage(returnTo)
}
</script>
