// Service Worker (#35): apka otwiera się offline i da się ją zainstalować.
// Cache'ujemy tylko powłokę aplikacji. Dane z /api (bariery, trasy, zgłoszenia) i kafelki mapy
// zawsze idą z sieci - nieaktualna bariera w cache byłaby gorsza niż komunikat „brak połączenia”.
const CACHE = 'kbb-shell-v1'
const SHELL = ['/', '/favicon.svg', '/manifest.webmanifest', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

async function networkFirst(request, fallback) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(fallback ?? request, response.clone())
    return response
  } catch {
    return (await cache.match(fallback ?? request)) ?? Response.error()
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    // nowa wersja apki od razu, offline - ostatnia zapamiętana
    event.respondWith(networkFirst(request, '/'))
  } else if (url.pathname.startsWith('/assets/')) {
    // pliki z hashem w nazwie (build Vite) się nie zmieniają
    event.respondWith(cacheFirst(request))
  } else {
    event.respondWith(networkFirst(request))
  }
})
