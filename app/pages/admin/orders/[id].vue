<script setup lang="ts">
import type { AdminOrderDetail, AdminPayment, PaymentStatus } from '~/types/api'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const id = route.params.id as string
const toast = useToast()

const { data: order, refresh, status, error } = await useAdminFetch<AdminOrderDetail>(`/api/admin/orders/${id}`)
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Order not found', fatal: true })
}

const syncing = ref<string | null>(null)
async function sync(payment: AdminPayment) {
  syncing.value = payment.id
  try {
    const result = await $fetch<{ status: PaymentStatus, outcome: string }>(`/api/admin/payments/${payment.id}/sync`, { method: 'POST' })
    toast.add({
      title: `Gateway says ${PAYMENT_STATUS[result.status].label.toLowerCase()}`,
      description: result.outcome === 'UPDATED' ? 'The payment status was updated.' : 'Nothing changed.',
      color: result.outcome === 'UPDATED' ? 'success' : 'neutral',
      icon: 'i-lucide-refresh-cw',
    })
    await refresh()
  }
  catch (e) {
    toast.add({ title: 'Re-check failed', description: problemMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
  }
  finally {
    syncing.value = null
  }
}

const paymentLabel = (paymentId: string | null) => {
  const index = order.value?.payments.findIndex(p => p.id === paymentId) ?? -1
  return index < 0 ? '—' : order.value!.payments[index]!.channelLabel
}

useSeoMeta({ title: () => `${order.value?.reference ?? 'Order'} · Payments admin` })
</script>

<template>
  <UDashboardPanel id="order-detail">
    <template #header>
      <UDashboardNavbar :title="order?.reference ?? 'Order'">
        <template #leading>
          <UButton to="/admin/orders" icon="i-lucide-arrow-left" color="neutral" variant="ghost" aria-label="Back to orders" />
        </template>
        <template #right>
          <UBadge v-if="order" :label="ORDER_STATUS[order.status].label" :color="ORDER_STATUS[order.status].color" variant="subtle" size="lg" />
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" :loading="status === 'pending'" aria-label="Refresh" @click="refresh()" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="order" class="space-y-6">
        <UAlert
          v-if="order.needsRefund"
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          title="Paid twice"
          description="More than one payment succeeded for this order. The order was marked paid once; refund the extra payment from the gateway dashboard."
        />

        <div class="grid gap-4 lg:grid-cols-3">
          <UCard>
            <p class="text-sm text-muted">
              Customer
            </p>
            <p class="mt-1 font-medium">
              {{ order.customerName }}
            </p>
            <p class="text-sm text-muted">
              {{ order.customerEmail ?? 'No email' }}
            </p>
          </UCard>
          <UCard>
            <p class="text-sm text-muted">
              Amount
            </p>
            <p class="mt-1 text-xl font-semibold">
              {{ formatIDR(order.amount) }}
            </p>
            <p class="text-sm text-muted">
              {{ order.items.length }} item{{ order.items.length > 1 ? 's' : '' }}
            </p>
          </UCard>
          <UCard>
            <dl class="space-y-1 text-sm">
              <div class="flex justify-between gap-2">
                <dt class="text-muted">
                  Created
                </dt><dd>{{ formatDateTime(order.createdAt) }}</dd>
              </div>
              <div class="flex justify-between gap-2">
                <dt class="text-muted">
                  Paid
                </dt><dd>{{ formatDateTime(order.paidAt) }}</dd>
              </div>
              <div class="flex justify-between gap-2">
                <dt class="text-muted">
                  Expires
                </dt><dd>{{ formatDateTime(order.expiresAt) }}</dd>
              </div>
            </dl>
          </UCard>
        </div>

        <UCard :ui="{ body: 'p-0 sm:p-0' }">
          <template #header>
            <p class="font-semibold">
              Items
            </p>
          </template>
          <table class="w-full text-sm">
            <tbody class="divide-y divide-default">
              <tr v-for="item in order.items" :key="item.productId">
                <td class="px-4 py-3 sm:px-6">
                  {{ item.name }}
                </td>
                <td class="px-4 py-3 text-muted">
                  {{ formatIDR(item.unitPrice) }} × {{ item.quantity }}
                </td>
                <td class="px-4 py-3 text-right font-medium sm:px-6">
                  {{ formatIDR(item.total) }}
                </td>
              </tr>
            </tbody>
          </table>
        </UCard>

        <UCard>
          <template #header>
            <p class="font-semibold">
              Payment attempts
            </p>
            <p class="text-sm text-muted">
              Newest first. Switching method cancels the previous attempt at the gateway.
            </p>
          </template>
          <p v-if="!order.payments.length" class="text-sm text-muted">
            The customer has not chosen a payment method yet.
          </p>
          <ul class="divide-y divide-default">
            <li v-for="p in order.payments" :key="p.id" class="flex flex-wrap items-start gap-4 py-4 first:pt-0 last:pb-0">
              <div class="flex size-9 items-center justify-center rounded-lg bg-elevated">
                <UIcon :name="CHANNEL_KIND[p.kind].icon" class="size-5 text-muted" />
              </div>
              <div class="min-w-56 flex-1">
                <p class="font-medium">
                  {{ p.channelLabel }}
                  <span class="ml-1 text-xs font-normal text-muted">via {{ p.provider }}</span>
                </p>
                <p class="font-mono text-xs text-muted">
                  {{ p.providerRef ?? 'not created at gateway' }}
                </p>
                <p class="mt-1 text-xs text-muted">
                  Created {{ formatDateTime(p.createdAt) }} · updated {{ formatDateTime(p.updatedAt) }}
                </p>
              </div>
              <UBadge :label="PAYMENT_STATUS[p.status].label" :color="PAYMENT_STATUS[p.status].color" variant="subtle" />
              <UButton
                v-if="p.providerRef"
                label="Re-check with gateway"
                icon="i-lucide-refresh-cw"
                size="xs"
                color="neutral"
                variant="outline"
                :loading="syncing === p.id"
                @click="sync(p)"
              />
            </li>
          </ul>
        </UCard>

        <UCard :ui="{ body: 'p-0 sm:p-0' }">
          <template #header>
            <p class="font-semibold">
              Webhooks
            </p>
            <p class="text-sm text-muted">
              Each event is verified, stored once, and re-checked with the gateway before it is applied.
            </p>
          </template>
          <p v-if="!order.webhooks.length" class="px-4 py-4 text-sm text-muted sm:px-6">
            No webhooks received for this order.
          </p>
          <table v-else class="w-full text-sm">
            <tbody class="divide-y divide-default">
              <tr v-for="w in order.webhooks" :key="w.id">
                <td class="px-4 py-3 text-muted sm:px-6">
                  {{ formatDateTime(w.receivedAt) }}
                </td>
                <td class="px-4 py-3 font-mono text-xs">
                  {{ w.eventKey }}
                </td>
                <td class="px-4 py-3">
                  {{ paymentLabel(w.paymentId) }}
                </td>
                <td class="px-4 py-3">
                  <UBadge v-if="w.confirmedStatus" :label="PAYMENT_STATUS[w.confirmedStatus].label" :color="PAYMENT_STATUS[w.confirmedStatus].color" variant="outline" />
                </td>
                <td class="px-4 py-3 sm:px-6">
                  <UTooltip v-if="w.outcome" :text="WEBHOOK_OUTCOME[w.outcome].hint">
                    <UBadge :label="WEBHOOK_OUTCOME[w.outcome].label" :color="WEBHOOK_OUTCOME[w.outcome].color" variant="subtle" />
                  </UTooltip>
                </td>
              </tr>
            </tbody>
          </table>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
