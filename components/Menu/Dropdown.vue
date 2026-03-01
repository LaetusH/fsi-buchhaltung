<template>
  <div ref="wrapper" class="relative w-full">
    <div @click="toggleDropdown" class="w-full">
      <slot name="trigger" :open="open" styling="input w-full flex justify-between text-left" />
    </div>

    <transition name="fade">
      <div
        v-if="open"
        class="absolute z-30 mt-1 rounded-md border bg-white shadow-lg min-w-full w-max max-w-[30vw] max-h-50 overflow-y-auto"
        @click.stop
      >
        <slot styling="flex w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md cursor-pointer whitespace-nowrap" />
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: number | null
  id: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: number | null): void
}>()

const wrapper = ref<HTMLElement | null>(null)

const open = computed({
  get: () => props.modelValue === props.id,
  set: v => emit('update:modelValue', v ? props.id : null)
})

function toggleDropdown() {
  emit('update:modelValue', open.value ? null : props.id)
}

function closeDropdown() {
  emit('update:modelValue', null)
}

function handleClickOutside(e: MouseEvent) {
  if (!open.value) return
  if (!wrapper.value) return
  if (!wrapper.value.contains(e.target as Node)) {
    closeDropdown()
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeDropdown()
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.1s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>