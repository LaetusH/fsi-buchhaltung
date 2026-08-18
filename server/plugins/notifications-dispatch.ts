import { runNotificationDispatch } from '~/server/utils/notifications/dispatch'

// The safety net behind requestImmediateDispatch(): if that nudge fires a moment before the
// enqueuing transaction commits, this is how long the notification waits instead.
const INTERVAL_MS = 30000

export default defineNitroPlugin((nitroApp) => {
  if (process.env.NOTIFICATIONS_DISPATCH_DISABLED === 'true') {
    console.info('notifications dispatch: disabled via NOTIFICATIONS_DISPATCH_DISABLED')
    return
  }

  // One line at boot so "are notifications even being sent?" is answerable from the logs.
  console.info(`notifications dispatch: scheduler started (every ${INTERVAL_MS / 1000}s)`)

  setTimeout(() => {
    runNotificationDispatch().catch(err => console.error('notifications dispatch: initial run failed', err))
  }, 5000)

  const interval = setInterval(() => {
    runNotificationDispatch().catch(err => console.error('notifications dispatch: scheduled run failed', err))
  }, INTERVAL_MS)

  nitroApp.hooks.hook('close', () => {
    clearInterval(interval)
  })
})
