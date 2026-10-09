<script setup lang="ts">
const { data: products, status } = useProducts()
const cart = useCart()
const toast = useToast()

const categories = computed(() => ['All', ...new Set(products.value.map(p => p.category))])
const category = ref('All')
const shown = computed(() => category.value === 'All' ? products.value : products.value.filter(p => p.category === category.value))

function addToCart(id: string, name: string) {
  cart.add(id)
  toast.add({
    title: `${name} added to cart`,
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
      <UBadge label="Pay with VA, QRIS, e-wallets, or retail outlets" variant="subtle" icon="i-lucide-shield-check" />
      <h1 class="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
        Courses, templates, and reviews for developers
      </h1>
      <p class="mt-3 text-lg text-muted">
        Add to cart, pay with an Indonesian payment method, and watch the order turn paid the moment the gateway confirms it.
      </p>
    </div>

    <div class="mt-8 flex flex-wrap gap-2">
      <UButton
        v-for="c in categories"
        :key="c"
        :label="c"
        size="sm"
        :color="c === category ? 'primary' : 'neutral'"
        :variant="c === category ? 'solid' : 'outline'"
        @click="category = c"
      />
    </div>

    <div v-if="status === 'pending' && !products.length" class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <USkeleton v-for="i in 6" :key="i" class="h-56" />
    </div>

    <UEmpty
      v-else-if="status === 'error'"
      class="mt-10"
      icon="i-lucide-server-off"
      title="The store backend is not reachable"
      description="Start the Spring Boot API on port 8080, then reload."
    />

    <div v-else class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <UCard v-for="p in shown" :key="p.id" :ui="{ body: 'flex h-full flex-col' }">
        <div class="flex items-start justify-between gap-3">
          <div class="flex size-11 items-center justify-center rounded-lg bg-primary/10">
            <UIcon :name="p.icon" class="size-6 text-primary" />
          </div>
          <UBadge :label="p.category" color="neutral" variant="subtle" />
        </div>
        <h2 class="mt-4 font-semibold text-highlighted">
          {{ p.name }}
        </h2>
        <p class="mt-1 flex-1 text-sm text-muted">
          {{ p.description }}
        </p>
        <div class="mt-5 flex items-center justify-between">
          <span class="text-lg font-semibold">{{ formatIDR(p.price) }}</span>
          <UButton label="Add to cart" icon="i-lucide-plus" @click="addToCart(p.id, p.name)" />
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
