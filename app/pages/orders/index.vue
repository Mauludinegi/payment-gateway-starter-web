<script setup lang="ts">
import type { Order } from '~/types/api'

const { ids } = useOrderHistory()

const { data: orders, status } = await useAsyncData('my-orders', async () => {
  const results = await Promise.allSettled(ids.value.map(id => $fetch<Order>(`/api/orders/${id}`)))
  return results.flatMap(r => r.status === 'fulfilled' ? [r.value] : [])
}, { default: () => [], watch: [ids] })

useSeoMeta({ title: 'My orders · Starter Store' })
</script>

<template>
  <UContainer class="py-10">
    <h1 class="text-2xl font-bold">
      My orders
    </h1>
    <p class="mt-1 text-sm text-muted">
      Orders placed from this browser.
    </p>

    <UEmpty
      v-if="status !== 'pending' && !orders.length"
      class="mt-10"
      icon="i-lucide-receipt"
      title="No orders yet"
      :actions="[{ label: 'Browse the store', to: '/' }]"
    />

    <div v-else class="mt-6 space-y-3">
      <NuxtLink v-for="o in orders" :key="o.id" :to="`/orders/${o.id}`" class="block">
        <UCard class="transition hover:ring-accented" :ui="{ body: 'flex flex-wrap items-center gap-4' }">
          <div class="min-w-48 flex-1">
            <p class="font-mono font-semibold">
              {{ o.reference }}
            </p>
            <p class="text-sm text-muted">
              {{ o.description }} · {{ formatDateTime(o.createdAt) }}
            </p>
          </div>
          <span class="text-sm text-muted">{{ o.payment?.channelLabel ?? 'No method chosen' }}</span>
          <span class="w-32 text-right font-semibold">{{ formatIDR(o.amount) }}</span>
          <UBadge :label="ORDER_STATUS[o.status].label" :color="ORDER_STATUS[o.status].color" variant="subtle" />
        </UCard>
      </NuxtLink>
    </div>
  </UContainer>
</template>
