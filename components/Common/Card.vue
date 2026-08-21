<template>
  <section
    class="-mx-6 p-4 shadow-sm space-y-3 col-span-12 sm:mx-0 sm:space-y-4 sm:rounded-xl sm:p-6 sm:shadow-lg"
    :class="toneClass"
  >
    <div v-if="title || description || $slots.header || $slots.actions" class="flex flex-wrap items-start justify-between gap-3">
      <div v-if="title || description" class="min-w-0">
        <h2 class="flex items-center gap-1.5 text-base font-semibold sm:text-lg" :class="titleClass">
          <Icon v-if="icon" :name="icon" class="shrink-0 text-lg text-base-400" aria-hidden="true" />
          {{ title }}
        </h2>
        <p v-if="description" class="text-sm" :class="descriptionClass">{{ description }}</p>
      </div>

      <slot name="header" />

      <div v-if="$slots.actions" class="flex flex-wrap items-center justify-end gap-2">
        <slot name="actions" />
      </div>
    </div>

    <slot />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  icon?: string
  tone?: 'default' | 'danger' | 'warning' | 'success'
}>(), {
  title: '',
  description: '',
  icon: '',
  tone: 'default',
})

const toneClass = computed(() => {
  switch (props.tone) {
    case 'danger':
      return 'bg-danger-50 sm:border sm:border-danger-200'
    case 'warning':
      return 'bg-warning-50 sm:border sm:border-warning-200'
    case 'success':
      return 'bg-secondary-50/60 sm:border sm:border-secondary-200'
    default:
      return 'bg-white'
  }
})

const titleClass = computed(() => (props.tone === 'danger' ? 'text-danger-900' : ''))

const descriptionClass = computed(() => (props.tone === 'danger' ? 'text-danger-800' : 'text-base-600'))
</script>
