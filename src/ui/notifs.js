// @ts-check
/**
 * NOTIFICATIONS — le seul canal qui traverse l'écran verrouillé.
 *
 * Pendant le repos, le téléphone est posé et l'écran s'éteint. Le navigateur
 * gèle alors la page : le son et la vibration, qui exigent que la page tourne,
 * ne partent pas. Une notification système, elle, s'affiche sur l'écran de
 * verrouillage et vibre — c'est la seule chose qui prévienne vraiment.
 *
 * Quatre règles, dont trois existent pour ne PAS être une application qui
 * harcèle :
 *
 *   1. ON NE DEMANDE JAMAIS LA PERMISSION AU CHARGEMENT. Une app qui réclame les
 *      notifications avant d'avoir rien montré se fait refuser, et le refus est
 *      définitif — Chrome ne redemande plus. On attend le premier repos, où la
 *      demande a un sens évident.
 *   2. UNE SEULE NOTIFICATION À LA FOIS. Le `tag` fait remplacer la précédente
 *      au lieu d'empiler : après huit séries, on ne veut pas huit lignes.
 *   3. ELLE DISPARAÎT QUAND ON REVIENT. Une notification « repos terminé »
 *      encore affichée alors qu'on est déjà en train de pousser est du bruit.
 *   4. RIEN N'EST ENVOYÉ NULLE PART. Ce sont des notifications LOCALES : pas de
 *      serveur, pas de push, pas d'abonnement. L'app reste hors ligne.
 */

/** Identifiant unique : une notification de repos remplace la précédente. */
export const TAG_REPOS = "coachperso-repos";

/**
 * État des notifications, avec la raison quand ce n'est pas disponible — pour
 * que les réglages expliquent au lieu d'afficher un interrupteur mort.
 *
 * @param {any} [fenetre]
 * @returns {{supporte:boolean, permission:string, actif:boolean, raison:string}}
 */
export function etatNotifs(fenetre) {
  const w = fenetre || (typeof window !== "undefined" ? window : null);
  const N = w && w.Notification;
  if (!N) {
    return { supporte: false, permission: "unsupported", actif: false,
      raison: "Ce navigateur ne gère pas les notifications." };
  }
  const perm = String(N.permission || "default");
  if (perm === "granted") return { supporte: true, permission: perm, actif: true, raison: "" };
  if (perm === "denied") {
    return { supporte: true, permission: perm, actif: false,
      raison: "Notifications bloquées pour ce site. Réactive-les dans les réglages du navigateur." };
  }
  return { supporte: true, permission: perm, actif: false,
    raison: "Autorise les notifications pour être prévenu même écran verrouillé." };
}

/**
 * Demande la permission. À n'appeler QUE depuis un geste de l'utilisateur : une
 * demande spontanée est refusée d'office par le navigateur, et un refus est
 * définitif.
 *
 * @returns {Promise<boolean>}
 */
export async function demanderNotifs() {
  const e = etatNotifs();
  if (!e.supporte) return false;
  if (e.permission === "granted") return true;
  if (e.permission === "denied") return false;   // redemander ne sert à rien
  try {
    const r = await Notification.requestPermission();
    return r === "granted";
  } catch (err) { return false; }
}

/**
 * Affiche une notification locale.
 *
 * On passe par le service worker quand il est là : sur Android, une
 * notification postée par la page seule disparaît si la page est déchargée,
 * alors que celle du service worker survit — c'est exactement le cas qui nous
 * intéresse.
 *
 * @param {string} titre
 * @param {{corps?:string, tag?:string, vibrer?:boolean, silencieux?:boolean}} [opts]
 * @returns {Promise<boolean>}
 */
export async function notifier(titre, opts = {}) {
  if (!etatNotifs().actif) return false;
  const options = {
    body: opts.corps || "",
    tag: opts.tag || TAG_REPOS,
    renotify: true,          // le tag remplace, mais on veut quand même le signal
    silent: !!opts.silencieux,
    icon: "./assets/icons/icon-192.png",
    badge: "./assets/icons/icon-192.png",
    vibrate: opts.vibrer === false ? undefined : [120, 60, 120],
    requireInteraction: false,
  };
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) { await reg.showNotification(titre, options); return true; }
    }
  } catch (e) { /* repli page ci-dessous */ }
  try { new Notification(titre, options); return true; }
  catch (e) { return false; }
}

/**
 * Retire les notifications de repos encore affichées.
 *
 * Une notification « repos terminé » toujours à l'écran alors qu'on pousse
 * déjà la série suivante est du bruit — et elle rend les suivantes moins
 * crédibles.
 *
 * @param {string} [tag]
 */
export async function fermerNotifs(tag = TAG_REPOS) {
  try {
    if (!navigator.serviceWorker) return;
    const reg = await navigator.serviceWorker.ready;
    if (!reg || !reg.getNotifications) return;
    const liste = await reg.getNotifications({ tag });
    liste.forEach((n) => n.close());
  } catch (e) { /* sans conséquence */ }
}
