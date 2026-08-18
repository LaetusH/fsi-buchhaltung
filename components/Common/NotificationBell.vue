<template>
  <div class="relative">
    <button
      ref="triggerRef"
      type="button"
      :class="[
        'relative flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition cursor-pointer',
        open ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
      ]"
      :aria-label="t('notifications.title')"
      :title="t('notifications.title')"
      :aria-expanded="open"
      aria-haspopup="dialog"
      @click="toggleOpen"
    >
      <span class="relative flex shrink-0">
        <Icon
          :name="unreadCount > 0 ? 'material-symbols:notifications-active-rounded' : 'material-symbols:notifications-rounded'"
          class="h-5 w-5"
          aria-hidden="true"
        />
        <span
          v-if="unreadCount > 0"
          class="absolute -top-2 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white ring-2 ring-slate-900"
        >
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </span>
      <span v-if="!collapsed" class="truncate">{{ t('notifications.title') }}</span>
    </button>

    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-50 bg-black/30 sm:bg-transparent" @click="open = false" />

      <div
        v-if="open"
        role="dialog"
        :aria-label="t('notifications.title')"
        :style="panelStyle"
        class="fixed inset-x-2 bottom-2 z-50 flex max-h-[80vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:inset-x-auto sm:bottom-auto sm:max-h-128 sm:w-96 sm:rounded-xl"
      >
        <div class="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div class="flex min-w-0 items-center gap-2">
            <h2 class="truncate text-sm font-semibold text-slate-900">{{ t('notifications.title') }}</h2>
            <span
              v-if="unreadCount > 0"
              class="shrink-0 rounded-full bg-cyan-100 px-2 py-0.5 text-[11px] font-semibold text-cyan-800"
            >
              {{ unreadCount }} {{ t('notifications.unread') }}
            </span>
          </div>

          <div class="flex shrink-0 items-center gap-1">
            <!-- h-8 w-8 rather than padding: an inline <Icon> adds line-height on the vertical axis,
                 which made these buttons taller than they were wide and the glyph sit off-centre. -->
            <button
              v-if="unreadCount > 0"
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-cyan-700 cursor-pointer"
              :title="t('notifications.markAllRead')"
              :aria-label="t('notifications.markAllRead')"
              @click="markAllRead"
            >
              <Icon name="material-symbols:mark-email-read-outline-rounded" class="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 cursor-pointer sm:hidden"
              :title="t('actions.close')"
              :aria-label="t('actions.close')"
              @click="open = false"
            >
              <Icon name="material-symbols:close-rounded" class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div v-if="loading && !items.length" class="space-y-3 p-4">
            <div v-for="n in 3" :key="n" class="flex animate-pulse gap-3">
              <div class="h-9 w-9 shrink-0 rounded-full bg-slate-200" />
              <div class="flex-1 space-y-2 py-1">
                <div class="h-3 w-2/3 rounded bg-slate-200" />
                <div class="h-3 w-full rounded bg-slate-100" />
              </div>
            </div>
          </div>

          <div v-else-if="!items.length" class="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Icon name="material-symbols:notifications-off-outline-rounded" class="h-8 w-8 text-slate-300" aria-hidden="true" />
            <p class="text-sm text-slate-500">{{ t('notifications.empty') }}</p>
          </div>

          <ul v-else class="divide-y divide-slate-100">
            <li v-for="item in items" :key="item.deliveryId" class="group relative">
              <component
                :is="item.linkPage ? 'button' : 'div'"
                :type="item.linkPage ? 'button' : undefined"
                class="flex w-full items-start gap-3 border-l-4 px-4 py-3 text-left transition"
                :class="[
                  item.readAt ? 'border-transparent' : 'border-cyan-500 bg-cyan-100/70',
                  item.linkPage ? 'cursor-pointer' : '',
                  item.linkPage ? (item.readAt ? 'hover:bg-slate-50' : 'hover:bg-cyan-100') : '',
                ]"
                @click="item.linkPage ? openItem(item) : undefined"
              >
                <span
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  :class="typeColorClass(item.typeKey)"
                >
                  <Icon :name="typeIcon(item.typeKey)" class="h-5 w-5" aria-hidden="true" />
                </span>

                <span class="min-w-0 flex-1">
                  <span class="flex items-start justify-between gap-2">
                    <span
                      class="truncate text-sm text-slate-900"
                      :class="item.readAt ? 'font-medium' : 'font-semibold'"
                    >
                      {{ item.subject || typeLabel(item.typeKey) }}
                    </span>
                    <span class="shrink-0 text-[11px] text-slate-400" :title="absoluteTime(receivedAt(item))">
                      {{ relativeTime(receivedAt(item)) }}
                    </span>
                  </span>

                  <span class="mt-0.5 line-clamp-2 text-xs break-words text-slate-500" v-html="renderNotificationInlineHtml(item.body)"></span>
                  <span class="mt-1 flex items-center gap-2">
                    <span class="truncate text-[11px] text-slate-400">{{ typeLabel(item.typeKey) }}</span>
                    <Icon
                      v-if="item.linkPage"
                      name="material-symbols:chevron-right-rounded"
                      class="h-4 w-4 shrink-0 text-slate-300"
                      aria-hidden="true"
                    />
                  </span>
                </span>

                <span v-if="!item.readAt" class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-600" aria-hidden="true" />
              </component>

              <button
                v-if="!item.readAt"
                type="button"
                class="absolute right-2 bottom-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white/90 text-slate-400 transition hover:text-cyan-700 cursor-pointer sm:opacity-0 sm:focus:opacity-100 sm:group-hover:opacity-100"
                :title="t('notifications.markRead')"
                :aria-label="t('notifications.markRead')"
                @click.stop="markRead([item.deliveryId])"
              >
                <Icon name="material-symbols:check-rounded" class="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </div>

        <div class="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2">
          <button
            v-if="canOpenSettings"
            type="button"
            class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            @click="openPreferences"
          >
            <Icon name="material-symbols:tune-rounded" class="h-4 w-4" aria-hidden="true" />
            {{ t('notifications.openPreferences') }}
          </button>
          <button
            type="button"
            class="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-cyan-700 transition hover:bg-cyan-50 cursor-pointer"
            @click="openList"
          >
            {{ t('notifications.showAll') }}
            <Icon name="material-symbols:arrow-forward-rounded" class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { useNotifications } from '~/composables/useNotifications'
