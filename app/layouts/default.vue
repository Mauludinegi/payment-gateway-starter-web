<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Environment } from '~/types/api'

const { count } = useCart()
const { unreadCount, toggleChat } = useChat()
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
      class="flex items-center justify-center gap-1.5 bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/20 px-3 py-1 text-center text-xs font-medium text-amber-700 dark:text-amber-300"
      data-testid="sandbox-banner"
    >
      <UIcon name="i-lucide-flask-conical" class="size-3.5 shrink-0 text-amber-500" />
      <span class="truncate sm:hidden">Mode Sandbox (Pembayaran simulasi)</span>
      <span class="hidden sm:inline">Sandbox demo, no real money. Payments use gateway test modes.</span>
    </div>

    <UHeader title="Starter Store" to="/">
      <template #title>
        <span class="flex items-center gap-2 font-semibold text-sm sm:text-base">
          <div class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UIcon name="i-lucide-zap" class="size-4 shrink-0" />
          </div>
          <span class="truncate tracking-tight font-bold">Starter Store</span>
        </span>
      </template>

      <UNavigationMenu :items="links" variant="link" />

      <template #right>
        <!-- Desktop only actions -->
        <UColorModeButton class="hidden sm:inline-flex" />

        <!-- Cart Button (Mobile & Desktop) -->
        <UChip :text="count" :show="count > 0" color="primary" size="2xl">
          <UButton
            to="/cart"
            icon="i-lucide-shopping-cart"
            color="neutral"
            variant="ghost"
            class="rounded-full size-9 flex items-center justify-center hover:bg-elevated text-default"
            aria-label="Cart"
          />
        </UChip>

        <!-- User Menu (Desktop & Mobile) -->
        <UDropdownMenu v-if="user" :items="userMenu" :content="{ align: 'end' }">
          <button
            type="button"
            class="flex items-center justify-center rounded-full p-0.5 ring-2 ring-default/40 hover:ring-primary transition focus:outline-none focus:ring-2 focus:ring-primary"
            :aria-label="`Account menu for ${user.name}`"
          >
            <UAvatar :src="user.pictureUrl ?? undefined" :alt="user.name" size="sm" class="size-7 sm:size-8" />
          </button>
        </UDropdownMenu>

        <!-- Sign in Button when guest -->
        <template v-else>
          <UButton
            to="/login"
            icon="i-lucide-log-in"
            color="primary"
            variant="soft"
            size="xs"
            class="sm:hidden rounded-lg font-medium"
            aria-label="Sign in"
            label="Masuk"
          />
          <UButton
            to="/login"
            label="Sign in"
            icon="i-lucide-log-in"
            color="neutral"
            variant="outline"
            size="sm"
            class="hidden sm:inline-flex rounded-lg"
          />
        </template>
      </template>

      <template #body>
        <!-- Mobile Drawer Header: User Profile Card -->
        <div v-if="user" class="mb-4 p-3.5 rounded-xl bg-elevated/70 border border-default/60 flex items-center gap-3">
          <UAvatar :src="user.pictureUrl ?? undefined" :alt="user.name" size="md" class="ring-2 ring-primary/30 shrink-0" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <p class="font-semibold text-sm truncate text-highlighted">{{ user.name }}</p>
              <UBadge v-if="user.role === 'ADMIN'" color="primary" size="xs" variant="subtle">Admin</UBadge>
            </div>
            <p class="text-xs text-muted truncate">{{ user.email ?? 'Pelanggan' }}</p>
          </div>
        </div>

        <div v-else class="mb-4 p-3.5 rounded-xl bg-elevated/70 border border-default/60 flex items-center justify-between gap-3">
          <div>
            <p class="font-semibold text-sm text-highlighted">Selamat Datang!</p>
            <p class="text-xs text-muted">Masuk untuk melihat pesanan Anda</p>
          </div>
          <UButton to="/login" label="Masuk" icon="i-lucide-log-in" size="xs" color="primary" />
        </div>

        <!-- Navigation Links -->
        <UNavigationMenu :items="links" orientation="vertical" class="-mx-2.5" />

        <!-- Extra Admin Link in mobile drawer if Admin -->
        <div v-if="user?.role === 'ADMIN'" class="mt-2 pt-2 border-t border-default/40">
          <NuxtLink
            to="/admin"
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition"
          >
            <UIcon name="i-lucide-layout-dashboard" class="size-4" />
            <span>Admin Dashboard</span>
          </NuxtLink>
        </div>

        <!-- Customer Support & Theme Settings -->
        <div class="mt-4 pt-4 border-t border-default space-y-2.5">
          <button
            type="button"
            class="w-full flex items-center justify-between p-2.5 rounded-xl text-sm text-default bg-elevated/40 hover:bg-elevated transition border border-default/40"
            @click="toggleChat"
          >
            <div class="flex items-center gap-2.5">
              <div class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UIcon name="i-lucide-headphones" class="size-4" />
              </div>
              <span class="font-medium">Customer Support</span>
            </div>
            <UBadge v-if="unreadCount > 0" color="error" size="xs" variant="solid">
              {{ unreadCount }} pesan baru
            </UBadge>
            <span v-else class="text-xs text-emerald-500 font-medium flex items-center gap-1">
              <span class="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </button>

          <div class="flex items-center justify-between px-2.5 py-2 rounded-xl bg-elevated/20 border border-default/30">
            <span class="text-xs text-muted font-medium">Tema Tampilan</span>
            <UColorModeButton />
          </div>

          <div v-if="user" class="pt-2">
            <UButton
              block
              color="neutral"
              variant="ghost"
              icon="i-lucide-log-out"
              label="Sign out"
              size="sm"
              class="text-error hover:bg-error/10 hover:text-error"
              @click="signOut"
            />
          </div>
        </div>
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

    <ChatWidget />
  </div>
</template>
