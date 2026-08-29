/* ============================================================
   Гомін — service worker
   Кешує оболонку застосунку, щоб він відкривався без мережі,
   і повідомляє сторінку, коли зʼявилася нова версія.
   ============================================================ */
const VERSION = 'homin-v1.4.0';
const SHELL = VERSION + '-shell';
const RUNTIME = VERSION + '-runtime';

/* Файли, без яких застосунок не запуститься. */
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-64.png'
];

/* Бажані, але не критичні: шрифти й бібліотека WebRTC.
   Якщо мережа підведе під час встановлення — не блокуємо. */
const OPTIONAL = [
  'https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js',
  'https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=Unbounded:wght@500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await cache.addAll(CORE);
    await Promise.all(OPTIONAL.map(url =>
      cache.add(new Request(url, { mode: 'cors', credentials: 'omit' })).catch(() => {})
    ));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(n => n !== SHELL && n !== RUNTIME)
      .map(n => caches.delete(n)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (e) {}
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'VERSION') {
    event.source && event.source.postMessage({ type: 'VERSION', version: VERSION });
  }
});

/* Будь-який перехід сторінкою віддаємо з оболонки:
   так працюють і ярлики виду ./?a=find. */
async function handleNavigation(event) {
  const cache = await caches.open(SHELL);
  const cached = await cache.match('./index.html');
  const network = (async () => {
    try {
      const preload = event.preloadResponse ? await event.preloadResponse : null;
      const res = preload || await fetch('./index.html', { cache: 'no-cache' });
      if (res && res.ok) cache.put('./index.html', res.clone());
      return res;
    } catch (e) { return null; }
  })();
  if (cached) { network.catch(() => {}); return cached; }
  const res = await network;
  return res || new Response(
    '<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;padding:40px">' +
    '<h1>Гомін</h1><p>Немає зʼєднання, а збереженої копії ще немає. Відкрийте застосунок один раз онлайн.</p>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (req.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
    return;
  }

  const sameOrigin = url.origin === self.location.origin;

  event.respondWith((async () => {
    const cacheName = sameOrigin ? SHELL : RUNTIME;
    const cache = await caches.open(cacheName);
    const cached = await cache.match(req);

    const fromNetwork = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {});
      return res;
    }).catch(() => null);

    /* Кеш віддаємо одразу, оновлення тягнемо у фоні. */
    if (cached) { fromNetwork.catch(() => {}); return cached; }
    const res = await fromNetwork;
    if (res) return res;
    /* Нехай браузер побачить звичайну мережеву помилку, а не наш підроблений код. */
    return Response.error();
  })());
});
