/* Service worker — la coquille de l'app en cache, jamais les réponses de
   l'API ni les vidéos.

   Servir une liste de tâches périmée serait pire que ne rien servir : on
   afficherait « en cours » sur une vidéo terminée depuis dix minutes. Seuls
   les fichiers statiques passent par le cache, en réseau d'abord pour que la
   mise à jour ne demande jamais de vider quoi que ce soit à la main. */

const CACHE = "studio-video-v1";

const COQUILLE = [
  "./",
  "./index.html",
  "./app.css",
  "./manifest.webmanifest",
  "./src/app.js",
  "./src/api.js",
  "./src/dom.js",
  "./src/journal.js",
  "./src/reglages.js",
  "./src/vues/creer.js",
  "./src/vues/videos.js",
  "./src/vues/reglages.js",
  "./assets/fonts/inter-latin.woff2",
  "./assets/fonts/inter-latin-ext.woff2",
  "./assets/icones/icone.svg",
  "./assets/icones/icone-192.png",
  "./assets/icones/icone-512.png",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(COQUILLE).catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const requete = e.request;
  if (requete.method !== "GET") return;

  const url = new URL(requete.url);

  /* Tout ce qui vient du moteur reste hors cache, sans exception. */
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/tasks/") ||
    url.pathname === "/ping" ||
    requete.destination === "video"
  ) {
    return;
  }

  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(requete)
      .then((reponse) => {
        if (reponse && reponse.ok) {
          const copie = reponse.clone();
          caches.open(CACHE).then((c) => c.put(requete, copie).catch(() => {}));
        }
        return reponse;
      })
      .catch(async () => {
        const enCache = await caches.match(requete);
        if (enCache) return enCache;
        if (requete.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      })
  );
});
