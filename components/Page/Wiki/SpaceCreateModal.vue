<template>
  <CommonModal
    :model-value="modelValue"
    :title="t('wiki.space.createTitle')"
    width-class="max-w-lg"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <CommonValidationSummary
      v-if="error"
      :errors="[error]"
      :title="t('common.validationBlocked')"
    />

    <p class="text-sm text-slate-500">{{ t('wiki.space.createHint') }}</p>

    <div class="field">
      <label for="wiki-space-title">{{ t('wiki.space.fields.title') }}</label>
      <input id="wiki-space-title" v-model="form.title" class="input" />
    </div>

    <div class="field">
      <label for="wiki-space-slug">{{ t('wiki.space.fields.slug') }}</label>
      <input id="wiki-space-slug" v-model="form.slug" class="input" :placeholder="t('wiki.space.fields.slugPlaceholder')" />
      <p class="mt-1 text-xs text-slate-500">{{ t('wiki.space.fields.slugHint') }}</p>
    </div>

    <div class="field">
      <label for="wiki-space-description">{{ t('wiki.space.fields.description') }}</label>
      <textarea id="wiki-space-description" v-model="form.description" class="input" rows="3"></textarea>
    </div>

    <div class="field">
      <label for="wiki-space-icon">{{ t('wiki.space.fields.icon') }}</label>
      <div class="flex items-center gap-2">
        <Icon :name="previewIcon" class="shrink-0 text-xl text-slate-500" />
        <input id="wiki-space-icon" v-model="form.icon" class="input" :placeholder="DEFAULT_ICON" />
      </div>
      <p class="mt-1 text-xs text-slate-500">{{ t('wiki.space.fields.iconHint') }}</p>
    </div>

    <label class="flex items-center gap-2 text-sm text-slate-700">
      <input v-model="form.requiresReview" type="checkbox" class="checkbox" />
      {{ t('wiki.space.fields.requiresReview') }}
    </label>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" :disabled="saving" @click="close">
          {{ t('actions.cancel') }}
        </button>
        <button type="button" class="btn-primary" :disabled="saving" @click="submit">
          {{ t('wiki.space.create') }}
        </button>
      </div>
    </template>
  </CommonModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { useToast } from '~/composables/useToast'
import type { CreateWikiSpaceResponse } from '~/server/api/wiki/spaces/create.post'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'created', spaceId: number): void
}>()

const { t } = useI18n()
const toast = useToast()

const DEFAULT_ICON = 'material-symbols:menu-book-rounded'

const saving = ref(false)
const error = ref('')
const form = reactive({
  title: '',
  slug: '',
  description: '',
  icon: '',
  requiresReview: false,
})

const previewIcon = computed(() => (/^[a-z0-9-]+:[a-z0-9-]+$/.test(form.icon.trim()) ? form.icon.trim() : DEFAULT_ICON))

function close() {
  emit('update:modelValue', false)
}

watch(() => props.modelValue, (open) => {
  if (!open) return
  error.value = ''
  form.title = ''
  form.slug = ''
  form.description = ''
  form.icon = ''
  form.requiresReview = false
})

async function submit() {
  error.value = ''

  if (!form.title.trim()) {
    error.value = t('wiki.errors.titleRequired')
    return
  }

  saving.value = true
  try {
    const res = await $fetch<CreateWikiSpaceResponse>('/api/wiki/spaces/create', {
      method: 'POST',
      body: {
        title: form.title.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        icon: form.icon.trim(),
        requiresReview: form.requiresReview,
      },
    })

    if (!res.ok) {
      error.value = res.error
      return
    }

    toast.success(t('wiki.space.createdToast'))
    emit('created', res.spaceId)
    close()
  } catch {
    error.value = t('wiki.space.createFailed')
  } finally {
    saving.value = false
  }
}
</script>
