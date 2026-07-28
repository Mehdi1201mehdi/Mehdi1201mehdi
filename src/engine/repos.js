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
