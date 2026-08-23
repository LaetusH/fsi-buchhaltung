<template>
  <Page :headline1="t('audit.title')" @open-menu="$emit('openMenu')">
    <template v-if="hasExplicitReturn" #header>
      <div class="flex flex-1 justify-end">
        <button type="button" class="btn-secondary inline-flex items-center gap-1.5" @click="goToReturnTarget()">
          <Icon name="material-symbols:arrow-back-rounded" class="text-base" aria-hidden="true" />
          {{ t('actions.back') }}
        </button>
      </div>
    </template>

    <template #cards>
      <PageAuditLogPanel />
    </template>
  </Page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { usePage } from '~/composables/usePage'
import { useReturnTarget } from '~/composables/useReturnTarget'
import PageAuditLogPanel from './LogPanel.vue'

defineEmits<{
  (e: 'openMenu'): void
}>()

const { t } = useI18n()
const { pageMeta } = usePage()
const { goToReturnTarget } = useReturnTarget('AuditLog')

const hasExplicitReturn = computed(() => Boolean(pageMeta.value?.returnTarget))
</script>
