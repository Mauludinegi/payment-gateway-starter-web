export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'EXPIRED'
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED' | 'CANCELLED'
export type ChannelKind = 'VIRTUAL_ACCOUNT' | 'QR' | 'EWALLET' | 'RETAIL'
export type InstructionType = 'VIRTUAL_ACCOUNT_NUMBER' | 'QR_STRING' | 'REDIRECT_URL' | 'PAYMENT_CODE'
export type Provider = 'XENDIT' | 'MIDTRANS' | 'SIMULATOR'

export interface Product {
  id: string
  name: string
  description: string
  category: string
  icon: string
  price: number
  /** null means unlimited */
  stock: number | null
  imageUrl: string | null
  /** Average of visible reviews, 0 when there are none */
  rating: number
  reviewCount: number
}

export interface AdminProduct {
  id: string
  name: string
  description: string
  category: string
  icon: string
  price: number
  active: boolean
  sortOrder: number
  stock: number | null
  imageUrl: string | null
  updatedAt: string | null
  version: number
}

export interface Review {
  id: string
  author: string
  authorPictureUrl: string | null
  rating: number
  comment: string | null
  createdAt: string
  updatedAt: string
}

export interface MyReview {
  canReview: boolean
  review: Review | null
  /** A moderator hid this review; only its author sees that. */
  hidden: boolean
}

export interface AdminReview {
  id: string
  productId: string
  productName: string | null
  authorName: string | null
  authorEmail: string | null
  rating: number
  comment: string | null
  hidden: boolean
  createdAt: string
  updatedAt: string
}

export interface ChannelOption {
  channel: string
  label: string
  kind: ChannelKind
  provider: Provider
}

export interface OrderItem {
  productId: string
  name: string
  unitPrice: number
  quantity: number
  total: number
}

export interface Payment {
  id: string
  provider: Provider
  channel: string
  channelLabel: string
  kind: ChannelKind
  status: PaymentStatus
  instructionType: InstructionType | null
  instructionValue: string | null
  /** The gateway has not confirmed the payment yet (its create call timed out); instructions follow. */
  confirming: boolean
  createdAt: string
  expiresAt: string
}

export interface Order {
  id: string
  reference: string
  description: string
  amount: number
  customerName: string
  customerEmail: string | null
  status: OrderStatus
  createdAt: string
  expiresAt: string
  paidAt: string | null
  items: OrderItem[]
  payment: Payment | null
}

export type Role = 'CUSTOMER' | 'ADMIN'

export interface User {
  id: string
  name: string
  email: string | null
  pictureUrl: string | null
  role: Role
  createdAt: string
}

export interface AdminUserRow {
  id: string
  name: string
  email: string | null
  pictureUrl: string | null
  role: Role
  createdAt: string
  lastLoginAt: string
  orders: number
  spent: number
}

export interface AuthOptions {
  google: boolean
  devLogin: boolean
}

export interface Page<T> {
  items: T[]
  page: number
  size: number
  total: number
}

export interface AdminStats {
  orders: number
  paid: number
  pending: number
  expired: number
  revenue: number
  conversionRate: number
  paidTwice: number
  last7Days: { date: string, paid: number, revenue: number }[]
  channels: { channel: string, label: string, kind: ChannelKind, payments: number, amount: number }[]
}

export interface AdminOrderRow {
  id: string
  reference: string
  description: string
  customerName: string
  customerEmail: string | null
  amount: number
  status: OrderStatus
  createdAt: string
  paidAt: string | null
  channel: string | null
  channelLabel: string | null
  paymentStatus: PaymentStatus | null
  provider: Provider | null
}

export type WebhookOutcome = 'UPDATED' | 'UNCHANGED' | 'IGNORED'

export interface AdminPayment {
  id: string
  provider: Provider
  channel: string
  channelLabel: string
  kind: ChannelKind
  status: PaymentStatus
  providerRef: string | null
  instructionType: InstructionType | null
  instructionValue: string | null
  createdAt: string
  updatedAt: string
  expiresAt: string
}

export interface AdminWebhook {
  id: number
  provider: Provider
  eventKey: string
  receivedAt: string
  paymentId: string | null
  confirmedStatus: PaymentStatus | null
  outcome: WebhookOutcome | null
}

export interface AdminOrderDetail {
  id: string
  reference: string
  description: string
  amount: number
  customerName: string
  customerEmail: string | null
  status: OrderStatus
  createdAt: string
  expiresAt: string
  paidAt: string | null
  needsRefund: boolean
  stockShort: boolean
  items: OrderItem[]
  payments: AdminPayment[]
  webhooks: AdminWebhook[]
}

export interface AdminWebhookRow extends AdminWebhook {
  orderId: string | null
  orderReference: string | null
  channel: string | null
  providerRef: string | null
  /** Matched no payment yet; replayed until it does. */
  queued: boolean
}

/** Whether the deployment can move real money. */
export interface Environment {
  sandbox: boolean
  testMode: Partial<Record<Provider, boolean>>
}

/** RFC 9457 problem detail returned by the backend on errors. */
export interface Problem {
  title?: string
  detail?: string
  status?: number
}
