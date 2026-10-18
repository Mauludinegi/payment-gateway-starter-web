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
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-center gap-3 sm:gap-4">
        <UAvatar :src="user.pictureUrl ?? undefined" :alt="user.name" size="2xl" class="ring-2 ring-primary/20 shrink-0" />
        <div class="min-w-0 flex-1">
          <h1 class="text-xl sm:text-2xl font-bold truncate">
            {{ user.name }}
          </h1>
          <p class="text-xs sm:text-sm text-muted truncate">
            {{ user.email ?? 'No email on this account' }} · member since {{ formatDate(user.createdAt) }}
          </p>
        </div>
      </div>
      <UButton label="Sign out" icon="i-lucide-log-out" color="neutral" variant="outline" size="sm" class="self-start sm:self-auto" @click="signOut" />
    </div>

    <div class="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <UCard v-for="s in stats" :key="s.label" :ui="{ body: 'p-3.5 sm:p-5' }">
        <div class="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted">
          <UIcon :name="s.icon" class="size-3.5 sm:size-4 shrink-0 text-primary" />
          <span class="truncate">{{ s.label }}</span>
        </div>
        <p class="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold truncate">
          {{ s.value }}
        </p>
      </UCard>
    </div>

    <h2 class="mt-8 sm:mt-10 text-lg font-semibold">
      Order history
    </h2>

    <div v-if="status === 'pending'" class="mt-4 space-y-3">
      <USkeleton v-for="i in 3" :key="i" class="h-20 w-full rounded-xl" />
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
        <UCard class="transition hover:ring-accented" :ui="{ body: 'p-4 sm:p-5' }">
          <div class="flex items-center justify-between gap-3 mb-1.5">
            <p class="font-mono font-bold text-sm sm:text-base text-highlighted">
              {{ o.reference }}
            </p>
            <UBadge :label="ORDER_STATUS[o.status].label" :color="ORDER_STATUS[o.status].color" variant="subtle" size="sm" />
          </div>
          <p class="text-xs sm:text-sm text-muted line-clamp-1">
            {{ o.description }} · {{ formatDateTime(o.createdAt) }}
          </p>
          <div class="mt-3 pt-2.5 border-t border-default/40 flex items-center justify-between text-xs sm:text-sm">
            <span class="text-muted flex items-center gap-1.5">
              <UIcon name="i-lucide-credit-card" class="size-3.5 text-primary shrink-0" />
              <span class="truncate">{{ o.payment?.channelLabel ?? 'Belum memilih metode' }}</span>
            </span>
            <span class="font-semibold text-sm sm:text-base text-highlighted">{{ formatIDR(o.amount) }}</span>
          </div>
        </UCard>
      </NuxtLink>
    </div>
  </UContainer>
</template>
