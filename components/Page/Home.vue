<template>
  <Page @open-menu="$emit('openMenu')">
    <template #cards>
      <div
        v-for="widget in visibleWidgets"
        :key="widget.id"
        :class="DASHBOARD_WIDGET_SIZE_CLASSES[widget.size]"
      >
        <component :is="widget.component" />
      </div>

      <div
        v-if="!visibleWidgets.length"
        class="col-span-12 flex flex-col items-center gap-2 rounded-xl bg-white p-10 text-center text-slate-400 shadow-sm"
      >
        <Icon name="material-symbols:dashboard-rounded" class="text-3xl" />
        <p class="text-sm">{{ t('home.noWidgets') }}</p>
      </div>
    </template>
  </Page>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { DASHBOARD_WIDGETS, DASHBOARD_WIDGET_SIZE_CLASSES } from '~/config/dashboard'

defineEmits<{
  (e: 'openMenu'): void
}>()

const { t } = useI18n()
const { hasPermission, hasAllPermissions } = useAuth()

const visibleWidgets = computed(() => DASHBOARD_WIDGETS.filter(widget =>
  !widget.permissions.length
  || (widget.requireAllPermissions ? hasAllPermissions(widget.permissions) : hasPermission(widget.permissions)),
))
</script>
