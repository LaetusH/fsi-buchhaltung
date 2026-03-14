import { nextTick } from 'vue'

export function sanitizeCurrencyInput(rawValue: string) {
  let value = rawValue.replace(/[^0-9.,]/g, '')
  value = value.replace(',', '.')

  const parts = value.split('.')
  if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('')

  return value
}

export function parseCurrencyInput(rawValue: string) {
  const parsed = parseFloat(sanitizeCurrencyInput(rawValue))
  return Number.isNaN(parsed) ? 0 : parsed
}

export function focusAndSelectInput(event: FocusEvent) {
  nextTick(() => {
    const input = event.target as HTMLInputElement | null
    input?.select()
  })
}

