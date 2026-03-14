<template>
  <div class="bg-white rounded-xl shadow-lg p-6 space-y-6 col-span-12">
    <div class="flex justify-between items-center gap-3 flex-wrap">
      <h2 class="text-lg font-semibold">{{ title }}</h2>

      <div class="flex items-center gap-2 flex-wrap justify-end">
        <CommonGlobalSearchBar
          :model-value="searchValue"
          :placeholder="searchPlaceholder"
          @update:model-value="$emit('update:searchValue', $event)"
        />

        <button v-if="canCreate" type="button" class="btn-primary" @click="$emit('create')">
          {{ createLabel }}
        </button>
      </div>
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  searchValue: string
  searchPlaceholder?: string
  canCreate?: boolean
  createLabel?: string
}>(), {
  searchPlaceholder: '',
  canCreate: false,
  createLabel: '',
})

defineEmits<{
  (e: 'update:searchValue', value: string): void
  (e: 'create'): void
}>()
</script>
