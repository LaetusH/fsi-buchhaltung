<template>
  <Page :headline1="headline1" @open-menu="$emit('openMenu')">
    <template #cards>
      <div class="col-span-6 self-start">
        <ClientOnly v-if="canViewFiles">
          <FileDrop
            :model-value="modelValue"
            :existing-file="existingFile"
            :can-edit="canEdit"
            @update:model-value="$emit('update:modelValue', $event)"
            @remove-existing="$emit('removeExisting')"
          />
        </ClientOnly>
      </div>

      <div
        data-finance-form-column
        :class="[canViewFiles ? 'col-span-6 self-start' : 'col-span-12 lg:col-span-8 lg:col-start-3 self-start']"
      >
        <slot />
      </div>
    </template>
  </Page>
</template>

<script setup lang="ts">
import Page from '~/components/Page.vue'
import FileDrop from './FileDrop.vue'

defineProps<{
  headline1: string
  canViewFiles: boolean
  modelValue: File | null
  existingFile: { id: number, url: string, name: string, mime_type: string, size: number } | null
  canEdit: boolean
}>()

defineEmits<{
  (e: 'openMenu'): void
  (e: 'update:modelValue', value: File | null): void
  (e: 'removeExisting'): void
}>()
</script>
