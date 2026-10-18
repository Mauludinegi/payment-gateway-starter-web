import type { ChatMessage, ChatRoom } from '~/types/api'

let sharedEventSource: EventSource | null = null
let sharedPollTimer: ReturnType<typeof setInterval> | null = null

export function useChat() {
  const { user } = useAuth()
  const isOpen = useState<boolean>('chat-is-open', () => false)
  const room = useState<ChatRoom | null>('chat-room', () => null)
  const messages = useState<ChatMessage[]>('chat-messages', () => [])
  const loading = useState<boolean>('chat-loading', () => false)
  const sending = useState<boolean>('chat-sending', () => false)
  const connected = useState<boolean>('chat-connected', () => false)
  const fcmRegistered = useState<boolean>('chat-fcm-registered', () => false)
  const unreadCount = useState<number>('chat-unread-count', () => 0)

  const notificationPermission = useState<string>('chat-notif-perm', () => {
    if (import.meta.client && 'Notification' in window) {
      return Notification.permission
    }
    return 'default'
  })

  function playNotificationSound() {
    if (!import.meta.client) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15) // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
    }
    catch {
      // Audio autoplay may be silenced if user hasn't interacted with page
    }
  }

  function showBrowserNotification(title: string, body: string) {
    if (!import.meta.client || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    const options: NotificationOptions = {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'chat-' + Date.now(),
    }

    try {
      const n = new Notification(title, options)
      n.onclick = () => {
        window.focus()
        isOpen.value = true
      }
    }
    catch (e) {
      console.warn('Direct notification error:', e)
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          reg.showNotification(title, options)
        }
      }).catch(() => {})
    }
  }

  function updateUnreadCount() {
    if (!import.meta.client) return
    if (isOpen.value) {
      unreadCount.value = 0
      return
    }
    const lastRead = localStorage.getItem('chat_last_read_at')
    const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0
    const unread = messages.value.filter(
      m => m.senderRole === 'ADMIN' && new Date(m.createdAt).getTime() > lastReadTime,
    ).length
    unreadCount.value = unread
  }

  function appendMessage(msg: any) {
    const id = msg?.id || msg?.messageId
    if (!id) return
    const normalized: ChatMessage = {
      id,
      roomId: msg.roomId,
      senderId: msg.senderId,
      senderRole: msg.senderRole,
      senderName: msg.senderName,
      text: msg.text,
      createdAt: msg.createdAt,
    }
    const exists = messages.value.some(m => (m.id || (m as any).messageId) === id)
    if (!exists) {
      messages.value.push(normalized)
      if (room.value) {
        room.value.lastMessageText = normalized.text
        room.value.lastMessageAt = normalized.createdAt
      }
      updateUnreadCount()

      if (normalized.senderRole === 'ADMIN') {
        playNotificationSound()
        showBrowserNotification('Customer Support', normalized.text)
      }
    }
  }

  async function fetchMessages(roomId: string) {
    try {
      const history = await $fetch<ChatMessage[]>(`/api/chat/rooms/${roomId}/messages`)
      const isInitial = messages.value.length === 0
      for (const m of history) {
        const id = m?.id || (m as any)?.messageId
        if (id && !messages.value.some(existing => (existing.id || (existing as any).messageId) === id)) {
          if (isInitial) {
            messages.value.push(m)
          }
          else {
            appendMessage(m)
          }
        }
      }
      updateUnreadCount()
    }
    catch (e) {
      console.warn('Failed to fetch chat messages', e)
    }
  }

  function startPolling(roomId: string) {
    stopPolling()
    // Poll every 4s to guarantee sync even when SSE drops or mobile browser pauses
    sharedPollTimer = setInterval(() => {
      if (user.value) {
        fetchMessages(roomId)
      }
      else {
        stopPolling()
      }
    }, 4000)
  }

  function stopPolling() {
    if (sharedPollTimer) {
      clearInterval(sharedPollTimer)
      sharedPollTimer = null
    }
  }

  function connectSse(roomId: string) {
    if (!import.meta.client) return
    if (sharedEventSource) {
      sharedEventSource.close()
      sharedEventSource = null
    }

    try {
      const source = new EventSource(`/api/chat/rooms/${roomId}/events`)
      sharedEventSource = source

      source.addEventListener('open', () => {
        connected.value = true
      })

      source.addEventListener('connected', () => {
        connected.value = true
      })

      const handleIncoming = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          appendMessage(data)
        }
        catch (err) {
          console.error('Error parsing SSE chat message', err)
        }
      }

      source.addEventListener('chat', handleIncoming)
      source.addEventListener('message', handleIncoming)
      source.onmessage = handleIncoming

      source.onerror = () => {
        connected.value = false
      }
    }
    catch (e) {
      console.warn('Failed to establish EventSource connection', e)
      connected.value = false
    }
  }

  function disconnectSse() {
    if (sharedEventSource) {
      sharedEventSource.close()
      sharedEventSource = null
    }
    connected.value = false
  }

  async function initChat() {
    if (!import.meta.client || !user.value) return
    loading.value = true
    try {
      if (!room.value) {
        const activeRoom = await $fetch<ChatRoom>('/api/chat/room')
        room.value = activeRoom
      }
      if (room.value) {
        await fetchMessages(room.value.id)
        connectSse(room.value.id)
        startPolling(room.value.id)
        if ('Notification' in window && Notification.permission === 'granted') {
          setupFcm()
        }
      }
    }
    catch (e) {
      console.warn('Failed to init chat', e)
    }
    finally {
      loading.value = false
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || !room.value || sending.value) return
    sending.value = true
    try {
      const sent = await $fetch<ChatMessage>(`/api/chat/rooms/${room.value.id}/messages`, {
        method: 'POST',
        body: { text: text.trim() },
      })
      appendMessage(sent)
    }
    catch (e) {
      console.error('Failed to send message', e)
      throw e
    }
    finally {
      sending.value = false
    }
  }

  async function enableNotifications() {
    if (!import.meta.client || !('Notification' in window)) return
    try {
      const permission = await Notification.requestPermission()
      notificationPermission.value = permission
      if (permission === 'granted') {
        showBrowserNotification('Notifikasi Aktif 🎉', 'Notifikasi pesan baru akan muncul di layar Mac Anda.')
        setupFcm()
      }
    }
    catch (e) {
      console.warn('Error requesting notification permission', e)
    }
  }

  async function setupFcm() {
    if (!import.meta.client || fcmRegistered.value) return
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    if (window.isSecureContext === false) {
      console.warn('FCM Push notifications require HTTPS or localhost. Current origin is insecure HTTP.')
      return
    }

    try {
      if (Notification.permission !== 'granted') return

      const config = useRuntimeConfig().public.firebase
      if (!config?.apiKey || !config?.projectId) return

      const { initializeApp, getApps } = await import('firebase/app')
      const { getMessaging, getToken, onMessage } = await import('firebase/messaging')

      const app = getApps().length === 0 ? initializeApp(config) : getApps()[0]!
      const messaging = getMessaging(app)

      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      const tokenOptions: { serviceWorkerRegistration: ServiceWorkerRegistration, vapidKey?: string } = {
        serviceWorkerRegistration: registration,
      }
      if (config.vapidKey) {
        tokenOptions.vapidKey = config.vapidKey
      }
      const currentToken = await getToken(messaging, tokenOptions)
      if (currentToken) {
        await $fetch('/api/chat/fcm-token', {
          method: 'POST',
          body: { token: currentToken, deviceInfo: navigator.userAgent },
        })
        fcmRegistered.value = true
      }

      // Handle foreground notifications with native showNotification
      onMessage(messaging, (payload) => {
        if (payload.notification) {
          const title = payload.notification.title || 'Pesan Baru'
          const body = payload.notification.body || ''
          showBrowserNotification(title, body)
        }
      })
    }
    catch (e) {
      console.debug('FCM registration skipped or not supported:', e)
    }
  }

  function toggleChat() {
    isOpen.value = !isOpen.value
    if (isOpen.value) {
      unreadCount.value = 0
      if (import.meta.client) {
        localStorage.setItem('chat_last_read_at', new Date().toISOString())
      }
      if (user.value) {
        if (import.meta.client && 'Notification' in window && Notification.permission === 'default' && window.isSecureContext) {
          enableNotifications()
        }
        initChat()
      }
    }
  }

  return {
    isOpen,
    room,
    messages,
    loading,
    sending,
    connected,
    notificationPermission,
    fcmRegistered,
    unreadCount,
    initChat,
    toggleChat,
    sendMessage,
    setupFcm,
    enableNotifications,
    showBrowserNotification,
    disconnectSse,
    stopPolling,
  }
}
