<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Order } from '~/types/api'
import type { CartLine } from '~/composables/useCart'

const { data: products } = useProducts()
const cart = useCart()
const history = useOrderHistory()
const toast = useToast()

const rows = computed(() => cart.lines.value
  .map(line => ({ line, product: products.value.find(p => p.id === line.productId) }))
  .filter((r): r is { line: CartLine, product: NonNullable<typeof r.product> } => !!r.product))
const total = computed(() => rows.value.reduce((sum, r) => sum + r.product.price * r.line.quantity, 0))

const schema = z.object({
  customerName: z.string().trim().min(2, 'Enter your name').max(100),
  customerEmail: z.union([z.literal(''), z.email('Enter a valid email')]),
})
type Schema = z.output<typeof schema>

const form = reactive<Schema>({ customerName: '', customerEmail: '' })
const submitting = ref(false)

async function checkout(event: FormSubmitEvent<Schema>) {
  submitting.value = true
  try {
    const order = await $fetch<Order>('/api/orders', {
      method: 'POST',
      body: {
        items: cart.lines.value,
        customerName: event.data.customerName,
        customerEmail: event.data.customerEmail || null,
      },
    })
    history.remember(order.id)
    cart.clear()
    await navigateTo(`/orders/${order.id}`)
  }
  catch (error) {
    toast.add({ title: 'Could not place the order', description: problemMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
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
          <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <UIcon :name="product.icon" class="size-5 text-primary" />
          </div>
          <div class="min-w-40 flex-1">
            <p class="font-medium text-highlighted">
              {{ product.name }}
            </p>
            <p class="text-sm text-muted">
              {{ formatIDR(product.price) }}
            </p>
          </div>
          <UInputNumber
            :model-value="line.quantity"
            :min="1"
            :max="MAX_QUANTITY"
            class="w-28"
            @update:model-value="(v) => cart.setQuantity(line.productId, Number(v) || 1)"
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

        <UForm :schema="schema" :state="form" class="space-y-4" @submit="checkout">
          <UFormField label="Full name" name="customerName" required>
            <UInput v-model="form.customerName" class="w-full" placeholder="Budi Santoso" autocomplete="name" />
          </UFormField>
          <UFormField label="Email" name="customerEmail" hint="Optional, for the receipt">
            <UInput v-model="form.customerEmail" class="w-full" type="email" placeholder="budi@example.com" autocomplete="email" />
          </UFormField>
          <UButton type="submit" block size="lg" :loading="submitting" label="Continue to payment" trailing-icon="i-lucide-arrow-right" />
        </UForm>
      </UCard>
    </div>
  </UContainer>
</template>
