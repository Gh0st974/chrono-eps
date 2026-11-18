const CACHE_NAME = 'chrono-eps-v3';
const APP_SHELL = ['./', 'index.html', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(['./', 'index.html', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png']);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isNetworkFirst = request.mode === 'navigate'
    || request.destination === 'document'
    || request.destination === 'iframe'
    || /\.html?$/i.test(url.pathname)
    || /\/manifest\.json$/i.test(url.pathname)
    || /\/sw\.js$/i.test(url.pathname);

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (isNetworkFirst) {
      try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch (error) {
        if (cached) return cached;
        if (request.mode === 'navigate') {
          return (await cache.match(new URL('index.html', self.registration.scope).href))
            || (await cache.match('index.html'))
            || Response.error();
        }
        return Response.error();
      }
    }

    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      return Response.error();
    }
  })());
});
