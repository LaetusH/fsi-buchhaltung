<template>
  <PageFinancesEditorLayout
    :headline1="t('invoice.title')"
    :can-view-files="canViewFiles"
    :model-value="file"
    :existing-file="existingFile"
    :can-edit="canEdit"
    :sidebar-mode="sidebarMode"
    @open-menu="$emit('openMenu')"
    @update:model-value="file = $event"
    @remove-existing="onRemoveFile"
  >
    <template #sidebar>
      <div class="space-y-3">
        <h2 class="text-lg font-semibold">{{ t('invoice.generatedPreviewTitle') }}</h2>
        <p class="text-sm text-slate-600">{{ t('invoice.generatedPreviewText') }}</p>
        <p class="text-xs text-slate-500">{{ t('invoice.generatedUsesAssociation') }}</p>
      </div>
    </template>

    <div v-if="isLocked" class="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {{ t('invoice.lockedNotice', { status: t(`invoice.states.${form.status}`) }) }}
    </div>

    <InvoiceForm
      v-model="form"
      :disabled="!canEdit"
      :status-disabled="!canEditStatus"
      :status-targets="statusTargets"
      :has-file="!!file || (!!existingFile && !removeExistingFile)"
      :can-edit-company="canEditCompany"
      @submit="submit"
      @cancel="cancel"
    />
  </PageFinancesEditorLayout>

  <Teleport to="body">
    <div
      v-if="showFinalizeConfirmModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div class="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
        <h3 class="text-lg font-semibold text-slate-900">
          {{ t('invoice.finalizeConfirm.title') }}
        </h3>
        <p class="mt-3 text-sm text-slate-700">
          {{ t('invoice.finalizeConfirm.intro', { status: t(`invoice.states.${form.status}`) }) }}
        </p>
        <p class="mt-2 text-sm text-slate-600">
          {{ t('invoice.finalizeConfirm.reviewHint') }}
        </p>

        <div class="mt-6 flex justify-end gap-3">
          <button class="btn-secondary" type="button" @click="showFinalizeConfirmModal = false">
            {{ t('actions.cancel') }}
          </button>
          <button class="btn-primary" type="button" @click="confirmFinalizeSave">
            {{ t('invoice.finalizeConfirm.continue') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'
import { useI18n } from '~/composables/useI18n'
import { usePage } from '~/composables/usePage'
import { useReturnTarget } from '~/composables/useReturnTarget'
import { useToast } from '~/composables/useToast'
import type { GetInvoiceResponse } from '~/server/api/invoices/[id].get'
import { InvoiceSourceType, InvoiceStatus, type CreateInvoiceBody } from '~/types/invoice'
import InvoiceForm from './Form.vue'

defineEmits<{
  (e: 'openMenu'): void
}>()

const { t } = useI18n()
const toast = useToast()
const { pageMeta } = usePage()
const { hasPermission } = useAuth()
const { goToReturnTarget } = useReturnTarget('InvoiceList')

const persistedStatus = ref<InvoiceStatus | null>(null)
const isLocked = computed(() => isEditMode.value && persistedStatus.value !== InvoiceStatus.Draft)
const canEdit = computed(() => !pageMeta.value?.forceReadonly && hasPermission('invoices.edit') && !isLocked.value)
const canEditStatus = computed(() => !pageMeta.value?.forceReadonly && hasPermission('invoices.edit'))
const canEditCompany = computed(() => canEdit.value && hasPermission('companies.edit'))
const statusTargets = computed<InvoiceStatus[] | undefined>(() => {
  if (!canEditStatus.value || !isLocked.value) return undefined
  return [InvoiceStatus.Open, InvoiceStatus.Paid, InvoiceStatus.Cancelled].filter(status => status !== form.value.status)
})

const isEditMode = ref(false)
const invoiceId = ref<number | null>(null)
const file = ref<File | null>(null)
const existingFile = ref<{ id: number, url: string, name: string, mime_type: string, size: number } | null>(null)
const removeExistingFile = ref(false)
const canViewFiles = computed(() => hasPermission('files.view') && (canEdit.value || existingFile.value !== null))
const showFinalizeConfirmModal = ref(false)

const form = ref<CreateInvoiceBody>({
  company_id: null,
  source_type: InvoiceSourceType.Generated,
  is_kleinunternehmer: false,
  invoice_date: '',
  due_date: '',
  paid_at: null,
  contact_person: null,
  service_date: null,
  invoice_number: '',
  subject: null,
  intro_text: null,
  notes: null,
  status: InvoiceStatus.Draft,
  positions: [{ name: '', description: '', sphere: 0, cost_centre: 0, quantity: 1, unit: null, unit_price: 0, tax: 19 }],
})

const sidebarMode = computed<'file' | 'custom'>(() => {
  if (!canViewFiles.value && form.value.source_type === InvoiceSourceType.Generated) return 'custom'
  if (form.value.source_type === InvoiceSourceType.Generated && !existingFile.value && !file.value) return 'custom'
  return 'file'
})

onMounted(async () => {
  invoiceId.value = pageMeta.value?.invoiceId
  if (!invoiceId.value) return

  isEditMode.value = true
  await loadInvoice(invoiceId.value)
})

function onRemoveFile() {
  existingFile.value = null
  removeExistingFile.value = true
}

async function submit() {
  if (!canEditStatus.value) {
    toast.error(t('common.notAuthorized'))
    return
  }

  const previousStatus = persistedStatus.value ?? InvoiceStatus.Draft
  const willBecomeLocked = previousStatus === InvoiceStatus.Draft && form.value.status !== InvoiceStatus.Draft

  if (willBecomeLocked) {
    showFinalizeConfirmModal.value = true
    return
  }

  await saveInvoice()
}

async function confirmFinalizeSave() {
  showFinalizeConfirmModal.value = false
  await saveInvoice()
}

async function saveInvoice() {
  const body = new FormData()
  if (file.value) body.append('file', file.value)
  body.append('invoice', JSON.stringify(form.value))

  try {
    if (isEditMode.value) {
      body.append('removeExistingFile', String(removeExistingFile.value))
      const res = await $fetch<{ ok: boolean, error?: string }>(`/api/invoices/${invoiceId.value}`, {
        method: 'PUT',
        body,
      })
      if (!res.ok) throw new Error(res.error || t('invoice.saved.failedUpdate'))
      if (invoiceId.value) await loadInvoice(invoiceId.value)
      toast.success(t('invoice.saved.updated'))
    } else {
      const res = await $fetch<{ ok: boolean, error?: string }>('/api/invoices/create', {
        method: 'POST',
        body,
      })
      if (!res.ok) throw new Error(res.error || t('invoice.saved.failedCreate'))
      toast.success(t('invoice.saved.created'))
    }

    goToReturnTarget()
  } catch (err: any) {
    toast.error(err?.message || t('invoice.saved.failedSave'))
  }
}

function cancel() {
  goToReturnTarget()
}

async function loadInvoice(id: number) {
  const res = await $fetch<GetInvoiceResponse>(`/api/invoices/${id}`)
  if (!res.ok) {
    isEditMode.value = false
    persistedStatus.value = null
    return
  }

  form.value = {
    company_id: res.invoice.company_id,
    source_type: res.invoice.source_type,
    is_kleinunternehmer: res.invoice.is_kleinunternehmer,
    invoice_date: res.invoice.invoice_date,
    due_date: res.invoice.due_date,
    paid_at: res.invoice.paid_at,
    contact_person: res.invoice.contact_person,
    service_date: res.invoice.service_date,
    invoice_number: res.invoice.invoice_number,
    subject: res.invoice.subject,
    intro_text: res.invoice.intro_text,
    notes: res.invoice.notes,
    status: res.invoice.status,
    positions: res.invoice.positions,
  }
  persistedStatus.value = res.invoice.status

  file.value = null
  removeExistingFile.value = false
  existingFile.value = res.file
    ? {
        id: res.file.id,
        url: `/api/files/${res.file.id}?v=${Date.now()}`,
        name: res.file.original_name,
        mime_type: res.file.mime_type,
        size: res.file.file_size,
      }
    : null
}
</script>
