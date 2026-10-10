<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { AdminWebhookRow, Page } from '~/types/api'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const PAGE_SIZE = 20
const page = ref(1)

const { data, status, refresh } = await useAdminFetch<Page<AdminWebhookRow>>('/api/admin/webhooks', {
  query: computed(() => ({ page: page.value - 1, size: PAGE_SIZE })),
})

const columns: TableColumn<AdminWebhookRow>[] = [
  { accessorKey: 'receivedAt', header: 'Received' },
  { accessorKey: 'provider', header: 'Gateway' },
  { accessorKey: 'eventKey', header: 'Event' },
  { accessorKey: 'orderReference', header: 'Order' },
  { accessorKey: 'confirmedStatus', header: 'Confirmed status' },
  { accessorKey: 'outcome', header: 'Result' },
]

useSeoMeta({ title: 'Webhooks · Payments admin' })
</script>

<template>
  <UDashboardPanel id="webhooks">
    <template #header>
      <UDashboardNavbar title="Webhooks">
        <template #right>
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" :loading="status === 'pending'" aria-label="Refresh" @click="refresh()" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UAlert
        color="neutral"
        variant="subtle"
        icon="i-lucide-shield-check"
        description="Only events that passed signature or token verification are stored. Redelivered events are acknowledged without being applied again, and the status shown is what the gateway reported when re-checked, not what the payload claimed. An event that arrives before its payment is known is queued and replayed, not dropped."
      />

      <UTable :data="data?.items ?? []" :columns="columns" :loading="status === 'pending'" class="flex-1">
        <template #receivedAt-cell="{ row }">
          <span class="text-sm whitespace-nowrap text-muted">{{ formatShortDateTime(row.original.receivedAt) }}</span>
        </template>
        <template #provider-cell="{ row }">
          <UBadge :label="row.original.provider" color="neutral" variant="outline" />
        </template>
        <template #eventKey-cell="{ row }">
          <span class="font-mono text-xs">{{ row.original.eventKey }}</span>
        </template>
        <template #orderReference-cell="{ row }">
          <ULink v-if="row.original.orderId" :to="`/admin/orders/${row.original.orderId}`" class="font-mono text-primary">
            {{ row.original.orderReference }}
          </ULink>
          <span v-else class="text-muted">—</span>
        </template>
        <template #confirmedStatus-cell="{ row }">
          <UBadge
            v-if="row.original.confirmedStatus"
            :label="PAYMENT_STATUS[row.original.confirmedStatus].label"
            :color="PAYMENT_STATUS[row.original.confirmedStatus].color"
            variant="subtle"
          />
        </template>
        <template #outcome-cell="{ row }">
          <UTooltip v-if="row.original.outcome" :text="WEBHOOK_OUTCOME[row.original.outcome].hint">
            <UBadge :label="WEBHOOK_OUTCOME[row.original.outcome].label" :color="WEBHOOK_OUTCOME[row.original.outcome].color" variant="outline" />
          </UTooltip>
          <UTooltip v-else-if="row.original.queued" :text="`No payment matches ${row.original.providerRef ?? 'this event'} yet; it is replayed every run of the background job.`">
            <UBadge label="Queued" color="warning" variant="outline" />
          </UTooltip>
          <UTooltip v-else-if="!row.original.paymentId" text="No matching payment turned up within 3 days; the event was set aside.">
            <UBadge label="Unmatched" color="neutral" variant="outline" />
          </UTooltip>
        </template>
        <template #empty>
          <UEmpty icon="i-lucide-webhook" title="No webhooks yet" description="Pay an order (or use the simulator) to see events here." />
        </template>
      </UTable>

      <div class="flex items-center justify-between border-t border-default pt-4">
        <p class="text-sm text-muted">
          {{ data?.total ?? 0 }} events
        </p>
        <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="PAGE_SIZE" />
      </div>
    </template>
  </UDashboardPanel>
</template>
