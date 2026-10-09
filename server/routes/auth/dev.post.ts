import { z } from 'zod'

const body = z.object({ name: z.string().trim().min(1).max(100), email: z.email().max(254) })

/** Name-and-email sign-in for local runs; the backend refuses it unless AUTH_DEV_LOGIN_ENABLED is on. */
export default defineEventHandler(async (event) => {
  const data = await readValidatedBody(event, body.parse)
  return signInAtBackend(event, '/api/auth/dev', data)
})
