<script setup lang="ts">
import type { MyReview, Page, Product, Review } from '~/types/api'

const route = useRoute()
const id = route.params.id as string
const cart = useCart()
const { signedIn } = useAuth()
const toast = useToast()

const REVIEWS_PER_PAGE = 5
const page = ref(1)
const [
  { data: product, error, refresh: refreshProduct },
  { data: reviews, refresh: refreshReviews },
  { data: mine, refresh: refreshMine },
] = await Promise.all([
  useFetch<Product>(`/api/products/${id}`),
  useFetch<Page<Review>>(`/api/products/${id}/reviews`, {
    query: computed(() => ({ page: page.value - 1, size: REVIEWS_PER_PAGE })),
  }),
  useFetch<MyReview>(`/api/me/reviews/${id}`, { immediate: signedIn.value }),
])
if (error.value || !product.value) {
  throw createError({ statusCode: 404, statusMessage: 'Product not found', fatal: true })
}

const limit = computed(() => product.value ? quantityLimit(product.value) : 0)
const inCart = computed(() => cart.quantityOf(id))
const quantity = ref(1)

function addToCart() {
  const p = product.value!
  if (!cart.add(p.id, quantity.value, limit.value)) {
    toast.add({ title: `You already have the most you can order of ${p.name}`, color: 'warning', icon: 'i-lucide-info' })
    return
  }
  toast.add({
    title: `${p.name} added to cart`,
    icon: 'i-lucide-check',
    color: 'success',
    actions: [{ label: 'View cart', to: '/cart', color: 'neutral', variant: 'outline' }],
  })
}

const editing = ref(false)
const draft = reactive({ rating: 0, comment: '' })
const saving = ref(false)

function startEditing() {
  draft.rating = mine.value?.review?.rating ?? 0
  draft.comment = mine.value?.review?.comment ?? ''
  editing.value = true
}

async function afterReviewChange() {
  editing.value = false
  await Promise.all([refreshMine(), refreshReviews(), refreshProduct(), refreshNuxtData('products')])
}

