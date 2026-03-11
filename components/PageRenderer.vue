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
const { user, fetchSession, hasPermission } = useAuth()

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
  if (!page) return LoginPage
  if (page.allowGuest) return page.component
  if (!user.value) return LoginPage
  if (!page.permissions.length) return page.component
  if (hasPermission(page.permissions)) return page.component
  
  return LoginPage
})
</script>
