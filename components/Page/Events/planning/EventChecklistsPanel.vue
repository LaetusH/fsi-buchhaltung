<template>
  <section class="space-y-4">
    <div class="rounded-xl bg-white p-4 shadow-lg">
      <h2 class="text-lg font-semibold">{{ t('event.planning.checklists') }}</h2>
      <p class="text-sm text-slate-500">{{ t('event.planning.checklistHint') }}</p>
    </div>

    <div class="grid gap-4 xl:grid-cols-[minmax(18rem,0.75fr)_minmax(0,1.25fr)]">
      <aside class="space-y-4">
        <section class="rounded-xl bg-white p-4 shadow-lg">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="font-semibold text-slate-900">{{ t('event.planning.checklistTemplates') }}</h3>
              <p class="text-sm text-slate-500">{{ t('event.planning.checklistTemplatesHint') }}</p>
            </div>
          </div>

          <button
            type="button"
            class="btn-secondary mt-4 inline-flex w-full items-center justify-center gap-2"
            :disabled="disabled || checklistTemplates.length === 0"
            @click="templateBrowserOpen = true"
          >
            <Icon name="material-symbols:folder-open-rounded" />
            {{ t('event.planning.openChecklistTemplates') }}
            <span class="rounded bg-white px-1.5 py-0.5 text-xs text-slate-600">{{ checklistTemplates.length }}</span>
          </button>

          <p v-if="checklistTemplates.length === 0" class="mt-3 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">
            {{ t('event.planning.noChecklistTemplates') }}
          </p>
        </section>

        <section class="rounded-xl bg-white p-4 shadow-lg">
          <div class="flex items-center justify-between gap-3">
            <h3 class="font-semibold text-slate-900">{{ builderTitle }}</h3>
            <button
              type="button"
              class="btn-primary inline-flex items-center gap-2 h-8.5"
              :disabled="disabled"
              @click="resetDraft"
            >
              <Icon name="material-symbols:add-rounded" />
              {{ t('event.planning.createChecklist') }}
            </button>
          </div>
          <div class="mt-3 space-y-3">
            <div>
              <label class="text-xs font-medium text-slate-500">{{ t('event.planning.checklistTitle') }}</label>
              <input v-model="draft.title" class="input mt-1" :disabled="disabled">
            </div>
            <div>
              <label class="text-xs font-medium text-slate-500">{{ t('event.planning.checklistDescription') }}</label>
              <textarea v-model="draft.description" class="input mt-1 min-h-20" :disabled="disabled" />
            </div>
            <div>
              <label class="text-xs font-medium text-slate-500">{{ t('event.planning.checklistItems') }}</label>
              <div class="mt-1 space-y-2">
                <div
                  v-for="item in draft.items"
                  :key="item.id"
                  :data-draft-item-id="item.id"
                  class="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 rounded-md"
                  :class="draggedDraftItemId === item.id ? 'opacity-45' : ''"
                  @dragover.prevent="dragOverDraftItem(item.id)"
                  @drop.prevent="dropDraftItem(item.id)"
                  @dragend="finishItemDrag"
                >
                  <button
                    type="button"
                    class="inline-flex h-9.5 w-9.5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 cursor-grab active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-60 touch-none"
                    draggable="true"
                    :disabled="disabled || draft.items.length <= 1"
                    :title="t('event.planning.reorderChecklistItem')"
                    @mousedown.stop
                    @dragstart="startDraftItemDrag(item.id, $event)"
                    @touchstart.prevent="startDraftItemTouchDrag(item.id, $event)"
                  >
                    <Icon name="material-symbols:unfold-more-rounded" />
                  </button>
                  <input
                    v-model="item.label"
                    :ref="(element) => setDraftItemInput(item.id, element)"
                    class="input"
                    :placeholder="t('event.planning.checklistItemPlaceholder')"
                    :disabled="disabled"
                    @keydown.enter.prevent="addDraftItemAfter(item.id)"
                  >
                  <button
                    type="button"
                    class="inline-flex h-9.5 w-9.5 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60 cursor-pointer"
                    :disabled="disabled"
                    :title="t('actions.remove')"
                    @click="removeDraftItem(item.id)"
                  >
                    <Icon name="material-symbols:close-rounded" />
                  </button>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <button type="button" class="btn-secondary inline-flex items-center gap-2" :disabled="disabled" @click="addDraftItem">
                <Icon name="material-symbols:add-rounded" />
                {{ t('event.planning.addChecklistItem') }}
              </button>
              <button v-if="editingTemplateId === null" type="button" class="btn-primary inline-flex items-center gap-2" :disabled="disabled || !canSaveDraft" @click="saveDraftToEvent">
                <Icon name="material-symbols:checklist-rounded" />
                {{ editingChecklistId === null ? t('event.planning.addChecklist') : t('actions.save') }}
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-60 not-disabled:cursor-pointer disabled:cursor-not-allowed"
                :class="draftIsSavedAsTemplate || editingTemplateId !== null ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
                :disabled="disabled || !canSaveDraft || draftIsSavedAsTemplate"
                @click="saveDraftAsTemplate"
              >
                <Icon name="material-symbols:bookmark-add-rounded" />
                {{ editingTemplateId === null ? templateSaveLabel : t('event.planning.saveTemplate') }}
              </button>
              <button v-if="editingChecklistId !== null || editingTemplateId !== null" type="button" class="btn-secondary" :disabled="disabled" @click="resetDraft">
                {{ t('actions.cancel') }}
              </button>
            </div>
          </div>
        </section>
      </aside>

      <section class="grid gap-4 lg:grid-cols-2 lg:auto-rows-min">
        <div v-for="checklist in checklists" :key="checklist.id" class="rounded-xl bg-white p-4 shadow-lg">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="truncate font-semibold text-slate-900">{{ checklist.title }}</h3>
              <p class="text-sm text-slate-500">{{ checklist.description || t('event.planning.noChecklistDescription') }}</p>
            </div>
            <span class="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
              {{ completedItemCount(checklist) }}/{{ checklist.items.length }}
            </span>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <button type="button" class="btn-secondary inline-flex items-center gap-1.5 px-2 py-1 text-xs" :disabled="disabled" @click="editChecklist(checklist)">
              <Icon name="material-symbols:edit-rounded" />
              {{ t('actions.edit') }}
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-60"
              :class="isChecklistSavedAsTemplate(checklist) ? 'border-emerald-200 bg-emerald-50 text-emerald-700 cursor-not-allowed' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer'"
              :disabled="disabled || isChecklistSavedAsTemplate(checklist)"
              @click="saveChecklistAsTemplate(checklist)"
            >
              <Icon name="material-symbols:bookmark-add-rounded" />
              {{ isChecklistSavedAsTemplate(checklist) ? t('event.planning.savedAsTemplate') : t('event.planning.saveAsTemplate') }}
            </button>
            <button type="button" class="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60 cursor-pointer" :disabled="disabled" @click="removeChecklist(checklist.id)">
              <Icon name="material-symbols:delete-rounded" />
              {{ t('actions.remove') }}
            </button>
          </div>

          <div class="mt-4 space-y-2">
            <label
              v-for="item in checklist.items"
              :key="item.id"
              class="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-sm hover:bg-slate-50"
            >
              <input
                type="checkbox"
                class="checkbox cursor-pointer"
                :checked="item.done"
                :disabled="disabled"
                @change="setChecklistItemDone(checklist.id, item.id, ($event.target as HTMLInputElement).checked)"
              >
              <span class="cursor-pointer" :class="item.done ? 'line-through text-slate-400' : 'text-slate-700'">{{ item.label }}</span>
            </label>
          </div>
        </div>

        <div v-if="checklists.length === 0" class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          {{ t('event.planning.noChecklists') }}
        </div>
      </section>
    </div>

    <Teleport to="body">
      <div
        v-if="templateBrowserOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
        @click.self="templateBrowserOpen = false"
        @keydown.esc="templateBrowserOpen = false"
      >
        <section class="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
          <div class="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
            <div>
              <h3 class="text-lg font-semibold text-slate-900">{{ t('event.planning.checklistTemplates') }}</h3>
              <p class="text-sm text-slate-500">{{ t('event.planning.checklistTemplateBrowserHint') }}</p>
            </div>
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
              :title="t('actions.close')"
              @click="templateBrowserOpen = false"
            >
              <Icon name="material-symbols:close-rounded" />
            </button>
          </div>

          <div class="border-b border-slate-200 p-4">
            <label class="text-xs font-medium text-slate-500">{{ t('event.planning.searchChecklistTemplates') }}</label>
            <input
              v-model="templateSearch"
              class="input mt-1"
              :placeholder="t('event.planning.searchChecklistTemplates')"
            >
          </div>

          <div class="event-checklist-template-scroll max-h-[60vh] overflow-y-auto p-4">
            <div class="grid gap-2 md:grid-cols-2">
              <article
                v-for="template in filteredChecklistTemplates"
                :key="template.id"
                class="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <button
                  type="button"
                  class="w-full text-left cursor-pointer"
                  :disabled="disabled"
                  @click="loadTemplate(template)"
                >
                  <span class="flex items-start justify-between gap-3">
                    <span class="min-w-0">
                      <span class="block truncate text-sm font-semibold text-slate-900">{{ template.title }}</span>
                      <span class="mt-0.5 block line-clamp-2 text-xs text-slate-500">{{ template.description || t('event.planning.noChecklistDescription') }}</span>
                    </span>
                    <span class="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                      {{ template.items.length }}
                    </span>
                  </span>
                </button>
                <div class="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="btn-secondary inline-flex items-center gap-1.5 px-2 py-1 text-xs"
                    :disabled="disabled"
                    @click="editTemplate(template)"
                  >
                    <Icon name="material-symbols:edit-rounded" />
                    {{ t('actions.edit') }}
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60 cursor-pointer"
                    :disabled="disabled"
                    @click="removeTemplate(template.id)"
                  >
                    <Icon name="material-symbols:delete-rounded" />
                    {{ t('actions.remove') }}
                  </button>
                </div>
              </article>
            </div>

            <p v-if="filteredChecklistTemplates.length === 0" class="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">
              {{ t('event.planning.noMatchingChecklistTemplates') }}
            </p>
          </div>
        </section>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { useTouchDrag } from '~/composables/useTouchDrag'
