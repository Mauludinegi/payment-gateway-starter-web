<script setup lang="ts">
const { count } = useCart()

const links = [
  { label: 'Shop', to: '/', icon: 'i-lucide-shopping-bag' },
  { label: 'My orders', to: '/orders', icon: 'i-lucide-receipt' },
]
</script>

<template>
  <div>
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
        <UButton to="/admin" icon="i-lucide-layout-dashboard" color="neutral" variant="ghost" aria-label="Admin" />
        <UChip :text="count" :show="count > 0" size="3xl">
          <UButton to="/cart" icon="i-lucide-shopping-cart" color="neutral" variant="ghost" aria-label="Cart" />
        </UChip>
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
