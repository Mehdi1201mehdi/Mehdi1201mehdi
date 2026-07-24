// @ts-check
/**
 * Séquences d'échauffement et d'étirement — données PURES, déterministes et
 * 100 % hors ligne. Mouvements au poids du corps / mobilité, à durée fixe.
 * `muscles` sert uniquement à illustrer la silhouette ; `view` choisit la vue
 * (avant/arrière). Aucune prétention médicale : ce sont des repères de forme.
 */

/** Mobilité générale (convient avant n'importe quelle séance). */
export const ECHAUFFEMENT_GENERAL = [
  { nom: "Montées de genoux", dureeSec: 45, consigne: "Cardio léger : monte les genoux à hauteur de hanches, reste souple.", muscles: ["quadriceps"], view: "front" },
  { nom: "Cercles de bras", dureeSec: 30, consigne: "Grands cercles lents en avant puis en arrière, épaules relâchées.", muscles: ["epaules"], view: "front" },
  { nom: "Rotations du buste", dureeSec: 30, consigne: "Bassin fixe, fais pivoter le buste de gauche à droite sans forcer.", muscles: ["abdominaux"], view: "front" },
  { nom: "Balancements de jambe", dureeSec: 40, consigne: "Appui sur une jambe, balance l'autre d'avant en arrière, puis change.", muscles: ["ischios", "fessiers"], view: "back" },
];

/** Activation bas du corps. */
export const ECHAUFFEMENT_BAS = [
  { nom: "Squats à vide", dureeSec: 40, consigne: "Descends contrôlé, buste droit, genoux dans l'axe des pieds.", muscles: ["quadriceps", "fessiers"], view: "front" },
  { nom: "Fentes alternées", dureeSec: 40, consigne: "Un pas en avant, genou arrière vers le sol, remonte. Alterne.", muscles: ["quadriceps", "fessiers"], view: "front" },
  { nom: "Ponts fessiers", dureeSec: 30, consigne: "Au sol, pousse sur les talons et serre les fessiers en haut.", muscles: ["fessiers", "ischios"], view: "back" },
  { nom: "Mollets debout", dureeSec: 30, consigne: "Monte lentement sur la pointe des pieds, marque le haut, redescends.", muscles: ["mollets"], view: "back" },
];

/** Activation haut du corps. */
export const ECHAUFFEMENT_HAUT = [
  { nom: "Pompes lentes", dureeSec: 30, consigne: "Gainage serré, descente contrôlée. Sur les genoux si besoin.", muscles: ["pectoraux", "triceps"], view: "front" },
  { nom: "Rotations d'épaules", dureeSec: 30, consigne: "Bras tendus, petits cercles, ouvre progressivement l'amplitude.", muscles: ["epaules", "trapezes"], view: "front" },
  { nom: "Tirage élastique / dos", dureeSec: 30, consigne: "Tire les coudes vers l'arrière, serre les omoplates.", muscles: ["dorsaux"], view: "back" },
  { nom: "Extensions de triceps", dureeSec: 30, consigne: "Coudes hauts, tends les bras au-dessus de la tête sans cambrer.", muscles: ["triceps"], view: "back" },
];

/** Étirements / retour au calme (après la séance). */
export const ETIREMENTS = [
  { nom: "Étirement quadriceps", dureeSec: 30, consigne: "Debout, attrape la cheville, genou vers le sol. Change de côté à mi-temps.", muscles: ["quadriceps"], view: "front" },
  { nom: "Étirement ischios", dureeSec: 30, consigne: "Jambe tendue, penche le buste vers l'avant, dos long.", muscles: ["ischios"], view: "back" },
  { nom: "Étirement fessiers", dureeSec: 30, consigne: "Allongé, ramène le genou vers la poitrine côté opposé.", muscles: ["fessiers"], view: "back" },
  { nom: "Ouverture pectoraux", dureeSec: 30, consigne: "Main sur un mur, tourne le buste à l'opposé pour ouvrir la poitrine.", muscles: ["pectoraux"], view: "front" },
  { nom: "Chat-vache", dureeSec: 30, consigne: "À quatre pattes, arrondis puis creuse le dos au rythme de la respiration.", muscles: ["dorsaux"], view: "back" },
  { nom: "Étirement épaules", dureeSec: 30, consigne: "Bras tendu devant la poitrine, ramène-le avec l'autre bras.", muscles: ["epaules"], view: "front" },
];

const MUSCLES_BAS = new Set(["quadriceps", "fessiers", "ischios", "mollets"]);
const MUSCLES_HAUT = new Set(["pectoraux", "dorsaux", "epaules", "biceps", "triceps", "trapezes"]);

/**
 * Échauffement adapté aux muscles ciblés par la séance : mobilité générale +
 * activation bas et/ou haut selon les groupes travaillés.
 * @param {string[]} groupesCibles
 */
export function echauffementPour(groupesCibles = []) {
  const set = new Set(groupesCibles);
  const bas = [...set].some((m) => MUSCLES_BAS.has(m));
  const haut = [...set].some((m) => MUSCLES_HAUT.has(m));
  let seq = [...ECHAUFFEMENT_GENERAL];
  if (bas) seq = seq.concat(ECHAUFFEMENT_BAS);
  if (haut) seq = seq.concat(ECHAUFFEMENT_HAUT);
  if (!bas && !haut) seq = seq.concat(ECHAUFFEMENT_BAS, ECHAUFFEMENT_HAUT); // séance sans cible → complet
  return seq;
}

/** Durée totale d'une séquence (secondes). */
export function dureeSequence(items) {
  return (items || []).reduce((a, x) => a + (x.dureeSec || 0), 0);
}
