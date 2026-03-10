<template>
  <div class="bg-white rounded-b-xl rounded-tl-xl shadow-lg p-6 space-y-6 col-span-12">
    <h2 class="text-lg font-semibold">{{ t('settings.general.title') }}</h2>

    <section class="rounded-xl border border-slate-200 p-4 space-y-3">
      <div>
        <h3 class="font-semibold">{{ t('settings.general.languageTitle') }}</h3>
        <p class="text-sm text-slate-600">
          {{ t('settings.general.languageText', { language: t(`language.${language === 'de' ? 'german' : 'english'}`) }) }}
        </p>
      </div>

      <button class="btn-secondary" @click="toggleLanguage">
        {{ t('language.switchTo') }}
      </button>
    </section>

    <section class="rounded-xl border border-slate-200 p-4 space-y-3">
      <div>
        <h3 class="font-semibold">{{ t('settings.general.logoutTitle') }}</h3>
        <p class="text-sm text-slate-600">{{ t('settings.general.logoutText') }}</p>
      </div>

      <button class="btn-primary" @click="handleLogout">
        {{ t('actions.logout') }}
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'
import { useI18n } from '~/composables/useI18n'
import { usePage } from '~/composables/usePage'

const { logout } = useAuth()
const { setPage } = usePage()
const { language, t, toggleLanguage } = useI18n()

async function handleLogout() {
  await logout()
  setPage('Login')
}
</script>
