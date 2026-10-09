<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { AdminOrderRow, OrderStatus, Page } from '~/types/api'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const router = useRouter()

const PAGE_SIZE = 15
const statusOptions = [
  { label: 'All statuses', value: 'ALL' },
  { label: 'Awaiting payment', value: 'PENDING_PAYMENT' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Expired', value: 'EXPIRED' },
]

const status = ref<OrderStatus | 'ALL'>((route.query.status as OrderStatus) || 'ALL')
const search = ref((route.query.q as string) || '')
const query = ref(search.value)
const page = ref(1)

let debounce: ReturnType<typeof setTimeout> | undefined
watch(search, (value) => {
  clearTimeout(debounce)
  debounce = setTimeout(() => (query.value = value), 300)
})
watch([status, query], () => {
  page.value = 1
  router.replace({ query: { ...(status.value !== 'ALL' && { status: status.value }), ...(query.value && { q: query.value }) } })
})

const { data, status: loading, refresh } = await useAdminFetch<Page<AdminOrderRow>>('/api/admin/orders', {
  query: computed(() => ({
    status: status.value === 'ALL' ? undefined : status.value,
    q: query.value || undefined,
    page: page.value - 1,
    size: PAGE_SIZE,
  })),
})

const columns: TableColumn<AdminOrderRow>[] = [
  { accessorKey: 'reference', header: 'Order' },
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'amount', header: () => h('div', { class: 'text-right' }, 'Amount') },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'channelLabel', header: 'Latest payment' },
  { accessorKey: 'createdAt', header: 'Created' },
]

function open(_: Event, row: { original: AdminOrderRow }) {
  navigateTo(`/admin/orders/${row.original.id}`)
}

useSeoMeta({ title: 'Orders · Payments admin' })
</script>

<template>
  <UDashboardPanel id="orders">
    <template #header>
      <UDashboardNavbar title="Orders">
        <template #right>
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" :loading="loading === 'pending'" aria-label="Refresh" @click="refresh()" />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <UInput v-model="search" icon="i-lucide-search" placeholder="Search reference, name, or email" class="w-full max-w-sm" />
        <USelect v-model="status" :items="statusOptions" class="w-48" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <UTable
        :data="data?.items ?? []"
        :columns="columns"
        :loading="loading === 'pending'"
        class="flex-1"
        :ui="{ tr: 'cursor-pointer' }"
        @select="open"
      >
        <template #reference-cell="{ row }">
          <span class="font-mono font-medium text-highlighted">{{ row.original.reference }}</span>
          <p class="max-w-56 truncate text-xs text-muted">
            {{ row.original.description }}
          </p>
        </template>
        <template #customerName-cell="{ row }">
          <p>{{ row.original.customerName }}</p>
          <p class="text-xs text-muted">
            {{ row.original.customerEmail ?? '—' }}
          </p>
        </template>
        <template #amount-cell="{ row }">
          <div class="text-right font-medium">
            {{ formatIDR(row.original.amount) }}
          </div>
        </template>
        <template #status-cell="{ row }">
          <UBadge :label="ORDER_STATUS[row.original.status].label" :color="ORDER_STATUS[row.original.status].color" variant="subtle" />
        </template>
        <template #channelLabel-cell="{ row }">
          <template v-if="row.original.channelLabel && row.original.paymentStatus">
            <p>{{ row.original.channelLabel }}</p>
            <p class="text-xs" :class="PAYMENT_STATUS[row.original.paymentStatus].text">
              {{ PAYMENT_STATUS[row.original.paymentStatus].label }}
            </p>
          </template>
          <span v-else class="text-muted">Not chosen</span>
        </template>
        <template #createdAt-cell="{ row }">
          <span class="text-sm whitespace-nowrap text-muted">{{ formatShortDateTime(row.original.createdAt) }}</span>
        </template>
        <template #empty>
          <UEmpty icon="i-lucide-receipt" title="No orders match" description="Try another status or search term." />
        </template>
      </UTable>

      <div class="flex items-center justify-between border-t border-default pt-4">
        <p class="text-sm text-muted">
          {{ data?.total ?? 0 }} orders
        </p>
        <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="PAGE_SIZE" />
      </div>
    </template>
  </UDashboardPanel>
</template>
