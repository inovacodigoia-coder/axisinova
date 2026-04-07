const CACHE_NAME = 'axis-patient-portal-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/resultado'])
    })
  )
  self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (!url.pathname.startsWith('/resultado')) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const isStaticAsset = /\.(js|css|png|jpg|svg|woff2)$/.test(url.pathname)
      if (isStaticAsset && cached) return cached

      return fetch(event.request)
        .then((response) => {
          if (response.ok && isStaticAsset) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() => cached || new Response('Offline', { status: 503 }))
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})
