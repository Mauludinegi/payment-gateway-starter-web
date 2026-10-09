<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const links: NavigationMenuItem[] = [
  { label: 'Overview', icon: 'i-lucide-chart-column', to: '/admin', exact: true },
  { label: 'Orders', icon: 'i-lucide-receipt', to: '/admin/orders' },
  { label: 'Webhooks', icon: 'i-lucide-webhook', to: '/admin/webhooks' },
]

const footerLinks: NavigationMenuItem[] = [
  { label: 'View store', icon: 'i-lucide-store', to: '/' },
  { label: 'Sign out', icon: 'i-lucide-log-out', onSelect: () => signOut() },
]
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
        <UNavigationMenu :collapsed="collapsed" :items="footerLinks" orientation="vertical" tooltip class="w-full" />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
