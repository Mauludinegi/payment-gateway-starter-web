<script setup lang="ts">
import type { Order } from '~/types/api'

definePageMeta({ middleware: 'auth' })

const { user, signOut } = useAuth()
const { data: orders, status } = await useFetch<Order[]>('/api/me/orders', { key: 'my-orders', default: () => [] })

const stats = computed(() => {
  const list = orders.value
  const paid = list.filter(o => o.status === 'PAID')
  return [
    { label: 'Orders', value: String(list.length), icon: 'i-lucide-receipt' },
    { label: 'Paid', value: String(paid.length), icon: 'i-lucide-circle-check' },
    { label: 'Awaiting payment', value: String(list.filter(o => o.status === 'PENDING_PAYMENT').length), icon: 'i-lucide-clock' },
    { label: 'Total spent', value: formatIDR(paid.reduce((sum, o) => sum + o.amount, 0)), icon: 'i-lucide-wallet' },
  ]
})

useSeoMeta({ title: 'My account · Starter Store' })
</script>

<template>
  <UContainer v-if="user" class="py-10">
    <div class="flex flex-wrap items-center gap-4">
      <UAvatar :src="user.pictureUrl ?? undefined" :alt="user.name" size="2xl" />
      <div class="min-w-0 flex-1">
        <h1 class="text-2xl font-bold">
          {{ user.name }}
        </h1>
        <p class="text-sm text-muted">
          {{ user.email ?? 'No email on this account' }} · member since {{ formatDate(user.createdAt) }}
        </p>
      </div>
      <UButton label="Sign out" icon="i-lucide-log-out" color="neutral" variant="outline" @click="signOut" />
    </div>

    <div class="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <UCard v-for="s in stats" :key="s.label">
        <div class="flex items-center gap-2 text-sm text-muted">
          <UIcon :name="s.icon" class="size-4" />
          {{ s.label }}
        </div>
        <p class="mt-2 text-2xl font-semibold">
          {{ s.value }}
        </p>
      </UCard>
    </div>

    <h2 class="mt-10 text-lg font-semibold">
      Order history
    </h2>

    <div v-if="status === 'pending'" class="mt-4 space-y-3">
      <USkeleton v-for="i in 3" :key="i" class="h-20 w-full" />
    </div>

    <UEmpty
      v-else-if="!orders.length"
      class="mt-6"
      icon="i-lucide-receipt"
      title="No orders yet"
      description="Orders you place while signed in show up here."
      :actions="[{ label: 'Browse the store', to: '/' }]"
    />

    <div v-else class="mt-4 space-y-3">
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
