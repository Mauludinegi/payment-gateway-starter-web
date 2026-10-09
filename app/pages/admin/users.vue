<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { AdminUserRow, Page, Role } from '~/types/api'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { user: me } = useAuth()
const toast = useToast()

const PAGE_SIZE = 15
const roleFilterOptions = [
  { label: 'All roles', value: 'ALL' },
  { label: 'Customers', value: 'CUSTOMER' },
  { label: 'Admins', value: 'ADMIN' },
]
const roleOptions = [
  { label: 'Customer', value: 'CUSTOMER' },
  { label: 'Admin', value: 'ADMIN' },
]

const role = ref<Role | 'ALL'>('ALL')
const search = ref('')
const query = ref('')
const page = ref(1)

let debounce: ReturnType<typeof setTimeout> | undefined
watch(search, (value) => {
  clearTimeout(debounce)
  debounce = setTimeout(() => (query.value = value), 300)
})
watch([role, query], () => (page.value = 1))

const { data, status: loading, refresh } = await useAdminFetch<Page<AdminUserRow>>('/api/admin/users', {
  query: computed(() => ({
    role: role.value === 'ALL' ? undefined : role.value,
    q: query.value || undefined,
    page: page.value - 1,
    size: PAGE_SIZE,
  })),
})

const columns: TableColumn<AdminUserRow>[] = [
  { accessorKey: 'name', header: 'User' },
  { accessorKey: 'orders', header: () => h('div', { class: 'text-right' }, 'Orders') },
  { accessorKey: 'spent', header: () => h('div', { class: 'text-right' }, 'Spent') },
  { accessorKey: 'lastLoginAt', header: 'Last sign-in' },
  { accessorKey: 'role', header: 'Role' },
]

const saving = ref<string>()

async function changeRole(row: AdminUserRow, next: Role) {
  if (next === row.role) return
  saving.value = row.id
  try {
    const updated = await $fetch<AdminUserRow>(`/api/admin/users/${row.id}/role`, { method: 'PATCH', body: { role: next } })
    row.role = updated.role
    toast.add({
      title: next === 'ADMIN' ? `${row.name} is now an admin` : `${row.name} is now a customer`,
      description: 'This applies to their next request; they do not need to sign in again.',
      color: 'success',
      icon: 'i-lucide-shield-check',
    })
  }
  catch (error) {
    toast.add({ title: 'Could not change the role', description: problemMessage(error), color: 'error', icon: 'i-lucide-circle-alert' })
  }
  finally {
    saving.value = undefined
  }
}

useSeoMeta({ title: 'Users · Payments admin' })
</script>

<template>
  <UDashboardPanel id="users">
    <template #header>
      <UDashboardNavbar title="Users">
        <template #right>
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" :loading="loading === 'pending'" aria-label="Refresh" @click="refresh()" />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <UInput v-model="search" icon="i-lucide-search" placeholder="Search name or email" class="w-full max-w-sm" />
        <USelect v-model="role" :items="roleFilterOptions" class="w-40" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <UAlert
        color="neutral"
        variant="subtle"
        icon="i-lucide-shield"
        description="Admins can open this dashboard and change roles. Nobody can change their own role, so there is always an admin left. New admins can also be added with ADMIN_EMAILS on the API."
      />

      <UTable :data="data?.items ?? []" :columns="columns" :loading="loading === 'pending'" class="flex-1">
        <template #name-cell="{ row }">
          <div class="flex items-center gap-3">
            <UAvatar :src="row.original.pictureUrl ?? undefined" :alt="row.original.name" size="sm" />
            <div class="min-w-0">
              <p class="font-medium text-highlighted">
                {{ row.original.name }}
                <UBadge v-if="row.original.id === me?.id" label="You" color="neutral" variant="subtle" size="sm" class="ml-1" />
              </p>
              <p class="truncate text-xs text-muted">
                {{ row.original.email ?? 'No email' }}
              </p>
            </div>
          </div>
        </template>
        <template #orders-cell="{ row }">
          <div class="text-right">
            {{ row.original.orders }}
          </div>
        </template>
        <template #spent-cell="{ row }">
          <div class="text-right font-medium">
            {{ formatIDR(row.original.spent) }}
          </div>
        </template>
        <template #lastLoginAt-cell="{ row }">
          <span class="text-sm whitespace-nowrap text-muted">{{ formatShortDateTime(row.original.lastLoginAt) }}</span>
        </template>
        <template #role-cell="{ row }">
          <USelect
            :model-value="row.original.role"
            :items="roleOptions"
            :disabled="row.original.id === me?.id"
            :loading="saving === row.original.id"
            class="w-32"
            :aria-label="`Role of ${row.original.name}`"
            @update:model-value="(v) => changeRole(row.original, v as Role)"
          />
        </template>
        <template #empty>
          <UEmpty icon="i-lucide-users" title="No users match" description="Users appear here after they sign in once." />
        </template>
      </UTable>

      <div class="flex items-center justify-between border-t border-default pt-4">
        <p class="text-sm text-muted">
          {{ data?.total ?? 0 }} users
        </p>
        <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="PAGE_SIZE" />
      </div>
    </template>
  </UDashboardPanel>
</template>
