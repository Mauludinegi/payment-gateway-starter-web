import type { Ref } from 'vue'
import type { Order } from '~/types/api'

const FALLBACK_POLL_MS = 5000

/**
 * Live order updates over Server-Sent Events. While the stream is down (reconnecting, a proxy that buffers,
 * or a different API instance handling the webhook), the page polls instead, so a payment is never missed.
 */
export function useOrderStream(id: string, order: Ref<Order | undefined>, refresh: () => Promise<void>) {
  const live = ref(false)
  let source: EventSource | undefined
  let poll: ReturnType<typeof setInterval> | undefined

  const pending = () => order.value?.status === 'PENDING_PAYMENT'

  function startPolling() {
    poll ??= setInterval(() => {
      if (pending()) refresh()
    }, FALLBACK_POLL_MS)
  }

  function stopPolling() {
    clearInterval(poll)
    poll = undefined
  }

  function close() {
    source?.close()
    source = undefined
    live.value = false
    stopPolling()
  }

  onMounted(() => {
    if (!pending()) return
    source = new EventSource(`/api/orders/${id}/events`)
    source.addEventListener('open', () => {
      live.value = true
      stopPolling()
    })
    source.addEventListener('order', (event) => {
      order.value = JSON.parse((event as MessageEvent<string>).data) as Order
      if (!pending()) close()
    })
    // EventSource reconnects on its own; polling covers the gap.
    source.addEventListener('error', () => {
      live.value = false
      if (pending()) startPolling()
      else close()
    })
  })
  onBeforeUnmount(close)

  return { live }
}
