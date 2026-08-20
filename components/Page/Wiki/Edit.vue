<template>
  <Page
    :headline1="isCreate ? t('wiki.editor.titleNew') : t('wiki.editor.titleEdit')"
    :flush-header-with-cards="!isCreate"
    :help-section="activeTab"
    @open-menu="$emit('openMenu')"
  >
    <template #header="{ headerContainerRef, headlineGroupRef }">
      <CommonTabOverview
        v-if="!isCreate"
        v-model="activeTab"
        :tabs="tabs"
        :header-container-ref="headerContainerRef"
        :headline-group-ref="headlineGroupRef"
      />
    </template>

    <template #cards>
      <div class="-mx-6 -mb-6 space-y-4 bg-white p-4 shadow-sm col-span-12 sm:mx-0 sm:mb-0 sm:rounded-xl sm:p-6 sm:shadow-lg">
        <CommonValidationSummary
          v-if="errors.length"
          :errors="errors"
          :title="t('common.validationBlocked')"
        />

        <p v-if="loading" class="text-sm text-slate-500">{{ t('wiki.loading') }}</p>

        <template v-else>
          <div v-show="activeTab === 'content'" class="space-y-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="field">
                <label for="wiki-title">{{ t('wiki.editor.fields.title') }}</label>
                <input id="wiki-title" v-model="form.title" class="input" :disabled="readOnly" @input="onTitleInput" />
              </div>
              <div class="field">
                <label for="wiki-slug">{{ t('wiki.editor.fields.slug') }}</label>
                <input id="wiki-slug" v-model="form.slug" class="input" :disabled="readOnly" @input="slugTouched = true" />
              </div>
            </div>

            <div class="field">
              <label for="wiki-summary">{{ t('wiki.editor.fields.summary') }}</label>
              <input id="wiki-summary" v-model="form.summary" class="input" :disabled="readOnly" />
            </div>

            <div v-if="isCreate" class="grid gap-3 sm:grid-cols-2">
              <div class="field">
                <label for="wiki-space">{{ t('wiki.editor.fields.space') }}</label>
                <MenuDropdown id="wiki-space" v-model="openFieldMenu">
                  <template #trigger="{ styling }">
                    <button type="button" :class="[styling, 'cursor-pointer']">
                      <span class="truncate">{{ spaceLabel }}</span>
                      <Icon name="material-symbols:keyboard-arrow-down-rounded" class="text-lg" />
                    </button>
                  </template>
                  <template #default="{ styling }">
                    <button
                      v-for="space in writableSpaces"
                      :key="space.id"
                      type="button"
                      :class="styling"
                      @click="selectSpace(space.id)"
                    >
                      {{ space.title }}
                    </button>
                  </template>
                </MenuDropdown>
              </div>
              <div class="field">
                <label for="wiki-parent-new">{{ t('wiki.editor.fields.parent') }}</label>
                <MenuDropdown id="wiki-parent-new" v-model="openFieldMenu">
                  <template #trigger="{ styling }">
                    <button type="button" :class="[styling, 'cursor-pointer']">
                      <span class="truncate">{{ parentLabel }}</span>
                      <Icon name="material-symbols:keyboard-arrow-down-rounded" class="text-lg" />
                    </button>
                  </template>
                  <template #default="{ styling }">
                    <button type="button" :class="styling" @click="selectParent(null)">{{ t('wiki.editor.fields.noParent') }}</button>
                    <button
                      v-for="option in parentOptions"
                      :key="option.id"
                      type="button"
                      :class="styling"
                      @click="selectParent(option.id)"
                    >
                      {{ option.label }}
                    </button>
                  </template>
                </MenuDropdown>
              </div>
            </div>

            <PageWikiEditorMarkdown v-model="form.markdown" :checklists="checklists" />

            <p class="text-xs text-slate-500">{{ draftStateLabel }}</p>
          </div>

          <div v-show="activeTab === 'settings'" class="space-y-4">
            <p v-if="readOnly" class="text-sm text-slate-500">{{ t('wiki.editor.readOnly') }}</p>

            <div class="grid gap-3 sm:grid-cols-2">
              <div class="field">
                <label for="wiki-parent">{{ t('wiki.editor.fields.parent') }}</label>
                <MenuDropdown id="wiki-parent" v-model="openFieldMenu" :disabled="readOnly">
                  <template #trigger="{ styling }">
                    <button type="button" :class="[styling, !readOnly ? 'cursor-pointer' : '']" :disabled="readOnly">
                      <span class="truncate">{{ parentLabel }}</span>
                      <Icon v-if="!readOnly" name="material-symbols:keyboard-arrow-down-rounded" class="text-lg" />
                    </button>
                  </template>
                  <template #default="{ styling }">
                    <button type="button" :class="styling" @click="selectParent(null)">{{ t('wiki.editor.fields.noParent') }}</button>
                    <button
                      v-for="option in parentOptions"
                      :key="option.id"
                      type="button"
                      :class="styling"
                      @click="selectParent(option.id)"
                    >
                      {{ option.label }}
                    </button>
                  </template>
                </MenuDropdown>
              </div>

              <div class="field">
                <label for="wiki-review-interval">{{ t('wiki.editor.fields.reviewInterval') }}</label>
                <input
                  id="wiki-review-interval"
                  v-model="form.reviewIntervalDays"
                  type="number"
                  min="1"
                  max="3650"
                  class="input"
                  :disabled="readOnly"
                />
                <span class="text-xs text-slate-500">{{ t('wiki.editor.fields.reviewIntervalHint') }}</span>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <div class="field">
                <label for="wiki-owner-position">{{ t('wiki.editor.fields.ownerPosition') }}</label>
                <MenuDropdown id="wiki-owner-position" v-model="openFieldMenu" :disabled="readOnly">
                  <template #trigger="{ styling }">
                    <button type="button" :class="[styling, !readOnly ? 'cursor-pointer' : '']" :disabled="readOnly">
                      <span class="truncate">{{ ownerPositionLabel }}</span>
                      <Icon v-if="!readOnly" name="material-symbols:keyboard-arrow-down-rounded" class="text-lg" />
                    </button>
                  </template>
                  <template #default="{ styling }">
                    <button type="button" :class="styling" @click="selectOwnerPosition(null)">{{ t('wiki.editor.fields.noOwner') }}</button>
                    <button
                      v-for="option in positionOptions"
                      :key="option.id"
                      type="button"
                      :class="styling"
                      @click="selectOwnerPosition(option.id)"
                    >
                      {{ option.label }}
                    </button>
                  </template>
                </MenuDropdown>
              </div>

              <div class="field">
                <label for="wiki-owner-subdivision">{{ t('wiki.editor.fields.ownerSubdivision') }}</label>
                <MenuDropdown id="wiki-owner-subdivision" v-model="openFieldMenu" :disabled="readOnly">
                  <template #trigger="{ styling }">
                    <button type="button" :class="[styling, !readOnly ? 'cursor-pointer' : '']" :disabled="readOnly">
                      <span class="truncate">{{ ownerSubdivisionLabel }}</span>
                      <Icon v-if="!readOnly" name="material-symbols:keyboard-arrow-down-rounded" class="text-lg" />
                    </button>
                  </template>
                  <template #default="{ styling }">
                    <button type="button" :class="styling" @click="selectOwnerSubdivision(null)">{{ t('wiki.editor.fields.noOwner') }}</button>
                    <button
                      v-for="option in subdivisionOptions"
                      :key="option.id"
                      type="button"
                      :class="styling"
                      @click="selectOwnerSubdivision(option.id)"
                    >
                      {{ option.label }}
                    </button>
                  </template>
                </MenuDropdown>
              </div>
            </div>

            <label class="flex items-center gap-2 text-sm text-slate-700">
              <input v-model="owner.createGrant" type="checkbox" class="checkbox" :disabled="readOnly" />
              {{ t('wiki.editor.fields.createOwnerGrant') }}
            </label>

            <div v-if="!readOnly" class="flex justify-end">
              <button type="button" class="btn-secondary" @click="saveOwner">{{ t('wiki.editor.save') }}</button>
            </div>
          </div>

          <div v-show="activeTab === 'checklists'">
            <PageWikiChecklistsTab
              v-if="articleId"
              :article-id="articleId"
              v-model="checklists"
              :read-only="readOnly"
            />
            <p v-else class="text-sm text-slate-500">{{ t('wiki.checklist.saveArticleFirst') }}</p>
          </div>

          <div v-show="activeTab === 'attachments'" class="space-y-3">
            <input
              v-if="!readOnly"
              ref="fileInputRef"
              type="file"
              class="input"
              accept="application/pdf,image/png,image/jpeg"
              @change="uploadAttachment"
            />

            <p v-if="!attachments.length" class="text-sm text-slate-500">{{ t('wiki.attachments.empty') }}</p>

            <ul v-else class="space-y-2">
              <li
                v-for="attachment in attachments"
                :key="attachment.attachmentId"
                class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm"
              >
                <a
                  :href="`/api/files/${attachment.fileId}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="min-w-0 truncate text-orange-700 hover:underline"
                >{{ attachment.name }}</a>
                <button v-if="!readOnly" type="button" class="btn-secondary" @click="removeAttachment(attachment.attachmentId)">
                  {{ t('wiki.attachments.remove') }}
                </button>
              </li>
            </ul>
          </div>

          <div v-show="activeTab === 'access'">
            <PageWikiAccessTab v-if="articleId" scope-type="article" :scope-id="articleId" />
          </div>

          <div v-show="activeTab === 'history'">
            <PageWikiRevisionList
              v-if="articleId"
              ref="revisionListRef"
              :article-id="articleId"
              :can-write="!readOnly"
              @restored="reload"
            />
          </div>

          <div class="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
            <button type="button" class="btn-secondary" @click="cancel">{{ t('wiki.editor.cancel') }}</button>

            <template v-if="isCreate">
              <button type="button" class="btn-primary" :disabled="saving" @click="create">
                {{ t('wiki.editor.create') }}
              </button>
            </template>

            <template v-else-if="!readOnly">
              <button type="button" class="btn-secondary" :disabled="saving" @click="saveDraft(true)">
                {{ t('wiki.editor.save') }}
              </button>
              <button type="button" class="btn-secondary" @click="confirmArchive = true">
                {{ t('wiki.editor.archive') }}
              </button>
              <button v-if="canMarkReviewed" type="button" class="btn-secondary" @click="markReviewed">
                {{ t('wiki.editor.markReviewed') }}
              </button>
              <button v-if="mustSubmit" type="button" class="btn-primary" :disabled="saving" @click="submitReview">
                {{ t('wiki.editor.submitReview') }}
              </button>
              <button v-else type="button" class="btn-primary" :disabled="saving" @click="publish">
                {{ t('wiki.editor.publish') }}
              </button>
            </template>
          </div>
        </template>
      </div>
    </template>
  </Page>

  <CommonModal v-model="confirmArchive" :title="t('wiki.editor.archiveConfirmTitle')">
    <p class="text-sm text-slate-700">{{ t('wiki.editor.archiveConfirmText') }}</p>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="confirmArchive = false">{{ t('wiki.editor.cancel') }}</button>
        <button type="button" class="btn-primary" @click="archive">{{ t('wiki.editor.archive') }}</button>
      </div>
    </template>
  </CommonModal>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { usePage } from '~/composables/usePage'
