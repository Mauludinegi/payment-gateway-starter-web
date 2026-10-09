import type { ChannelKind, OrderStatus, PaymentStatus, WebhookOutcome } from '~/types/api'

type BadgeColor = 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'info'

export const ORDER_STATUS: Record<OrderStatus, { label: string, color: BadgeColor }> = {
  PENDING_PAYMENT: { label: 'Awaiting payment', color: 'warning' },
  PAID: { label: 'Paid', color: 'success' },
  EXPIRED: { label: 'Expired', color: 'neutral' },
}

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string, color: BadgeColor, text: string }> = {
  PENDING: { label: 'Pending', color: 'warning', text: 'text-warning' },
  SUCCEEDED: { label: 'Succeeded', color: 'success', text: 'text-success' },
  FAILED: { label: 'Failed', color: 'error', text: 'text-error' },
  EXPIRED: { label: 'Expired', color: 'neutral', text: 'text-muted' },
  CANCELLED: { label: 'Cancelled', color: 'neutral', text: 'text-muted' },
}

export const WEBHOOK_OUTCOME: Record<WebhookOutcome, { label: string, color: BadgeColor, hint: string }> = {
  UPDATED: { label: 'Applied', color: 'success', hint: 'Changed the payment status' },
  UNCHANGED: { label: 'No change', color: 'neutral', hint: 'Status was already up to date' },
  IGNORED: { label: 'Ignored', color: 'warning', hint: 'Would have downgraded a final status' },
}

export const CHANNEL_KIND: Record<ChannelKind, { label: string, icon: string }> = {
  VIRTUAL_ACCOUNT: { label: 'Virtual account', icon: 'i-lucide-landmark' },
  QR: { label: 'QRIS', icon: 'i-lucide-qr-code' },
  EWALLET: { label: 'E-wallet', icon: 'i-lucide-wallet' },
  RETAIL: { label: 'Retail outlet', icon: 'i-lucide-store' },
}
