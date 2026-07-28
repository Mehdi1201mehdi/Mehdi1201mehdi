// @ts-check
/**
 * FILTRAGE de la bibliothèque de programmes.
 *
 * Logique PURE : aucune dépendance au DOM ni au stockage, pour que le tri des
 * 18 programmes soit testable et que l'écran ne fasse que l'afficher.
 *
 * Quatre critères indépendants — objectif/niveau, durée d'une séance, matériel
 * requis, nombre de séances par semaine — parce que « je n'ai que des haltères
 * et 45 minutes » est la vraie question qu'on se pose devant une bibliothèque,
 * pas « quel est mon niveau ».
 */

/** Tranches de durée d'une séance. `test` reçoit `dureeMin`. */
export const DUREES = [
  { cle: "court", label: "≤ 45 min", test: (d) => d <= 45 },
  { cle: "moyen", label: "45–60 min", test: (d) => d > 45 && d <= 60 },
  { cle: "long", label: "> 60 min", test: (d) => d > 60 },
];

/** Tranches de fréquence hebdomadaire. `test` reçoit `joursParSemaine`. */
export const FREQUENCES = [
  { cle: "f2", label: "2 ×/sem", test: (j) => j <= 2 },
  { cle: "f3", label: "3 ×/sem", test: (j) => j === 3 },
  { cle: "f4", label: "4 ×/sem", test: (j) => j === 4 },
  { cle: "f5", label: "5 ×/sem et +", test: (j) => j >= 5 },
];

/**
 * Familles de matériel : l'utilisateur déclare ce dont il DISPOSE, on ne garde
 * que les programmes intégralement réalisables avec ça. Un programme passe donc
 * le filtre seulement si TOUT son matériel est dans la famille — sinon on
 * proposerait une séance impossible à finir, ce qui est pire que ne rien
 * proposer.
 */
export const MATERIELS = [
  { cle: "libre", label: "Charges libres", autorise: ["poids_du_corps", "halteres", "barre", "barre_ez", "barre_traction", "banc", "rack", "elastiques"] },
  { cle: "machines", label: "Machines & poulies", autorise: ["poids_du_corps", "machine_guidee", "machine_leviers", "poulie", "banc", "rameur", "elastiques"] },
  { cle: "salle", label: "Salle complète", autorise: null },   // null = tout accepté
];

/**
 * Matériel requis par un programme, dédupliqué.
 *
 * @param {any} pr                         programme de la bibliothèque
 * @param {(id:string)=>any} getExercise   résolveur catalogue
 * @returns {string[]}
 */
export function equipementsProgramme(pr, getExercise) {
  const out = new Set();
  for (const s of (pr && pr.seances) || []) {
    for (const x of s.exercices || []) {
      const exo = getExercise(x.ref);
      for (const q of (exo && exo.equipement) || []) out.add(q);
    }
  }
  return [...out].sort();
}

/**
 * Le programme tient-il dans la famille de matériel demandée ?
 * Un programme dont on ne peut résoudre aucun exercice est accepté : mieux vaut
 * l'afficher que le faire disparaître silencieusement de la bibliothèque.
 */
export function correspondMateriel(pr, cleMateriel, getExercise) {
  const fam = MATERIELS.find((m) => m.cle === cleMateriel);
  if (!fam || !fam.autorise) return true;
  const eq = equipementsProgramme(pr, getExercise);
  if (!eq.length) return true;
  return eq.every((q) => fam.autorise.includes(q));
}

/**
 * Applique les critères actifs. Un critère absent (null/undefined) n'est pas
 * appliqué ; les critères actifs se cumulent.
 *
 * @param {any[]} programmes
 * @param {{objectif?:string|null, niveau?:string|null, duree?:string|null,
 *          materiel?:string|null, frequence?:string|null}} criteres
 * @param {(id:string)=>any} getExercise
 * @returns {any[]}
 */
export function filtrerProgrammes(programmes, criteres = {}, getExercise = () => null) {
  const d = DUREES.find((x) => x.cle === criteres.duree);
  const f = FREQUENCES.find((x) => x.cle === criteres.frequence);
  return (programmes || []).filter((pr) => {
    if (criteres.objectif && pr.objectif !== criteres.objectif) return false;
    if (criteres.niveau && pr.niveau !== criteres.niveau) return false;
    if (d && !d.test(pr.dureeMin || 0)) return false;
    if (f && !f.test(pr.joursParSemaine || 0)) return false;
    if (criteres.materiel && !correspondMateriel(pr, criteres.materiel, getExercise)) return false;
    return true;
  });
}

/** Nombre de critères actifs — sert à afficher « 3 filtres » et le bouton d'effacement. */
export function nbCriteresActifs(criteres = {}) {
  return ["objectif", "niveau", "duree", "materiel", "frequence"].filter((k) => criteres[k]).length;
}
