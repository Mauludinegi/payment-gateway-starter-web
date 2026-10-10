<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Environment } from '~/types/api'

const { count } = useCart()
// Shown only when the backend reports test credentials for every gateway it routes payments to.
const { data: environment } = useFetch<Environment>('/api/environment', { key: 'environment', lazy: true })
const { user, signOut } = useAuth()

const links = [
  { label: 'Shop', to: '/', icon: 'i-lucide-shopping-bag' },
  { label: 'My account', to: '/account', icon: 'i-lucide-circle-user' },
]

const userMenu = computed<DropdownMenuItem[][]>(() => [
  [{ label: user.value?.name ?? '', description: user.value?.email ?? undefined, type: 'label' }],
  [
    { label: 'My account', icon: 'i-lucide-circle-user', to: '/account' },
    ...(user.value?.role === 'ADMIN' ? [{ label: 'Admin dashboard', icon: 'i-lucide-layout-dashboard', to: '/admin' }] : []),
  ],
  [{ label: 'Sign out', icon: 'i-lucide-log-out', onSelect: () => signOut() }],
])
</script>

<template>
  <div>
    <div
      v-if="environment?.sandbox"
      class="flex items-center justify-center gap-2 bg-warning/15 px-4 py-1.5 text-center text-sm font-medium text-warning"
      data-testid="sandbox-banner"
    >
      <UIcon name="i-lucide-flask-conical" class="size-4 shrink-0" />
      Sandbox demo, no real money. Payments use gateway test modes and the simulator.
    </div>
    <UHeader title="Starter Store" to="/">
      <template #title>
        <span class="flex items-center gap-2 font-semibold">
          <UIcon name="i-lucide-zap" class="size-5 text-primary" />
          Starter Store
        </span>
      </template>

      <UNavigationMenu :items="links" variant="link" />

      <template #right>
        <UColorModeButton />
        <UChip :text="count" :show="count > 0" size="3xl">
          <UButton to="/cart" icon="i-lucide-shopping-cart" color="neutral" variant="ghost" aria-label="Cart" />
        </UChip>
        <UDropdownMenu v-if="user" :items="userMenu" :content="{ align: 'end' }">
          <UButton color="neutral" variant="ghost" class="rounded-full p-1" :aria-label="`Account menu for ${user.name}`">
            <UAvatar :src="user.pictureUrl ?? undefined" :alt="user.name" size="sm" />
          </UButton>
        </UDropdownMenu>
        <UButton v-else to="/login" label="Sign in" icon="i-lucide-log-in" color="neutral" variant="outline" size="sm" />
      </template>

      <template #body>
        <UNavigationMenu :items="links" orientation="vertical" class="-mx-2.5" />
      </template>
    </UHeader>

    <UMain>
      <slot />
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          Demo store for the open-source payment gateway starter. Payments run on the built-in simulator unless a gateway key is set.
        </p>
      </template>
    </UFooter>
  </div>
</template>
