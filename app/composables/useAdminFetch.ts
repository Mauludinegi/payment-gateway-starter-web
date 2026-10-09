import type { UseFetchOptions } from 'nuxt/app'

/** useFetch for /api/admin: an expired session goes to sign-in, a missing ADMIN role to the 403 page. */
export function useAdminFetch<T>(url: string | (() => string), options: UseFetchOptions<T> = {}) {
  return useFetch(url, {
    ...options,
    async onResponseError({ response }) {
      if (response.status === 401) {
        useAuth().user.value = null
        useCookie('signed_in').value = null
        await navigateTo({ path: '/login', query: { redirect: useRoute().fullPath } })
      }
      else if (response.status === 403) {
        showError({ statusCode: 403, statusMessage: 'You need the ADMIN role for this page' })
      }
    },
  })
}
