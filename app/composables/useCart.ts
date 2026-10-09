import type { Product } from '~/types/api'

export interface CartLine {
  productId: string
  quantity: number
}

export const MAX_QUANTITY = 10

export function useProducts() {
  return useFetch<Product[]>('/api/products', { key: 'products', default: () => [] })
}

/** Kept in a cookie so the server-rendered page already shows the right cart count. */
export function useCart() {
  const lines = useCookie<CartLine[]>('cart', { default: () => [], maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' })
  const count = computed(() => lines.value.reduce((sum, l) => sum + l.quantity, 0))

  function add(productId: string, quantity = 1) {
    const existing = lines.value.find(l => l.productId === productId)
    lines.value = existing
      ? lines.value.map(l => l.productId === productId ? { ...l, quantity: Math.min(l.quantity + quantity, MAX_QUANTITY) } : l)
      : [...lines.value, { productId, quantity }]
  }

  function setQuantity(productId: string, quantity: number) {
    lines.value = lines.value.map(l => l.productId === productId ? { ...l, quantity: Math.max(1, Math.min(quantity, MAX_QUANTITY)) } : l)
  }

  function remove(productId: string) {
    lines.value = lines.value.filter(l => l.productId !== productId)
  }

  function clear() {
    lines.value = []
  }

  return { lines, count, add, setQuantity, remove, clear }
}
