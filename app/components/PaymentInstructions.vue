<script setup lang="ts">
import type { Payment } from '~/types/api'

const props = defineProps<{ payment: Payment, amount: number }>()
const toast = useToast()

const steps = computed(() => {
  const label = props.payment.channelLabel
  switch (props.payment.instructionType) {
    case 'VIRTUAL_ACCOUNT_NUMBER':
      return [
        `Open your mobile banking app or go to an ATM (${label.replace(' Virtual Account', '')}).`,
        'Choose Transfer → Virtual Account, then enter the number above.',
        `Check that the amount is ${formatIDR(props.amount)} and confirm.`,
      ]
    case 'QR_STRING':
      return [
        'Open any banking or e-wallet app that supports QRIS.',
        'Scan the code above.',
        `Check that the amount is ${formatIDR(props.amount)} and confirm.`,
      ]
    case 'PAYMENT_CODE':
      return [
        `Go to the cashier at any ${label} store.`,
        'Say you want to pay an online order and show the payment code.',
        `Pay ${formatIDR(props.amount)} and keep the receipt.`,
      ]
    case 'REDIRECT_URL':
      return [
        `Open ${label} with the button above, or scan the code with your phone.`,
        'Approve the payment in the app.',
        'Come back here; this page updates on its own.',
      ]
    default:
      return [`Approve the payment request in your ${label} app.`, 'Come back here; this page updates on its own.']
  }
})

async function copy(value: string) {
  await navigator.clipboard.writeText(value)
  toast.add({ title: 'Copied', icon: 'i-lucide-copy-check', color: 'success', duration: 1500 })
}
</script>

<template>
  <div class="space-y-5">
    <div v-if="payment.instructionType === 'VIRTUAL_ACCOUNT_NUMBER' || payment.instructionType === 'PAYMENT_CODE'">
      <p class="text-sm text-muted">
        {{ payment.instructionType === 'PAYMENT_CODE' ? 'Payment code' : 'Virtual account number' }}
      </p>
      <div class="mt-1 flex flex-wrap items-center gap-3">
        <span class="font-mono text-2xl font-bold tracking-wider text-highlighted sm:text-3xl">
          {{ groupDigits(payment.instructionValue ?? '') }}
        </span>
        <UButton icon="i-lucide-copy" label="Copy" color="neutral" variant="outline" size="sm" @click="copy(payment.instructionValue ?? '')" />
      </div>
    </div>

    <div v-else-if="payment.instructionType === 'QR_STRING'" class="flex flex-col items-center gap-2">
      <QrCode :value="payment.instructionValue ?? ''" />
      <p class="text-xs text-muted">
        QRIS · scan with any banking or e-wallet app
      </p>
    </div>

    <div v-else-if="payment.instructionType === 'REDIRECT_URL'" class="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <QrCode :value="payment.instructionValue ?? ''" :size="160" />
      <div class="space-y-2 text-center sm:text-left">
        <p class="text-sm text-muted">
          On your phone? Open the app directly.
        </p>
        <UButton :to="payment.instructionValue ?? undefined" external target="_blank" :label="`Open ${payment.channelLabel}`" trailing-icon="i-lucide-external-link" />
      </div>
    </div>

    <UAlert
      v-else
      icon="i-lucide-smartphone"
      color="info"
      variant="subtle"
      :title="`Check your ${payment.channelLabel} app`"
      description="A payment request was sent to your phone number."
    />

    <div>
      <p class="mb-2 text-sm font-medium">
        How to pay
      </p>
      <ol class="space-y-1.5 text-sm text-muted">
        <li v-for="(step, i) in steps" :key="i" class="flex gap-2">
          <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-elevated text-xs font-semibold text-default">{{ i + 1 }}</span>
          <span>{{ step }}</span>
        </li>
      </ol>
    </div>
  </div>
</template>
