// @ts-check
/**
 * Remplacement intelligent d'exercice fondé sur des contraintes.
 * Conserve autant que possible : muscle principal, patron de mouvement, rôle,
 * difficulté, plage de reps, objectif. Exclut : matériel indisponible,
 * exercice refusé, contre-indication, doublon déjà présent, incompatibilité niveau.
 */
import { CATALOGUE, getExercise } from "../data/exercises.js";
import { equipementDisponible, estContreIndique, compatibleNiveau } from "./constraints.js";

function partageMuscle(a, b) {
  return a.musclesPrincipaux.some((m) => b.musclesPrincipaux.includes(m));
}

/** Fiche rédigée (consignes, contre-indications renseignées) plutôt qu'import brut. */
const estRedigee = (e) => !e.source;

/**
 * Exercices candidats. Tout le catalogue chargé (maison + extensions), SAUF
 * quand le profil déclare une limitation : les fiches importées n'ont pas de
 * contre-indications renseignées, on ne les propose donc pas à quelqu'un qui
 * a une épaule ou un genou sensible — l'absence d'information n'est pas une
 * garantie d'innocuité.
 */
function candidats(profil) {
  const prudence = (profil.limitations || []).length > 0;
  return CATALOGUE.filter((e) => !prudence || estRedigee(e));
}

/** Familles d'exercices qu'on ne mélange pas : un développé n'est pas remplacé par un cardio. */
const famille = (e) => (e.typeExercice === "cardio" ? "cardio" : e.typeExercice === "mobilite" ? "mobilite" : "muscu");

/**
 * Score d'équivalence pondéré : muscles principaux communs (le plus lourd),
 * muscles secondaires, patron biomécanique, type, difficulté, plage de reps,
 * latéralité, et un léger avantage aux fiches rédigées (consignes, sécurité).
 */
export function scoreEquivalence(origine, cand) {
  let s = 0;
  const communs = origine.musclesPrincipaux.filter((m) => cand.musclesPrincipaux.includes(m)).length;
  s += communs * 5;
  const secO = origine.musclesSecondaires || [], secC = cand.musclesSecondaires || [];
  s += secO.filter((m) => secC.includes(m) || cand.musclesPrincipaux.includes(m)).length * 0.75;
  if (cand.patron && cand.patron === origine.patron) s += 4;
  if (cand.typeExercice === origine.typeExercice) s += 2;
  s -= Math.abs((cand.difficulte || 2) - (origine.difficulte || 2));
  // plages de reps proches
  s -= Math.abs(((cand.repsPertinent || [8])[0]) - ((origine.repsPertinent || [8])[0])) * 0.2;
  if (!!cand.unilateral === !!origine.unilateral) s += 0.5;
  if (estRedigee(cand)) s += 1.5;
  return s;
}

/**
 * Renvoie jusqu'à 3 alternatives classées et étiquetées pour un exercice donné.
 * @param {string} exerciceId
 * @param {import("../models.js").Profil} profil
 * @param {string[]} [dejaDansSeance] ids d'exercices déjà présents dans la séance
 * @returns {{ etiquette:string, exercice:any, explication:string }[]}
 */