import { useReturnTarget } from '~/composables/useReturnTarget'
import { useToast } from '~/composables/useToast'
import type { TabOverviewItem } from '~/composables/useTabOverviewLayout'
import type { WikiArticleDetailResult } from '~/server/utils/wiki/detail'
import type { WikiTreeResponse } from '~/server/api/wiki/tree.get'
import type { CreateWikiArticleResponse } from '~/server/api/wiki/articles/create.post'
import type { UploadWikiAttachmentResponse } from '~/server/api/wiki/articles/[id]/attachments.post'
import type { WikiSubjectOptionsResponse } from '~/server/api/wiki/access/subject-options.get'
import type { WikiAttachment, WikiChecklistView, WikiTreeArticle, WikiTreeSpace } from '~/types/wiki'

defineEmits<{
  (e: 'openMenu'): void
}>()

const AUTOSAVE_DELAY = 5000

const { t } = useI18n()
const { pageMeta } = usePage()
const { goToReturnTarget } = useReturnTarget('Wiki')
const toast = useToast()

const articleId = ref<number | null>(pageMeta.value?.articleId ? Number(pageMeta.value.articleId) : null)
const isCreate = computed(() => articleId.value === null)

const loading = ref(true)
const saving = ref(false)
const readOnly = ref(false)
const errors = ref<string[]>([])
const activeTab = ref('content')
const confirmArchive = ref(false)
const attachments = ref<WikiAttachment[]>([])
const checklists = ref<WikiChecklistView[]>([])
const spaces = ref<WikiTreeSpace[]>([])
const status = ref<string>('draft')
const requiresReview = ref(false)
const accessLevel = ref<'read' | 'write' | 'admin'>('read')
const fileInputRef = ref<HTMLInputElement | null>(null)
const revisionListRef = ref<{ reload: () => void } | null>(null)
const openFieldMenu = ref<string | null>(null)

