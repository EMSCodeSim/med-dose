const CACHE = "metro-med-dose-v54-report-scroll";
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
self.addEventListener("message", event => {
  if (event.data?.type !== "CACHE_AND_VERIFY_OFFLINE") return;
  event.waitUntil(cacheAndVerifyOffline().then(result => event.ports[0]?.postMessage(result)).catch(error => event.ports[0]?.postMessage({ok:false,error:error instanceof Error?error.message:"Offline download failed"})));
});
async function cacheAndVerifyOffline() {
  const cache = await caches.open(CACHE);
  const home = await fetch("/", {cache:"no-store"});
  if (!home.ok) throw new Error("Could not download the application start page.");
  const html = await home.clone().text();
  const assetPaths = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)].map(match => match[1]);
  const required = [...new Set([...CORE, ...assetPaths])];
  const missing = [];
  for (const path of required) {
    try { const response = path === "/" ? home.clone() : await fetch(path, {cache:"no-store"}); if (!response.ok) throw new Error(String(response.status)); await cache.put(path, response); }
    catch { missing.push(path); }
  }
  const verification = await Promise.all(required.map(path => cache.match(path)));
  required.forEach((path,index)=>{if(!verification[index]&&!missing.includes(path))missing.push(path)});
  return missing.length ? {ok:false,missing} : {ok:true,cachedFiles:required.length,cache:CACHE};
}
async function networkWithTimeout(request, milliseconds) { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), milliseconds); try { const response = await fetch(request, { signal: controller.signal, cache: "no-store" }); if (response.ok) (await caches.open(CACHE)).put(request, response.clone()); return response; } finally { clearTimeout(timer); } }
async function cacheFirst(request) { const cached = await caches.match(request); if (cached) return cached; const response = await fetch(request); if (response.ok) (await caches.open(CACHE)).put(request, response.clone()); return response; }
async function networkFirst(request) { try { const response = await fetch(request); if (response.ok || response.type === "opaque") (await caches.open(CACHE)).put(request, response.clone()); return response; } catch { return (await caches.match(request)) || Response.error(); } }
