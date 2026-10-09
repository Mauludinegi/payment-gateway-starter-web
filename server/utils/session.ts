import type { H3Event } from 'h3'

/** Http-only: the customer's session token never reaches browser JavaScript. */
export const USER_TOKEN_COOKIE = 'session'
/** Readable flag so the app only asks the backend who is signed in when someone might be. */
export const USER_FLAG_COOKIE = 'signed_in'

export interface SignedInResponse {
  token: string
  expiresAt: string
  user: unknown
}

// Lax, not strict: customers coming back from an e-wallet app must still be signed in on the order page.
export function setUserSession(event: H3Event, token: string, expiresAt: string) {
  const secure = !import.meta.dev
  const expires = new Date(expiresAt)
  setCookie(event, USER_TOKEN_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure, path: '/', expires })
  setCookie(event, USER_FLAG_COOKIE, '1', { sameSite: 'lax', secure, path: '/', expires })
}

export function clearUserSession(event: H3Event) {
  deleteCookie(event, USER_TOKEN_COOKIE, { path: '/' })
  deleteCookie(event, USER_FLAG_COOKIE, { path: '/' })
}

/** Signs in at the backend and keeps the session in cookies; only the user goes back to the browser. */
export async function signInAtBackend(event: H3Event, path: string, body: unknown) {
  const { apiBase } = useRuntimeConfig(event)
  const response = await fetch(new URL(path, apiBase), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => null)

  if (!response) {
    throw createError({ statusCode: 502, statusMessage: 'Backend is not reachable' })
  }
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { detail?: string } | null
    throw createError({ statusCode: response.status, statusMessage: problem?.detail ?? 'Sign-in failed' })
  }
  const session = await response.json() as SignedInResponse
  setUserSession(event, session.token, session.expiresAt)
  return { user: session.user }
}
