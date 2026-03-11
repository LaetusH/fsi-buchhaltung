<template>
  <div ref="rootRef" class="w-full mx-auto text-slate-700">
    <div
      v-if="!modelValue && !existingFile"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="fileInput?.click()"
      :class="[
        'relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200',
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
      ]"
    >
      <div class="flex flex-col items-center justify-center pt-5 pb-6">
        <svg class="w-10 h-10 mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
        </svg>
        <p class="mb-2 text-sm text-slate-500"><span class="font-semibold">{{ t('files.clickUpload') }}</span> {{ t('files.dragDrop') }}</p>
        <p class="text-xs text-slate-500">PDF, PNG, JPG or JPEG</p>
      </div>
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        accept="application/pdf,image/*"
        @change="handleFileSelect"
      />
    </div>

    <div
      v-else-if="previewUrl"
      class="relative flex flex-col w-full border border-slate-200 rounded-lg overflow-hidden bg-slate-800 group shadow-lg"
      :style="{ height: `${previewHeight}px` }"
    >
      <div class="file-preview-toolbar z-20 flex items-center justify-between gap-3 p-3 bg-black/70 backdrop-blur-sm">
        <div class="flex items-center space-x-3 text-white">
          <span class="text-sm font-medium truncate max-w-50">{{ displayName }}</span>
          <span class="text-xs text-slate-300">({{ displaySize }} MB)</span>
        </div>

        <div class="flex items-center space-x-2 bg-slate-700/50 rounded-lg p-1">
          <button @click="zoomOut" class="p-1.5 hover:bg-slate-600 rounded text-white transition disabled:opacity-50" title="Zoom Out">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
          </button>

          <span class="text-xs font-mono text-white w-12 text-center">{{ Math.round(zoomLevel * 100) }}%</span>

          <button @click="zoomIn" class="p-1.5 hover:bg-slate-600 rounded text-white transition disabled:opacity-50" title="Zoom In">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          </button>

          <div v-if="isPdf" class="w-px h-4 bg-slate-500 mx-1"></div>

          <template v-if="isPdf">
            <button @click="prevPage" :disabled="currentPage <= 1" class="p-1.5 hover:bg-slate-600 rounded text-white transition disabled:opacity-50 disabled:cursor-not-allowed">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <span class="text-xs text-white whitespace-nowrap px-1">
              {{ currentPage }} / {{ pdfPageCount }}
            </span>
            <button @click="nextPage" :disabled="currentPage >= pdfPageCount" class="p-1.5 hover:bg-slate-600 rounded text-white transition disabled:opacity-50 disabled:cursor-not-allowed">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </template>
        </div>

        <div>
          <button
            @click="removeFile"
            class="flex h-9 items-center gap-1.5 rounded-lg bg-red-500/80 px-3 text-xs font-medium text-white transition backdrop-blur-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!canEdit"
            :aria-label="t('files.remove')"
            :title="t('files.remove')"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            <span>{{ t('files.remove') }}</span>
          </button>
        </div>
      </div>

      <div ref="containerRef" class="file-preview-content w-full flex-1 min-h-0 overflow-auto bg-slate-800 custom-scrollbar">
        <div v-if="isPdf" class="relative shadow-2xl bg-white transition-all duration-200">
          <VuePdfEmbed
            :source="previewUrl"
            :page="currentPage"
            :width="computedWidth"
            :text-layer="true"
            class="relative"
            @loaded="onPdfLoaded"
          />
        </div>

        <div v-else-if="isImage" class="min-w-max transition-all duration-200">
          <img
            ref="imageRef"
            :src="previewUrl"
            :style="{ width: computedWidth + 'px' }"
            class="block h-auto shadow-2xl"
            alt="Preview"
            @load="onImageLoaded"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { useI18n } from '~/composables/useI18n'
import type { PDFDocumentProxy } from 'pdfjs-dist'

const VuePdfEmbed = defineAsyncComponent(() => import('vue-pdf-embed'))

const props = defineProps<{
  modelValue: File | null
  canEdit?: boolean
  existingFile?: {
    id: number
    url: string
    name: string
    mime_type: string
    size: number
  } | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: File | null): void
  (e: 'remove-existing'): void
}>()

const isDragging = ref<boolean>(false)
const previewUrl = ref<string | undefined>(undefined)
const rootRef = ref<HTMLDivElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)
const pdfPageCount = ref<number>(0)
const currentPage = ref<number>(1)
const containerRef = ref<HTMLDivElement | null>(null)
const containerWidth = ref<number>(800)
const previewHeight = ref<number>(800)
const intrinsicContentHeight = ref<number>(800)
const pdfDocument = shallowRef<PDFDocumentProxy | null>(null)
const zoomLevel = ref<number>(1.0)
const pdfLoading = ref<boolean>(false)
const { t } = useI18n()

