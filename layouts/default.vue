<template>
  <div class="flex min-h-screen">
    <MenuMain :pages="filteredMenuItems" :open="menuOpen" @close="menuOpen = false" />

    <main class="flex-1 md:ml-36 p-6 bg-gray-100" @click="handleClick">
      <PageRenderer @open-menu="handleOpen" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'
import { PAGES } from '~/config/pages'

const { user, fetchSession } = useAuth()

const menuOpen = ref(false)
const openMenu = ref(false)

const menuItems = Object.entries(PAGES).map(([name, page]) => ({ name, ...page }))

const filteredMenuItems = computed(() => {
  return menuItems.filter(it => {
    if (it.name === 'Login') return false
    if (it.roles.includes('guest')) return !user.value
    if (!user.value) return false
    return it.roles.includes(user.value.role)
  })
})

function handleOpen() {
  openMenu.value = true
  menuOpen.value = true
}

function handleClick() {
  if (openMenu.value) {
    openMenu.value = false
  } else {
    menuOpen.value = false
  }
}

onMounted(() => {
  fetchSession()
})
</script>