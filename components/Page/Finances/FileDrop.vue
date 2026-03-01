<template>
  <div class="w-full mx-auto text-slate-700">
    <div
      v-if="!modelValue"
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
        <p class="mb-2 text-sm text-slate-500"><span class="font-semibold">Click to upload</span> or drag and drop</p>
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

    <div v-else class="relative w-full h-200 border border-slate-200 rounded-lg overflow-hidden bg-slate-800 group shadow-lg">
      <div class="absolute top-0 left-0 right-0 flex z-20 items-center justify-between p-3 transition-opacity duration-200 bg-black/70 backdrop-blur-sm opacity-0 group-hover:opacity-100">
        <div class="flex items-center space-x-3 text-white">
          <span class="text-sm font-medium truncate max-w-50">{{ modelValue.name }}</span>
          <span class="text-xs text-slate-300">({{ (modelValue.size / 1024 / 1024).toFixed(2) }} MB)</span>
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
          <button @click="removeFile" class="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-500/80 hover:bg-red-600 rounded transition backdrop-blur-sm">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            Remove
          </button>
        </div>
      </div>

      <div ref="containerRef" class="w-full h-full overflow-auto bg-slate-800 custom-scrollbar">
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

        <div v-else-if="isImage"  class="min-w-max transition-all duration-200">
          <img 
            :src="previewUrl" 
            :style="{ width: computedWidth + 'px' }" 
            class="block h-auto shadow-2xl" 
            alt="Preview" 
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
const VuePdfEmbed = defineAsyncComponent(() => import('vue-pdf-embed'))
  
const props = defineProps<{
  modelValue: File | null
}>()
  
const emit = defineEmits<{
  (e: 'update:modelValue', value: File | null): void
}>()
  
const isDragging = ref<boolean>(false)
const previewUrl = ref<string | undefined>(undefined)
const fileInput = ref<HTMLInputElement | null>(null)
  
const pdfPageCount = ref<number>(0)
const currentPage = ref<number>(1)

const containerRef = ref<HTMLDivElement | null>(null)
const containerWidth = ref<number>(800)

const zoomLevel = ref<number>(1.0)
const pdfLoading = ref<boolean>(false)

const MIN_ZOOM = 0.5
const MAX_ZOOM = 4.0
const ZOOM_STEP = 0.25
  
const computedWidth = computed<number>(() => {
  return (containerWidth.value - 15) * zoomLevel.value
})

const isPdf = computed<boolean>(() => props.modelValue?.type === 'application/pdf')
const isImage = computed<boolean>(() => props.modelValue?.type === 'image/png' || props.modelValue?.type === 'image/jpeg' || props.modelValue?.type === 'image/jpg')

const updateContainerWidth = (): void => {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth
  }
}

onMounted(() => {
  updateContainerWidth();
  window.addEventListener('resize', updateContainerWidth)
})

onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  window.removeEventListener('resize', updateContainerWidth)
})
  
watch(
  () => props.modelValue, 
  async (newFile: File | null) => {
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    
    if (newFile) {
      previewUrl.value = URL.createObjectURL(newFile)
      await nextTick()
      updateContainerWidth()

      currentPage.value = 1
      zoomLevel.value = 1.0
    } else {
      previewUrl.value = undefined
      pdfPageCount.value = 0
    }
  }, 
  { immediate: true }
)

type PdfDocumentProxy = {
  numPages: number
}

const onPdfLoaded = (doc: PdfDocumentProxy): void => {
  pdfPageCount.value = doc.numPages
  pdfLoading.value = false
}

const processFile = (file: File): void => {
  if (file.type === 'application/pdf' || file.type === 'image/png' || file.type === 'image/jpg' || file.type === 'image/jpeg') {
    emit('update:modelValue', file)
  } else {
    alert('Please upload a PDF or an Image file.')
  }
}
  
const handleDrop = (e: DragEvent): void => {
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (!files || files.length == 0) return

  const file = files.item(0)
  if (!file) return

  processFile(file)
}
  
const handleFileSelect = (e: Event): void => {
  const input = e.target as HTMLInputElement | null
  const files = input?.files
  if (!files || files.length == 0) return

  const file = files.item(0)
  if (!file) return

  processFile(file)
}

const removeFile = (): void => {
  emit('update:modelValue', null);
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
  
const zoomIn = (): void => {
  if (zoomLevel.value < MAX_ZOOM) zoomLevel.value += ZOOM_STEP
}
  
const zoomOut = (): void => {
  if (zoomLevel.value > MIN_ZOOM) zoomLevel.value -= ZOOM_STEP
}
  
const nextPage = (): void => {
  if (currentPage.value < pdfPageCount.value) currentPage.value++
}
  
const prevPage = (): void => {
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