<template>
  <section class="-mx-6 flex h-full flex-col overflow-hidden bg-white shadow-sm sm:mx-0 sm:rounded-xl sm:shadow-lg">
    <!-- Header -->
    <header class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 bg-slate-900 px-4 py-3 text-white sm:px-5">
      <div class="min-w-0">
        <h2 class="flex items-center gap-2 text-base font-semibold">
          <Icon :name="icon" class="shrink-0 text-lg text-slate-400" />
          <span class="truncate">{{ title }}</span>
        </h2>
        <slot name="subtitle" />
      </div>

      <slot name="action" />
    </header>

    <div v-if="loading" class="flex flex-1 items-center justify-center p-8 text-slate-400">
      <Icon name="material-symbols:progress-activity" class="animate-spin text-2xl" />
    </div>

    <div v-else-if="isEmpty" class="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-slate-400">
      <Icon :name="emptyIcon" class="text-3xl" />
      <p class="text-sm">{{ emptyText }}</p>
    </div>

    <div v-else class="flex-1 p-4 sm:p-5">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  icon: string
  loading?: boolean
  isEmpty?: boolean
  emptyIcon?: string
  emptyText?: string
}>(), {
  loading: false,
  isEmpty: false,
  emptyIcon: 'material-symbols:info-outline-rounded',
  emptyText: '',
})
</script>