const MIN_ZOOM = 0.5
const MAX_ZOOM = 4.0
const ZOOM_STEP = 0.25

const computedWidth = computed<number>(() => {
  return containerWidth.value * zoomLevel.value
})

const activeFileType = computed(() => {
  if (props.modelValue) return props.modelValue.type
  if (props.existingFile) return props.existingFile.mime_type
})

const isPdf = computed(() => activeFileType.value === 'application/pdf')
const isImage = computed(() => activeFileType.value?.startsWith('image/'))

let resizeObserver: ResizeObserver | null = null

const updateContainerWidth = (): void => {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth
  }
}

const getFormColumn = (): HTMLElement | null => {
  const gridItem = rootRef.value?.parentElement
  const grid = gridItem?.parentElement
  if (!gridItem || !grid) return null
  return Array.from(grid.children).find((child) =>
    child !== gridItem && child instanceof HTMLElement && child.hasAttribute('data-finance-form-column')
  ) as HTMLElement | null
}

const getFormContentHeight = (): number => {
  const formColumn = getFormColumn()
  if (!formColumn) return 0

  const formContent = formColumn.firstElementChild
  if (formContent instanceof HTMLElement) return formContent.getBoundingClientRect().height

  return formColumn.getBoundingClientRect().height
}

const getCardsGrid = (): HTMLElement | null => {
  const gridItem = rootRef.value?.parentElement
  const grid = gridItem?.parentElement
  return grid instanceof HTMLElement ? grid : null
}

const getVerticalPadding = (element: HTMLElement | null): number => {
  if (!element) return 0
  const style = window.getComputedStyle(element)
  const top = Number.parseFloat(style.paddingTop || '0') || 0
  const bottom = Number.parseFloat(style.paddingBottom || '0') || 0
  return top + bottom
}

const getViewportAvailableHeight = (): number => {
  if (!rootRef.value) return 0

  const main = rootRef.value.closest('main') as HTMLElement | null
  const pageRoot = rootRef.value.closest('#page-root') as HTMLElement | null
  const cardsGrid = getCardsGrid()

  const mainPadding = getVerticalPadding(main)
  const pagePadding = getVerticalPadding(pageRoot)

  let headerFootprint = 0
  if (pageRoot && cardsGrid) {
    const pageRootRect = pageRoot.getBoundingClientRect()
    const cardsGridRect = cardsGrid.getBoundingClientRect()
    const pagePaddingTop = Number.parseFloat(window.getComputedStyle(pageRoot).paddingTop || '0') || 0
    headerFootprint = Math.max(0, cardsGridRect.top - pageRootRect.top - pagePaddingTop)
  }

  return Math.max(0, window.innerHeight - mainPadding - pagePadding - headerFootprint)
}

const updatePreviewHeight = (): void => {
  if (!rootRef.value || !previewUrl.value) return
  const viewportAvailableHeight = getViewportAvailableHeight()
  const formHeight = getFormContentHeight()
  const targetHeight = formHeight > viewportAvailableHeight ? formHeight : viewportAvailableHeight
  previewHeight.value = Math.max(1, Math.min(intrinsicContentHeight.value, targetHeight))
}

const updateLayout = (): void => {
  updateContainerWidth()
  updatePreviewHeight()
}

let pdfMeasurementToken = 0

const updateIntrinsicHeight = async (): Promise<void> => {
  if (isImage.value) {
    const image = imageRef.value
    if (!image?.naturalWidth || !image.naturalHeight) return

    intrinsicContentHeight.value = Math.ceil(computedWidth.value * (image.naturalHeight / image.naturalWidth))
    updatePreviewHeight()
    return
  }

  if (isPdf.value && pdfDocument.value) {
    const measurementToken = ++pdfMeasurementToken
    const page = await pdfDocument.value.getPage(currentPage.value)
    if (measurementToken !== pdfMeasurementToken) return

    const viewport = page.getViewport({ scale: 1 })
    if (viewport.width > 0 && viewport.height > 0) {
      intrinsicContentHeight.value = Math.ceil(computedWidth.value * (viewport.height / viewport.width))
      updatePreviewHeight()
    }
  }
}

