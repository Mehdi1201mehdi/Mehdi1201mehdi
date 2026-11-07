// @ts-check
/**
 * Pont vers les fonctions natives d'Android, UNIQUEMENT dans l'APK (Capacitor).
 *
 * Sur le web (GitHub Pages, PWA installée), `window.Capacitor` n'existe pas :
 * toutes les fonctions répondent « non géré » et l'application garde son
 * comportement web habituel. Aucune dépendance n'est importée : Capacitor
 * expose ses plugins sur `window.Capacitor.Plugins`, injecté par l'APK.
 *
 * Deux trous de la WebView Android sont comblés :
 *  - le téléchargement de fichier (sauvegarde, CSV) n'existe pas dans une
 *    WebView → on écrit le fichier puis on ouvre le partage Android ;
 *  - l'API Notification du web n'existe pas non plus → la fin de repos est
 *    PROGRAMMÉE comme notification locale native quand l'app passe en
 *    arrière-plan, et annulée à son retour.
 */

/** @returns {any} */
function cap() {
  return typeof window !== "undefined" ? /** @type {any} */ (window).Capacitor : null;
}

/** L'application tourne-t-elle dans l'APK ? */
export function estNatif() {
  const c = cap();
  try { return !!(c && typeof c.isNativePlatform === "function" && c.isNativePlatform()); } catch { return false; }
}

/** Plugin natif par son nom, ou null. */
function plugin(nom) {
  const c = cap();
  return (estNatif() && c && c.Plugins && c.Plugins[nom]) || null;
}

/**
 * Enregistre un fichier texte puis ouvre la feuille de partage Android
 * (Drive, Gmail, Fichiers…). Renvoie false hors de l'APK.
 * @param {string} nom      nom du fichier
 * @param {string} contenu  contenu texte (JSON, CSV)
 * @param {string} [titre]  titre de la feuille de partage
 * @returns {Promise<boolean>}
 */
export async function partagerFichier(nom, contenu, titre = "Coach Perso") {
  const fs = plugin("Filesystem");
  const share = plugin("Share");
  if (!fs || !share) return false;
  const ecrit = await fs.writeFile({ path: nom, data: contenu, directory: "CACHE", encoding: "utf8" });
  await share.share({ title: titre, text: nom, files: [ecrit.uri], dialogTitle: "Enregistrer ou envoyer" });
  return true;
}

const ID_REPOS = 4201;
let PERMISSION = null;

/** Demande (une fois) l'autorisation de notifier. */
export async function autoriserNotifs() {
  const ln = plugin("LocalNotifications");
  if (!ln) return false;
  try {
    let p = await ln.checkPermissions();
    if (p.display !== "granted") p = await ln.requestPermissions();
    PERMISSION = p.display === "granted";
  } catch { PERMISSION = false; }
  return PERMISSION;
}

/** Les notifications natives sont-elles disponibles (APK) ? */
export function notifsNativesDispo() {
  return !!plugin("LocalNotifications");
}

/**
 * Programme la notification de fin de repos à l'heure exacte.
 * @param {number} finAt   horodatage (ms) de fin du repos
 * @param {string} titre
 * @param {string} corps
 */
export async function programmerFinRepos(finAt, titre, corps) {
  const ln = plugin("LocalNotifications");
  if (!ln || !(finAt > Date.now() + 1000)) return false;
  if (PERMISSION === null) await autoriserNotifs();
  if (!PERMISSION) return false;
  try {
    await ln.cancel({ notifications: [{ id: ID_REPOS }] });
    await ln.schedule({ notifications: [{
      id: ID_REPOS, title: titre, body: corps,
      schedule: { at: new Date(finAt), allowWhileIdle: true },
    }] });
    return true;
  } catch { return false; }
}

/** Annule la notification programmée et retire celle déjà affichée. */
export async function annulerFinRepos() {
  const ln = plugin("LocalNotifications");
  if (!ln) return;
  try { await ln.cancel({ notifications: [{ id: ID_REPOS }] }); } catch { /* rien à annuler */ }
  try { await ln.removeDeliveredNotifications({ notifications: [{ id: ID_REPOS, title: "", body: "" }] }); } catch { /* idem */ }
}
