/**
 * Forwards /api/** to the Spring Boot backend, so the browser talks to one origin and no CORS setup is needed.
 * Admin calls get the bearer token from the http-only session cookie.
 */
export default defineEventHandler((event) => {
  const { apiBase } = useRuntimeConfig(event)
  const headers: Record<string, string> = {}

  if (event.path.startsWith('/api/admin/')) {
    const token = getCookie(event, ADMIN_TOKEN_COOKIE)
    if (!token) {
      throw createError({ statusCode: 401, statusMessage: 'Not signed in' })
    }
    headers.authorization = `Bearer ${token}`
  }

  return proxyRequest(event, new URL(event.path, apiBase).toString(), {
    headers,
    async onResponse(event, response) {
      if (response.status === 401 && event.path.startsWith('/api/admin/')) {
        clearAdminSession(event)
      }
    },
  })
})
