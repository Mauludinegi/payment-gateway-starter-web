<script setup lang="ts">
import type { Order } from '~/types/api'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const id = route.params.id as string
const toast = useToast()

const { data: order, error, refresh } = await useFetch<Order>(`/api/orders/${id}`, { key: `order-${id}` })
if (error.value?.statusCode === 401) {
  useCookie('signed_in').value = null
  useAuth().user.value = null
  await navigateTo({ path: '/login', query: { redirect: route.fullPath } })
}
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Order not found', fatal: true })
}

const payment = computed(() => order.value?.payment ?? null)
const changing = ref(false)
const paying = ref(false)
const showPicker = computed(() => order.value?.status === 'PENDING_PAYMENT'
  && (changing.value || !payment.value || payment.value.status !== 'PENDING'))

// The webhook updates the order on the server, which pushes it here as it happens.
const { live } = useOrderStream(id, order, refresh)

watch(() => order.value?.status, (now, before) => {
  if (before === 'PENDING_PAYMENT' && now === 'PAID') {
    toast.add({ title: 'Payment received', description: 'Thank you! Your order is paid.', color: 'success', icon: 'i-lucide-party-popper' })
  }
})

// One key per choice of method: a double click or a retry after a network error returns the payment
// the first request started instead of starting a second one.
let pending: { channel: string, mobileNumber: string | null, key: string } | null = null

