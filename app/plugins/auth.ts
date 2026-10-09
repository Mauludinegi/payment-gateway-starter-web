/** Loads the signed-in customer once during server rendering; the client reuses it from the payload. */
export default defineNuxtPlugin(async () => {
  const { user, refresh } = useAuth()
  if (import.meta.server && !user.value) {
    await refresh()
  }
})
