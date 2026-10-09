<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { AuthOptions } from '~/types/api'

const route = useRoute()
const auth = useAuth()
const { data: options } = await useFetch<AuthOptions>('/api/auth/options', { key: 'auth-options' })

const redirectTo = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/admin')
    ? target
    : '/account'
})

if (auth.signedIn.value) {
  await navigateTo(redirectTo.value, { replace: true })
}

const showGoogle = computed(() => auth.googleAvailable && options.value?.google)
const error = ref<string>()
const googleLoading = ref(false)

async function google() {
  googleLoading.value = true
  error.value = undefined
  try {
    await auth.signInWithGoogle()
    await navigateTo(redirectTo.value, { replace: true })
  }
  catch (e) {
    error.value = firebaseErrorMessage(e) ?? problemMessage(e, 'Could not sign in with Google')
  }
  finally {
    googleLoading.value = false
  }
}

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(100),
  email: z.email('Enter a valid email').max(254),
})
type Schema = z.output<typeof schema>
const dev = reactive<Schema>({ name: '', email: '' })
const devLoading = ref(false)

async function devSignIn(event: FormSubmitEvent<Schema>) {
  devLoading.value = true
  error.value = undefined
  try {
    await auth.signInForDevelopment(event.data.name, event.data.email)
    await navigateTo(redirectTo.value, { replace: true })
  }
  catch (e) {
    error.value = problemMessage(e, 'Could not sign in')
  }
  finally {
    devLoading.value = false
  }
}

useSeoMeta({ title: 'Sign in · Starter Store' })
</script>

<template>
  <UContainer class="flex justify-center py-16">
    <UCard class="w-full max-w-sm">
      <div class="mb-6 text-center">
        <UIcon name="i-lucide-zap" class="size-8 text-primary" />
        <h1 class="mt-2 text-xl font-semibold">
          Sign in to Starter Store
        </h1>
        <p class="mt-1 text-sm text-muted">
          Your orders and payments stay with your account.
        </p>
      </div>

      <div class="space-y-4">
        <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :description="error" />

        <UButton
          v-if="showGoogle"
          block
          size="lg"
          color="neutral"
          variant="outline"
          :loading="googleLoading"
          label="Continue with Google"
          @click="google"
        >
          <template #leading>
            <GoogleLogo v-if="!googleLoading" class="size-5" />
          </template>
        </UButton>
        <UAlert
          v-else
          color="neutral"
          variant="subtle"
          icon="i-lucide-info"
          title="Google sign-in is not configured"
          description="Set the NUXT_PUBLIC_FIREBASE_* variables here and FIREBASE_PROJECT_ID on the backend."
        />

        <template v-if="options?.devLogin">
          <USeparator label="or, for local development" />
          <UForm :schema="schema" :state="dev" class="space-y-3" @submit="devSignIn">
            <UFormField label="Name" name="name">
              <UInput v-model="dev.name" class="w-full" placeholder="Budi Santoso" autocomplete="name" />
            </UFormField>
            <UFormField label="Email" name="email">
              <UInput v-model="dev.email" class="w-full" type="email" placeholder="budi@example.com" autocomplete="email" />
            </UFormField>
            <UButton type="submit" block color="neutral" variant="soft" :loading="devLoading" label="Sign in without Google" />
          </UForm>
          <p class="text-center text-xs text-muted">
            Turn this off with <code>AUTH_DEV_LOGIN_ENABLED=false</code> before going live.
          </p>
        </template>
      </div>
    </UCard>
  </UContainer>
</template>