export function alternatives(exerciceId, profil, dejaDansSeance = []) {
  const origine = getExercise(exerciceId);
  if (!origine) return [];
  const refuses = new Set(profil.exercicesRefuses || []);
  const presents = new Set(dejaDansSeance);
  const patronsPresents = new Set(dejaDansSeance.map((id) => getExercise(id)?.patron).filter(Boolean));

  const eligibles = candidats(profil).filter((e) => e.id !== exerciceId)
    .filter((e) => famille(e) === famille(origine))
    .filter((e) => partageMuscle(origine, e))
    .filter((e) => !refuses.has(e.id))
    .filter((e) => !presents.has(e.id))
    .filter((e) => equipementDisponible(e, profil.equipements))
    .filter((e) => !estContreIndique(e, profil.limitations))
    .filter((e) => compatibleNiveau(e, profil.niveau))
    // évite de renforcer un patron déjà trop présent
    .filter((e) => e.patron === "gainage" || e.patron === "cardio" || !patronsPresents.has(e.patron) || e.patron === origine.patron)
    .map((e) => ({ e, score: scoreEquivalence(origine, e) }))
    .sort((a, b) => (b.score - a.score) || (a.e.id < b.e.id ? -1 : 1));

  if (eligibles.length === 0) return [];

  const res = [];
  const utilises = new Set();

  // 1) Meilleur équivalent
  const meilleur = eligibles[0];
  res.push({ etiquette: "Meilleur équivalent", exercice: meilleur.e, explication: explique(origine, meilleur.e) });
  utilises.add(meilleur.e.id);

  // 2) Option plus facile (difficulté strictement inférieure la mieux classée)
  const facile = eligibles.find((x) => !utilises.has(x.e.id) && x.e.difficulte < origine.difficulte)
    || eligibles.find((x) => !utilises.has(x.e.id) && x.e.difficulte <= origine.difficulte);
  if (facile) { res.push({ etiquette: "Option plus facile", exercice: facile.e, explication: explique(origine, facile.e) }); utilises.add(facile.e.id); }

  // 3) Autre équipement (matériel différent de l'origine)
  const autreEquip = eligibles.find((x) => !utilises.has(x.e.id) && x.e.equipement.join() !== origine.equipement.join());
  if (autreEquip) { res.push({ etiquette: "Autre équipement", exercice: autreEquip.e, explication: explique(origine, autreEquip.e) }); utilises.add(autreEquip.e.id); }

  // complète jusqu'à 3 si nécessaire
  for (const x of eligibles) {
    if (res.length >= 3) break;
    if (!utilises.has(x.e.id)) { res.push({ etiquette: "Alternative", exercice: x.e, explication: explique(origine, x.e) }); utilises.add(x.e.id); }
  }
  return res.slice(0, 3);
}

function explique(origine, cand) {
  const communs = origine.musclesPrincipaux.filter((m) => cand.musclesPrincipaux.includes(m));
  const bits = [];
  if (communs.length) bits.push(`cible le(s) même(s) muscle(s)`);
  if (cand.patron === origine.patron) bits.push("même type de mouvement");
  if (cand.difficulte < origine.difficulte) bits.push("plus accessible");
  else if (cand.difficulte > origine.difficulte) bits.push("plus exigeant");
  if (cand.equipement.join() !== origine.equipement.join()) bits.push("matériel différent");
  return bits.length ? `Conserve l'essentiel : ${bits.join(", ")}.` : "Alternative compatible avec ton profil.";
}

/**
 * Variantes d'un exercice dans le catalogue chargé : même patron de mouvement
 * et même muscle principal, classées par proximité. Sert la fiche exercice
 * (« plus facile », « plus difficile », « à un bras / une jambe », « à deux
 * bras ») — sans filtre de matériel : c'est un répertoire, pas un remplacement.
 * @param {string} exerciceId
 * @param {number} [n]  nombre par catégorie
 * @returns {{plusFacile:any[], plusDifficile:any[], unilaterale:any[], bilaterale:any[]}}
 */
export function variantes(exerciceId, n = 3) {
  const o = getExercise(exerciceId);
  const vide = { plusFacile: [], plusDifficile: [], unilaterale: [], bilaterale: [] };
  if (!o || !o.patron) return vide;
  const proches = CATALOGUE
    .filter((e) => e.id !== o.id && e.patron === o.patron && famille(e) === famille(o)
      && e.musclesPrincipaux[0] === o.musclesPrincipaux[0]
      // Cardio : une « variante » garde le même appareil (des burpees ne sont pas un rameur plus dur).
      && (famille(o) !== "cardio" || (e.equipement || []).some((q) => (o.equipement || []).includes(q) && q !== "poids_du_corps")))
    .map((e) => ({ e, s: scoreEquivalence(o, e) }))
    .sort((a, b) => (b.s - a.s) || (a.e.id < b.e.id ? -1 : 1))
    .map((x) => x.e);
  const d = o.difficulte || 2;
  return {
    plusFacile: proches.filter((e) => (e.difficulte || 2) < d).slice(0, n),
    plusDifficile: proches.filter((e) => (e.difficulte || 2) > d).slice(0, n),
    unilaterale: o.unilateral ? [] : proches.filter((e) => e.unilateral).slice(0, n),
    bilaterale: o.unilateral ? proches.filter((e) => !e.unilateral).slice(0, n) : [],
  };
}