const initializeObservers = (): void => {
  resizeObserver?.disconnect()
  resizeObserver = null

  if (typeof ResizeObserver === 'undefined') return

  const targets = [containerRef.value, getFormColumn()].filter((el): el is HTMLElement => Boolean(el))
  if (!targets.length) return

  resizeObserver = new ResizeObserver(() => {
    updateLayout()
    void updateIntrinsicHeight()
  })

  for (const target of targets) resizeObserver.observe(target)
}

onMounted(() => {
  updateLayout()
  window.addEventListener('resize', updateLayout)
})

onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  window.removeEventListener('resize', updateLayout)
  resizeObserver?.disconnect()
})

watch(
  () => [props.modelValue, props.existingFile],
  async () => {
    if (previewUrl.value && props.modelValue) URL.revokeObjectURL(previewUrl.value)

    if (props.modelValue) {
      previewUrl.value = URL.createObjectURL(props.modelValue)
    } else if (props.existingFile) {
      previewUrl.value = props.existingFile.url
    } else {
      previewUrl.value = undefined
    }

    await nextTick()
    currentPage.value = 1
    zoomLevel.value = 1.0

    intrinsicContentHeight.value = 800
    pdfDocument.value = null
    updateLayout()
    initializeObservers()
    void updateIntrinsicHeight()
  },
  { immediate: true }
)

watch([computedWidth, currentPage], async () => {
  await nextTick()
  void updateIntrinsicHeight()
})

const displayName = computed(() => {
  if (props.modelValue) return props.modelValue.name
  if (props.existingFile) return props.existingFile.name
  return ''
})

const displaySize = computed(() => {
  if (props.modelValue) return (props.modelValue.size / 1024 / 1024).toFixed(2)
  if (props.existingFile) return (props.existingFile.size / 1024 / 1024).toFixed(2)
  return ''
})

function onPdfLoaded(doc: PDFDocumentProxy) {
  pdfDocument.value = doc
  pdfPageCount.value = doc.numPages
  pdfLoading.value = false
  nextTick(() => void updateIntrinsicHeight())
}

function onImageLoaded() {
  nextTick(() => void updateIntrinsicHeight())
}

function processFile(file: File) {
  if (file.type === 'application/pdf' || file.type === 'image/png' || file.type === 'image/jpg' || file.type === 'image/jpeg') {
    emit('update:modelValue', file)
  } else {
    alert(t('files.uploadError'))
  }
}

function handleDrop(e: DragEvent) {
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return

  const file = files.item(0)
  if (!file) return

  processFile(file)
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement | null
  const files = input?.files
  if (!files || files.length === 0) return

  const file = files.item(0)
  if (!file) return

  processFile(file)
}

function removeFile() {
  if (props.modelValue) emit('update:modelValue', null)
  if (props.existingFile) emit('remove-existing')
}

function zoomIn() {
  if (zoomLevel.value < MAX_ZOOM) zoomLevel.value += ZOOM_STEP
}

function zoomOut() {
  if (zoomLevel.value > MIN_ZOOM) zoomLevel.value -= ZOOM_STEP
}

function nextPage() {
  if (currentPage.value < pdfPageCount.value) currentPage.value++
}

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  display: block;
  width: 10px;
  height: 10px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #1e293b;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 5px;
  border: 2px solid #1e293b;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

.custom-scrollbar {
  scrollbar-width: auto;
  scrollbar-color: #475569 #1e293b;
}

.file-preview-toolbar {
  flex-wrap: wrap;
}

@media (hover: hover) and (pointer: fine) {
  .file-preview-toolbar {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .group:hover .file-preview-toolbar,
  .group:focus-within .file-preview-toolbar {
    opacity: 1;
  }
}

:deep(.vue-pdf-embed__page > canvas) {
  position: absolute;
  display: block;
  width: 100%;
  height: auto;
  z-index: 1;
  pointer-events: none;
}

:deep(.textLayer) {
  position: absolute;
  inset: 0;
  z-index: 2;
  line-height: 1;
  font-size: 1px;
  pointer-events: auto;
  -webkit-user-select: text;
  -moz-user-select: text;
  user-select: text;
}

:deep(.textLayer span) {
  position: absolute !important;
  display: block !important;
  white-space: pre;
  line-height: 1;
  padding: 0;
  margin: 0;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  user-select: text !important;
  background: transparent;
  color: transparent;
  transform-origin: 0 0;
}

:deep(.textLayer span:empty),
:deep(.text-layer span:empty) {
  display: none !important;
}

:deep(.textLayer span::selection),
:deep(.textLayer span::-moz-selection) {
  background: rgba(96, 165, 250, 0.6) !important;
}
</style>
