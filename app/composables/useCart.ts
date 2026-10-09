import type { Product } from '~/types/api'

export interface CartLine {
  productId: string
  quantity: number
}

export const MAX_QUANTITY = 10

/** How many of a product fit in one order: the per-order cap, or less when stock is limited. */
export function quantityLimit(product: Pick<Product, 'stock'>) {
  return product.stock === null ? MAX_QUANTITY : Math.min(MAX_QUANTITY, product.stock)
}

export function useProducts() {
  return useFetch<Product[]>('/api/products', { key: 'products', default: () => [] })
}

/** Kept in a cookie so the server-rendered page already shows the right cart count. */
export function useCart() {
  const lines = useCookie<CartLine[]>('cart', { default: () => [], maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' })
  const count = computed(() => lines.value.reduce((sum, l) => sum + l.quantity, 0))

  function quantityOf(productId: string) {
    return lines.value.find(l => l.productId === productId)?.quantity ?? 0
  }

  /** Returns false when the limit is already reached, so the caller can say so. */
  function add(productId: string, quantity = 1, limit = MAX_QUANTITY) {
    const current = quantityOf(productId)
    if (current >= limit) return false
    const next = Math.min(current + quantity, limit)
    lines.value = current
      ? lines.value.map(l => l.productId === productId ? { ...l, quantity: next } : l)
      : [...lines.value, { productId, quantity: next }]
    return true
  }

  function setQuantity(productId: string, quantity: number, limit = MAX_QUANTITY) {
    lines.value = lines.value.map(l => l.productId === productId ? { ...l, quantity: Math.max(1, Math.min(quantity, limit)) } : l)
  }

  function remove(productId: string) {
    lines.value = lines.value.filter(l => l.productId !== productId)
  }

  function clear() {
    lines.value = []
  }

  return { lines, count, quantityOf, add, setQuantity, remove, clear }
}