const positionOptions = ref<Array<{ id: number, label: string }>>([])
const subdivisionOptions = ref<Array<{ id: number, label: string }>>([])

const form = reactive({
  spaceId: Number(pageMeta.value?.spaceId ?? 0),
  parentId: pageMeta.value?.parentId ? Number(pageMeta.value.parentId) : null as number | null,
  title: '',
  slug: '',
  summary: '',
  markdown: '',
  reviewIntervalDays: '' as string | number,
})

const owner = reactive({
  positionId: null as number | null,
  subdivisionId: null as number | null,
  createGrant: true,
})

const dirty = ref(false)
const savingDraft = ref(false)
const lastSavedAt = ref<Date | null>(null)
let autosaveTimer: ReturnType<typeof setTimeout> | null = null
// Once the author edits the slug by hand, the title stops rewriting it.
const slugTouched = ref(false)

const tabs = computed<TabOverviewItem[]>(() => [
  { key: 'content', label: t('wiki.editor.tabs.content') },
  { key: 'checklists', label: t('wiki.editor.tabs.checklists') },
  { key: 'settings', label: t('wiki.editor.tabs.settings') },
  { key: 'attachments', label: t('wiki.editor.tabs.attachments') },
  { key: 'access', label: t('wiki.editor.tabs.access') },
  { key: 'history', label: t('wiki.editor.tabs.history') },
])

