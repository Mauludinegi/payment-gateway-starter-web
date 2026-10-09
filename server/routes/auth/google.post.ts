import { z } from 'zod'

const body = z.object({ idToken: z.string().min(1).max(4096) })

/** Exchanges the Firebase ID token from Google sign-in for a backend session. */
export default defineEventHandler(async (event) => {
  const { idToken } = await readValidatedBody(event, body.parse)
  return signInAtBackend(event, '/api/auth/google', { idToken })
})
