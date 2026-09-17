import { getSession } from './accountApi'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

export async function enableEpisodeNotifications() {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notification tidak didukung browser ini')
  }
  if (!API_BASE) throw new Error('API belum dikonfigurasi')
  if (!VAPID_PUBLIC_KEY) throw new Error('VAPID public key belum dikonfigurasi')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Izin notifikasi belum diberikan')

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    })
  }

  const token = getSession()?.token
  const response = await fetch(`${API_BASE}/api/push/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(subscription.toJSON())
  })

  if (!response.ok) throw new Error('Gagal menyimpan langganan notifikasi')
  return subscription
}

export async function disableEpisodeNotifications() {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  const token = getSession()?.token
  await fetch(`${API_BASE}/api/push/unsubscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ endpoint: subscription.endpoint })
  }).catch(() => undefined)

  await subscription.unsubscribe()
}
