<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Order } from '~/types/api'
import type { CartLine } from '~/composables/useCart'

const { data: products, refresh: refreshProducts } = useProducts()
const cart = useCart()
const { user, signedIn } = useAuth()
const toast = useToast()

const rows = computed(() => cart.lines.value
  .map(line => ({ line, product: products.value.find(p => p.id === line.productId) }))
  .filter((r): r is { line: CartLine, product: NonNullable<typeof r.product> } => !!r.product))
const total = computed(() => rows.value.reduce((sum, r) => sum + r.product.price * r.line.quantity, 0))
/** Lines asking for more than is left; the server would refuse the order anyway. */
const shortRows = computed(() => rows.value.filter(r => r.product.stock !== null && r.line.quantity > r.product.stock))

const schema = z.object({
  customerName: z.string().trim().min(2, 'Enter your name').max(100),
})
type Schema = z.output<typeof schema>

const form = reactive<Schema>({ customerName: user.value?.name ?? '' })
const submitting = ref(false)

async function checkout(event: FormSubmitEvent<Schema>) {
  submitting.value = true
  try {
    const order = await $fetch<Order>('/api/orders', {
      method: 'POST',
      body: { items: cart.lines.value, customerName: event.data.customerName },
    })
    cart.clear()
    await navigateTo(`/orders/${order.id}`)
  }
  catch (error) {
    toast.add({ title: 'Could not place the order', description: problemMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
    if ((error as { statusCode?: number }).statusCode === 409) await refreshProducts()
  }
  finally {
    submitting.value = false
  }
}

useSeoMeta({ title: 'Cart · Starter Store' })
</script>

<template>
  <UContainer class="py-10">
    <h1 class="text-2xl font-bold">
      Your cart
    </h1>

    <UEmpty
      v-if="!rows.length"
      class="mt-10"
      icon="i-lucide-shopping-cart"
      title="Your cart is empty"
      description="Pick a course or template to try the checkout."
      :actions="[{ label: 'Browse the store', to: '/', icon: 'i-lucide-arrow-left' }]"
    />

    <div v-else class="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
      <UCard :ui="{ body: 'divide-y divide-default p-0 sm:p-0' }">
        <div v-for="{ line, product } in rows" :key="line.productId" class="flex flex-wrap items-center gap-4 p-4 sm:p-5">
          <NuxtLink :to="`/products/${product.id}`" tabindex="-1">
            <ProductMedia :product="product" variant="thumb" />
          </NuxtLink>
          <div class="min-w-40 flex-1">
            <NuxtLink :to="`/products/${product.id}`" class="font-medium text-highlighted hover:text-primary">
              {{ product.name }}
            </NuxtLink>
            <p class="text-sm text-muted">
              {{ formatIDR(product.price) }}
            </p>
            <p v-if="product.stock === 0" class="text-sm text-error">
              Sold out. Remove it to check out.
            </p>
            <p v-else-if="product.stock !== null && line.quantity > product.stock" class="text-sm text-error">
              Only {{ product.stock }} left. Lower the quantity to check out.
            </p>
            <p v-else-if="product.stock !== null && product.stock <= 5" class="text-sm text-warning">
              Only {{ product.stock }} left
            </p>
          </div>
          <UInputNumber
            :model-value="line.quantity"
            :min="1"
            :max="Math.max(quantityLimit(product), 1)"
            class="w-28"
            @update:model-value="(v) => cart.setQuantity(line.productId, Number(v) || 1, Math.max(quantityLimit(product), 1))"
          />
          <span class="w-28 text-right font-medium">{{ formatIDR(product.price * line.quantity) }}</span>
          <UButton icon="i-lucide-trash-2" color="neutral" variant="ghost" aria-label="Remove" @click="cart.remove(line.productId)" />
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">Total</span>
            <span class="text-xl font-bold">{{ formatIDR(total) }}</span>
          </div>
          <p class="mt-1 text-xs text-muted">
            The server recalculates prices from the catalogue; the browser only sends products and quantities.
          </p>
        </template>

        <UForm v-if="signedIn" :schema="schema" :state="form" class="space-y-4" @submit="checkout">
          <UFormField label="Full name" name="customerName" required>
            <UInput v-model="form.customerName" class="w-full" autocomplete="name" />
          </UFormField>
          <p v-if="user?.email" class="flex items-center gap-2 text-sm text-muted">
            <UIcon name="i-lucide-circle-user" class="size-4 shrink-0" />
            Ordering as {{ user.email }}; the order and its status stay on your account page
          </p>
          <UButton
            type="submit"
            block
            size="lg"
            :loading="submitting"
            :disabled="shortRows.length > 0"
            label="Continue to payment"
            trailing-icon="i-lucide-arrow-right"
          />
        </UForm>
        <div v-else class="space-y-3 text-center">
          <p class="text-sm text-muted">
            Sign in to place the order, so you can find it and its payment later.
          </p>
          <UButton
            :to="{ path: '/login', query: { redirect: '/cart' } }"
            block
            size="lg"
            label="Sign in to check out"
            icon="i-lucide-log-in"
          />
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