async function saveReview() {
  if (!draft.rating) {
    toast.add({ title: 'Choose a star rating first', color: 'warning', icon: 'i-lucide-star' })
    return
  }
  saving.value = true
  try {
    await $fetch(`/api/me/reviews/${id}`, {
      method: 'PUT',
      body: { rating: draft.rating, comment: draft.comment.trim() || null },
    })
    toast.add({ title: 'Thanks for your review', color: 'success', icon: 'i-lucide-check' })
    await afterReviewChange()
  }
  catch (e) {
    toast.add({ title: 'Could not save the review', description: problemMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
  }
  finally {
    saving.value = false
  }
}

async function deleteReview() {
  saving.value = true
  try {
    await $fetch(`/api/me/reviews/${id}`, { method: 'DELETE' })
    toast.add({ title: 'Review deleted', color: 'neutral', icon: 'i-lucide-trash-2' })
    await afterReviewChange()
  }
  catch (e) {
    toast.add({ title: 'Could not delete the review', description: problemMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
  }
  finally {
    saving.value = false
  }
}

useSeoMeta({
  title: () => `${product.value?.name ?? 'Product'} · Starter Store`,
  description: () => product.value?.description,
})
</script>

<template>
  <UContainer v-if="product" class="py-10">
    <UButton to="/" label="All products" icon="i-lucide-arrow-left" color="neutral" variant="link" class="-ml-2.5 mb-4" />

    <div class="grid gap-8 lg:grid-cols-2">
      <ProductMedia :product="product" variant="hero" />

      <div>
        <div class="flex flex-wrap items-center gap-2">
          <UBadge :label="product.category" color="neutral" variant="subtle" />
          <StockBadge :stock="product.stock" />
        </div>
        <h1 class="mt-3 text-3xl font-bold tracking-tight">
          {{ product.name }}
        </h1>
        <a v-if="product.reviewCount" href="#reviews" class="mt-2 inline-block">
          <StarRating :value="product.rating" :count="product.reviewCount" size="md" />
        </a>
        <p v-else class="mt-2 text-sm text-muted">
          No reviews yet
        </p>
        <p class="mt-4 text-2xl font-semibold">
          {{ formatIDR(product.price) }}
        </p>
        <p class="mt-4 text-muted">
          {{ product.description }}
        </p>

        <div v-if="product.stock === 0" class="mt-6">
          <UAlert color="error" variant="subtle" icon="i-lucide-package-x" title="Sold out" description="Check back later; stock comes back when unpaid orders expire." />
        </div>
        <div v-else class="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <div class="flex items-center gap-3">
            <UInputNumber v-model="quantity" :min="1" :max="limit" class="w-28 sm:w-32" aria-label="Quantity" />
            <UButton label="Add to cart" icon="i-lucide-plus" size="lg" class="flex-1 sm:flex-none justify-center" @click="addToCart" />
          </div>
          <UButton v-if="inCart" to="/cart" :label="`In cart: ${inCart}`" color="neutral" variant="ghost" trailing-icon="i-lucide-arrow-right" class="justify-center self-start sm:self-auto" />
        </div>
        <p v-if="product.stock !== null && product.stock > 0" class="mt-2 text-xs text-muted">
          Stock is held for you once you place the order, and released if it is not paid in time.
        </p>
      </div>
    </div>

    <section id="reviews" class="mt-14 scroll-mt-20">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-xl font-semibold">
            Reviews
          </h2>
          <p class="mt-1 text-sm text-muted">
            Only customers who paid for this product can review it.
          </p>
        </div>
        <div v-if="product.reviewCount" class="flex items-center gap-3">
          <span class="text-4xl font-bold">{{ product.rating.toFixed(1) }}</span>
          <div>
            <StarRating :value="product.rating" size="md" />
            <p class="text-xs text-muted">
              {{ product.reviewCount }} review{{ product.reviewCount === 1 ? '' : 's' }}
            </p>
          </div>
        </div>
      </div>

      <UCard class="mt-6">
        <div v-if="!signedIn" class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-muted">
            Bought this? Sign in to leave a review.
          </p>
          <UButton :to="{ path: '/login', query: { redirect: `/products/${id}` } }" label="Sign in" icon="i-lucide-log-in" color="neutral" variant="outline" />
        </div>

        <form v-else-if="editing" class="space-y-4" @submit.prevent="saveReview">
          <StarInput v-model="draft.rating" />
          <UTextarea
            v-model="draft.comment"
            :maxlength="1000"
            :rows="4"
            autoresize
            placeholder="What did you like or not like? (optional)"
            class="w-full"
            aria-label="Review"
          />
          <div class="flex items-center justify-between gap-3">
            <span class="text-xs text-muted">{{ draft.comment.length }}/1000</span>
            <div class="flex gap-2">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="editing = false" />
              <UButton type="submit" :label="mine?.review ? 'Update review' : 'Post review'" :loading="saving" />
            </div>
          </div>
        </form>

        <div v-else-if="mine?.review" class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm font-medium">
              Your review
            </p>
            <div class="flex gap-1">
              <UButton label="Edit" icon="i-lucide-pencil" color="neutral" variant="ghost" size="sm" :disabled="!mine.canReview" @click="startEditing" />
              <UButton label="Delete" icon="i-lucide-trash-2" color="error" variant="ghost" size="sm" :loading="saving" @click="deleteReview" />
            </div>
          </div>
          <UAlert
            v-if="mine.hidden"
            color="warning"
            variant="subtle"
            icon="i-lucide-eye-off"
            description="A moderator hid this review, so other shoppers do not see it and it does not count toward the rating."
          />
          <StarRating :value="mine.review.rating" size="md" />
          <p v-if="mine.review.comment" class="text-sm whitespace-pre-line">
            {{ mine.review.comment }}
          </p>
        </div>

        <div v-else-if="mine?.canReview" class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-muted">
            You bought this. How was it?
          </p>
          <UButton label="Write a review" icon="i-lucide-star" @click="startEditing" />
        </div>

        <p v-else class="text-sm text-muted">
          You can review this once you have a paid order for it.
        </p>
      </UCard>

      <div v-if="reviews?.items.length" class="mt-6 divide-y divide-default">
        <article v-for="review in reviews.items" :key="review.id" class="flex gap-4 py-5">
          <UAvatar :src="review.authorPictureUrl ?? undefined" :alt="review.author" />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span class="font-medium text-highlighted">{{ review.author }}</span>
              <StarRating :value="review.rating" />
              <span class="text-xs text-muted">{{ formatDate(review.createdAt) }}<template v-if="review.updatedAt !== review.createdAt"> · edited</template></span>
            </div>
            <p v-if="review.comment" class="mt-2 text-sm whitespace-pre-line">
              {{ review.comment }}
            </p>
          </div>
        </article>
      </div>
      <UEmpty v-else class="mt-6" icon="i-lucide-message-square" title="No reviews yet" description="Reviews from paying customers will show up here." />

      <div v-if="(reviews?.total ?? 0) > REVIEWS_PER_PAGE" class="mt-4 flex justify-center">
        <UPagination v-model:page="page" :total="reviews?.total ?? 0" :items-per-page="REVIEWS_PER_PAGE" />
      </div>
    </section>
  </UContainer>
</template>
