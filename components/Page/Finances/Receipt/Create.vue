<template>
  <Page headline1="Beleg" @open-menu="$emit('openMenu')">
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
        <ReceiptForm
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
import ReceiptForm from './Form.vue'
import { ReceiptStatus, type CreateReceiptBody } from '~/types/receipt'
import { usePage } from '~/composables/usePage'
import type { GetReceiptResponse } from '~/server/api/receipts/[id].get'

const emit = defineEmits<{
  (e: 'openMenu'): void
}>()

const { setPage, pageMeta } = usePage()

const isEditMode = ref(false)
const receiptId = ref<number | null>(null)

const file = ref<File | null>(null)
const existingFile = ref<{
    id: number
    url: string
    name: string
    mime_type: string
    size: number
  } | null>(null)
const removeExistingFile = ref(false)

const form = ref<CreateReceiptBody>({
  receipt_date: '',
  receipt_number: null,
  description: null,
  status: ReceiptStatus.Open,
  company_id: null,
  positions: [{
    sphere: 0,
    cost_centre: 0,
    amount: 0.0,
    tax: 19
  }]
})

onMounted(async () => {
  receiptId.value = pageMeta.value?.receiptId
  if (!receiptId.value) return

  isEditMode.value = true

  const res = await $fetch<GetReceiptResponse>(`/api/receipts/${receiptId.value}`, { method: 'GET'})

  if (!res.ok) {
    isEditMode.value = false
    return
  }

  form.value = {
    receipt_date: res.receipt.receipt_date,
    receipt_number: res.receipt.receipt_number,
    description: res.receipt.description,
    status: res.receipt.status,
    company_id: res.receipt.company_id,
    positions: res.receipt.positions
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
  if (!form.value.receipt_date) {
    alert('Please enter a receipt date.')
    return
  }

  if (!form.value.positions.length) {
    alert('Please add at least one position.')
    return
  }

  if (form.value.positions.some(p => !p.sphere || !p.cost_centre || p.amount === null || p.amount === undefined)) {
    alert('Each position requires sphere, cost centre and amount.')
    return
  }

  const hasFile = !!file.value || (!!existingFile.value && !removeExistingFile.value)
  const requiresFile = form.value.status === ReceiptStatus.Open || form.value.status === ReceiptStatus.Paid
  if (requiresFile && !hasFile) {
    alert('A file is required when status is open or paid.')
    return
  }

  const body = new FormData()

  if(file.value) body.append('file', file.value)

  body.append('receipt', JSON.stringify(form.value))

  try {
    let createdReceiptId: number | null = null
    if (isEditMode.value) {
      body.append('removeExistingFile', String(removeExistingFile.value))
      const updateRes = await $fetch<{ ok: boolean, error?: string }>(`/api/receipts/${receiptId.value}`, {
        method: 'PUT',
        body,
      })
      if (!updateRes.ok) throw new Error(updateRes.error || 'Failed to update receipt')
    } else {
      const createRes = await $fetch<{ ok: boolean, receiptId?: number, error?: string }>('/api/receipts/create', {
        method: 'POST',
        body,
      })
      if (!createRes.ok) throw new Error(createRes.error || 'Failed to create receipt')
      if (createRes.receiptId) createdReceiptId = createRes.receiptId
    }

    alert(isEditMode.value ? 'Receipt updated successfully!' : 'Receipt created successfully!')
    const returnTo = pageMeta.value?.returnTo || 'ReceiptList'
    const returnToMeta = pageMeta.value?.returnToMeta
      ? { ...pageMeta.value.returnToMeta }
      : undefined

    if (createdReceiptId && returnTo === 'ReimbursementCreate') {
      if (!returnToMeta) {
        setPage(returnTo, { newReceiptId: createdReceiptId })
        return
      }
      returnToMeta.newReceiptId = createdReceiptId
    }

    setPage(returnTo, returnToMeta)
  } catch (err: any) {
    alert(err?.message || 'Failed to upload receipt.')
  }
}

function cancel() {
  const returnTo = pageMeta.value?.returnTo || 'ReceiptList'
  const returnToMeta = pageMeta.value?.returnToMeta
    ? { ...pageMeta.value.returnToMeta }
    : undefined
  setPage(returnTo, returnToMeta)
}
</script>
