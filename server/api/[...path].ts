/**
 * Forwards /api/** to the Spring Boot backend, so the browser talks to one origin and no CORS setup is needed.
 * The session token comes from the http-only cookie; the backend decides what the user's role may access.
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
  const headers: Record<string, string> = {}

  // Session tokens must only travel through server/routes/auth, which keeps them in cookies.
  if (path.startsWith('/api/auth') && !PUBLIC_AUTH_PATHS.includes(path)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const token = getCookie(event, USER_TOKEN_COOKIE)
  if (token) {
    headers.authorization = `Bearer ${token}`
  }

  return proxyRequest(event, new URL(event.path, apiBase).toString(), {
    headers,
    async onResponse(event, response) {
      if (response.status === 401 && token) {
        clearUserSession(event)
      }
    },
  })
})
