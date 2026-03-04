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
          :disabled="!file"
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

  const body = new FormData()

  if(file.value) body.append('file', file.value)

  body.append('receipt', JSON.stringify(form.value))

  try {
    if (isEditMode.value) {
      body.append('removeExistingFile', String(removeExistingFile.value))
      await $fetch(`/api/receipts/${receiptId.value}`, {
        method: 'PUT',
        body,
      })
    } else {
      await $fetch('/api/receipts/create', {
        method: 'POST',
        body,
      })
    }

    alert('Receipt created successfully!')
    const returnTo = pageMeta.value?.returnTo || 'ReceiptList'
    setPage(returnTo)
  } catch (err: any) {
    alert(err?.message || 'Failed to upload receipt.')
  }
}

function cancel() {
  const returnTo = pageMeta.value?.returnTo || 'ReceiptList'
  setPage(returnTo)
}
</script>