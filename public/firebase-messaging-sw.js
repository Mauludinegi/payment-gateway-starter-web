// Firebase Messaging Service Worker for background push notifications
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const payload = event.data.json()
    const notification = payload.notification || {}
    const title = notification.title || 'Pesan Baru'
    const options = {
      body: notification.body || 'Anda menerima pesan baru.',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: payload.data || {},
    }

    event.waitUntil(self.registration.showNotification(title, options))
  } catch (e) {
    console.error('Error handling push notification', e)
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    })
  )
})
