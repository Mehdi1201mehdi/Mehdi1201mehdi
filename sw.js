/* Service worker — cache applicatif pour un usage 100 % hors ligne.
   Stratégie : "app shell" en cache-first, mise à jour en arrière-plan. */
const CACHE = "coachperso-ia-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.webmanifest",
  "./assets/icons/icon.svg",
  "./src/ui/app.js",
  "./src/models.js",
  "./src/data/exercises.js",
  "./src/data/exercises-extra.js",
  "./src/engine/index.js",
  "./src/engine/constraints.js",
  "./src/engine/generator.js",
  "./src/engine/progression.js",
  "./src/engine/replacement.js",
  "./src/integrations/exercisedb.js",
  "./src/store/state.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    caches.match(req).then((hit) => {
      const fromNet = fetch(req).then((res) => {
        if (res && res.ok && new URL(req.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || fromNet;
    })
  );
});
