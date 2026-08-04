/* Service worker — stratégie RÉSEAU D'ABORD pour l'app (toujours la dernière
   version en ligne), cache en secours hors ligne. Les médias de démonstration
   (cross-origin) restent en cache d'abord pour l'usage hors ligne. */
const CACHE = "coachperso-ia-v128";
const MEDIA_CACHE = "coachperso-media-v1";
const MEDIA_HOSTS = ["exercisedb.dev", "exercisedb.p.rapidapi.com", "wger.de", "githubusercontent.com", "cloudfront.net"];
const ASSETS = [
  "./", "./index.html", "./boot.js", "./style.css", "./manifest.webmanifest",
  "./assets/icons/icon.svg", "./assets/icons/icon-192.png", "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png", "./assets/icons/apple-touch-icon.png",
  "./assets/fonts/inter-latin.woff2", "./assets/fonts/inter-latin-ext.woff2", "./assets/fonts/anton-latin.woff2",
  "./src/ui/app.js", "./src/ui/icones.js", "./src/ui/dom.js", "./src/ui/vignettes.js", "./src/ui/graphes.js", "./src/ui/anatomy.js", "./src/ui/scanner.js", "./src/ui/notifs.js", "./src/ui/photoCapture.js", "./src/ui/son.js", "./src/ui/flip.js", "./src/ui/anatomieCanvas.js", "./src/ui/illustrations.js", "./src/ui/medailles.js", "./src/models.js",
  "./src/data/exercises.js", "./src/data/exercises-extra.js", "./src/data/foods.js", "./src/data/gifs.js", "./src/data/media-manifest.js", "./src/data/anatoly.js", "./src/data/anatomy-paths.js", "./src/data/mobilite.js", "./src/data/programmes-salle.js", "./src/data/exercises-salle.js", "./src/data/muscles-moteur.js", "./src/data/exercise-muscle-map.js",
  "./src/engine/index.js", "./src/engine/constraints.js", "./src/engine/generator.js",
  "./src/engine/progression.js", "./src/engine/replacement.js", "./src/engine/review.js",
  "./src/engine/nutrition.js", "./src/engine/calendar.js", "./src/engine/export.js", "./src/engine/liveSession.js", "./src/engine/routines.js",
  "./src/engine/records.js", "./src/engine/stats.js", "./src/engine/backup.js", "./src/engine/powerlifting.js", "./src/engine/defis.js", "./src/engine/assistant.js", "./src/engine/outils.js", "./src/engine/fatigue.js", "./src/engine/planner.js", "./src/engine/apprentissage.js", "./src/engine/bibliotheque.js", "./src/engine/repos.js", "./src/engine/force.js", "./src/engine/trophees.js", "./src/engine/rang.js", "./src/engine/photos.js", "./src/engine/bilanSeance.js", "./src/engine/muscle.js", "./src/engine/equilibre.js",
  "./src/integrations/exercisedb.js", "./src/integrations/openfoodfacts.js", "./src/integrations/coachIA.js",
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

  /* App (même origine) — DEUX stratégies, et la distinction compte.

     Tout était en « réseau d'abord », pour garantir qu'on ait toujours la
     dernière version. Mesuré : 60 modules JS re-téléchargés à CHAQUE
     lancement, soit 6,7 secondes avant que l'application soit utilisable sur un
     téléphone d'entrée de gamme en 4G. Un prix énorme pour une garantie que le
     mécanisme de mise à jour assure déjà — `boot.js` détecte une nouvelle
     version et l'app affiche « Nouvelle version disponible ».

     · LE DOCUMENT reste en réseau d'abord. C'est LA requête qui permet au
       navigateur de découvrir un `sw.js` modifié, donc de déclencher la mise à
       jour. Une seule requête au lieu de soixante.
     · LE RESTE (modules, styles, polices, icônes) passe en CACHE D'ABORD avec
       rafraîchissement en arrière-plan. Ces fichiers sont versionnés par
       `CACHE` : le cache d'une version donnée est toujours cohérent avec
       lui-même, et la version suivante arrive par l'installation du nouveau
       service worker. */
  if (url.origin === self.location.origin) {
    const estDocument = req.mode === "navigate" || req.destination === "document";

    if (estDocument) {
      e.respondWith((async () => {
        try {
          const res = await fetch(req);
          if (res && res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
          return res;
        } catch (err) {
          return (await caches.match(req)) || caches.match("./index.html");
        }
      })());
      return;
    }

    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req);
      // Rafraîchissement en arrière-plan : la réponse est déjà partie, celle-ci
      // servira au prochain lancement. Un échec réseau est sans conséquence.
      const frais = fetch(req).then((res) => {
        if (res && res.ok) c.put(req, res.clone());
        return res;
      }).catch(() => null);
      if (hit) return hit;
      const res = await frais;
      return res || caches.match("./index.html");
    })());
  }
});
