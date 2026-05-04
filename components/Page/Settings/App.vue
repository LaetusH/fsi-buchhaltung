<template>
  <div class="bg-white rounded-xl shadow-lg p-6 space-y-6 col-span-12">
    <h2 class="text-lg font-semibold">{{ t('settings.app.title') }}</h2>

    <section class="rounded-xl border border-slate-200 p-4 space-y-4">
      <div>
        <h3 class="font-semibold">{{ t('settings.app.invoiceTextsTitle') }}</h3>
        <p class="text-sm text-slate-600">{{ t('settings.app.invoiceTextsText') }}</p>
      </div>

      <div class="flex flex-wrap gap-2">
        <span
          v-for="variable in invoiceTextVariables"
          :key="variable.key"
          class="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700"
          :title="variable.label"
        >
          {{ variableToken(variable.key) }}
        </span>
      </div>

      <div class="grid gap-4">
        <div class="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
          <div class="field">
            <label>{{ t('settings.app.invoiceNumberTemplate') }}</label>
            <input v-model="invoiceTextForm.invoice_number_template" class="input" :disabled="isSavingInvoiceTexts">
          </div>
          <div class="field">
            <label>{{ t('settings.app.invoiceNumberNextIncrement') }}</label>
            <input
              v-model.number="invoiceTextForm.invoice_number_next_increment"
              type="number"
              min="1"
              step="1"
              class="input md:w-36"
              :disabled="isSavingInvoiceTexts"
            >
          </div>
          <div class="field">
            <label>{{ t('settings.app.invoiceNumberIncrementDigits') }}</label>
            <input
              v-model.number="invoiceTextForm.invoice_number_increment_digits"
              type="number"
              min="1"
              step="1"
              class="input md:w-36"
              :disabled="isSavingInvoiceTexts"
            >
          </div>
        </div>
        <label class="inline-flex items-center gap-3 text-sm text-slate-700 select-none cursor-pointer">
          <input
            v-model="invoiceTextForm.invoice_number_manual_edit_disabled"
            type="checkbox"
            class="checkbox"
            :disabled="isSavingInvoiceTexts"
          >
          <span>{{ t('settings.app.invoiceNumberManualEditDisabled') }}</span>
        </label>
        <div class="field">
          <label>{{ t('settings.app.invoiceSubject') }}</label>
          <input v-model="invoiceTextForm.subject" class="input" :disabled="isSavingInvoiceTexts">
        </div>
        <div class="field">
          <label>{{ t('settings.app.invoiceIntroText') }}</label>
          <textarea v-model="invoiceTextForm.intro_text" rows="3" class="input resize-y" :disabled="isSavingInvoiceTexts" />
        </div>
        <div class="field">
          <label>{{ t('settings.app.invoiceNotes') }}</label>
          <textarea v-model="invoiceTextForm.notes" rows="4" class="input resize-y" :disabled="isSavingInvoiceTexts" />
        </div>
        <label class="inline-flex items-center gap-3 text-sm text-slate-700 select-none cursor-pointer">
          <input
            v-model="invoiceTextForm.is_kleinunternehmer_default"
            type="checkbox"
            class="checkbox"
            :disabled="isSavingInvoiceTexts"
          >
          <span>{{ t('settings.app.invoiceKleinunternehmerDefault') }}</span>
        </label>
      </div>

      <div class="flex justify-end">
        <button
          class="btn-primary"
          :disabled="isSavingInvoiceTexts"
          :class="{ 'opacity-50 cursor-not-allowed': isSavingInvoiceTexts }"
          @click="saveInvoiceTexts"
        >
          {{ isSavingInvoiceTexts ? t('settings.app.invoiceTextsSaving') : t('settings.app.invoiceTextsSave') }}
        </button>
      </div>
    </section>

    <section v-if="canManageSnapshots" class="rounded-xl border border-slate-200 p-4 space-y-3">
      <div>
        <h3 class="font-semibold">{{ t('settings.app.snapshotTitle') }}</h3>
        <p class="text-sm text-slate-600">{{ t('settings.app.snapshotText') }}</p>
      </div>

      <div class="flex flex-wrap gap-2">
        <input
          v-model="snapshotPassword"
          class="input max-w-sm"
          type="password"
          autocomplete="new-password"
          :placeholder="t('settings.app.snapshotPasswordPlaceholder')"
        >

        <button
          class="btn-primary"
          :disabled="isDownloadingSnapshot || isDownloadingFiles || !canUseSnapshotPassword"
          :class="{ 'opacity-50 cursor-not-allowed': isDownloadingSnapshot || isDownloadingFiles || !canUseSnapshotPassword }"
          @click="downloadSnapshot"
        >
          {{ isDownloadingSnapshot ? t('settings.app.downloading') : t('settings.app.download') }}
        </button>

        <button
          class="btn-secondary"
          :disabled="isDownloadingSnapshot || isDownloadingFiles"
          :class="{ 'opacity-50 cursor-not-allowed': isDownloadingSnapshot || isDownloadingFiles }"
          @click="downloadFiles"
        >
          {{ isDownloadingFiles ? t('settings.app.downloadingFiles') : t('settings.app.downloadFiles') }}
        </button>
      </div>

      <p class="text-xs text-slate-500">{{ t('settings.app.snapshotPasswordHelp') }}</p>
      <p class="text-xs text-slate-500">{{ t('settings.app.filesArchiveText') }}</p>
    </section>

    <section v-if="canManageSnapshots" class="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
      <div>
        <h3 class="font-semibold text-red-900">{{ t('settings.app.restoreTitle') }}</h3>
        <p class="text-sm text-red-800">{{ t('settings.app.restoreText') }}</p>
      </div>

      <input
        ref="fileInput"
        class="input bg-white"
        type="file"
        accept="application/json,.json,.enc,application/octet-stream"
        @change="handleFileChange"
      >

      <input
        v-model="restorePassword"
        class="input bg-white"
        type="password"
        autocomplete="new-password"
        :placeholder="t('settings.app.restorePasswordPlaceholder')"
        @input="handleRestorePasswordInput"
      >

      <label class="block space-y-1">
        <span class="text-sm font-medium text-red-900">{{ t('settings.app.filesArchiveLabel') }}</span>
        <input
          ref="archiveInput"
          class="input bg-white"
          type="file"
          accept=".tar,application/x-tar"
          @change="handleArchiveChange"
        >
      </label>

      <button
        class="btn-primary"
        :disabled="isPreviewing || isRestoring || !selectedFile || !canUseRestorePassword"
        :class="{ 'opacity-50 cursor-not-allowed': isPreviewing || isRestoring || !selectedFile || !canUseRestorePassword }"
        @click="openRestorePreview"
      >
        {{ isPreviewing ? t('settings.app.previewing') : t('settings.app.previewRestore') }}
      </button>

      <div v-if="isPreviewing && uploadProgress !== null" class="space-y-1">
        <div class="h-2 overflow-hidden rounded-full bg-red-100">
          <div class="h-full bg-orange-500" :style="{ width: `${uploadProgress}%` }" />
        </div>
        <p class="text-xs text-red-800">{{ t('settings.app.uploadProgress', { progress: String(uploadProgress) }) }}</p>
      </div>
    </section>

    <section v-else class="rounded-xl border border-slate-200 p-4">
      <p class="text-sm text-slate-600">{{ t('settings.app.noSnapshotPermission') }}</p>
    </section>

    <CommonModal
      v-if="restorePreview"
      :model-value="!!restorePreview"
      :title="t('settings.app.restorePreviewTitle')"
      width-class="max-w-2xl"
      @update:model-value="closeRestorePreview"
    >
      <p class="text-sm text-slate-600">{{ t('settings.app.restorePreviewText') }}</p>

      <div class="grid md:grid-cols-2 gap-3 text-sm">
        <div class="rounded-lg border border-slate-200 p-3">
          <p class="text-xs text-slate-500">{{ t('settings.app.previewCreatedAt') }}</p>
          <p class="font-medium">{{ previewCreatedAtLabel }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-3">
          <p class="text-xs text-slate-500">{{ t('settings.app.previewDatabase') }}</p>
          <p class="font-medium">{{ restorePreview.database || t('settings.app.previewUnknown') }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-3">
          <p class="text-xs text-slate-500">{{ t('settings.app.previewApp') }}</p>
          <p class="font-medium">{{ previewAppLabel }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-3">
          <p class="text-xs text-slate-500">{{ t('settings.app.previewSchema') }}</p>
          <p class="font-medium">{{ restorePreview.schemaVersion || t('settings.app.previewUnknown') }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-3">
          <p class="text-xs text-slate-500">{{ t('settings.app.previewTables') }}</p>
          <p class="font-medium">{{ restorePreview.tables }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-3">
          <p class="text-xs text-slate-500">{{ t('settings.app.previewRows') }}</p>
          <p class="font-medium">{{ restorePreview.rows }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-3 md:col-span-2">
          <p class="text-xs text-slate-500">{{ t('settings.app.previewIntegrity') }}</p>
          <p class="font-medium">{{ integrityLabel }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-3 md:col-span-2">
          <p class="text-xs text-slate-500">{{ t('settings.app.previewFilesArchive') }}</p>
          <p class="font-medium">{{ filesArchiveLabel }}</p>
        </div>
      </div>

      <div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 space-y-2">
        <p>{{ t('settings.app.restoreSessionsWarning') }}</p>
        <div v-if="isRestoring && uploadProgress !== null" class="space-y-1">
          <div class="h-2 overflow-hidden rounded-full bg-red-100">
            <div class="h-full bg-orange-500" :style="{ width: `${uploadProgress}%` }" />
          </div>
          <p class="text-xs text-red-800">{{ t('settings.app.uploadProgress', { progress: String(uploadProgress) }) }}</p>
        </div>
        <label class="block">
          <span class="text-xs font-medium text-red-900">{{ t('settings.app.restoreConfirmLabel') }}</span>
          <input v-model="restoreConfirmation" class="input mt-1 bg-white" autocomplete="off">
        </label>
      </div>

      <template #footer>
        <button class="btn-secondary" type="button" @click="closeRestorePreview">
          {{ t('actions.cancel') }}
        </button>
        <button
          class="btn-primary"
          type="button"
          :disabled="isRestoring || restoreConfirmation !== 'RESTORE' || !canRestorePreview"
          :class="{ 'opacity-50 cursor-not-allowed': isRestoring || restoreConfirmation !== 'RESTORE' || !canRestorePreview }"
          @click="restoreSnapshot"
        >
          {{ isRestoring ? t('settings.app.restoring') : t('settings.app.restore') }}
        </button>
      </template>
    </CommonModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import { useToast } from '~/composables/useToast'
import type { PreviewSnapshotResponse } from '~/server/api/settings/app/snapshot.preview.post'
import type { PreviewFilesSnapshotResponse } from '~/server/api/settings/app/snapshot.files-preview.post'
import type { RestoreSnapshotResponse } from '~/server/api/settings/app/snapshot.restore.post'
import type { InvoiceTextSettings, InvoiceTextVariable } from '~/types/appSettings'

const { t } = useI18n()
const { formatDateTime } = useLocaleFormatters()
const { hasPermission, fetchSession } = useAuth()
const toast = useToast()

const canManageSnapshots = computed(() => hasPermission('settings.app.snapshots.manage'))
const isDownloadingSnapshot = ref(false)
const isDownloadingFiles = ref(false)
const isPreviewing = ref(false)
const isRestoring = ref(false)
const uploadProgress = ref<number | null>(null)
const selectedFile = ref<File | null>(null)
const selectedArchive = ref<File | null>(null)
const restoreToken = ref('')
const snapshotPassword = ref('')
const restorePassword = ref('')
const restorePreview = ref<Extract<PreviewSnapshotResponse, { ok: true }> | null>(null)
const restoreConfirmation = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const archiveInput = ref<HTMLInputElement | null>(null)
const isSavingInvoiceTexts = ref(false)
const invoiceTextForm = ref<InvoiceTextSettings>({
  invoice_number_template: '',
  invoice_number_next_increment: 1,
  invoice_number_increment_digits: 1,
  invoice_number_manual_edit_disabled: false,
  subject: '',
  intro_text: '',
  notes: '',
  is_kleinunternehmer_default: false,
})
const invoiceTextVariables = ref<InvoiceTextVariable[]>([])

const previewAppLabel = computed(() => {
  if (!restorePreview.value) return ''
  const name = restorePreview.value.appName || t('settings.app.previewUnknown')
  return restorePreview.value.appVersion ? `${name} ${restorePreview.value.appVersion}` : name
})

const canUseSnapshotPassword = computed(() => snapshotPassword.value.length >= 12)
const canUseRestorePassword = computed(() => restorePassword.value.length >= 12)

const previewCreatedAtLabel = computed(() => {
  if (!restorePreview.value?.createdAt) return t('settings.app.previewUnknown')
  return formatDateTime(restorePreview.value.createdAt)
})

const integrityLabel = computed(() => {
  if (!restorePreview.value) return ''
  if (!restorePreview.value.integrity.present) return t('settings.app.integrityMissing')
  return restorePreview.value.integrity.valid ? t('settings.app.integrityValid') : t('settings.app.integrityInvalid')
})

const filesArchiveLabel = computed(() => {
  if (!restorePreview.value) return ''
  if (!restorePreview.value.filesArchive.provided) return t('settings.app.filesArchiveMissing')
  return t('settings.app.filesArchiveValid', {
    files: String(restorePreview.value.filesArchive.fileCount),
    archived: String(restorePreview.value.filesArchive.archiveFileCount),
  })
})

const canRestorePreview = computed(() => {
  if (!restorePreview.value) return false
  return !restorePreview.value.integrity.present || restorePreview.value.integrity.valid
})

onMounted(loadInvoiceTexts)

async function loadInvoiceTexts() {
  const res = await $fetch<{ ok: boolean, settings?: InvoiceTextSettings, variables?: InvoiceTextVariable[], error?: string }>('/api/settings/app/invoice-texts')
  if (!res.ok || !res.settings) {
    toast.error(res.error || t('settings.app.invoiceTextsLoadFailed'))
    return
  }

  invoiceTextForm.value = { ...res.settings }
  invoiceTextVariables.value = res.variables ?? []
}

async function saveInvoiceTexts() {
  isSavingInvoiceTexts.value = true
  try {
    const res = await $fetch<{ ok: boolean, settings?: InvoiceTextSettings, error?: string }>('/api/settings/app/invoice-texts.save', {
      method: 'POST',
      body: invoiceTextForm.value,
    })
    if (!res.ok || !res.settings) {
      toast.error(res.error || t('settings.app.invoiceTextsSaveFailed'))
      return
    }

    invoiceTextForm.value = { ...res.settings }
    toast.success(t('settings.app.invoiceTextsSaved'))
  } catch (err) {
    toast.error(t('settings.app.invoiceTextsSaveFailed'))
  } finally {
    isSavingInvoiceTexts.value = false
  }
}

function variableToken(key: string) {
  return `{${key}}`
}

function handleFileChange(event: Event) {
  selectedFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
  restoreToken.value = ''
  restorePreview.value = null
  restoreConfirmation.value = ''
}

function handleArchiveChange(event: Event) {
  selectedArchive.value = (event.target as HTMLInputElement).files?.[0] ?? null
  restorePreview.value = null
  restoreConfirmation.value = ''
}

function handleRestorePasswordInput() {
  restoreToken.value = ''
  restorePreview.value = null
  restoreConfirmation.value = ''
}

function postDownloadSnapshot() {
  const iframeName = `snapshot-download-${Date.now()}`
  const iframe = document.createElement('iframe')
  iframe.name = iframeName
  iframe.style.display = 'none'
  document.body.appendChild(iframe)

  const form = document.createElement('form')
  form.method = 'POST'
  form.action = '/api/settings/app/snapshot'
  form.target = iframeName
  form.style.display = 'none'

  const passwordInput = document.createElement('input')
  passwordInput.type = 'hidden'
  passwordInput.name = 'password'
  passwordInput.value = snapshotPassword.value
  form.appendChild(passwordInput)

  document.body.appendChild(form)
  form.submit()
  form.remove()
  window.setTimeout(() => iframe.remove(), 60_000)
}

async function downloadSnapshot() {
  if (!canUseSnapshotPassword.value) return
  isDownloadingSnapshot.value = true
  try {
    postDownloadSnapshot()
    toast.success(t('settings.app.downloadSuccess'))
  } catch (err) {
    toast.error(t('settings.app.downloadFailed'))
  } finally {
    isDownloadingSnapshot.value = false
  }
}

async function downloadFiles() {
  isDownloadingFiles.value = true
  try {
    const link = document.createElement('a')
    link.href = `/api/settings/app/files?download=${Date.now()}`
    link.download = 'fsi-buchhaltung-files.tar'
    link.click()
    toast.success(t('settings.app.filesDownloadSuccess'))
  } catch (err) {
    toast.error(t('settings.app.filesDownloadFailed'))
  } finally {
    isDownloadingFiles.value = false
  }
}

function sendFormData<T>(url: string, body: FormData) {
  uploadProgress.value = 0

  return new Promise<T>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', url)
    request.responseType = 'text'

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      uploadProgress.value = Math.min(100, Math.round((event.loaded / event.total) * 100))
    }

    request.onload = () => {
      uploadProgress.value = 100
      try {
        const data = request.responseText ? JSON.parse(request.responseText) : null
        if (request.status >= 200 && request.status < 300) {
          resolve(data as T)
        } else {
          reject(new Error(data?.message || data?.error || request.statusText))
        }
      } catch (err) {
        reject(err)
      }
    }

    request.onerror = () => reject(new Error('Upload failed'))
    request.send(body)
  })
}

async function openRestorePreview() {
  if (!selectedFile.value) return

  isPreviewing.value = true
  try {
    const body = new FormData()
    body.append('snapshotFile', selectedFile.value)
    body.append('password', restorePassword.value)

    const res = await sendFormData<PreviewSnapshotResponse>('/api/settings/app/snapshot.preview', body)

    if (!res.ok) {
      toast.error(res.error || t('settings.app.previewFailed'))
      return
    }

    const canRestoreSnapshotIntegrity = !res.integrity.present || res.integrity.valid
    if (selectedArchive.value && canRestoreSnapshotIntegrity) {
      const archiveBody = new FormData()
      archiveBody.append('restoreToken', res.restoreToken)
      archiveBody.append('archive', selectedArchive.value)

      const archiveRes = await sendFormData<PreviewFilesSnapshotResponse>('/api/settings/app/snapshot.files-preview', archiveBody)
      if (!archiveRes.ok) {
        toast.error(archiveRes.error || t('settings.app.previewFailed'))
        return
      }

      res.filesArchive = archiveRes.filesArchive
    }

    restoreToken.value = res.restoreToken
    restorePreview.value = res
    restoreConfirmation.value = ''
  } catch (err) {
    toast.error(t('settings.app.previewFailed'))
  } finally {
    isPreviewing.value = false
    uploadProgress.value = null
  }
}

function closeRestorePreview() {
  restorePreview.value = null
  restoreConfirmation.value = ''
}

async function restoreSnapshot() {
  if (!restoreToken.value || restoreConfirmation.value !== 'RESTORE' || !canRestorePreview.value) return

  isRestoring.value = true
  try {
    const res = await sendFormData<RestoreSnapshotResponse>('/api/settings/app/snapshot.restore', restoreBody())

    if (!res.ok) {
      toast.error(res.error || t('settings.app.restoreFailed'))
      return
    }

    selectedFile.value = null
    selectedArchive.value = null
    restoreToken.value = ''
    closeRestorePreview()
    if (fileInput.value) fileInput.value.value = ''
    if (archiveInput.value) archiveInput.value.value = ''
    await fetchSession()
    toast.success(t('settings.app.restoreSuccess', { tables: String(res.tables), rows: String(res.rows), files: String(res.files) }))
  } catch (err) {
    toast.error(t('settings.app.restoreFailed'))
  } finally {
    isRestoring.value = false
    uploadProgress.value = null
  }
}

function restoreBody() {
  const body = new FormData()
  body.append('restoreToken', restoreToken.value)
  if (selectedArchive.value) body.append('archive', selectedArchive.value)
  return body
}
</script>
