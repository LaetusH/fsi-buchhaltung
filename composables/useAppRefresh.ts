import { useAuth } from '~/composables/useAuth'

export const useAppRefresh = () => {
  const refreshKey = useState('app-refresh-key', () => 0)
  const isRefreshing = useState('app-is-refreshing', () => false)
  const { fetchSession } = useAuth()

  async function refreshCurrentPage() {
    if (isRefreshing.value) return

    isRefreshing.value = true
    try {
      await fetchSession()
    } finally {
      refreshKey.value += 1
      isRefreshing.value = false
    }
  }

  return { refreshKey, isRefreshing, refreshCurrentPage }
}
