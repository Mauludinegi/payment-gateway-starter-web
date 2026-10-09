<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: false })

const route = useRoute()
const schema = z.object({ token: z.string().min(1, 'Enter the admin token') })
type Schema = z.output<typeof schema>

const state = reactive<Schema>({ token: '' })
const loading = ref(false)
const error = ref<string>()

async function signIn(event: FormSubmitEvent<Schema>) {
  loading.value = true
  error.value = undefined
  try {
    await $fetch('/auth/admin/login', { method: 'POST', body: event.data })
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/admin') ? route.query.redirect : '/admin'
    await navigateTo(redirect)
  }
  catch (e) {
    error.value = problemMessage(e, 'Could not sign in')
  }
  finally {
    loading.value = false
  }
}

useSeoMeta({ title: 'Sign in · Payments admin' })
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4">
    <UCard class="w-full max-w-sm">
      <div class="mb-6 text-center">
        <UIcon name="i-lucide-zap" class="size-8 text-primary" />
        <h1 class="mt-2 text-xl font-semibold">
          Payments admin
        </h1>
        <p class="mt-1 text-sm text-muted">
          Sign in with the backend's <code>ADMIN_TOKEN</code>.
        </p>
      </div>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="signIn">
        <UFormField label="Admin token" name="token">
          <UInput v-model="state.token" type="password" class="w-full" autocomplete="current-password" autofocus />
        </UFormField>
        <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :description="error" />
        <UButton type="submit" block :loading="loading" label="Sign in" />
      </UForm>
      <p class="mt-4 text-center text-xs text-muted">
        Running locally without ADMIN_TOKEN? The demo token is <code>demo-admin-token</code>.
      </p>
    </UCard>
  </div>
</template>
