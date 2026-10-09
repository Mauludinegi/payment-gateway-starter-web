import type { Ref } from 'vue'
import type { Order } from '~/types/api'

const FALLBACK_POLL_MS = 5000
const LIVE_POLL_MS = 15000

/**
 * Live order updates over Server-Sent Events. While the stream is down (reconnecting or a proxy that buffers),
 * the page polls instead. While it is up, the page still polls slowly: with several API instances, the webhook
 * can land on one that doesn't hold this stream. Either way a payment is never missed.
 */
export function useOrderStream(id: string, order: Ref<Order | undefined>, refresh: () => Promise<void>) {
  const live = ref(false)
  let source: EventSource | undefined
  let poll: ReturnType<typeof setInterval> | undefined
  let pollEvery: number | undefined

  const pending = () => order.value?.status === 'PENDING_PAYMENT'

  // EventSource fires 'error' on every reconnect attempt; restarting the timer each time would starve it.
  function startPolling(every = FALLBACK_POLL_MS) {
    if (poll && pollEvery === every) return
    stopPolling()
    pollEvery = every
    poll = setInterval(() => {
      if (pending()) refresh()
    }, every)
  }

  function stopPolling() {
    clearInterval(poll)
    poll = undefined
    pollEvery = undefined
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
      startPolling(LIVE_POLL_MS)
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