import type { PlanningChecklist } from './types'

const props = defineProps<{
  disabled?: boolean
}>()

const checklists = defineModel<PlanningChecklist[]>('checklists', { required: true })
const checklistTemplates = defineModel<PlanningChecklist[]>('templates', { required: true })
const emit = defineEmits<{
  (e: 'save-checklists', value: PlanningChecklist[]): void
  (e: 'save-templates', value: PlanningChecklist[]): void
}>()
const { t } = useI18n()

const templateBrowserOpen = ref(false)
const templateSearch = ref('')
const editingChecklistId = ref<number | null>(null)
const editingTemplateId = ref<number | null>(null)
const nextChecklistId = ref(-1)
const nextTemplateId = ref(-1000)
const nextDraftItemId = ref(-1)
const draftItemInputs = ref<Record<number, HTMLInputElement | null>>({})
const draggedDraftItemId = ref<number | null>(null)
const draft = reactive<PlanningChecklist>(createEmptyChecklist(0))

const { startTouchDrag: startDraftItemDragTouch } = useTouchDrag({
  findTarget(el) {
    const row = el?.closest('[data-draft-item-id]')
    if (!row) return null
    return { type: 'item', id: row.getAttribute('data-draft-item-id') ?? '' }
  },
  onOver(target) {
    if (target?.type === 'item') dragOverDraftItem(Number(target.id))
  },
  onDrop(target) {
    if (target?.type === 'item') dropDraftItem(Number(target.id))
    else finishItemDrag()
  },
  onEnd: finishItemDrag,
})

