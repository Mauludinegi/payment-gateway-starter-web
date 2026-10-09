export default defineEventHandler(async (event) => {
  const token = getCookie(event, USER_TOKEN_COOKIE)
  if (token) {
    const { apiBase } = useRuntimeConfig(event)
    await fetch(new URL('/api/auth/session', apiBase), {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    }).catch(() => null)
  }
  clearUserSession(event)
  return { ok: true }
})
