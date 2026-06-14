<template>
  <section class="col-span-12 overflow-hidden rounded-xl bg-white shadow-lg">
    <div v-if="loading" class="flex items-center justify-center p-8 text-slate-400">
      <Icon name="material-symbols:progress-activity" class="animate-spin text-2xl" />
    </div>

    <div v-else-if="isEmpty" class="flex flex-col items-center gap-2 p-8 text-center text-slate-400">
      <Icon :name="emptyIcon" class="text-3xl" />
      <p class="text-sm">{{ emptyText }}</p>
    </div>

    <template v-else>
      <!-- Hero -->
      <div class="bg-slate-900 px-4 py-4 text-white sm:px-6 sm:py-5">
        <div v-if="$slots.badge || $slots.toggle" class="flex flex-wrap items-start justify-between gap-3">
          <slot name="badge" />
          <slot name="toggle" />
        </div>

        <div class="flex flex-wrap items-end justify-between gap-3" :class="{ 'mt-3': $slots.badge || $slots.toggle }">
          <div class="min-w-0">
            <h2 class="truncate text-xl font-semibold sm:text-2xl">{{ title }}</h2>
            <slot name="subtitle" />
          </div>

          <slot name="action" />
        </div>
      </div>

      <!-- Body -->
      <div class="p-4 sm:p-6">
        <slot />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  loading?: boolean
  isEmpty?: boolean
  emptyIcon?: string
  emptyText?: string
  title?: string
}>(), {
  loading: false,
  isEmpty: false,
  emptyIcon: 'material-symbols:info-outline-rounded',
  emptyText: '',
  title: '',
})
</script>
