<template>
  <div class="bg-white rounded-xl shadow-lg p-6 space-y-6 col-span-12">
    <h2 class="text-lg font-semibold">{{ t('settings.app.title') }}</h2>

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

    <div
      v-if="restorePreview"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div class="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl space-y-5">
        <div>
          <h3 class="text-lg font-semibold">{{ t('settings.app.restorePreviewTitle') }}</h3>
          <p class="mt-1 text-sm text-slate-600">{{ t('settings.app.restorePreviewText') }}</p>
        </div>

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

        <div class="flex justify-end gap-2">
          <button class="btn-secondary" type="button" @click="closeRestorePreview">
            {{ t('actions.cancel') }}
          </button>
          <button
            class="btn-primary"
            type="button"
            :disabled="isRestoring || restoreConfirmation !== 'RESTORE'"
            :class="{ 'opacity-50 cursor-not-allowed': isRestoring || restoreConfirmation !== 'RESTORE' }"
            @click="restoreSnapshot"
          >
            {{ isRestoring ? t('settings.app.restoring') : t('settings.app.restore') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useI18n } from '~/composables/useI18n'
import { useLocaleFormatters } from '~/composables/useLocaleFormatters'
import { useToast } from '~/composables/useToast'
import type { PreviewSnapshotResponse } from '~/server/api/settings/app/snapshot.preview.post'
import type { RestoreSnapshotResponse } from '~/server/api/settings/app/snapshot.restore.post'

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
const selectedSnapshot = ref<unknown | null>(null)
const snapshotPassword = ref('')
const restorePassword = ref('')
const restorePreview = ref<Extract<PreviewSnapshotResponse, { ok: true }> | null>(null)
const restoreConfirmation = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const archiveInput = ref<HTMLInputElement | null>(null)

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

function handleFileChange(event: Event) {
  selectedFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
  selectedSnapshot.value = null
  restorePreview.value = null
  restoreConfirmation.value = ''
}

function handleArchiveChange(event: Event) {
  selectedArchive.value = (event.target as HTMLInputElement).files?.[0] ?? null
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
    if (selectedArchive.value) body.append('archive', selectedArchive.value)

    const res = await sendFormData<PreviewSnapshotResponse>('/api/settings/app/snapshot.preview', body)

    if (!res.ok) {
      toast.error(res.error || t('settings.app.previewFailed'))
      return
    }

    selectedSnapshot.value = selectedFile.value
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
  if (!selectedSnapshot.value || restoreConfirmation.value !== 'RESTORE') return

  isRestoring.value = true
  try {
    const res = await sendFormData<RestoreSnapshotResponse>('/api/settings/app/snapshot.restore', restoreBody())

    if (!res.ok) {
      toast.error(res.error || t('settings.app.restoreFailed'))
      return
    }

    selectedFile.value = null
    selectedArchive.value = null
    selectedSnapshot.value = null
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
  if (selectedFile.value) body.append('snapshotFile', selectedFile.value)
  body.append('password', restorePassword.value)
  if (selectedArchive.value) body.append('archive', selectedArchive.value)
  return body
}
</script>
