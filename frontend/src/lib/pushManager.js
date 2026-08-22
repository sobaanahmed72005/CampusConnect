import api from './api'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    return registration
  } catch (err) {
    console.error('Service worker registration failed:', err)
    return null
  }
}

export async function subscribeUserToPush() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    throw new Error('Push notifications are not supported in this browser')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission was denied')
  }

  const registration = await registerServiceWorker()
  if (!registration) {
    throw new Error('Service worker failed to register')
  }

  const res = await api.get('/notifications/vapid-public-key')
  const publicKey = res.data.publicKey

  const convertedKey = urlBase64ToUint8Array(publicKey)
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedKey
  })

  const subJson = subscription.toJSON()
  await api.post('/notifications/push-subscribe', {
    endpoint: subJson.endpoint,
    keys: subJson.keys
  })

  return subscription
}

export async function unsubscribeUserFromPush() {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (subscription) {
    const endpoint = subscription.endpoint
    await subscription.unsubscribe()
    await api.delete('/notifications/push-unsubscribe', { data: { endpoint } }).catch(() => {})
  }
}