const writableSpaces = computed(() => spaces.value.filter(space => space.accessLevel !== 'read'))

function flatten(nodes: WikiTreeArticle[], depth = 0, into: Array<{ id: number, label: string }> = []) {
  for (const node of nodes) {
    into.push({ id: node.id, label: `${'— '.repeat(depth)}${node.title}` })
    flatten(node.children, depth + 1, into)
  }
  return into
}

const parentOptions = computed(() => {
  const space = spaces.value.find(entry => entry.id === form.spaceId)
  if (!space) return []
  return flatten(space.articles).filter(option => option.id !== articleId.value)
})

const spaceLabel = computed(() => writableSpaces.value.find(space => space.id === form.spaceId)?.title ?? '')
const parentLabel = computed(() => parentOptions.value.find(option => option.id === form.parentId)?.label ?? t('wiki.editor.fields.noParent'))
const ownerPositionLabel = computed(() => positionOptions.value.find(option => option.id === owner.positionId)?.label ?? t('wiki.editor.fields.noOwner'))
const ownerSubdivisionLabel = computed(() => subdivisionOptions.value.find(option => option.id === owner.subdivisionId)?.label ?? t('wiki.editor.fields.noOwner'))

function selectSpace(spaceId: number) {
  form.spaceId = spaceId
  form.parentId = null
  openFieldMenu.value = null
}

function selectParent(parentId: number | null) {
  form.parentId = parentId
  openFieldMenu.value = null
}

function selectOwnerPosition(positionId: number | null) {
  owner.positionId = positionId
  openFieldMenu.value = null
}

function selectOwnerSubdivision(subdivisionId: number | null) {
  owner.subdivisionId = subdivisionId
  openFieldMenu.value = null
}

const mustSubmit = computed(() => requiresReview.value && accessLevel.value !== 'admin')
const canMarkReviewed = computed(() => accessLevel.value === 'admin' && status.value === 'published')

