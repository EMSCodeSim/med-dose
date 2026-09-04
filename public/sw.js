const CACHE = "metro-med-dose-v39-age-before-weight";
const CORE = ["/", "/offline.html", "/manifest.webmanifest", "/protocols/txa-500-63.html", "/medications/adenosine-vial.webp", "/icons/metro-med-dose-192.png", "/icons/metro-med-dose-512.png", "/icons/apple-touch-icon.png", "/icons/favicon-32.png"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate") {
    event.respondWith(networkWithTimeout(request, 3000).catch(async () => (await caches.match(request)) || (await caches.match("/")) || caches.match("/offline.html")));
    return;
  }
  if (url.origin === self.location.origin && (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/medications/") || url.pathname.startsWith("/protocols/"))) {
    event.respondWith(cacheFirst(request));
    return;
  }
  event.respondWith(networkFirst(request));
});
async function networkWithTimeout(request, milliseconds) { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), milliseconds); try { const response = await fetch(request, { signal: controller.signal, cache: "no-store" }); if (response.ok) (await caches.open(CACHE)).put(request, response.clone()); return response; } finally { clearTimeout(timer); } }
async function cacheFirst(request) { const cached = await caches.match(request); if (cached) return cached; const response = await fetch(request); if (response.ok) (await caches.open(CACHE)).put(request, response.clone()); return response; }
async function networkFirst(request) { try { const response = await fetch(request); if (response.ok || response.type === "opaque") (await caches.open(CACHE)).put(request, response.clone()); return response; } catch { return (await caches.match(request)) || Response.error(); } }
