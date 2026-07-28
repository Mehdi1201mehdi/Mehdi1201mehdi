// @ts-check
/**
 * Migration et normalisation de l'état applicatif.
 *
 * Objectif : faire évoluer le schéma de données SANS JAMAIS effacer ce que
 * l'utilisateur a déjà enregistré. Les fonctions ici sont PURES (aucun accès
 * au DOM, à localStorage ou à IndexedDB) donc entièrement testables sous Node.
 *
 * La persistance (localStorage ⇆ IndexedDB) est gérée par store/state.js ;
 * ce module se contente de transformer un objet d'état d'une version à l'autre.
 */

/** Version de schéma courante. Incrémenter à chaque évolution structurelle. */
export const SCHEMA_VERSION = 2;

/** État vierge complet (schéma courant). */
export function etatVide() {
  return {
    version: SCHEMA_VERSION,
    profil: null,
    programme: null,          // programme généré (inchangé)
    programmesPerso: [],      // routines créées à la main (illimitées) — étape 4
    exercicesPerso: [],       // exercices créés par l'utilisateur — étape 4
    sessionEnCours: null,     // séance en cours, pour la reprise après refresh — étape 4
    seanceAuto: null,         // dernière séance générée par le moteur automatique
    logs: [],                 // séances réalisées
    metrics: [],              // poids / mensurations
    foodlog: {},              // "YYYY-MM-DD" -> [aliments]
    waterlog: {},             // "YYYY-MM-DD" -> millilitres bus
    reviews: [],              // bilans d'ajustement
    testsVelo: [],            // relevés du test cardio sur vélo (outils)
    mediaCache: {},           // exId -> URL de média résolue
    reglages: {
      theme: "dark", unites: "metrique", sons: true, vibrations: true,
      // Interface progressive : en mode débutant l'écran de séance reste
      // volontairement minimal (charge, reps, validation). Le mode avancé
      // débloque RIR/RPE, types de séries et supersets, sans rien retirer.
      modeAvance: false, metrique: "rir",
    },
  };
}

/**
 * Normalise un état brut (issu de localStorage ou d'IndexedDB, quelle que soit
 * sa version) vers le schéma courant. Ne supprime aucune donnée existante :
 * complète seulement les clés manquantes et migre les anciennes formes.
 *
 * @param {any} brut  objet d'état potentiellement partiel / ancien / null
 * @returns {any}     état conforme au schéma courant
 */
export function normaliserEtat(brut) {
  const base = etatVide();
  if (!brut || typeof brut !== "object") return base;

  // Fusion superficielle : les valeurs existantes priment, les manquantes
  // reçoivent le défaut. Les réglages sont fusionnés champ par champ.
  const out = { ...base, ...brut };
  out.reglages = { ...base.reglages, ...(brut.reglages || {}) };

  // Garantir le bon type des collections (robustesse face à un stockage abîmé).
  out.programmesPerso = toArray(brut.programmesPerso);
  out.exercicesPerso = toArray(brut.exercicesPerso);
  out.logs = toArray(brut.logs);
  out.metrics = toArray(brut.metrics);
  out.reviews = toArray(brut.reviews);
  out.testsVelo = toArray(brut.testsVelo);
  out.foodlog = brut.foodlog && typeof brut.foodlog === "object" ? brut.foodlog : {};
  out.waterlog = brut.waterlog && typeof brut.waterlog === "object" ? brut.waterlog : {};
  out.mediaCache = brut.mediaCache && typeof brut.mediaCache === "object" ? brut.mediaCache : {};
  // sessionEnCours : conservée telle quelle si présente (objet), sinon null.
  out.sessionEnCours = brut.sessionEnCours && typeof brut.sessionEnCours === "object" ? brut.sessionEnCours : null;
  out.seanceAuto = brut.seanceAuto && typeof brut.seanceAuto === "object" ? brut.seanceAuto : null;

  out.version = SCHEMA_VERSION;
  return out;
}

/**
 * Choisit l'état à conserver entre deux sources (ex. IndexedDB vs localStorage).
 * Règle principale : « dernière écriture gagne » via l'horodatage `_savedAt`
 * (localStorage est écrit de façon synchrone, IndexedDB en différé ; le plus
 * récent est donc la source de vérité). À défaut d'horodatage exploitable, on
 * se rabat sur la source la plus riche (anti-perte de données).
 *
 * @param {any} a
 * @param {any} b
 * @returns {any} la source à conserver (déjà celle passée, non modifiée)
 */
export function choisirEtat(a, b) {
  const ta = a && typeof a._savedAt === "number" ? a._savedAt : null;
  const tb = b && typeof b._savedAt === "number" ? b._savedAt : null;
  if (ta !== null && tb !== null && ta !== tb) return ta > tb ? a : b;
  if (ta !== null && tb === null) return a;
  if (tb !== null && ta === null) return b;
  return choisirSourcePlusRiche(a, b);
}

/**
 * Choisit l'état le plus complet entre deux sources sans perdre de données :
 * on privilégie celui qui contient le plus d'historique enregistré (séances +
 * mesures + routines), car c'est ce que l'utilisateur risque le plus de perdre.
 *
 * @param {any} a
 * @param {any} b
 * @returns {any} la source à conserver (déjà celle passée, non modifiée)
 */
export function choisirSourcePlusRiche(a, b) {
  const poids = (e) => {
    if (!e || typeof e !== "object") return -1;
    return (Array.isArray(e.logs) ? e.logs.length : 0)
      + (Array.isArray(e.metrics) ? e.metrics.length : 0)
      + (Array.isArray(e.programmesPerso) ? e.programmesPerso.length : 0)
      + (e.profil ? 1 : 0) + (e.programme ? 1 : 0);
  };
  return poids(a) >= poids(b) ? a : b;
}

/** Force une valeur en tableau (copie défensive). */
function toArray(v) {
  return Array.isArray(v) ? v.slice() : [];
}
