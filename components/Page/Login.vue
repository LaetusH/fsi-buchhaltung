<template>
  <div class="max-w-md mx-auto">
    <div class="bg-white p-6 rounded-lg shadow">
      <h2 class="text-xl font-semibold mb-4">{{ t('login.title') }}</h2>

      <form @submit.prevent="doLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('login.username') }}</label>
          <input v-model="username" class="w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">{{ t('login.password') }}</label>
          <input v-model="password" type="password" class="w-full border rounded px-3 py-2" />
        </div>

        <div class="flex items-center justify-between">
          <div v-if="error" class="text-sm text-red-600">{{ error }}</div>
          <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer">{{ t('actions.login') }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useI18n } from '~/composables/useI18n'
import { usePage } from '~/composables/usePage'

const username = ref('')
const password = ref('')
const error = ref('')

const { login } = useAuth()
const { setPage } = usePage()
const { t } = useI18n()

async function doLogin() {
  error.value = ''
  const res = await login(username.value, password.value)
  if (res.ok) {
    setPage('Home')
  } else { 
    error.value = res.error || t('login.error')
  }
}
</script>