const draftStateLabel = computed(() => {
  if (savingDraft.value) return t('wiki.editor.draftSaving')
  if (dirty.value) return t('wiki.editor.draftUnsaved')
  if (lastSavedAt.value) return t('wiki.editor.draftSaved')
  return ''
})

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

function onTitleInput() {
  if (!slugTouched.value && isCreate.value) form.slug = slugify(form.title)
}

async function loadSpaces() {
  const res = await $fetch<WikiTreeResponse>('/api/wiki/tree', { query: { includeDrafts: '1' } })
  spaces.value = res.ok ? res.spaces : []
  if (isCreate.value && !form.spaceId && writableSpaces.value[0]) {
    form.spaceId = writableSpaces.value[0].id
  }
}

async function loadOwnerOptions() {
  for (const [type, target] of [['position', positionOptions], ['subdivision', subdivisionOptions]] as const) {
    const res = await $fetch<WikiSubjectOptionsResponse>('/api/wiki/access/subject-options', { query: { type, q: '' } })
    target.value = res.ok ? res.options.map(option => ({ id: option.id, label: option.label })) : []
  }
}

async function loadArticle() {
  if (articleId.value === null) {
    loading.value = false
    return
  }

  const res = await $fetch<WikiArticleDetailResult>(`/api/wiki/articles/${articleId.value}`)
  if (!res.ok) {
    errors.value = [res.error]
    loading.value = false
    return
  }

  const article = res.article
  form.spaceId = article.spaceId
  form.parentId = article.parentId
  form.title = article.title
  form.slug = article.slug
  form.summary = article.summary
  // The draft is what the editor works on; without one, editing starts from the published version.
  form.markdown = article.draftMd ?? article.contentMd ?? ''
  owner.positionId = article.owner.position_id
  owner.subdivisionId = article.owner.subdivision_id
  attachments.value = article.attachments
  checklists.value = article.checklists
  status.value = article.status
  requiresReview.value = article.requiresReview
  accessLevel.value = article.accessLevel
  readOnly.value = article.accessLevel === 'read'
  slugTouched.value = true
  dirty.value = false
  loading.value = false
}

async function reload() {
  await loadArticle()
  revisionListRef.value?.reload()
}

function scheduleAutosave() {
  if (isCreate.value || readOnly.value) return
  dirty.value = true
  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => { saveDraft(false) }, AUTOSAVE_DELAY)
}

async function saveDraft(explicit: boolean) {
  if (isCreate.value || readOnly.value || articleId.value === null) return
  if (!explicit && !dirty.value) return

  savingDraft.value = true
  errors.value = []

  try {
    const res = await $fetch<{ ok: boolean, error?: string }>(`/api/wiki/articles/${articleId.value}`, {
      method: 'PUT',
      body: {
        title: form.title,
        slug: form.slug,
        summary: form.summary,
        parentId: form.parentId,
        draftMd: form.markdown,
        reviewIntervalDays: form.reviewIntervalDays === '' ? null : Number(form.reviewIntervalDays),
      },
    })

    if (!res.ok) {
      errors.value = [res.error ?? t('wiki.errors.saveFailed')]
      return
    }

    dirty.value = false
    lastSavedAt.value = new Date()
    if (explicit) toast.success(t('wiki.editor.savedToast'))
  } finally {
    savingDraft.value = false
  }
}

async function create() {
  errors.value = []
  if (!form.title.trim()) {
    errors.value = [t('wiki.errors.titleRequired')]
    return
  }
  if (!form.spaceId) {
    errors.value = [t('wiki.errors.spaceRequired')]
    return
  }

  saving.value = true
  try {
    const res = await $fetch<CreateWikiArticleResponse>('/api/wiki/articles/create', {
      method: 'POST',
      body: {
        spaceId: form.spaceId,
        parentId: form.parentId,
        title: form.title,
        slug: form.slug || slugify(form.title),
        summary: form.summary,
        markdown: form.markdown,
      },
    })

    if (!res.ok) {
      errors.value = [res.error]
      return
    }

    articleId.value = res.articleId
    dirty.value = false
    toast.success(t('wiki.editor.createdToast'))
    await loadArticle()
  } finally {
    saving.value = false
  }
}

