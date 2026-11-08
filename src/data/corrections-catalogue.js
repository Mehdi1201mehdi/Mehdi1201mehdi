// @ts-check
/**
 * CORRECTIONS DU CATALOGUE — appliquées au chargement, sans toucher aux
 * fichiers générés (qui restent le reflet fidèle de leur source).
 *
 * 1. `CORRECTIONS` : erreurs de classement relevées par les contrôles de
 *    cohérence (src/engine/validationExo.js) puis VÉRIFIÉES UNE PAR UNE.
 *    Exemple : « Adduction debout (câble) » était rangée en quadriceps, au
 *    poids du corps.
 * 2. `materielDepuisNom` : le matériel nommé explicitement dans le nom
 *    (« à la poulie », « (machine) ») prime quand la fiche wger déclare autre
 *    chose (souvent « poids du corps » par défaut dans la source).
 * 3. Nettoyage : un muscle principal n'est pas répété en secondaire.
 *
 * Chaque fiche corrigée porte `corrige: true`, visible sur la fiche.
 */

/** @type {Record<string, {musclesPrincipaux?: string[], musclesSecondaires?: string[], equipement?: string[], nom?: string, patron?: string|null, typeExercice?: string}>} */
export const CORRECTIONS = {
  // ---- wger : muscles mal rangés
  "wger-93b9b84c-standing-adduction-cable": { musclesPrincipaux: ["adducteurs"], musclesSecondaires: [], equipement: ["poulie"], patron: "isolation_jambe", typeExercice: "isolation" },
  "wger-ca514fad-leg-curl-with-elastic": { musclesPrincipaux: ["ischios"], musclesSecondaires: ["mollets"], equipement: ["elastiques"], patron: "isolation_jambe", typeExercice: "isolation" },
  "wger-1a20b09a-dumbbell-wrist-curl-over-bench-palms-up": { musclesPrincipaux: ["avant_bras"], musclesSecondaires: [], equipement: ["halteres", "banc"] },
  "wger-a31743c4-dumbbell-wrist-curl-over-bench-palms-down": { musclesPrincipaux: ["avant_bras"], musclesSecondaires: [], equipement: ["halteres", "banc"] },
  "wger-b2c52988-barbell-wrist-curl-over-bench-palms-down": { musclesPrincipaux: ["avant_bras"], musclesSecondaires: [], equipement: ["barre", "banc"] },
  "wger-c7ac4377-barbell-wrist-curl-over-bench-palms-up": { musclesPrincipaux: ["avant_bras"], musclesSecondaires: [], equipement: ["barre", "banc"] },
  "wger-cfb6a754-barbell-wrist-curl": { musclesPrincipaux: ["avant_bras"], musclesSecondaires: [] },
  "wger-adb642ac-cable-reverse-wrist-curl-outer-forearm": { musclesPrincipaux: ["avant_bras"], musclesSecondaires: [], equipement: ["poulie"] },
  "wger-44cfa56c-close-grip-press-ups": { musclesPrincipaux: ["triceps"], musclesSecondaires: ["pectoraux", "epaules"] },
  "wger-716286dd-shoulder-width-three-point-push-up": { musclesPrincipaux: ["pectoraux"], musclesSecondaires: ["triceps", "epaules"] },
  "wger-7704e810-handstand-pushup": { musclesPrincipaux: ["epaules"], musclesSecondaires: ["triceps", "trapezes"] },
  "wger-53906cd1-seated-hip-adduction": { musclesPrincipaux: ["adducteurs"], musclesSecondaires: [], equipement: ["machine_guidee"] },
  "wger-2539f907-dumbbell-donkey-kick": { musclesPrincipaux: ["fessiers"], musclesSecondaires: ["ischios"] },
  "wger-b2b40a54-high-plank": { musclesPrincipaux: ["abdominaux"], musclesSecondaires: ["epaules", "pectoraux"] },
  "wger-75d730d0-plank-shoulder-taps": { musclesPrincipaux: ["abdominaux"], musclesSecondaires: ["epaules", "fessiers", "dorsaux"] },
  "wger-94f2dea6-plank-with-alternating-leg-lift": { musclesPrincipaux: ["abdominaux"], musclesSecondaires: ["fessiers"] },
  "wger-4f5de647-plank-jacks": { musclesPrincipaux: ["abdominaux"], musclesSecondaires: ["fessiers", "mollets", "quadriceps"] },
  "wger-d2cf769a-straddle-l-sit": { musclesPrincipaux: ["abdominaux"], musclesSecondaires: ["quadriceps", "dorsaux"] },
  "wger-752c0380-roll-overs-into-v-sits": { musclesPrincipaux: ["abdominaux"], musclesSecondaires: ["quadriceps"] },
  "wger-6f5d4373-reverse-wood-chops": { musclesPrincipaux: ["abdominaux"], musclesSecondaires: ["epaules", "fessiers", "dorsaux"], equipement: ["poulie"] },
  // ---- free-exercise-db
  "fedb-cable-hip-adduction": { musclesPrincipaux: ["adducteurs"], musclesSecondaires: [] },
  "fedb-lying-crossover": { nom: "Étirement des abducteurs allongé, jambe croisée", equipement: ["poids_du_corps"] },
  // ---- exercises-dataset : la source range ces flexions de poignet en biceps
  "edb-0397-dumbbell-seated-neutral-wrist-curl": { musclesPrincipaux: ["avant_bras"], musclesSecondaires: ["biceps"] },
  "edb-0365-dumbbell-over-bench-neutral-wrist-curl": { musclesPrincipaux: ["avant_bras"], musclesSecondaires: ["biceps"] },
  "edb-0366-dumbbell-over-bench-one-arm-neutral-wrist-curl": { musclesPrincipaux: ["avant_bras"], musclesSecondaires: ["biceps"] },
  "edb-0199-cable-pushdown-straight-arm": { nom: "Pull-down bras tendus (poulie)", patron: "tirage_vertical" },
};