async function startPayment(channel: string, mobileNumber: string | null) {
  if (paying.value) return
  if (pending?.channel !== channel || pending.mobileNumber !== mobileNumber) {
    pending = { channel, mobileNumber, key: crypto.randomUUID() }
  }
  paying.value = true
  try {
    order.value = await $fetch<Order>(`/api/orders/${id}/payments`, {
      method: 'POST',
      body: { channel, mobileNumber },
      headers: { 'Idempotency-Key': pending.key },
    })
    pending = null
    changing.value = false
  }
  catch (e) {
    toast.add({ title: 'Could not start the payment', description: problemMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
    await refresh()
  }
  finally {
    paying.value = false
  }
}

// The stream only fires on changes; while the gateway confirms, poll so the instructions show up.
const confirming = computed(() => payment.value?.status === 'PENDING' && payment.value.confirming)
let confirmTimer: ReturnType<typeof setInterval> | undefined
watch(confirming, (on) => {
  clearInterval(confirmTimer)
  if (on) confirmTimer = setInterval(() => refresh(), 5000)
}, { immediate: true })
onBeforeUnmount(() => clearInterval(confirmTimer))

const simulating = ref<string | null>(null)
async function simulate(action: 'pay' | 'fail' | 'expire') {
  simulating.value = action
  try {
    await $fetch(`/api/simulator/orders/${id}/${action}`, { method: 'POST' })
    await refresh()
  }
  catch (e) {
    toast.add({ title: 'Simulator error', description: problemMessage(e), color: 'error' })
  }
  finally {
    simulating.value = null
  }
}

const lastAttemptMessage = computed(() => {
  const p = payment.value
  if (!p || changing.value || p.status === 'PENDING' || p.status === 'SUCCEEDED') return null
  return `Your ${p.channelLabel} payment ${p.status === 'FAILED' ? 'failed' : p.status === 'EXPIRED' ? 'expired' : 'was cancelled'}. Choose a method to try again.`
})

useSeoMeta({ title: () => `${order.value?.reference ?? 'Order'} · Starter Store` })
</script>

<template>
  <UContainer v-if="order" class="py-10">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-sm text-muted">
          Order
        </p>
        <h1 class="font-mono text-2xl font-bold">
          {{ order.reference }}
        </h1>
      </div>
      <div class="flex items-center gap-3">
        <UTooltip
          v-if="order.status === 'PENDING_PAYMENT'"
          :text="live ? 'Connected: this page updates the moment the payment arrives' : 'Reconnecting; checking every few seconds meanwhile'"
        >
          <span class="flex items-center gap-1.5 text-xs text-muted">
            <span class="size-2 rounded-full" :class="live ? 'animate-pulse bg-success' : 'bg-warning'" />
            {{ live ? 'Live' : 'Reconnecting' }}
          </span>
        </UTooltip>
        <UBadge :label="ORDER_STATUS[order.status].label" :color="ORDER_STATUS[order.status].color" variant="subtle" size="lg" />
      </div>
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
      <div class="order-2 lg:order-1">
        <!-- Paid -->
        <UCard v-if="order.status === 'PAID'">
          <div class="flex flex-col items-center py-6 text-center">
            <div class="flex size-14 items-center justify-center rounded-full bg-success/15">
              <UIcon name="i-lucide-check" class="size-8 text-success" />
            </div>
            <h2 class="mt-4 text-xl font-semibold">
              Payment received
            </h2>
            <p class="mt-1 text-muted">
              {{ formatIDR(order.amount) }} paid via {{ payment?.channelLabel }} on {{ formatDateTime(order.paidAt) }}.
            </p>
            <div class="mt-6 flex gap-2">
              <UButton to="/account" label="My orders" color="neutral" variant="outline" />
              <UButton to="/" label="Back to the store" />
            </div>
          </div>
        </UCard>

        <!-- Expired -->
        <UCard v-else-if="order.status === 'EXPIRED'">
          <UEmpty
            icon="i-lucide-clock-alert"
            title="This order expired"
            description="It was not paid in time. Place a new order to try again."
            :actions="[{ label: 'Back to the store', to: '/' }]"
          />
        </UCard>

        <!-- Choose a method -->
        <UCard v-else-if="showPicker">
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="font-semibold">
                Choose a payment method
              </h2>
              <UButton v-if="changing" label="Cancel" color="neutral" variant="ghost" size="sm" @click="changing = false" />
            </div>
          </template>
          <UAlert v-if="lastAttemptMessage" class="mb-5" color="warning" variant="subtle" icon="i-lucide-circle-alert" :description="lastAttemptMessage" />
          <UAlert
            v-if="changing"
            class="mb-5"
            color="info"
            variant="subtle"
            icon="i-lucide-info"
            description="Your current payment will be cancelled. If you already paid it, the order still counts as paid."
          />
          <ChannelPicker :loading="paying" :current="payment?.channel" @select="startPayment" />
        </UCard>

        <!-- Instructions -->
        <UCard v-else-if="payment">
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <UIcon :name="CHANNEL_KIND[payment.kind].icon" class="size-5 text-primary" />
                <h2 class="font-semibold">
                  {{ payment.channelLabel }}
                </h2>
              </div>
              <div class="flex items-center gap-3 text-sm">
                <span class="text-muted">Pay within</span>
                <PaymentCountdown :expires-at="payment.expiresAt" />
              </div>
            </div>
          </template>

          <UAlert
            v-if="confirming"
            color="info"
            variant="subtle"
            icon="i-lucide-loader-circle"
            title="Confirming with the payment provider"
            description="The provider did not answer in time. We are checking whether your payment was created; the instructions appear here as soon as it is. Please do not start another payment meanwhile."
            data-testid="payment-confirming"
          />
          <PaymentInstructions v-else :payment="payment" :amount="order.amount" />

          <template #footer>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="flex items-center gap-2 text-sm text-muted">
                <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
                Waiting for payment; this page updates automatically.
              </p>
              <UButton v-if="!confirming" label="Change payment method" color="neutral" variant="outline" size="sm" @click="changing = true" />
            </div>
          </template>
        </UCard>

        <UCard v-if="payment?.provider === 'SIMULATOR' && payment.status === 'PENDING' && order.status === 'PENDING_PAYMENT' && !changing" class="mt-4 border-dashed" variant="outline">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="flex items-center gap-2 text-sm font-medium">
                <UIcon name="i-lucide-flask-conical" class="size-4" />
                Simulator
              </p>
              <p class="text-xs text-muted">
                Act as the gateway: send a signed webhook to the backend.
              </p>
            </div>
            <div class="flex gap-2">
              <UButton label="Mark paid" size="sm" color="success" :loading="simulating === 'pay'" @click="simulate('pay')" />
              <UButton label="Fail" size="sm" color="error" variant="soft" :loading="simulating === 'fail'" @click="simulate('fail')" />
              <UButton label="Expire" size="sm" color="neutral" variant="soft" :loading="simulating === 'expire'" @click="simulate('expire')" />
            </div>
          </div>
        </UCard>
      </div>

      <UCard class="order-1 h-fit lg:order-2">
        <template #header>
          <h2 class="font-semibold">
            Summary
          </h2>
        </template>
        <ul class="space-y-3 text-sm">
          <li v-for="item in order.items" :key="item.productId" class="flex justify-between gap-3">
            <span>{{ item.name }} <span class="text-muted">× {{ item.quantity }}</span></span>
            <span class="font-medium">{{ formatIDR(item.total) }}</span>
          </li>
        </ul>
        <USeparator class="my-4" />
        <div class="flex justify-between font-semibold">
          <span>Total</span>
          <span>{{ formatIDR(order.amount) }}</span>
        </div>
        <dl class="mt-4 space-y-1 text-xs text-muted">
          <div class="flex justify-between">
            <dt>Customer</dt><dd>{{ order.customerName }}</dd>
          </div>
          <div class="flex justify-between">
            <dt>Placed</dt><dd>{{ formatDateTime(order.createdAt) }}</dd>
          </div>
          <div v-if="order.status === 'PENDING_PAYMENT'" class="flex justify-between">
            <dt>Order expires</dt><dd>{{ formatDateTime(order.expiresAt) }}</dd>
          </div>
        </dl>
      </UCard>
    </div>
  </UContainer>
</template>