async function publish() {
  if (articleId.value === null) return
  await saveDraft(false)

  saving.value = true
  errors.value = []
  try {
    const res = await $fetch<{ ok: boolean, error?: string }>(`/api/wiki/articles/${articleId.value}/publish`, {
      method: 'POST',
      body: { changeNote: '' },
    })

    if (!res.ok) {
      errors.value = [res.error ?? t('wiki.errors.saveFailed')]
      return
    }

    toast.success(t('wiki.editor.publishedToast'))
    dirty.value = false
    goToReturnTarget({ articleId: articleId.value })
  } finally {
    saving.value = false
  }
}

async function submitReview() {
  if (articleId.value === null) return
  await saveDraft(false)

  const res = await $fetch<{ ok: boolean, error?: string }>(`/api/wiki/articles/${articleId.value}/submit-review`, {
    method: 'POST',
  })

  if (!res.ok) {
    errors.value = [res.error ?? t('wiki.errors.saveFailed')]
    return
  }

  toast.success(t('wiki.editor.submittedToast'))
  await loadArticle()
}

async function markReviewed() {
  if (articleId.value === null) return
  const res = await $fetch<{ ok: boolean, error?: string }>(`/api/wiki/articles/${articleId.value}/mark-reviewed`, {
    method: 'POST',
  })

  if (!res.ok) {
    errors.value = [res.error ?? t('wiki.errors.saveFailed')]
    return
  }
  toast.success(t('wiki.editor.reviewedToast'))
}

async function archive() {
  confirmArchive.value = false
  if (articleId.value === null) return

  const res = await $fetch<{ ok: boolean, error?: string }>(`/api/wiki/articles/${articleId.value}`, { method: 'DELETE' })
  if (!res.ok) {
    errors.value = [res.error ?? t('wiki.errors.saveFailed')]
    return
  }

  toast.success(t('wiki.editor.archivedToast'))
  dirty.value = false
  goToReturnTarget()
}

async function saveOwner() {
  if (articleId.value === null) return

  const res = await $fetch<{ ok: boolean, error?: string }>(`/api/wiki/articles/${articleId.value}/owner`, {
    method: 'PUT',
    body: {
      ownerPositionId: owner.positionId,
      ownerSubdivisionId: owner.subdivisionId,
      createGrant: owner.createGrant,
    },
  })

  if (!res.ok) {
    errors.value = [res.error ?? t('wiki.errors.saveFailed')]
    return
  }

  await saveDraft(true)
}

async function uploadAttachment(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || articleId.value === null) return

  const body = new FormData()
  body.append('file', file)

  const res = await $fetch<UploadWikiAttachmentResponse>(`/api/wiki/articles/${articleId.value}/attachments`, {
    method: 'POST',
    body,
  })

  input.value = ''

  if (!res.ok) {
    toast.error(res.error)
    return
  }

  attachments.value = res.attachments
  toast.success(t('wiki.attachments.uploadedToast'))
}

async function removeAttachment(attachmentId: number) {
  const res = await $fetch<{ ok: boolean, error?: string }>(`/api/wiki/attachments/${attachmentId}`, { method: 'DELETE' })
  if (!res.ok) {
    toast.error(res.error ?? t('wiki.errors.saveFailed'))
    return
  }
  attachments.value = attachments.value.filter(entry => entry.attachmentId !== attachmentId)
  toast.success(t('wiki.attachments.removedToast'))
}

function cancel() {
  if (dirty.value && import.meta.client && !window.confirm(t('wiki.editor.unsavedWarning'))) return
  goToReturnTarget()
}

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

watch(() => [form.title, form.slug, form.summary, form.markdown, form.parentId, form.reviewIntervalDays], scheduleAutosave)

onMounted(() => {
  if (import.meta.client) window.addEventListener('beforeunload', onBeforeUnload)
})

onBeforeUnmount(() => {
  if (autosaveTimer) clearTimeout(autosaveTimer)
  if (import.meta.client) window.removeEventListener('beforeunload', onBeforeUnload)
})

loadSpaces()
loadOwnerOptions()
loadArticle()
</script>
