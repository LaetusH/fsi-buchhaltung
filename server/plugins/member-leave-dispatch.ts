import { runMemberLeaveDispatch } from '~/server/utils/memberLeaveDispatch'

function msUntilNextUtcMidnight() {
  const now = new Date()
  const nextMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  return nextMidnight - now.getTime()
}

export default defineNitroPlugin((nitroApp) => {
  if (process.env.MEMBER_LEAVE_DISPATCH_DISABLED === 'true') {
    console.info('member leave dispatch: disabled via MEMBER_LEAVE_DISPATCH_DISABLED')
    return
  }

  console.info('member leave dispatch: scheduler started (on startup, then daily at midnight UTC)')

  let timer: NodeJS.Timeout

  function run() {
    runMemberLeaveDispatch().catch(err => console.error('member leave dispatch: run failed', err))
  }

  function scheduleNext() {
    timer = setTimeout(() => {
      run()
      scheduleNext()
    }, msUntilNextUtcMidnight())
  }

  setTimeout(run, 5000)
  scheduleNext()

  nitroApp.hooks.hook('close', () => {
    clearTimeout(timer)
  })
})
