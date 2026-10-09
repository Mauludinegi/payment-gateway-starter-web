<script setup lang="ts">
import type { AdminStats } from '~/types/api'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: stats, refresh, status } = await useAdminFetch<AdminStats>('/api/admin/stats')

const cards = computed(() => {
  const s = stats.value
  if (!s) return []
  return [
    { label: 'Revenue', value: formatIDR(s.revenue), icon: 'i-lucide-banknote', hint: `${s.paid} paid orders` },
    { label: 'Orders', value: String(s.orders), icon: 'i-lucide-receipt', hint: `${s.pending} awaiting payment` },
    { label: 'Conversion', value: formatPercent(s.conversionRate), icon: 'i-lucide-trending-up', hint: 'Paid ÷ all orders' },
    { label: 'Expired', value: String(s.expired), icon: 'i-lucide-clock-alert', hint: 'Never paid in time' },
  ]
})

const maxDay = computed(() => Math.max(1, ...(stats.value?.last7Days.map(d => d.revenue) ?? [])))
const maxChannel = computed(() => Math.max(1, ...(stats.value?.channels.map(c => c.amount) ?? [])))

useSeoMeta({ title: 'Overview · Payments admin' })
</script>

<template>
  <UDashboardPanel id="overview">
    <template #header>
      <UDashboardNavbar title="Overview">
        <template #right>
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" :loading="status === 'pending'" aria-label="Refresh" @click="refresh()" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="stats" class="space-y-6">
        <UAlert
          v-if="stats.paidTwice"
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :title="`${stats.paidTwice} order${stats.paidTwice > 1 ? 's were' : ' was'} paid twice`"
          description="A customer paid an old payment method after switching. Refund the extra payment from the gateway dashboard."
          :actions="[{ label: 'Review orders', to: '/admin/orders?status=PAID', color: 'warning', variant: 'outline' }]"
        />

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UCard v-for="c in cards" :key="c.label">
            <div class="flex items-center justify-between">
              <p class="text-sm text-muted">
                {{ c.label }}
              </p>
              <UIcon :name="c.icon" class="size-5 text-muted" />
            </div>
            <p class="mt-2 text-2xl font-semibold text-highlighted">
              {{ c.value }}
            </p>
            <p class="mt-1 text-xs text-muted">
              {{ c.hint }}
            </p>
          </UCard>
        </div>

        <div class="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <UCard>
            <template #header>
              <p class="font-semibold">
                Revenue, last 7 days
              </p>
            </template>
            <div class="flex h-48 items-end gap-3">
              <div v-for="d in stats.last7Days" :key="d.date" class="flex flex-1 flex-col items-center gap-2">
                <UTooltip :text="`${formatIDR(d.revenue)} · ${d.paid} paid`">
                  <div class="flex h-36 w-full items-end">
                    <div
                      class="w-full rounded-t-md bg-primary/80 transition-all"
                      :style="{ height: `${Math.max(d.revenue ? 4 : 1, (d.revenue / maxDay) * 100)}%` }"
                    />
                  </div>
                </UTooltip>
                <span class="text-xs text-muted">{{ formatDay(d.date) }}</span>
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <p class="font-semibold">
                Successful payments by method
              </p>
            </template>
            <p v-if="!stats.channels.length" class="text-sm text-muted">
              No payments yet.
            </p>
            <ul class="space-y-4">
              <li v-for="c in stats.channels" :key="c.channel">
                <div class="mb-1 flex justify-between text-sm">
                  <span class="flex items-center gap-2">
                    <UIcon :name="CHANNEL_KIND[c.kind].icon" class="size-4 text-muted" />
                    {{ c.label }}
                  </span>
                  <span class="text-muted">{{ c.payments }} · {{ formatIDR(c.amount) }}</span>
                </div>
                <UProgress :model-value="(c.amount / maxChannel) * 100" size="sm" />
              </li>
            </ul>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
