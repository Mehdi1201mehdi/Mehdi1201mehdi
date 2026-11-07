// @ts-check
/**
 * Santé Connect (Health Connect d'Android) — LECTURE SEULE, à la demande.
 *
 * Fonctionne uniquement dans l'APK, via le plugin Capacitor
 * @capgo/capacitor-health (MPL-2.0), exposé sur window.Capacitor.Plugins.Health.
 * Sur le web, tout répond « indisponible » et rien n'est tenté.
 *
 * Permissions : seules six lectures sont déclarées dans le manifeste Android
 * (poids, taille, masse grasse, distance, calories actives, séances
 * d'exercice) ; les dizaines d'autres que déclare le plugin sont retirées
 * (tools:node="remove"). Aucune écriture : le plugin ne sait pas enregistrer
 * une séance d'exercice dans Santé Connect, et écrire des calories estimées
 * polluerait les données de santé de l'utilisateur.
 *
 * Rien n'est importé sans un geste explicite : l'écran affiche ce qui a été lu,
 * l'utilisateur choisit d'ajouter (ou non) une mesure à ses mensurations.
 *
 * Les fonctions de conversion sont PURES et testées ; les appels natifs sont
 * de minces enveloppes.
 */

/** Données lues — et rien d'autre. */
export const LECTURES = Object.freeze(["weight", "height", "bodyFat", "distance", "calories", "workouts"]);

/** @returns {any} */
function plugin() {
  const c = typeof window !== "undefined" ? /** @type {any} */ (window).Capacitor : null;
  try {
    return c && typeof c.isNativePlatform === "function" && c.isNativePlatform() && c.Plugins && c.Plugins.Health ? c.Plugins.Health : null;
  } catch { return null; }
}

/** Santé Connect est-il utilisable ici (APK + appli Santé Connect présente) ? */
export async function disponibilite() {
  const h = plugin();
  if (!h) return { ok: false, raison: "web" };
  try {
    const r = await h.isAvailable();
    return r && r.available ? { ok: true, raison: null } : { ok: false, raison: (r && r.reason) || "indisponible" };
  } catch (e) {
    return { ok: false, raison: String((e && e.message) || e) };
  }
}

/** Ouvre la feuille d'autorisation de Santé Connect (lecture seule). */
export async function autoriser() {
  const h = plugin();
  if (!h) return null;
  return h.requestAuthorization({ read: [...LECTURES], write: [] });
}

/** Ouvre les réglages de Santé Connect (gérer ou retirer les autorisations). */
export async function ouvrirReglages() {
  const h = plugin();
  if (h && typeof h.openHealthConnectSettings === "function") await h.openHealthConnectSettings();
}

/**
 * Dernière valeur de chaque mesure corporelle parmi des échantillons lus.
 * Convertit vers les unités de stockage de l'app (kg, cm, %), écarte les
 * valeurs aberrantes (bornes de corps.js) plutôt que de les importer.
 * @param {{dataType:string, value:number, unit?:string, startDate:string, sourceName?:string}[]} echantillons
 * @returns {{poidsKg?:{v:number, date:string, source:string}, tailleCm?:{v:number, date:string, source:string}, masseGrassePct?:{v:number, date:string, source:string}}}
 */
export function dernieresMesures(echantillons) {
  /** @type {any} */
  const out = {};
  const cles = { weight: "poidsKg", height: "tailleCm", bodyFat: "masseGrassePct" };
  const bornes = { poidsKg: [25, 350], tailleCm: [100, 250], masseGrassePct: [2, 70] };
  for (const s of echantillons || []) {
    const cle = cles[s && s.dataType];
    if (!cle || !s.startDate) continue;
    let v = Number(s.value);
    if (!Number.isFinite(v)) continue;
    // Taille : Santé Connect la donne en cm via le plugin ; une valeur < 3 est en mètres.
    if (cle === "tailleCm" && v < 3) v *= 100;
    if (cle === "masseGrassePct" && v > 0 && v < 1) v *= 100;
    const [min, max] = bornes[cle];
    if (v < min || v > max) continue;
    const prec = out[cle];
    if (!prec || s.startDate > prec.date) out[cle] = { v: Math.round(v * 10) / 10, date: s.startDate, source: s.sourceName || "Santé Connect" };
  }
  return out;
}

