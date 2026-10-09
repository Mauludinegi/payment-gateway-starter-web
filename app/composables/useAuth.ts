import type { User } from '~/types/api'

export function useAuth() {
  const user = useState<User | null>('user', () => null)
  const signedInFlag = useCookie('signed_in')
  const config = useRuntimeConfig().public.firebase
  const requestFetch = useRequestFetch()

  async function refresh() {
    if (!signedInFlag.value) {
      user.value = null
      return
    }
    user.value = await requestFetch<User>('/api/auth/me').catch(() => null)
    if (!user.value) {
      signedInFlag.value = null
    }
  }

  async function signInWithGoogle() {
    const idToken = await googleIdToken(config)
    const result = await $fetch<{ user: User }>('/auth/google', { method: 'POST', body: { idToken } })
    user.value = result.user
  }

  async function signInForDevelopment(name: string, email: string) {
    const result = await $fetch<{ user: User }>('/auth/dev', { method: 'POST', body: { name, email } })
    user.value = result.user
  }

  async function signOut() {
    await $fetch('/auth/logout', { method: 'POST' })
    user.value = null
    signedInFlag.value = null
    await navigateTo('/')
  }

  return {
    user,
    signedIn: computed(() => !!user.value),
    googleAvailable: firebaseConfigured(config),
    refresh,
    signInWithGoogle,
    signInForDevelopment,
    signOut,
  }
}
