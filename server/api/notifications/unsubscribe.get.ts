import { defineEventHandler, getQuery, setHeader } from 'h3'
import { query } from '~/server/utils/db'
import { hmacToken } from '~/server/utils/auth'
import { setPreference } from '~/server/utils/notifications/preferences'
import { translate } from '~/shared/i18n'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const token = String(q.token || '')
  setHeader(event, 'content-type', 'text/html; charset=utf-8')

  if (!token) return renderPage(false)

  const tokenHash = hmacToken(token)
  const [delivery] = await query<Array<{ notification_id: number, member_id: number | null, type_key: string }>>(
    `SELECT nd.notification_id, nd.member_id, n.type_key
     FROM notification_deliveries nd
     JOIN notifications n ON n.id = nd.notification_id
     WHERE nd.unsubscribe_token = ? AND nd.channel = 'email'
     LIMIT 1`,
    [tokenHash],
  )

  if (!delivery || !delivery.member_id) return renderPage(false)

  await setPreference('member', delivery.member_id, delivery.type_key as any, 'email', false)

  return renderPage(true)
})

function renderPage(success: boolean) {
  // Same default locale as everywhere else in the notification pipeline (see recipients.ts) — there
  // is no per-member locale preference in the app yet, so this stays 'de' until one exists.
  const locale = 'de' as const
  const title = translate(locale, 'notifications.unsubscribe.title')
  const message = translate(locale, success ? 'notifications.unsubscribe.success' : 'notifications.unsubscribe.error')
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family: sans-serif; max-width: 32rem; margin: 4rem auto; text-align: center; color: #1e293b;">
<h1>${title}</h1><p>${message}</p>
</body></html>`
}