/** Matériel nommé dans le nom français. @type {[RegExp, string][]} */
const MATERIEL_NOM = [
  [/barre ez/, "barre_ez"], [/\bsmith\b/, "smith"], [/\bpoulies?\b|\bcables?\b|\bcâbles?\b|vis-a-vis|vis-à-vis/, "poulie"],
  [/\(machine|\bmachine\b|hammer strength/, "machine_guidee"], [/\bhalteres?\b|\bhaltères?\b/, "halteres"],
  [/\(barre\)|a la barre\b|à la barre\b/, "barre"], [/kettlebell/, "kettlebell"], [/elastiques?|élastiques?/, "elastiques"],
  [/swiss ball/, "swiss_ball"], [/médecine-ball|medecine-ball/, "medecine_ball"],
];

/** @param {string} nom */
export function materielDepuisNom(nom) {
  const t = String(nom || "").toLowerCase();
  const out = [];
  for (const [re, q] of MATERIEL_NOM) if (re.test(t) && !out.includes(q)) out.push(q);
  return out;
}

/**
 * Applique corrections et nettoyages à une fiche (modifiée en place).
 * @param {any} e
 * @returns {boolean} vrai si la fiche a été modifiée
 */
export function corrigerFiche(e) {
  let modif = false;
  const c = CORRECTIONS[e.id];
  if (c) { Object.assign(e, structuredCloneSimple(c)); modif = true; }
  if (e.source === "wger") {
    const impl = materielDepuisNom(e.nom);
    if (impl.length && !(e.equipement || []).some((q) => impl.includes(q) || (q === "machine_leviers" && impl.includes("machine_guidee")))) {
      e.equipement = [...impl, ...(e.equipement || []).filter((q) => q === "banc")];
      modif = true;
    }
  }
  const prim = (e.musclesPrincipaux || [])[0];
  if (prim && (e.musclesSecondaires || []).includes(prim)) {
    e.musclesSecondaires = e.musclesSecondaires.filter((m) => m !== prim);
    modif = true;
  }
  if (modif) e.corrige = true;
  return modif;
}

/** @param {any} o */
function structuredCloneSimple(o) { return JSON.parse(JSON.stringify(o)); }
