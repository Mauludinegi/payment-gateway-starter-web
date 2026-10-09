<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { AdminProduct, AdminReview, Page } from '~/types/api'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const toast = useToast()

const PAGE_SIZE = 15
const visibilityOptions = [
  { label: 'All reviews', value: 'ALL' },
  { label: 'Visible', value: 'VISIBLE' },
  { label: 'Hidden', value: 'HIDDEN' },
]

const visibility = ref<'ALL' | 'VISIBLE' | 'HIDDEN'>('ALL')
const productId = ref('ALL')
const page = ref(1)
watch([visibility, productId], () => (page.value = 1))

const [{ data: products }, { data, status: loading, refresh }] = await Promise.all([
  useAdminFetch<AdminProduct[]>('/api/admin/products'),
  useAdminFetch<Page<AdminReview>>('/api/admin/reviews', {
    query: computed(() => ({
      productId: productId.value === 'ALL' ? undefined : productId.value,
      hidden: visibility.value === 'ALL' ? undefined : visibility.value === 'HIDDEN',
      page: page.value - 1,
      size: PAGE_SIZE,
    })),
  }),
])
const productOptions = computed(() => [{ label: 'All products', value: 'ALL' }, ...(products.value ?? []).map(p => ({ label: p.name, value: p.id }))])

const columns: TableColumn<AdminReview>[] = [
  { accessorKey: 'authorName', header: 'Customer' },
  { accessorKey: 'productName', header: 'Product' },
  { accessorKey: 'comment', header: 'Review' },
  { accessorKey: 'createdAt', header: 'Posted' },
  { accessorKey: 'hidden', header: 'Shown in store' },
]

const saving = ref<string>()

async function setHidden(row: AdminReview, hidden: boolean) {
  saving.value = row.id
  try {
    await $fetch(`/api/admin/reviews/${row.id}`, { method: 'PATCH', body: { hidden } })
    row.hidden = hidden
    toast.add({
      title: hidden ? 'Review hidden' : 'Review visible again',
      description: hidden ? 'It no longer shows in the store or counts toward the rating. Its author still sees it.' : undefined,
      color: 'success',
      icon: hidden ? 'i-lucide-eye-off' : 'i-lucide-eye',
    })
  }
  catch (error) {
    toast.add({ title: 'Could not update the review', description: problemMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  }
  finally {
    saving.value = undefined
  }
}

useSeoMeta({ title: 'Reviews · Payments admin' })
</script>

<template>
  <UDashboardPanel id="reviews">
    <template #header>
      <UDashboardNavbar title="Reviews">
        <template #right>
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" :loading="loading === 'pending'" aria-label="Refresh" @click="refresh()" />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <div class="flex gap-2">
          <USelect v-model="productId" :items="productOptions" class="w-56" aria-label="Product" />
          <USelect v-model="visibility" :items="visibilityOptions" class="w-40" aria-label="Visibility" />
        </div>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UTable :data="data?.items ?? []" :columns="columns" :loading="loading === 'pending'" class="flex-1">
        <template #authorName-cell="{ row }">
          <div class="min-w-0">
            <p class="font-medium text-highlighted">
              {{ row.original.authorName ?? 'Deleted user' }}
            </p>
            <p class="truncate text-xs text-muted">
              {{ row.original.authorEmail ?? 'No email' }}
            </p>
          </div>
        </template>
        <template #productName-cell="{ row }">
          <NuxtLink :to="`/products/${row.original.productId}`" target="_blank" class="hover:text-primary">
            {{ row.original.productName ?? row.original.productId }}
          </NuxtLink>
        </template>
        <template #comment-cell="{ row }">
          <div class="max-w-md space-y-1">
            <StarRating :value="row.original.rating" />
            <p v-if="row.original.comment" class="line-clamp-3 text-sm whitespace-normal" :title="row.original.comment">
              {{ row.original.comment }}
            </p>
            <p v-else class="text-sm text-dimmed">
              No comment
            </p>
          </div>
        </template>
        <template #createdAt-cell="{ row }">
          <span class="text-sm whitespace-nowrap text-muted">{{ formatShortDateTime(row.original.createdAt) }}</span>
        </template>
        <template #hidden-cell="{ row }">
          <USwitch
            :model-value="!row.original.hidden"
            :loading="saving === row.original.id"
            :aria-label="row.original.hidden ? 'Show this review' : 'Hide this review'"
            @update:model-value="(shown) => setHidden(row.original, !shown)"
          />
        </template>
        <template #empty>
          <UEmpty icon="i-lucide-star" title="No reviews match" description="Customers can review a product after paying for it." />
        </template>
      </UTable>

      <div class="flex items-center justify-between border-t border-default pt-4">
        <p class="text-sm text-muted">
          {{ data?.total ?? 0 }} reviews
        </p>
        <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="PAGE_SIZE" />
      </div>
    </template>
  </UDashboardPanel>
</template>
