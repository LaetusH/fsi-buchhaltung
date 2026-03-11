<template>
  <Page :headline1="t('receipt.title')" @open-menu="$emit('openMenu')">
    <template #cards>
      <div class="col-span-6 self-start">
        <ClientOnly v-if="canViewFiles">
          <FileDrop
            v-model:model-value="file"
            :existing-file="existingFile"
            :can-edit="canEdit"
            @remove-existing="onRemoveFile"
          />
        </ClientOnly>
      </div>

      <div
        data-finance-form-column
        :class="[canViewFiles ? 'col-span-6 self-start' : 'col-span-12 lg:col-span-8 lg:col-start-3 self-start']"
      >
        <ReceiptForm
          v-model="form"
          :has-file="!!file || (!!existingFile && !removeExistingFile)"
          :disabled="!canEdit"
          :can-edit-company="canEditCompany"
          @submit="submit"
          @cancel="cancel"
        />
      </div>
    </template>
  </Page>
</template>

<script setup lang="ts">
import Page from '~/components/Page.vue'
import { useI18n } from '~/composables/useI18n'
import FileDrop from '../FileDrop.vue'
import ReceiptForm from './Form.vue'
import { ReceiptStatus, type CreateReceiptBody } from '~/types/receipt'
import { usePage } from '~/composables/usePage'
import type { GetReceiptResponse } from '~/server/api/receipts/[id].get'
import { useAuth } from '~/composables/useAuth'

const emit = defineEmits<{
  (e: 'openMenu'): void
}>()

const { setPage, pageMeta } = usePage()
const { t } = useI18n()
const { hasPermission } = useAuth()

const canEdit = computed(() => hasPermission('receipts.edit'))
const canEditCompany = computed(() => hasPermission('companies.edit'))
const canViewFiles = computed(() => hasPermission('files.view') && (hasPermission('receipts.edit') || existingFile.value !== null))

const isEditMode = ref(false)
const receiptId = ref<number | null>(null)
const file = ref<File | null>(null)
const existingFile = ref<{ id: number, url: string, name: string, mime_type: string, size: number } | null>(null)
const removeExistingFile = ref(false)

const form = ref<CreateReceiptBody>({
  receipt_date: '',
  receipt_number: null,
  description: null,
  status: ReceiptStatus.Open,
  company_id: null,
  positions: [{ sphere: 0, cost_centre: 0, amount: 0.0, tax: 19 }]
})

onMounted(async () => {
  receiptId.value = pageMeta.value?.receiptId
  if (!receiptId.value) return

  isEditMode.value = true

  const res = await $fetch<GetReceiptResponse>(`/api/receipts/${receiptId.value}`, { method: 'GET' })

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
  if (!canEdit.value) {
    alert(t('common.notAuthorized'))
    return
  }
  if (!form.value.company_id) {
    alert(t('receipt.required.enterCompany'))
    return
  }

  if (!form.value.receipt_date) {
    alert(t('receipt.required.enterDate'))
    return
  }

  if (!form.value.positions.length) {
    alert(t('receipt.required.addPosition'))
    return
  }

  if (form.value.positions.some(p => !p.sphere || !p.cost_centre || p.amount === null || p.amount === undefined)) {
    alert(t('receipt.required.completePosition'))
    return
  }

  const hasFile = !!file.value || (!!existingFile.value && !removeExistingFile.value)
  const requiresFile = form.value.status === ReceiptStatus.Open || form.value.status === ReceiptStatus.Paid
  if (requiresFile && !hasFile) {
    alert(t('receipt.required.fileForStatus'))
    return
  }

  const body = new FormData()
  if (file.value) body.append('file', file.value)
  body.append('receipt', JSON.stringify(form.value))

  try {
    let createdReceiptId: number | null = null
    if (isEditMode.value) {
      body.append('removeExistingFile', String(removeExistingFile.value))
      const updateRes = await $fetch<{ ok: boolean, error?: string }>(`/api/receipts/${receiptId.value}`, {
        method: 'PUT',
        body,
      })
      if (!updateRes.ok) throw new Error(updateRes.error || t('receipt.saved.failedUpdate'))
    } else {
      const createRes = await $fetch<{ ok: boolean, receiptId?: number, error?: string }>('/api/receipts/create', {
        method: 'POST',
        body,
      })
      if (!createRes.ok) throw new Error(createRes.error || t('receipt.saved.failedCreate'))
      if (createRes.receiptId) createdReceiptId = createRes.receiptId
    }

    alert(isEditMode.value ? t('receipt.saved.updated') : t('receipt.saved.created'))
    const returnTo = pageMeta.value?.returnTo || 'ReceiptList'
    const returnToMeta = pageMeta.value?.returnToMeta ? { ...pageMeta.value.returnToMeta } : undefined

    if (createdReceiptId && returnTo === 'ReimbursementCreate') {
      if (!returnToMeta) {
        setPage(returnTo, { newReceiptId: createdReceiptId })
        return
      }
      returnToMeta.newReceiptId = createdReceiptId
    }

    setPage(returnTo, returnToMeta)
  } catch (err: any) {
    alert(err?.message || t('receipt.saved.failedUpload'))
  }
}

function cancel() {
  const returnTo = pageMeta.value?.returnTo || 'ReceiptList'
  const returnToMeta = pageMeta.value?.returnToMeta ? { ...pageMeta.value.returnToMeta } : undefined
  setPage(returnTo, returnToMeta)
}
</script>
