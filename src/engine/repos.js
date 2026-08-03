// @ts-check
/**
 * MINUTEUR DE REPOS — logique PURE, fondée sur l'horloge.
 *
 * Un décompte qui retire 1 à un compteur chaque seconde suppose que le
 * navigateur déclenche l'intervalle exactement une fois par seconde. Aucune
 * plateforme ne le garantit : Chrome limite les minuteurs d'une page cachée,
 * puis les gèle après quelques minutes, et Android peut évincer l'application
 * de la mémoire. Or le repos entre deux séries est PRÉCISÉMENT le moment où on
 * pose le téléphone et où l'écran se verrouille.
 *
 * On mémorise donc l'INSTANT DE FIN. Le temps restant est toujours recalculé à
 * partir de l'horloge : la limitation des minuteurs n'affecte plus que la
 * fluidité de l'affichage, jamais l'exactitude. Et comme un instant de fin se
 * sérialise, le repos survit à un rechargement.
 *
 * Forme : { finAt: number(ms), totalSec: number, label: string }
 */

/** Borne haute de sécurité : un repos ne dure jamais plus de 2 heures. */
export const REPOS_MAX_SEC = 7200;

/**
 * Crée un repos qui se terminera dans `sec` secondes.
 * @param {number} sec
 * @param {string} [label]
 * @param {number} [maintenant]
 */
export function creerRepos(sec, label = "", maintenant = Date.now()) {
  const s = Math.max(1, Math.min(REPOS_MAX_SEC, Math.round(Number(sec) || 0) || 60));
  return { finAt: maintenant + s * 1000, totalSec: s, label: String(label || "") };
}

/**
 * Secondes restantes, jamais négatives. Renvoie 0 pour un repos absent ou
 * échu — l'appelant n'a donc jamais à distinguer les deux cas pour l'affichage.
 * @param {any} repos
 * @param {number} [maintenant]
 */
export function restantSec(repos, maintenant = Date.now()) {
  if (!repos || !Number.isFinite(repos.finAt)) return 0;
  return Math.max(0, Math.ceil((repos.finAt - maintenant) / 1000));
}

/** Le repos est-il terminé (ou inexistant) ? */
export function estEcoule(repos, maintenant = Date.now()) {
  return restantSec(repos, maintenant) <= 0;
}

/** Part écoulée entre 0 et 1, pour l'anneau de progression. */
export function progression(repos, maintenant = Date.now()) {
  if (!repos || !(repos.totalSec > 0)) return 1;
  return Math.max(0, Math.min(1, 1 - restantSec(repos, maintenant) / repos.totalSec));
}

/**
 * Allonge (+) ou raccourcit (−) le repos. Le total suit l'allongement pour que
 * l'anneau reste cohérent, et il reste toujours au moins une seconde.
 * @param {any} repos
 * @param {number} deltaSec
 * @param {number} [maintenant]
 */
export function ajusterRepos(repos, deltaSec, maintenant = Date.now()) {
  if (!repos) return repos;
  const restant = restantSec(repos, maintenant);
  const nouveau = Math.max(1, Math.min(REPOS_MAX_SEC, restant + Math.round(Number(deltaSec) || 0)));
  return {
    finAt: maintenant + nouveau * 1000,
    totalSec: Math.max(repos.totalSec || 0, nouveau),
    label: repos.label || "",
  };
}

/**
 * Valide un repos venant du stockage. Rejette ce qui est inexploitable ou
 * aberrant (instant de fin trop lointain = horloge décalée ou données abîmées)
 * plutôt que d'afficher un décompte fantaisiste au réveil.
 * @param {any} brut
 * @param {number} [maintenant]
 * @returns {{finAt:number,totalSec:number,label:string}|null}
 */
export function restaurerRepos(brut, maintenant = Date.now()) {
  if (!brut || typeof brut !== "object") return null;
  const finAt = Number(brut.finAt);
  if (!Number.isFinite(finAt)) return null;
  if (finAt <= maintenant) return null;                       // déjà échu
  if (finAt - maintenant > REPOS_MAX_SEC * 1000) return null;  // aberrant
  const totalSec = Number(brut.totalSec);
  return {
    finAt,
    totalSec: Number.isFinite(totalSec) && totalSec > 0 ? Math.min(REPOS_MAX_SEC, totalSec) : Math.ceil((finAt - maintenant) / 1000),
    label: typeof brut.label === "string" ? brut.label : "",
  };
}

/** Libellé mm:ss du temps restant. */
export function formatRestant(repos, maintenant = Date.now()) {
  const r = restantSec(repos, maintenant);
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}`;
}

/**
 * Depuis combien de temps le repos est-il terminé ?
 *
 * Ce n'est pas un détail d'affichage. Pendant le repos, le téléphone est posé
 * et l'écran se verrouille : le navigateur gèle alors la page, et le signal de
 * fin n'arrive qu'au déverrouillage. Annoncer « repos terminé » à ce
 * moment-là laisse croire qu'il vient de s'écouler, alors qu'il peut dater de
 * trois minutes. Entre une série reprise à l'heure et une série reprise trois
 * minutes trop tard, ce n'est plus le même entraînement.
 *
 * @param {any} repos
 * @param {number} [maintenant]
 * @returns {number} secondes écoulées DEPUIS la fin, 0 si le repos court encore
 */
export function retardSec(repos, maintenant = Date.now()) {
  if (!repos || !Number.isFinite(repos.finAt)) return 0;
  return Math.max(0, Math.floor((maintenant - repos.finAt) / 1000));
}

/**
 * Au-delà de ce retard, l'app dit DEPUIS QUAND le repos est fini au lieu de
 * l'annoncer au présent. En dessous, la précision n'apporte rien : deux
 * secondes de décalage ne changent aucune série.
 */
export const RETARD_SIGNIFICATIF_SEC = 5;

/**
 * Durée lisible pour un retard : « 8 s », « 1 min 20 », « 12 min ».
 *
 * On ne montre les secondes que sous 10 minutes. Au-delà, l'utilisateur a
 * clairement fait autre chose et la précision devient du bruit.
 *
 * @param {number} sec
 */
export function formatRetard(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  if (s < 60) return `${s} s`;
  const min = Math.floor(s / 60), reste = s % 60;
  if (min >= 10 || reste === 0) return `${min} min`;
  return `${min} min ${String(reste).padStart(2, "0")}`;
}

/**
 * Faut-il reprendre ce repos au démarrage de l'application ?
 *
 * Un minuteur de repos n'a de sens QUE pendant une séance. Sans cette
 * condition, un repos resté en stockage — séance abandonnée, onglet fermé
 * pendant la pause, terminaison de séance qui n'a pas nettoyé — fait apparaître
 * une capsule de décompte sur une application au repos. L'utilisateur ouvre son
 * app un mardi matin et voit un minuteur tourner : il ne peut qu'en conclure
 * que quelque chose est cassé.
 *
 * @param {any} repos             `reposEnCours` tel que stocké
 * @param {boolean} seanceActive  une séance est-elle réellement en cours ?
 * @param {number} [maintenant]
 * @returns {"reprendre"|"purger"|"rien"}
 */
export function decisionReprise(repos, seanceActive, maintenant = Date.now()) {
  if (!repos || !Number.isFinite(repos.finAt)) return "rien";
  if (!seanceActive) return "purger";          // orphelin : on nettoie en silence
  return estEcoule(repos, maintenant) ? "purger" : "reprendre";
}
