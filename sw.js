// Opens instantly: the app comes from the phone's cache first, and a fresh
// copy is fetched quietly in the background for the next launch.
const CACHE = "hedge-bot-v1";
const SHELL = ["/", "/index.html", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only this site's own files. Never touch Deriv's API or WebSockets.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const update = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached || cache.match("/"));
      event.waitUntil(update.catch(() => {}));
      return cached || update;
    })
  );
});
