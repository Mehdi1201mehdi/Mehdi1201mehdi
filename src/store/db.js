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
const DB_VERSION = 1;
const STORE_KV = "kv";

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
      if (!db.objectStoreNames.contains(STORE_KV)) db.createObjectStore(STORE_KV);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { console.error("IndexedDB error", req.error); resolve(null); };
    req.onblocked = () => resolve(null);
  });
  return _ouverture;
}

/** Exécute une transaction sur le magasin `kv` et renvoie une promesse. */
function tx(mode, fn) {
  return ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        if (!db) { resolve(undefined); return; }
        let t;
        try {
          t = db.transaction(STORE_KV, mode);
        } catch (e) {
          reject(e);
          return;
        }
        const store = t.objectStore(STORE_KV);
        const req = fn(store);
        t.oncomplete = () => resolve(req ? req.result : undefined);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

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
