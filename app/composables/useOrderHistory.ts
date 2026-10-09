const MAX_ORDERS = 20

/** There are no customer accounts in this demo, so the browser remembers which orders it placed. */
export function useOrderHistory() {
  const ids = useCookie<string[]>('orders', { default: () => [], maxAge: 60 * 60 * 24 * 90, sameSite: 'lax' })

  function remember(id: string) {
    ids.value = [id, ...ids.value.filter(x => x !== id)].slice(0, MAX_ORDERS)
  }

  return { ids, remember }
}
