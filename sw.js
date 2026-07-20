/* Service worker — stratégie RÉSEAU D'ABORD pour l'app (toujours la dernière
   version en ligne), cache en secours hors ligne. Les médias de démonstration
   (cross-origin) restent en cache d'abord pour l'usage hors ligne. */
const CACHE = "coachperso-ia-v21";
const MEDIA_CACHE = "coachperso-media-v1";
const MEDIA_HOSTS = ["exercisedb.dev", "exercisedb.p.rapidapi.com", "workoutxapp.com", "wger.de", "githubusercontent.com", "cloudfront.net", "vercel"];
const ASSETS = [
  "./", "./index.html", "./boot.js", "./style.css", "./manifest.webmanifest", "./assets/icons/icon.svg",
  "./src/ui/app.js", "./src/ui/anatomy.js", "./src/models.js",
  "./src/data/exercises.js", "./src/data/exercises-extra.js", "./src/data/foods.js", "./src/data/gifs.js", "./src/data/exdb-ids.js",
  "./src/engine/index.js", "./src/engine/constraints.js", "./src/engine/generator.js",
  "./src/engine/progression.js", "./src/engine/replacement.js", "./src/engine/review.js",
  "./src/engine/nutrition.js", "./src/engine/calendar.js", "./src/engine/export.js", "./src/engine/liveSession.js", "./src/engine/routines.js",
  "./src/engine/records.js", "./src/engine/stats.js", "./src/engine/backup.js", "./src/engine/powerlifting.js",
  "./src/integrations/exercisedb.js", "./src/integrations/openfoodfacts.js", "./src/integrations/workoutx.js",
  "./src/store/state.js", "./src/store/db.js", "./src/store/migrate.js",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== MEDIA_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Médias de démonstration (cross-origin) : cache d'abord, pour le hors ligne
  const estMedia = MEDIA_HOSTS.some((hh) => url.hostname.includes(hh))
    || (req.destination === "image" && url.origin !== self.location.origin);
  if (estMedia) {
    e.respondWith(caches.open(MEDIA_CACHE).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); c.put(req, res.clone()); return res; }
      catch (err) { return hit || Response.error(); }
    }));
    return;
  }

  // App (même origine) : RÉSEAU D'ABORD, cache en secours hors ligne
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res && res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
        return res;
      } catch (err) {
        const hit = await caches.match(req);
        return hit || caches.match("./index.html");
      }
    })());
  }
});
