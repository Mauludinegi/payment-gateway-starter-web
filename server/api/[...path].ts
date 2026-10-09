/**
 * Forwards /api/** to the Spring Boot backend, so the browser talks to one origin and no CORS setup is needed.
 * Bearer tokens come from http-only cookies: the admin token for /api/admin, the customer session for the rest.
 */
const PUBLIC_AUTH_PATHS = ['/api/auth/me', '/api/auth/options']

function normalizedPath(raw: string) {
  try {
    return decodeURIComponent(raw.split('?')[0]!).toLowerCase()
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Malformed path' })
  }
}

export default defineEventHandler((event) => {
  const { apiBase } = useRuntimeConfig(event)
  const path = normalizedPath(event.path)
  const isAdmin = path.startsWith('/api/admin/')
  const headers: Record<string, string> = {}

  // Session tokens must only travel through server/routes/auth, which keeps them in cookies.
  if (path.startsWith('/api/auth') && !PUBLIC_AUTH_PATHS.includes(path)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  if (isAdmin) {
    const token = getCookie(event, ADMIN_TOKEN_COOKIE)
    if (!token) {
      throw createError({ statusCode: 401, statusMessage: 'Not signed in' })
    }
    headers.authorization = `Bearer ${token}`
  }
  else {
    const token = getCookie(event, USER_TOKEN_COOKIE)
    if (token) {
      headers.authorization = `Bearer ${token}`
    }
  }

  return proxyRequest(event, new URL(event.path, apiBase).toString(), {
    headers,
    async onResponse(event, response) {
      if (response.status !== 401) {
        return
      }
      if (isAdmin) {
        clearAdminSession(event)
      }
      else if (getCookie(event, USER_TOKEN_COOKIE)) {
        clearUserSession(event)
      }
    },
  })
})