/** Libellés français des types de séance de Santé Connect les plus courants. */
const TYPES_SEANCE = {
  running: "Course", walking: "Marche", cycling: "Vélo", swimming: "Natation", rowing: "Rameur",
  elliptical: "Elliptique", hiking: "Randonnée", strengthTraining: "Musculation",
  traditionalStrengthTraining: "Musculation", functionalStrengthTraining: "Renforcement",
  highIntensityIntervalTraining: "HIIT", yoga: "Yoga", other: "Autre activité",
  rowingMachine: "Rameur", runningTreadmill: "Course sur tapis", bikingStationary: "Vélo d'appartement",
  weightlifting: "Haltérophilie", swimmingPool: "Natation en bassin", stairClimbingMachine: "Simulateur d'escalier",
  calisthenics: "Poids du corps", stretching: "Étirements", crossTraining: "Cross-training",
  coreTraining: "Gainage", pilates: "Pilates", jumpRope: "Corde à sauter", mixedCardio: "Cardio",
  stairClimbing: "Escaliers", boxing: "Boxe", martialArts: "Arts martiaux", dancing: "Danse",
  swimmingOpenWater: "Natation en eau libre", flexibility: "Souplesse", bootCamp: "Bootcamp",
  exerciseClass: "Cours collectif", plank: "Planche", deadlift: "Soulevé de terre", benchPress: "Développé couché",
};

/**
 * Résumé des séances lues dans Santé Connect : liste lisible et totaux.
 * @param {{workoutType:string, duration?:number, totalEnergyBurned?:number, totalDistance?:number, startDate:string, endDate:string, sourceName?:string}[]} seances
 */
export function resumeActivites(seances) {
  const liste = (seances || [])
    .filter((w) => w && w.startDate && w.endDate)
    .map((w) => {
      const duree = Math.max(0, Math.round((Date.parse(w.endDate) - Date.parse(w.startDate)) / 1000));
      return {
        type: TYPES_SEANCE[w.workoutType] || w.workoutType || "Activité",
        date: w.startDate,
        dureeSec: duree,
        distanceM: Number(w.totalDistance) > 0 ? Math.round(Number(w.totalDistance)) : null,
        kcal: Number(w.totalEnergyBurned) > 0 ? Math.round(Number(w.totalEnergyBurned)) : null,
        source: w.sourceName || "",
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return {
    liste,
    total: {
      seances: liste.length,
      dureeSec: liste.reduce((s, x) => s + x.dureeSec, 0),
      distanceM: liste.reduce((s, x) => s + (x.distanceM || 0), 0),
      kcal: liste.reduce((s, x) => s + (x.kcal || 0), 0),
    },
  };
}

/**
 * Lit les mesures corporelles des 365 derniers jours (dans la limite de
 * l'historique autorisé : ~30 jours sans permission d'historique).
 */
export async function lireMesures() {
  const h = plugin();
  if (!h) return {};
  const debut = new Date(Date.now() - 365 * 864e5).toISOString();
  const tous = [];
  for (const dataType of ["weight", "height", "bodyFat"]) {
    try {
      const r = await h.readSamples({ dataType, startDate: debut, limit: 50, ascending: false });
      tous.push(...((r && r.samples) || []));
    } catch { /* type refusé ou absent : on lit les autres */ }
  }
  return dernieresMesures(tous);
}

/** Lit les séances d'exercice des `jours` derniers jours. */
export async function lireActivites(jours = 7) {
  const h = plugin();
  if (!h) return resumeActivites([]);
  try {
    const r = await h.queryWorkouts({ startDate: new Date(Date.now() - jours * 864e5).toISOString(), limit: 50, ascending: false });
    return resumeActivites((r && r.workouts) || []);
  } catch {
    return resumeActivites([]);
  }
}
