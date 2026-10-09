import { z } from 'zod'

const body = z.object({ token: z.string().min(1).max(500) })

export default defineEventHandler(async (event) => {
  const { token } = await readValidatedBody(event, body.parse)
  const { apiBase } = useRuntimeConfig(event)

  const response = await fetch(new URL('/api/admin/session', apiBase), {
    headers: { authorization: `Bearer ${token}` },
  }).catch(() => null)

  if (!response) {
    throw createError({ statusCode: 502, statusMessage: 'Backend is not reachable' })
  }
  if (!response.ok) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid admin token' })
  }
  setAdminSession(event, token)
  return { ok: true }
})