function startDraftItemTouchDrag(itemId: number, event: TouchEvent) {
  if (props.disabled || draft.items.length <= 1) return
  draggedDraftItemId.value = itemId
  const row = (event.currentTarget as HTMLElement).closest('[data-draft-item-id]') as HTMLElement | null
  if (row) startDraftItemDragTouch(event, row)
}

const canSaveDraft = computed(() => {
  return Boolean(draft.title.trim() && draft.items.some(item => item.label.trim()))
})
const builderTitle = computed(() => {
  if (editingTemplateId.value !== null) return t('event.planning.editChecklistTemplate')
  return t('event.planning.checklistBuilder')
})
const draftIsSavedAsTemplate = computed(() => {
  return editingTemplateId.value === null && isTemplateContentSaved(buildDraftChecklist())
})
const templateSaveLabel = computed(() => draftIsSavedAsTemplate.value
  ? t('event.planning.savedAsTemplate')
  : t('event.planning.saveAsTemplate'))
const filteredChecklistTemplates = computed(() => {
  const search = templateSearch.value.trim().toLocaleLowerCase()
  if (!search) return checklistTemplates.value

  return checklistTemplates.value.filter((template) => {
    const itemText = template.items.map(item => item.label).join(' ')
    return `${template.title} ${template.description} ${itemText}`.toLocaleLowerCase().includes(search)
  })
})

watch(
  checklists,
  (value) => {
    const ids = value.flatMap(checklist => [checklist.id, ...checklist.items.map(item => item.id)])
    const minimumId = Math.min(-1, ...ids)
    nextChecklistId.value = Math.min(nextChecklistId.value, minimumId - 1)
    nextDraftItemId.value = Math.min(nextDraftItemId.value, minimumId - 1)
  },
  { immediate: true, deep: true },
)

