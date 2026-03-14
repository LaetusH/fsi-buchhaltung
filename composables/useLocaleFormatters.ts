import { useI18n } from '~/composables/useI18n'

export function useLocaleFormatters() {
  const { locale } = useI18n()

  function formatCurrency(value: number, options?: Intl.NumberFormatOptions) {
    return new Intl.NumberFormat(locale.value, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(value)
  }

  function formatDate(value?: string | null) {
    if (!value) return ''
    return new Date(value).toLocaleDateString(locale.value, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  function formatDateTime(value?: string | null) {
    if (!value) return ''
    return new Date(value).toLocaleString(locale.value, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return {
    formatCurrency,
    formatDate,
    formatDateTime,
  }
}
