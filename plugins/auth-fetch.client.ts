type ApiErrorResponse = {
  ok?: boolean
  error?: string
}

function isUnauthenticatedResponse(data: unknown) {
  if (!data || typeof data !== 'object') return false

  const response = data as ApiErrorResponse
  return response.ok === false && response.error === 'Not authenticated'
}

export default defineNuxtPlugin(() => {
  const apiFetch = $fetch.create({
    onResponse({ response }) {
      if (isUnauthenticatedResponse(response._data)) {
        useAuth().redirectToLogin()
      }
    },
    onResponseError({ response }) {
      if (response?.status === 401 || isUnauthenticatedResponse(response?._data)) {
        useAuth().redirectToLogin()
      }
    },
  })

  globalThis.$fetch = apiFetch as typeof $fetch
})
