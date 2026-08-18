let pendingRun: ReturnType<typeof setTimeout> | null = null

/**
 * Nudges the dispatcher shortly after something was enqueued for immediate delivery, so a
 * "send now" notification is not stuck in the queue until the next tick of the background
 * plugin (that delay is what made notifications look like they only arrive on a page refresh).
 *
 * Deliberately deferred by a couple of seconds: the caller is usually still inside its audit
 * transaction and the row has to be committed before the dispatcher can see it. Runs are debounced
 * and `runNotificationDispatch` takes a DB lock, so a burst of enqueues costs one pass — and the
 * periodic run stays the safety net if this one fires a moment too early.
 *
 * Imported dynamically because dispatch.ts → reminders.ts → enqueue.ts already forms a cycle.
 */
export function requestImmediateDispatch(delayMs = 2000) {
  if (pendingRun) return

  pendingRun = setTimeout(async () => {
    pendingRun = null
    try {
      const { runNotificationDispatch } = await import('~/server/utils/notifications/dispatch')
      await runNotificationDispatch()
    } catch (err) {
      console.error('notifications dispatch: immediate run failed', err)
    }
  }, delayMs)

  // Never hold the process open just for this.
  pendingRun.unref?.()
}
