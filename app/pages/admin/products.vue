<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent, TableColumn } from '@nuxt/ui'
import type { AdminProduct } from '~/types/api'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const toast = useToast()
const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const { data, status: loading, refresh } = await useAdminFetch<AdminProduct[]>('/api/admin/products')
const products = computed(() => data.value ?? [])

const search = ref('')
const shown = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? products.value.filter(p => `${p.name} ${p.id} ${p.category}`.toLowerCase().includes(q)) : products.value
})
const categories = computed(() => [...new Set(products.value.map(p => p.category))])

const columns: TableColumn<AdminProduct>[] = [
  { accessorKey: 'name', header: 'Product' },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'price', header: () => h('div', { class: 'text-right' }, 'Price') },
  { accessorKey: 'stock', header: () => h('div', { class: 'text-right' }, 'Stock') },
  { accessorKey: 'active', header: 'Status' },
  { accessorKey: 'updatedAt', header: 'Updated' },
  { id: 'actions' },
]

const schema = z.object({
  id: z.string().trim().max(40).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, digits, and dashes'),
  name: z.string().trim().min(1, 'Required').max(120),
  description: z.string().trim().min(1, 'Required').max(500),
  category: z.string().trim().min(1, 'Required').max(40),
  icon: z.string().trim().max(60).regex(/^i-[a-z0-9]+(-[a-z0-9]+)+$/, 'Use an icon name such as i-lucide-book-open'),
  price: z.number({ error: 'Required' }).int().min(1).max(100_000_000),
  sortOrder: z.number().int().min(0).max(9999),
  active: z.boolean(),
  unlimited: z.boolean(),
  stock: z.number().int().min(0).max(1_000_000).nullable(),
})
type Schema = z.output<typeof schema>

function blank(): Schema {
  const nextOrder = products.value.reduce((max, p) => Math.max(max, p.sortOrder), 0) + 10
  return { id: '', name: '', description: '', category: '', icon: 'i-lucide-package', price: 50000, sortOrder: nextOrder, active: true, unlimited: true, stock: null }
}

const open = ref(false)
const editing = ref<AdminProduct | null>(null)
const state = reactive<Schema>(blank())
const file = ref<File | null>(null)
const removeImage = ref(false)
const saving = ref(false)

function startCreate() {
  editing.value = null
  Object.assign(state, blank())
  file.value = null
  removeImage.value = false
  open.value = true
}

function startEdit(p: AdminProduct) {
  editing.value = p
  Object.assign(state, {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    icon: p.icon,
    price: p.price,
    sortOrder: p.sortOrder,
    active: p.active,
    unlimited: p.stock === null,
    stock: p.stock,
  })
  file.value = null
  removeImage.value = false
  open.value = true
}

const currentImage = computed(() => removeImage.value ? null : editing.value?.imageUrl ?? null)

function imageProblem(f: File) {
  if (!IMAGE_TYPES.includes(f.type)) return 'Use a JPEG, PNG, or WebP image.'
  if (f.size > MAX_IMAGE_BYTES) return 'The image must be 2 MB or smaller.'
  return null
}

watch(file, (f) => {
  const problem = f && imageProblem(f)
  if (problem) {
    toast.add({ title: 'Image not accepted', description: problem, color: 'error', icon: 'i-lucide-image-off' })
    file.value = null
  }
})

