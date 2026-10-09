import type { UseFetchOptions } from 'nuxt/app'

/** useFetch for /api/admin: an expired or revoked session sends the admin back to the login page. */
export function useAdminFetch<T>(url: string | (() => string), options: UseFetchOptions<T> = {}) {
  return useFetch(url, {
    ...options,
    async onResponseError({ response }) {
      if (response.status === 401) {
        useCookie('admin_signed_in').value = null
        await navigateTo({ path: '/admin/login', query: { redirect: useRoute().fullPath } })
      }
    },
  })
}

export async function signOut() {
  await $fetch('/auth/admin/logout', { method: 'POST' })
  useCookie('admin_signed_in').value = null
  await navigateTo('/admin/login')
}
