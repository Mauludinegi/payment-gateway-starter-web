/** Hides admin pages from customers; the API enforces the same rule on every /api/admin request. */
export default defineNuxtRouteMiddleware((to) => {
  const { user } = useAuth()
  if (!user.value) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
  if (user.value.role !== 'ADMIN') {
    return abortNavigation(createError({ statusCode: 403, statusMessage: 'You need the ADMIN role for this page' }))
  }
})
