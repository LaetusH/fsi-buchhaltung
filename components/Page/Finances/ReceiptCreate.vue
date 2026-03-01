<template>
  <Page headline1="New receipt" @open-menu="$emit('openMenu')">
    <template #cards>
      <div class="col-span-6">
        <ClientOnly>
          <FileDrop 
            v-model:model-value="file" 
          />
        </ClientOnly>
      </div>

      <div class="col-span-6">
        <ReceiptForm
          v-model="form"
          :disabled="!file"
          @submit="submit"
        />
      </div>
    </template>
  </Page>
</template>

<script setup lang="ts">
import Page from '~/components/Page.vue'
import FileDrop from './FileDrop.vue'
import ReceiptForm from './ReceiptForm.vue'
import { ReceiptStatus, type CreateReceiptBody } from '~/types/receipt';

const emit = defineEmits<{
  (e: 'openMenu'): void
}>()

const file = ref<File | null>(null)

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

async function submit() {
  if (!file.value) {
    alert('Please upload a file.')
    return
  }

  if (!form.value.receipt_date) {
    alert('Please enter a receipt date.')
    return
  }

  const body = new FormData()

  body.append('file', file.value)

  body.append('receipt', JSON.stringify(form.value))

  try {
    const res = await $fetch('/api/receipts/create', {
      method: 'POST',
      body,
    })

    alert('Receipt created successfully!')
  } catch (err: any) {
    alert(err?.message || 'Failed to upload receipt.')
  }
}
</script>