import { useNotificationDisplay, NOTIFICATION_PREFERENCES_SECTION } from '~/composables/useNotificationDisplay'
import { usePage } from '~/composables/usePage'
import { useAuth } from '~/composables/useAuth'
import { renderNotificationInlineHtml } from '~/utils/notificationFormatting'
import type { NotificationInboxItem } from '~/types/notification'

withDefaults(defineProps<{
  collapsed?: boolean
}>(), {
  collapsed: false,
})

const { t } = useI18n()
const { items, unreadCount, loading, fetchInbox, markRead, markAllRead, startPolling, stopPolling } = useNotifications()
const { typeIcon, typeColorClass, typeLabel, relativeTime, absoluteTime, receivedAt } = useNotificationDisplay()
const { setPage } = usePage()
const { hasPermission } = useAuth()

const open = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const anchor = ref({ left: 0, bottom: 0 })
const isWideScreen = ref(false)

const canOpenSettings = computed(() => hasPermission(['settings.access']))

const panelStyle = computed(() => isWideScreen.value
  ? { left: `${anchor.value.left}px`, bottom: `${anchor.value.bottom}px` }
  : undefined)

function updateAnchor() {
  const rect = triggerRef.value?.getBoundingClientRect()
  if (!rect) return
  anchor.value = { left: rect.right + 12, bottom: window.innerHeight - rect.bottom }
}

function toggleOpen() {
  open.value = !open.value
  if (open.value) {
    updateAnchor()
    fetchInbox()
  }
}

function openItem(item: NotificationInboxItem) {
  if (!item.readAt) markRead([item.deliveryId])
  open.value = false
  if (item.linkPage) setPage(item.linkPage as any, item.linkMeta || undefined)
}

function openList() {
  open.value = false
  setPage('NotificationList' as any)
}

function openPreferences() {
  open.value = false
  // The personal preference matrix lives in the general settings tab — jump straight to it.
  // `sectionKey` re-triggers the scroll when the settings page is already open on that section.
  setPage('Settings' as any, { tab: 'general', section: NOTIFICATION_PREFERENCES_SECTION, sectionKey: Date.now() })
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) open.value = false
}

function onResize() {
  isWideScreen.value = window.matchMedia('(min-width: 640px)').matches
  if (open.value) updateAnchor()
}

onMounted(() => {
  // Loads the preview list too, so the panel opens with content already in it.
  fetchInbox().catch(() => {})
  startPolling()
  onResize()
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  stopPolling()
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onResize)
})
</script>
