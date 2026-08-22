// CampusConnect Service Worker for Web Push Notifications & Offline Caching
self.addEventListener('push', (event) => {
  let payload = {
    title: 'CampusConnect Notification',
    body: 'You have a new notification on CampusConnect.',
    icon: '/logo.png',
    url: '/dashboard',
    data: {}
  }

  if (event.data) {
    try {
      const dataJson = event.data.json()
      payload = { ...payload, ...dataJson }
    } catch {
      payload.body = event.data.text()
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon,
    badge: '/logo.png',
    vibrate: [100, 50, 100],
    data: {
      url: payload.url,
      ...payload.data
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})
