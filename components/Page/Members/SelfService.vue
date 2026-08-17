<template>
  <Page :headline1="t('member.myData.title')" @open-menu="$emit('openMenu')">
    <template #cards>
      <div class="col-span-12 xl:col-span-8 xl:col-start-3">
        <PageMembersSelfEditForm />
      </div>
    </template>
  </Page>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'

defineEmits<{
  (e: 'openMenu'): void
}>()

const { t } = useI18n()
</script>
