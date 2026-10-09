export default defineNuxtRouteMiddleware((to) => {
  const signedIn = useCookie('admin_signed_in')
  if (!signedIn.value) {
    return navigateTo({ path: '/admin/login', query: { redirect: to.fullPath } })
  }
})
