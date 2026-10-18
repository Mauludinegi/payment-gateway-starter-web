<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'
import type { ChatRoom } from '~/types/api'

const { user, signOut } = useAuth()

const { data: adminRooms, refresh: refreshRooms } = await useAdminFetch<ChatRoom[]>('/api/admin/chat/rooms')

let roomTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  // Periodically refresh chat rooms for open badge count in sidebar menu
  roomTimer = setInterval(() => {
    refreshRooms()
  }, 4000)
})

onUnmounted(() => {
  if (roomTimer) {
    clearInterval(roomTimer)
    roomTimer = null
  }
})

const activeChatCount = computed(() => {
  return adminRooms.value?.filter(r => r.status === 'OPEN').length ?? 0
})

const links = computed<NavigationMenuItem[]>(() => [
  { label: 'Overview', icon: 'i-lucide-chart-column', to: '/admin', exact: true },
  {
    label: 'Live Chat',
    icon: 'i-lucide-messages-square',
    to: '/admin/chat',
    badge: activeChatCount.value > 0 ? { label: String(activeChatCount.value), color: 'primary', variant: 'subtle', size: 'xs' } : undefined,
  },
  { label: 'Orders', icon: 'i-lucide-receipt', to: '/admin/orders' },
  { label: 'Products', icon: 'i-lucide-package', to: '/admin/products' },
  { label: 'Reviews', icon: 'i-lucide-star', to: '/admin/reviews' },
  { label: 'Webhooks', icon: 'i-lucide-webhook', to: '/admin/webhooks' },
  { label: 'Users', icon: 'i-lucide-users', to: '/admin/users' },
])

const userMenu = computed<DropdownMenuItem[][]>(() => [
  [{ label: user.value?.name ?? '', description: user.value?.email ?? undefined, type: 'label' }],
  [
    { label: 'View store', icon: 'i-lucide-store', to: '/' },
    { label: 'My account', icon: 'i-lucide-circle-user', to: '/account' },
  ],
  [{ label: 'Sign out', icon: 'i-lucide-log-out', onSelect: () => signOut() }],
])
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar collapsible resizable :default-size="15" :ui="{ footer: 'border-t border-default' }">
      <template #header="{ collapsed }">
        <NuxtLink to="/admin" class="flex items-center gap-2 font-semibold">
          <UIcon name="i-lucide-zap" class="size-5 shrink-0 text-primary" />
          <span v-if="!collapsed">Payments admin</span>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu :collapsed="collapsed" :items="links" orientation="vertical" tooltip />
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu
          v-if="user"
          :items="userMenu"
          :content="{ side: 'top', align: 'start', collisionPadding: 12 }"
          :ui="{ content: collapsed ? 'w-56' : 'w-(--reka-dropdown-menu-trigger-width) min-w-56' }"
          class="w-full"
        >
          <UButton
            :avatar="{ src: user.pictureUrl ?? undefined, alt: user.name }"
            :label="collapsed ? undefined : user.name"
            :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
            :square="collapsed"
            :block="!collapsed"
            color="neutral"
            variant="ghost"
            class="data-[state=open]:bg-elevated"
            :ui="{ label: 'truncate', trailingIcon: 'ms-auto text-dimmed' }"
            :aria-label="`Account menu for ${user.name}`"
          />
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
