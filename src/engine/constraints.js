// @ts-check
/**
 * Moteur de contraintes : décide quels exercices sont autorisés pour un profil.
 * 100 % déterministe, aucune dépendance à l'IA.
 */
import { EXERCISES } from "../data/exercises.js";

/** Difficulté maximale tolérée par niveau (1..4). */
const DIFFICULTE_MAX = { grand_debutant: 2, debutant: 3, intermediaire: 4, avance: 4 };
/** Difficulté « idéale » visée par niveau (sert au classement). */
const DIFFICULTE_CIBLE = { grand_debutant: 1, debutant: 2, intermediaire: 3, avance: 3 };

/** Un exercice est réalisable si TOUT son équipement requis est disponible. */
export function equipementDisponible(exo, equipementsDispo) {
  const set = new Set(equipementsDispo);
  return exo.equipement.every((eq) => set.has(eq));
}

/** Une limitation déclarée contre-indique-t-elle l'exercice ? */
export function estContreIndique(exo, limitations) {
  if (!limitations || limitations.length === 0) return false;
  return exo.contreIndications.some((c) => limitations.includes(c));
}

/** L'exercice est-il compatible avec le niveau ? */
export function compatibleNiveau(exo, niveau) {
  return exo.difficulte <= (DIFFICULTE_MAX[niveau] ?? 4);
}

export { DIFFICULTE_CIBLE };

/**
 * Renvoie la liste des exercices autorisés pour un profil, avec la raison
 * d'exclusion pour ceux qui sont écartés (utile pour l'explicabilité).
 * @returns {{ autorises: any[], exclus: {id:string, raison:string}[] }}
 */
export function filtrerExercices(profil) {
  const autorises = [];
  const exclus = [];
  const refuses = new Set(profil.exercicesRefuses || []);
  for (const exo of EXERCISES) {
    if (refuses.has(exo.id)) { exclus.push({ id: exo.id, raison: "refusé" }); continue; }
    if (!equipementDisponible(exo, profil.equipements)) { exclus.push({ id: exo.id, raison: "matériel indisponible" }); continue; }
    if (estContreIndique(exo, profil.limitations)) { exclus.push({ id: exo.id, raison: "contre-indication déclarée" }); continue; }
    if (!compatibleNiveau(exo, profil.niveau)) { exclus.push({ id: exo.id, raison: "trop difficile pour le niveau" }); continue; }
    autorises.push(exo);
  }
  return { autorises, exclus };
}