watch(
  checklistTemplates,
  (value) => {
    const ids = value.flatMap(template => [template.id, ...template.items.map(item => item.id)])
    const minimumId = Math.min(-1000, ...ids)
    nextTemplateId.value = Math.min(nextTemplateId.value, minimumId - 1)
    nextDraftItemId.value = Math.min(nextDraftItemId.value, minimumId - 1)
  },
  { immediate: true, deep: true },
)

function createEmptyChecklist(id: number): PlanningChecklist {
  return {
    id,
    title: '',
    description: '',
    items: [
      { id: nextDraftItemId.value--, label: '', done: false },
    ],
  }
}

function replaceDraft(nextDraft: PlanningChecklist) {
  draft.id = nextDraft.id
  draft.title = nextDraft.title
  draft.description = nextDraft.description
  draft.items = nextDraft.items.map(item => ({ ...item }))
}

function resetDraft() {
  editingChecklistId.value = null
  editingTemplateId.value = null
  replaceDraft(createEmptyChecklist(0))
}


function addDraftItem() {
  draft.items.push({ id: nextDraftItemId.value--, label: '', done: false })
}

async function addDraftItemAfter(itemId: number) {
  const index = draft.items.findIndex(item => item.id === itemId)
  const nextItem = { id: nextDraftItemId.value--, label: '', done: false }

  if (index === -1) {
    draft.items.push(nextItem)
  } else {
    draft.items.splice(index + 1, 0, nextItem)
  }

  await nextTick()
  draftItemInputs.value[nextItem.id]?.focus()
}

function setDraftItemInput(itemId: number, element: unknown) {
  draftItemInputs.value[itemId] = element instanceof HTMLInputElement ? element : null
}

function removeDraftItem(itemId: number) {
  if (draft.items.length <= 1) {
    draft.items = draft.items.map(item => item.id === itemId ? { ...item, label: '', done: false } : item)
    return
  }

  draft.items = draft.items.filter(item => item.id !== itemId)
  const nextInputs = { ...draftItemInputs.value }
  delete nextInputs[itemId]
  draftItemInputs.value = nextInputs
}

