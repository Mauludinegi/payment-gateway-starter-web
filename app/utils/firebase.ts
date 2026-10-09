interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
}

export function firebaseConfigured(config: FirebaseConfig) {
  return Boolean(config.apiKey && config.authDomain && config.projectId)
}

/**
 * Opens the Google popup and returns a Firebase ID token for the backend to verify.
 * Firebase's own session is dropped right away: the backend session is the only one that counts.
 */
export async function googleIdToken(config: FirebaseConfig): Promise<string> {
  const [{ initializeApp, getApps }, { getAuth, GoogleAuthProvider, signInWithPopup, signOut }] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
  ])
  const app = getApps()[0] ?? initializeApp(config)
  const auth = getAuth(app)
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  const result = await signInWithPopup(auth, provider)
  try {
    return await result.user.getIdToken()
  }
  finally {
    await signOut(auth)
  }
}

const FIREBASE_MESSAGES: Record<string, string> = {
  'auth/popup-closed-by-user': 'The Google window was closed before signing in.',
  'auth/cancelled-popup-request': 'The Google window was closed before signing in.',
  'auth/popup-blocked': 'The browser blocked the Google window. Allow pop-ups for this site and try again.',
  'auth/unauthorized-domain': 'This domain is not authorised for Google sign-in in the Firebase console.',
  'auth/operation-not-allowed': 'Google sign-in is not enabled in the Firebase console.',
  'auth/configuration-not-found': 'Firebase Authentication is not set up for this project yet.',
}

export function firebaseErrorMessage(error: unknown): string | null {
  const code = (error as { code?: string } | null)?.code
  return code ? FIREBASE_MESSAGES[code] ?? `Google sign-in failed (${code}).` : null
}
