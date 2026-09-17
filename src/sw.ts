/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision?: string }>
}

const CACHE_NAME = 'reeleks-shell-v2.5'
const precacheEntries = self.__WB_MANIFEST || []
const precacheUrls = precacheEntries.map(entry => entry.url)

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(precacheUrls))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.pathname.includes('.m3u8') || url.pathname.includes('.ts')) return

  if (event.request.destination === 'image') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(event.request)
        if (cached) return cached
        const response = await fetch(event.request)
        if (response.ok) cache.put(event.request, response.clone())
        return response
      })
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  )
})

self.addEventListener('push', event => {
  let payload: { title?: string; body?: string; icon?: string; url?: string; tag?: string } = {}
  try {
    payload = event.data?.json() || {}
  } catch {
    payload = { body: event.data?.text() || 'Ada episode baru di REELEKS' }
  }

  const title = payload.title || 'REELEKS · Episode Baru'
  const options: NotificationOptions = {
    body: payload.body || 'Drama favoritmu punya episode baru.',
    icon: payload.icon || './icon-192.png',
    badge: payload.icon || './icon-192.png',
    tag: payload.tag || 'reeleks-episode-update',
    data: { url: payload.url || './' }
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = new URL((event.notification.data as { url?: string })?.url || './', self.location.origin).href

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of clients) {
      if ('focus' in client) {
        await client.navigate(targetUrl).catch(() => undefined)
        return client.focus()
      }
    }
    return self.clients.openWindow(targetUrl)
  })())
})
