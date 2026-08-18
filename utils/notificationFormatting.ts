/**
 * Lightweight markdown-lite syntax shared by every place a notification body is authored or
 * rendered: the ad-hoc composer, the admin template/footer editors, the e-mail channel, and the
 * in-app inbox. Kept intentionally small — bold, italic, lists, and a divider — rather than
 * pulling in a full markdown/rich-text dependency for a handful of formatting options.
 */

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function renderInline(line: string): string {
  return escapeHtml(line)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
}

function isListBlock(lines: string[], marker: RegExp): boolean {
  const nonEmpty = lines.filter(line => line.trim() !== '')
  return nonEmpty.length > 0 && nonEmpty.every(line => marker.test(line))
}

const BULLET_MARKER = /^[-*]\s+/
const NUMBERED_MARKER = /^\d+\.\s+/

/**
 * Converts the markdown-lite body into HTML. Escapes first and only ever emits a hardcoded set of
 * tags (`p`/`br`/`strong`/`em`/`ul`/`ol`/`li`/`hr`), so the result is safe to `v-html` regardless
 * of who authored the text.
 */
export function renderNotificationBodyHtml(text: string): string {
  const blocks = text.replace(/\r\n/g, '\n').split(/\n{2,}/)

  return blocks.map((block) => {
    if (block.trim() === '---') return '<hr>'

    const lines = block.split('\n')

    if (isListBlock(lines, BULLET_MARKER)) {
      const items = lines.filter(line => line.trim() !== '').map(line => `<li>${renderInline(line.replace(BULLET_MARKER, ''))}</li>`)
      return `<ul>${items.join('')}</ul>`
    }

    if (isListBlock(lines, NUMBERED_MARKER)) {
      const items = lines.filter(line => line.trim() !== '').map(line => `<li>${renderInline(line.replace(NUMBERED_MARKER, ''))}</li>`)
      return `<ol>${items.join('')}</ol>`
    }

    return `<p>${lines.map(renderInline).join('<br>')}</p>`
  }).join('')
}

/** For plain-text-only contexts (push notifications) — drops the markers, keeps the text. */
export function stripNotificationFormatting(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
}

/**
 * Bold/italic + line breaks only — no `p`/`ul`/`ol`/`hr` — for spots where the body is `v-html`'d
 * inside a `line-clamp`/`-webkit-box` container (inbox rows, the bell dropdown). Block-level
 * children there break the clamp, so list markers become a plain bullet character and a divider
 * line becomes a plain dash rule instead of an actual block element.
 */
export function renderNotificationInlineHtml(text: string): string {
  return text.replace(/\r\n/g, '\n').split('\n').map((line) => {
    if (line.trim() === '---') return '———'
    if (BULLET_MARKER.test(line)) return `• ${renderInline(line.replace(BULLET_MARKER, ''))}`
    return renderInline(line)
  }).join('<br>')
}

export type FormatActionKey = 'bold' | 'italic' | 'bulletList' | 'numberedList' | 'divider'

export interface FormatAction {
  key: FormatActionKey
  icon: string
  labelKey: string
}

export const FORMAT_ACTIONS: FormatAction[] = [
  { key: 'bold', icon: 'material-symbols:format-bold-rounded', labelKey: 'notifications.compose.format.bold' },
  { key: 'italic', icon: 'material-symbols:format-italic-rounded', labelKey: 'notifications.compose.format.italic' },
  { key: 'bulletList', icon: 'material-symbols:format-list-bulleted-rounded', labelKey: 'notifications.compose.format.bulletList' },
  { key: 'numberedList', icon: 'material-symbols:format-list-numbered-rounded', labelKey: 'notifications.compose.format.numberedList' },
  { key: 'divider', icon: 'material-symbols:horizontal-rule-rounded', labelKey: 'notifications.compose.format.divider' },
]

export interface FormatActionResult {
  value: string
  selectionStart: number
  selectionEnd: number
}

function wrapSelection(value: string, start: number, end: number, marker: string, placeholder: string): FormatActionResult {
  const selected = value.slice(start, end)
  const inner = selected || placeholder
  const before = value.slice(0, start)
  const after = value.slice(end)
  const next = `${before}${marker}${inner}${marker}${after}`
  const innerStart = before.length + marker.length
  return { value: next, selectionStart: innerStart, selectionEnd: innerStart + inner.length }
}

function prefixLines(value: string, start: number, end: number, prefix: (index: number) => string): FormatActionResult {
  // Extend the selection to cover whole lines, so a partial selection still prefixes every line it touches.
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  let lineEnd = value.indexOf('\n', end)
  if (lineEnd === -1) lineEnd = value.length

  const before = value.slice(0, lineStart)
  const selected = value.slice(lineStart, lineEnd)
  const after = value.slice(lineEnd)

  const lines = selected.split('\n').map((line, index) => `${prefix(index)}${line}`)
  const next = `${before}${lines.join('\n')}${after}`

  return { value: next, selectionStart: lineStart, selectionEnd: lineStart + lines.join('\n').length }
}

export function applyFormatAction(key: FormatActionKey, value: string, start: number, end: number): FormatActionResult {
  switch (key) {
    case 'bold':
      return wrapSelection(value, start, end, '**', 'fett')
    case 'italic':
      return wrapSelection(value, start, end, '_', 'kursiv')
    case 'bulletList':
      return prefixLines(value, start, end, () => '- ')
    case 'numberedList':
      return prefixLines(value, start, end, index => `${index + 1}. `)
    case 'divider': {
      const before = value.slice(0, start)
      const after = value.slice(start)
      const needsLeadingBreak = before.length > 0 && !before.endsWith('\n\n')
      const insert = `${needsLeadingBreak ? '\n\n' : ''}---\n\n`
      const next = `${before}${insert}${after}`
      const caret = before.length + insert.length
      return { value: next, selectionStart: caret, selectionEnd: caret }
    }
  }
}
