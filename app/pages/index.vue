<script setup lang="ts">
import type { Product } from '~/types/api'

const { data: products, status } = useProducts()
const cart = useCart()
const toast = useToast()

const categories = computed(() => ['All', ...new Set(products.value.map(p => p.category))])
const category = ref('All')
const shown = computed(() => category.value === 'All' ? products.value : products.value.filter(p => p.category === category.value))

function addToCart(p: Product) {
  if (!cart.add(p.id, 1, quantityLimit(p))) {
    toast.add({ title: `You already have the most you can order of ${p.name}`, color: 'warning', icon: 'i-lucide-info' })
    return
  }
  toast.add({
    title: `${p.name} added to cart`,
    icon: 'i-lucide-check',
    color: 'success',
    actions: [{ label: 'View cart', to: '/cart', color: 'neutral', variant: 'outline' }],
  })
}

useSeoMeta({ title: 'Starter Store' })
</script>

<template>
  <UContainer class="py-10 sm:py-14">
    <div class="max-w-2xl">
      <UBadge label="Pay with VA, QRIS, e-wallets, or retail outlets" variant="subtle" icon="i-lucide-shield-check" class="max-w-full truncate" />
      <h1 class="mt-3 sm:mt-4 text-2xl font-bold tracking-tight sm:text-4xl">
        Courses, templates, and reviews for developers
      </h1>
      <p class="mt-2 sm:mt-3 text-sm sm:text-lg text-muted">
        Add to cart, pay with an Indonesian payment method, and watch the order turn paid the moment the gateway confirms it.
      </p>
    </div>

    <div class="mt-6 sm:mt-8 flex flex-wrap gap-2">
      <UButton
        v-for="c in categories"
        :key="c"
        :label="c"
        size="sm"
        class="rounded-full px-3.5"
        :color="c === category ? 'primary' : 'neutral'"
        :variant="c === category ? 'solid' : 'subtle'"
        @click="category = c"
      />
    </div>

    <div v-if="status === 'pending' && !products.length" class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <USkeleton v-for="i in 6" :key="i" class="h-96" />
    </div>

    <UEmpty
      v-else-if="status === 'error'"
      class="mt-10"
      icon="i-lucide-server-off"
      title="The store backend is not reachable"
      description="Start the Spring Boot API on port 8080, then reload."
    />

    <div v-else class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <UCard v-for="p in shown" :key="p.id" class="overflow-hidden" :ui="{ body: 'flex h-full flex-col p-0 sm:p-0' }">
        <NuxtLink :to="`/products/${p.id}`" tabindex="-1">
          <ProductMedia :product="p" />
        </NuxtLink>
        <div class="flex flex-1 flex-col p-4 sm:p-5">
          <div class="flex items-center justify-between gap-2">
            <UBadge :label="p.category" color="neutral" variant="subtle" />
            <StockBadge :stock="p.stock" />
          </div>
          <NuxtLink :to="`/products/${p.id}`" class="mt-3 font-semibold text-highlighted hover:text-primary">
            {{ p.name }}
          </NuxtLink>
          <StarRating v-if="p.reviewCount" :value="p.rating" :count="p.reviewCount" class="mt-1" />
          <p class="mt-1 line-clamp-3 flex-1 text-sm text-muted">
            {{ p.description }}
          </p>
          <div class="mt-5 flex items-center justify-between gap-2">
            <span class="text-base sm:text-lg font-bold text-highlighted">{{ formatIDR(p.price) }}</span>
            <UButton
              v-if="p.stock === 0"
              label="Sold out"
              color="neutral"
              variant="subtle"
              disabled
              size="sm"
            />
            <UButton v-else label="Add to cart" icon="i-lucide-plus" size="sm" class="rounded-lg" @click="addToCart(p)" />
          </div>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