async function save(event: FormSubmitEvent<Schema>) {
  const { unlimited, ...fields } = event.data
  if (!unlimited && fields.stock === null) {
    toast.add({ title: 'Enter the stock, or switch on unlimited', color: 'warning', icon: 'i-lucide-package' })
    return
  }
  const body = { ...fields, stock: unlimited ? null : fields.stock, version: editing.value?.version }
  const creating = !editing.value
  saving.value = true
  let saved: AdminProduct
  try {
    saved = creating
      ? await $fetch<AdminProduct>('/api/admin/products', { method: 'POST', body })
      : await $fetch<AdminProduct>(`/api/admin/products/${editing.value!.id}`, { method: 'PUT', body })
  }
  catch (error) {
    saving.value = false
    const conflict = (error as { statusCode?: number }).statusCode === 409
    toast.add({
      title: conflict && !creating ? 'This product changed while you were editing' : 'Could not save the product',
      description: conflict && !creating
        ? 'An order or another admin changed it, most likely the stock. The form now shows the latest values; check them and save again.'
        : problemMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
    if (conflict && !creating) {
      await refresh()
      const latest = products.value.find(p => p.id === editing.value!.id)
      if (latest) startEdit(latest)
    }
    return
  }

  try {
    if (file.value) {
      const form = new FormData()
      form.append('file', file.value)
      saved = await $fetch<AdminProduct>(`/api/admin/products/${saved.id}/image`, { method: 'PUT', body: form })
    }
    else if (removeImage.value && saved.imageUrl) {
      saved = await $fetch<AdminProduct>(`/api/admin/products/${saved.id}/image`, { method: 'DELETE' })
    }
  }
  catch (error) {
    // The product itself is saved; keep the drawer open on it so only the image needs retrying.
    toast.add({ title: 'Saved, but the image was not updated', description: problemMessage(error), color: 'warning', icon: 'i-lucide-image-off' })
    await refresh()
    startEdit(saved)
    saving.value = false
    return
  }

  saving.value = false
  open.value = false
  toast.add({ title: creating ? `${saved.name} created` : `${saved.name} saved`, color: 'success', icon: 'i-lucide-check' })
  await refresh()
}

useSeoMeta({ title: 'Products · Payments admin' })
</script>

<template>
  <UDashboardPanel id="products">
    <template #header>
      <UDashboardNavbar title="Products">
        <template #right>
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" :loading="loading === 'pending'" aria-label="Refresh" @click="refresh()" />
          <UButton label="New product" icon="i-lucide-plus" @click="startCreate" />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <UInput v-model="search" icon="i-lucide-search" placeholder="Search name, ID, or category" class="w-full max-w-sm" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <UTable :data="shown" :columns="columns" :loading="loading === 'pending'" class="flex-1">
        <template #name-cell="{ row }">
          <div class="flex items-center gap-3">
            <ProductMedia :product="row.original" variant="thumb" />
            <div class="min-w-0">
              <p class="font-medium text-highlighted">
                {{ row.original.name }}
              </p>
              <p class="font-mono text-xs text-muted">
                {{ row.original.id }}
              </p>
            </div>
          </div>
        </template>
        <template #price-cell="{ row }">
          <div class="text-right font-medium">
            {{ formatIDR(row.original.price) }}
          </div>
        </template>
        <template #stock-cell="{ row }">
          <div class="text-right">
            <span v-if="row.original.stock === null" class="text-muted">Unlimited</span>
            <span v-else :class="row.original.stock === 0 ? 'text-error' : row.original.stock <= 5 ? 'text-warning' : ''">
              {{ row.original.stock }}
            </span>
          </div>
        </template>
        <template #active-cell="{ row }">
          <UBadge
            :label="row.original.active ? 'On sale' : 'Hidden'"
            :color="row.original.active ? 'success' : 'neutral'"
            variant="subtle"
          />
        </template>
        <template #updatedAt-cell="{ row }">
          <span class="text-sm whitespace-nowrap text-muted">{{ row.original.updatedAt ? formatShortDateTime(row.original.updatedAt) : '-' }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="text-right">
            <UButton icon="i-lucide-pencil" label="Edit" color="neutral" variant="ghost" size="sm" @click="startEdit(row.original)" />
          </div>
        </template>
        <template #empty>
          <UEmpty icon="i-lucide-package" title="No products" description="Create the first product to open the store." />
        </template>
      </UTable>

      <p class="border-t border-default pt-4 text-sm text-muted">
        Stock goes down when an order is placed and comes back if it expires unpaid. Products are never deleted, because past orders refer to them; hide them instead.
      </p>
    </template>
  </UDashboardPanel>

  <USlideover
    v-model:open="open"
    :title="editing ? `Edit ${editing.name}` : 'New product'"
    :description="editing ? `ID ${editing.id}` : 'The ID appears in order history and cannot change later.'"
    :ui="{ content: 'max-w-xl' }"
  >
    <template #body>
      <UForm id="product-form" :schema="schema" :state="state" class="space-y-5" @submit="save">
        <UFormField v-if="!editing" label="ID" name="id" required help="For example: nuxt-course">
          <UInput v-model="state.id" class="w-full font-mono" autocomplete="off" />
        </UFormField>
        <UFormField label="Name" name="name" required>
          <UInput v-model="state.name" class="w-full" />
        </UFormField>
        <UFormField label="Description" name="description" required>
          <UTextarea v-model="state.description" :rows="3" autoresize :maxlength="500" class="w-full" />
        </UFormField>

        <div class="grid gap-5 sm:grid-cols-2">
          <UFormField label="Category" name="category" required>
            <UInput v-model="state.category" class="w-full" list="product-categories" />
            <datalist id="product-categories">
              <option v-for="c in categories" :key="c" :value="c" />
            </datalist>
          </UFormField>
          <UFormField label="Icon" name="icon" required help="Shown when there is no image">
            <UInput v-model="state.icon" class="w-full font-mono">
              <template #leading>
                <UIcon :name="state.icon || 'i-lucide-package'" class="size-4" />
              </template>
            </UInput>
          </UFormField>
          <UFormField label="Price (IDR)" name="price" required>
            <UInputNumber v-model="state.price" :min="1" :max="100000000" :step="1000" locale="id-ID" class="w-full" />
          </UFormField>
          <UFormField label="Sort order" name="sortOrder" help="Lower comes first">
            <UInputNumber v-model="state.sortOrder" :min="0" :max="9999" :step="10" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Stock" name="stock">
          <div class="flex flex-wrap items-center gap-4">
            <USwitch v-model="state.unlimited" label="Unlimited" aria-label="Unlimited stock" />
            <UInputNumber
              v-if="!state.unlimited"
              v-model="state.stock"
              :min="0"
              :max="1000000"
              placeholder="Units left"
              aria-label="Units in stock"
              class="w-40"
            />
          </div>
          <p v-if="editing && editing.stock !== null" class="mt-1 text-xs text-muted">
            Orders keep changing this number. If one comes in while the form is open, saving asks you to check again.
          </p>
        </UFormField>

        <UFormField label="Image" help="JPEG, PNG, or WebP up to 2 MB. Shown on the store card and product page.">
          <div v-if="currentImage && !file" class="space-y-2">
            <img :src="currentImage" :alt="state.name" class="aspect-[16/10] w-full rounded-lg object-cover">
            <UButton label="Remove image" icon="i-lucide-trash-2" color="error" variant="ghost" size="sm" @click="removeImage = true" />
          </div>
          <UFileUpload
            v-else
            v-model="file"
            accept="image/jpeg,image/png,image/webp"
            icon="i-lucide-image-up"
            label="Drop an image here"
            description="or click to choose one"
            class="min-h-40 w-full"
          />
          <UButton
            v-if="removeImage && editing?.imageUrl && !file"
            label="Keep the current image"
            icon="i-lucide-undo-2"
            color="neutral"
            variant="link"
            size="sm"
            class="mt-1"
            @click="removeImage = false"
          />
        </UFormField>

        <USwitch v-model="state.active" label="On sale" description="Hidden products stay in past orders but cannot be bought." />
      </UForm>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton label="Cancel" color="neutral" variant="ghost" @click="open = false" />
        <UButton type="submit" form="product-form" :label="editing ? 'Save changes' : 'Create product'" :loading="saving" />
      </div>
    </template>
  </USlideover>
</template>
