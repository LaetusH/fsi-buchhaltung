<template>
  <div class="w-full">
    <component v-if="loaded" :is="currentComponent" @open-menu="$emit('openMenu')"/>
  </div>
</template>

<script setup lang="ts">
import { usePage } from '~/composables/usePage'
import { useAuth } from '~/composables/useAuth'
import { PAGES } from '~/config/pages'

import LoginPage from '~/components/Page/Login.vue'

const emit = defineEmits<{
  (e: 'openMenu'): void
}>()

const { currentPage } = usePage()
const { user, fetchSession } = useAuth()

const loaded = ref(false)

onMounted(async () => {
  await fetchSession()
  loaded.value = true

  watch(currentPage, async () => {
    if (user.value) await $fetch('/api/auth/session')
  })
})

const currentComponent = computed(() => {
  const page = PAGES[currentPage.value]
  if (!user.value) return LoginPage
  if (!page) return LoginPage

  if (page.roles.includes('guest')) return page.component

  if (page.roles.includes(user.value.role)) return page.component
  
  return LoginPage
})
</script>