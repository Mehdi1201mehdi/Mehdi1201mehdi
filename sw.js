/* Service worker — cache applicatif pour un usage 100 % hors ligne.
   Stratégie : "app shell" en cache-first, mise à jour en arrière-plan. */
const CACHE = "coachperso-ia-v1";
const MEDIA_CACHE = "coachperso-media-v1";
const MEDIA_HOSTS = ["exercisedb.dev", "exercisedb.p.rapidapi.com", "wger.de", "cloudfront.net", "vercel"];
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.webmanifest",
  "./assets/icons/icon.svg",
  "./src/ui/app.js",
  "./src/ui/anatomy.js",
  "./src/models.js",
  "./src/data/exercises.js",
  "./src/data/exercises-extra.js",
  "./src/data/foods.js",
  "./src/engine/nutrition.js",
  "./src/integrations/openfoodfacts.js",
  "./src/engine/index.js",
  "./src/engine/constraints.js",
  "./src/engine/generator.js",
  "./src/engine/progression.js",
  "./src/engine/replacement.js",
  "./src/engine/review.js",
  "./src/integrations/exercisedb.js",
  "./src/store/state.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== MEDIA_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const estMedia = MEDIA_HOSTS.some((hh) => url.hostname.includes(hh))
    || (req.destination === "image" && url.origin !== self.location.origin);

  // Médias de démonstration (cross-origin) : cache-first pour un usage hors ligne
  if (estMedia) {
    e.respondWith(caches.open(MEDIA_CACHE).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); c.put(req, res.clone()); return res; }
      catch (err) { return hit || Response.error(); }
    }));
    return;
  }

  // Coquille de l'app (même origine) : cache-first, mise à jour en arrière-plan
  e.respondWith(
    caches.match(req).then((hit) => {
      const fromNet = fetch(req).then((res) => {
        if (res && res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || fromNet;
    })
  );
});
