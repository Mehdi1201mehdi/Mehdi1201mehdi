// @ts-check
/**
 * Couche de stockage IndexedDB (navigateur uniquement).
 *
 * IndexedDB est le stockage PRINCIPAL des données de l'utilisateur : plus
 * robuste et plus large que localStorage, il survit mieux aux fermetures
 * accidentelles de la page. localStorage reste utilisé en miroir de secours
 * (voir store/state.js) et pour les petits réglages.
 *
 * Ce module n'expose qu'un magasin clé→valeur simple (`kv`). La forme des
 * données stockées est décidée par state.js / migrate.js, pas ici : ainsi ce
 * fichier reste minimal, sans dépendance au domaine, et facile à faire évoluer.
 *
 * Toutes les fonctions sont défensives : si IndexedDB est indisponible ou
 * échoue, elles se rabattent proprement (résolution à null / false) pour que
 * l'application continue de tourner sur localStorage seul.
 */

const DB_NAME = "coachperso";
const DB_VERSION = 2;
const STORE_KV = "kv";
/**
 * Magasin des photos de progression. SÉPARÉ de `kv` pour une raison précise :
 * `kv` contient l'état applicatif, qui est mirroré en JSON dans localStorage.
 * Une image n'a rien à faire dans du JSON — elle serait encodée en base64
 * (+33 % de taille) et ferait exploser le quota de localStorage à la première
 * photo. Ici les images restent des Blob binaires, et seules leurs FICHES
 * (date, note) voyagent avec l'état.
 */
const STORE_PHOTOS = "photos";

/** @type {Promise<IDBDatabase|null>|null} */
let _ouverture = null;

/** IndexedDB est-il disponible dans cet environnement ? */
export function idbDisponible() {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch (e) {
    return false;
  }
}

/** Ouvre (une seule fois) la base et crée les magasins au besoin. */
export function ouvrirDB() {
  if (_ouverture) return _ouverture;
  _ouverture = new Promise((resolve) => {
    if (!idbDisponible()) { resolve(null); return; }
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      console.error("IndexedDB open", e);
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      // `contains` avant chaque création : la migration v1 → v2 doit AJOUTER
      // le magasin des photos sans toucher à `kv`, qui contient tout l'historique
      // d'entraînement de l'utilisateur.
      if (!db.objectStoreNames.contains(STORE_KV)) db.createObjectStore(STORE_KV);
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) db.createObjectStore(STORE_PHOTOS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { console.error("IndexedDB error", req.error); resolve(null); };
    req.onblocked = () => resolve(null);
  });
  return _ouverture;
}

/** Exécute une transaction sur un magasin et renvoie une promesse. */
function txSur(magasin, mode, fn) {
  return ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        if (!db) { resolve(undefined); return; }
        let t;
        try {
          t = db.transaction(magasin, mode);
        } catch (e) {
          reject(e);
          return;
        }
        const store = t.objectStore(magasin);
        const req = fn(store);
        t.oncomplete = () => resolve(req ? req.result : undefined);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

/** Transaction sur le magasin `kv` (état applicatif). */
const tx = (mode, fn) => txSur(STORE_KV, mode, fn);

/** Lit une valeur par clé. Renvoie `undefined` si absente ou indisponible. */
export function idbGet(cle) {
  return tx("readonly", (s) => s.get(cle)).catch((e) => {
    console.error("idbGet", e);
    return undefined;
  });
}

/** Écrit une valeur. Renvoie `true` en cas de succès, `false` sinon. */
export function idbSet(cle, valeur) {
  return tx("readwrite", (s) => s.put(valeur, cle))
    .then(() => true)
    .catch((e) => { console.error("idbSet", e); return false; });
}

/** Supprime une clé. */
export function idbDel(cle) {
  return tx("readwrite", (s) => s.delete(cle))
    .then(() => true)
    .catch((e) => { console.error("idbDel", e); return false; });
}

/* ---------------------------------------------------------------------------
   PHOTOS DE PROGRESSION

   Les images ne quittent JAMAIS l'appareil : aucune de ces fonctions n'ouvre de
   connexion réseau. Elles vivent dans un magasin IndexedDB à part, et l'app doit
   dire clairement à l'utilisateur qu'elles ne sont PAS incluses dans la
   sauvegarde JSON — sinon il croit ses photos à l'abri et les perd.
--------------------------------------------------------------------------- */

/** Enregistre une image. `true` en cas de succès. */
export function photoSet(id, blob) {
  return txSur(STORE_PHOTOS, "readwrite", (s) => s.put(blob, id))
    .then(() => true)
    .catch((e) => { console.error("photoSet", e); return false; });
}

/** Lit une image. `undefined` si absente. */
export function photoGet(id) {
  return txSur(STORE_PHOTOS, "readonly", (s) => s.get(id))
    .catch((e) => { console.error("photoGet", e); return undefined; });
}

/** Supprime une image. */
export function photoDel(id) {
  return txSur(STORE_PHOTOS, "readwrite", (s) => s.delete(id))
    .then(() => true)
    .catch((e) => { console.error("photoDel", e); return false; });
}

/** Toutes les clés d'images présentes — sert à repérer les orphelines. */
export function photoCles() {
  return txSur(STORE_PHOTOS, "readonly", (s) => s.getAllKeys())
    .then((r) => (Array.isArray(r) ? r : []))
    .catch((e) => { console.error("photoCles", e); return []; });
}
