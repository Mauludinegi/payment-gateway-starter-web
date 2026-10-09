import type { H3Event } from 'h3'

/** Http-only: the admin token never reaches browser JavaScript. */
export const ADMIN_TOKEN_COOKIE = 'admin_token'
/** Readable flag so route middleware can redirect before a request fails. */
export const ADMIN_FLAG_COOKIE = 'admin_signed_in'

const MAX_AGE = 60 * 60 * 8

export function setAdminSession(event: H3Event, token: string) {
  const secure = !import.meta.dev
  setCookie(event, ADMIN_TOKEN_COOKIE, token, { httpOnly: true, sameSite: 'strict', secure, path: '/', maxAge: MAX_AGE })
  setCookie(event, ADMIN_FLAG_COOKIE, '1', { sameSite: 'strict', secure, path: '/', maxAge: MAX_AGE })
}

export function clearAdminSession(event: H3Event) {
  deleteCookie(event, ADMIN_TOKEN_COOKIE, { path: '/' })
  deleteCookie(event, ADMIN_FLAG_COOKIE, { path: '/' })
}