function startDraftItemDrag(itemId: number, event: DragEvent) {
  if (props.disabled || draft.items.length <= 1) return
  draggedDraftItemId.value = itemId
  event.dataTransfer?.setData('text/plain', String(itemId))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function dragOverDraftItem(targetItemId: number) {
  if (draggedDraftItemId.value === null || draggedDraftItemId.value === targetItemId) return
  draft.items = moveItemById(draft.items, draggedDraftItemId.value, targetItemId)
}

function dropDraftItem(targetItemId: number) {
  dragOverDraftItem(targetItemId)
  finishItemDrag()
}

function finishItemDrag() {
  draggedDraftItemId.value = null
}

function moveItemById<T extends { id: number }>(items: T[], sourceItemId: number, targetItemId: number) {
  const sourceIndex = items.findIndex(item => item.id === sourceItemId)
  const targetIndex = items.findIndex(item => item.id === targetItemId)
  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return items

  const nextItems = [...items]
  const [movedItem] = nextItems.splice(sourceIndex, 1)
  if (!movedItem) return items
  nextItems.splice(targetIndex, 0, movedItem)
  return nextItems
}

function normalizeDraftItems(keepDone = false) {
  return draft.items
    .map(item => ({ ...item, label: item.label.trim(), done: keepDone ? item.done : false }))
    .filter(item => item.label)
}

function duplicateDraftItems(keepDone = false) {
  return normalizeDraftItems(keepDone).map(item => ({
    id: nextDraftItemId.value--,
    label: item.label,
    done: item.done,
  }))
}

function buildDraftChecklist(): PlanningChecklist {
  return {
    id: draft.id,
    title: draft.title.trim(),
    description: draft.description.trim(),
    items: normalizeDraftItems(false),
  }
}

function saveDraftToEvent() {
  if (!canSaveDraft.value) return

  const nextChecklist: PlanningChecklist = {
    id: editingChecklistId.value ?? nextChecklistId.value--,
    title: draft.title.trim(),
    description: draft.description.trim(),
    items: normalizeDraftItems(true),
  }

  let nextChecklists: PlanningChecklist[]
  if (editingChecklistId.value === null) {
    nextChecklists = [...checklists.value, nextChecklist]
  } else {
    nextChecklists = checklists.value.map(checklist => checklist.id === editingChecklistId.value ? nextChecklist : checklist)
  }

  persistChecklists(nextChecklists)
  resetDraft()
}

function saveDraftAsTemplate() {
  if (!canSaveDraft.value) return

  if (editingTemplateId.value !== null) {
    const nextTemplate = {
      ...buildDraftChecklist(),
      id: editingTemplateId.value,
    }

    persistTemplates(checklistTemplates.value.map(template => template.id === editingTemplateId.value ? nextTemplate : template))
    resetDraft()
    return
  }

  if (draftIsSavedAsTemplate.value) return

  persistTemplates([
    {
      id: nextTemplateId.value--,
      title: draft.title.trim(),
      description: draft.description.trim(),
      items: duplicateDraftItems(false),
    },
    ...checklistTemplates.value,
  ])
}

function saveChecklistAsTemplate(checklist: PlanningChecklist) {
  if (isChecklistSavedAsTemplate(checklist)) return

  persistTemplates([
    duplicateChecklist(checklist, nextTemplateId.value--, false),
    ...checklistTemplates.value,
  ])
}

function loadTemplate(template: PlanningChecklist) {
  persistChecklists([
    ...checklists.value,
    duplicateChecklist(template, nextChecklistId.value--, false),
  ])
  templateBrowserOpen.value = false
}

function editChecklist(checklist: PlanningChecklist) {
  editingChecklistId.value = checklist.id
  editingTemplateId.value = null
  replaceDraft(copyChecklist(checklist, true))
}

function editTemplate(template: PlanningChecklist) {
  editingChecklistId.value = null
  editingTemplateId.value = template.id
  templateBrowserOpen.value = false
  replaceDraft(copyChecklist(template, false))
}

function removeTemplate(templateId: number) {
  persistTemplates(checklistTemplates.value.filter(template => template.id !== templateId))
  if (editingTemplateId.value === templateId) resetDraft()
}

function removeChecklist(checklistId: number) {
  persistChecklists(checklists.value.filter(checklist => checklist.id !== checklistId))
  if (editingChecklistId.value === checklistId) resetDraft()
}

function setChecklistItemDone(checklistId: number, itemId: number, done: boolean) {
  persistChecklists(checklists.value.map((checklist) => {
    if (checklist.id !== checklistId) return checklist
    return {
      ...checklist,
      items: checklist.items.map(item => item.id === itemId ? { ...item, done } : item),
    }
  }))
}

function completedItemCount(checklist: PlanningChecklist) {
  return checklist.items.filter(item => item.done).length
}

function isChecklistSavedAsTemplate(checklist: PlanningChecklist) {
  return isTemplateContentSaved(checklist)
}

function isTemplateContentSaved(checklist: PlanningChecklist) {
  const signature = checklistSignature(checklist)
  return Boolean(signature) && checklistTemplates.value.some(template => template.id !== editingTemplateId.value && checklistSignature(template) === signature)
}

function checklistSignature(checklist: PlanningChecklist) {
  const title = checklist.title.trim()
  const items = checklist.items.map(item => item.label.trim()).filter(Boolean)
  if (!title || !items.length) return ''

  return JSON.stringify({
    title,
    description: checklist.description.trim(),
    items,
  })
}

function copyChecklist(checklist: PlanningChecklist, keepDone: boolean): PlanningChecklist {
  return {
    id: checklist.id,
    title: checklist.title,
    description: checklist.description,
    items: checklist.items.map(item => ({
      id: item.id,
      label: item.label,
      done: keepDone ? item.done : false,
    })),
  }
}

function duplicateChecklist(checklist: PlanningChecklist, id: number, keepDone: boolean): PlanningChecklist {
  return {
    id,
    title: checklist.title,
    description: checklist.description,
    items: checklist.items.map(item => ({
      id: nextDraftItemId.value--,
      label: item.label,
      done: keepDone ? item.done : false,
    })),
  }
}

function persistChecklists(nextChecklists: PlanningChecklist[]) {
  checklists.value = nextChecklists
  emit('save-checklists', nextChecklists)
}

function persistTemplates(nextTemplates: PlanningChecklist[]) {
  checklistTemplates.value = nextTemplates
  emit('save-templates', nextTemplates)
}
</script>

<style scoped>
.event-checklist-template-scroll {
  scrollbar-width: auto;
  scrollbar-color: #94a3b8 #e2e8f0;
}

.event-checklist-template-scroll::-webkit-scrollbar {
  width: 12px;
}

.event-checklist-template-scroll::-webkit-scrollbar-track {
  background: #e2e8f0;
  border-radius: 9999px;
}

.event-checklist-template-scroll::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 9999px;
  border: 2px solid #e2e8f0;
}
</style>
