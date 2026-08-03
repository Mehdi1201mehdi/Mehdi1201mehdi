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
    reposEnCours: null,       // minuteur de repos en cours { finAt, totalSec, label }
    logs: [],                 // séances réalisées
    metrics: [],              // poids / mensurations
    foodlog: {},              // "YYYY-MM-DD" -> [aliments]
    waterlog: {},             // "YYYY-MM-DD" -> millilitres bus
    reviews: [],              // bilans d'ajustement
    testsVelo: [],            // relevés du test cardio sur vélo (outils)
    mediaCache: {},           // exId -> URL de média résolue
    // Photos de progression : seules les FICHES vivent ici (date, angle, note,
    // poids, dimensions). Les images sont des Blob dans IndexedDB — du binaire
    // n'a rien à faire dans un état mirroré en JSON vers localStorage.
    photos: [],
    // Bibliothèque : un choix explicite (favoris) et une trace automatique
    // (récents). Deux listes d'identifiants — minuscules dans le stockage.
    favoris: [],
    recentsExo: [],
    reglages: {
      theme: "dark", unites: "metrique", sons: true, vibrations: true,
      // Interface progressive : en mode débutant l'écran de séance reste
      // volontairement minimal (charge, reps, validation). Le mode avancé
      // débloque RIR/RPE, types de séries et supersets, sans rien retirer.
      modeAvance: false, metrique: "rir",
      // Notification de fin de repos : le seul signal qui passe écran verrouillé.
      notifsRepos: true,
      // Seuils de rang saisis à la main, par mouvement puis par sexe :
      // { "squat-barre": { H: [1, 1.5, 2, 2.5] } }. Vide = repères publiés.
      standardsForce: {},
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
  out.reglages.standardsForce = normaliserStandardsForce(out.reglages.standardsForce);

  // Garantir le bon type des collections (robustesse face à un stockage abîmé).
  out.programmesPerso = toArray(brut.programmesPerso);
  out.exercicesPerso = toArray(brut.exercicesPerso);
  out.logs = toArray(brut.logs);
  out.metrics = toArray(brut.metrics);
  out.reviews = toArray(brut.reviews);
  out.testsVelo = toArray(brut.testsVelo);
  out.photos = toArray(brut.photos).filter((p) => p && typeof p === "object" && p.id);
  out.favoris = toArray(brut.favoris).filter((x) => typeof x === "string");
  out.recentsExo = toArray(brut.recentsExo).filter((x) => typeof x === "string");
  out.foodlog = brut.foodlog && typeof brut.foodlog === "object" ? brut.foodlog : {};
  out.waterlog = brut.waterlog && typeof brut.waterlog === "object" ? brut.waterlog : {};
  out.mediaCache = brut.mediaCache && typeof brut.mediaCache === "object" ? brut.mediaCache : {};
  // sessionEnCours : conservée telle quelle si présente (objet), sinon null.
  out.sessionEnCours = brut.sessionEnCours && typeof brut.sessionEnCours === "object" ? brut.sessionEnCours : null;
  out.seanceAuto = brut.seanceAuto && typeof brut.seanceAuto === "object" ? brut.seanceAuto : null;

  out.profil = normaliserProfil(brut.profil);
  // Le programme aussi : un `series: 4` au lieu d'un tableau faisait lever une
  // TypeError à l'écran de séance, qui n'affichait alors plus rien du tout.
  out.programme = normaliserProgramme(brut.programme);
  out.programmesPerso = out.programmesPerso.map(normaliserProgramme).filter(Boolean);
  out.seanceAuto = out.seanceAuto && Array.isArray(out.seanceAuto.exercices)
    ? { ...out.seanceAuto, exercices: out.seanceAuto.exercices
        .filter((e) => e && e.exerciceId)
        .map((e) => ({ ...e, series: normaliserSeries(e.series, e) })) }
    : out.seanceAuto;

  out.version = SCHEMA_VERSION;
  return out;
}

/**
 * Nettoie les seuils de rang saisis à la main.
 *
 * On garde uniquement les entrées de la forme `{ H: [4 nombres] }` ou
 * `{ F: [...] }` : le reste est écarté. Une entrée abîmée ne doit pas faire
 * disparaître le rang — le moteur retombe alors sur les repères publiés, sans
 * que l'utilisateur ait à comprendre pourquoi. La VALIDATION de plausibilité
 * (croissance, bornes) reste dans `engine/rang.js` : ici on ne fait que du
 * typage, pour que le stockage ne conserve jamais de forme inattendue.
 *
 * @param {any} v
 * @returns {Record<string, {H?:number[], F?:number[]}>}
 */
export function normaliserStandardsForce(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  /** @type {Record<string, {H?:number[], F?:number[]}>} */
  const out = {};
  for (const [id, entree] of Object.entries(v)) {
    if (!id || !entree || typeof entree !== "object") continue;
    /** @type {{H?:number[], F?:number[]}} */
    const garde = {};
    for (const col of ["H", "F"]) {
      const s = /** @type {any} */ (entree)[col];
      if (!Array.isArray(s) || s.length !== 4) continue;
      const nb = s.map((x) => Number(String(x).replace(",", ".")));
      if (nb.every((x) => Number.isFinite(x))) garde[col] = nb;
    }
    if (garde.H || garde.F) out[id] = garde;
  }
  return out;
}

/**
 * Normalise les SÉRIES d'un exercice de programme.
 *
 * Le schéma attend un tableau d'objets. Une forme abrégée — `series: 4` — est
 * naturelle à écrire à la main, et c'est exactement ce qu'on trouve dans un
 * programme rédigé hors de l'application ou importé d'ailleurs. Or l'écran de
 * séance appelle `series.find()` et `series.filter()` : sur un nombre, il lève
 * une TypeError et n'affiche RIEN. Un écran blanc à la place d'une séance, sans
 * message, pour une virgule de différence dans un fichier.
 *
 * On reconstruit donc les séries au lieu de planter, en reprenant les bornes de
 * répétitions et le repos si l'exercice les porte.
 *
 * @param {any} brut  valeur du champ `series`
 * @param {any} exo   l'exercice, pour y lire repsMin/repsMax/reposSec
 * @returns {any[]}
 */
export function normaliserSeries(brut, exo = {}) {
  if (Array.isArray(brut)) return brut.filter((s) => s && typeof s === "object");
  const n = Math.round(Number(brut));
  if (!(n > 0) || n > 50) return [];
  const min = Number(exo && exo.repsMin), max = Number(exo && exo.repsMax);
  const reps = Number.isFinite(min) && Number.isFinite(max) && max >= min ? [min, max] : [8, 12];
  const repos = Number(exo && exo.reposSec);
  return Array.from({ length: n }, () => ({
    type: "travail", repsCible: reps.slice(), dureeSec: null, distanceM: null,
    rirCible: 2, rpeCible: null, tempo: null,
    reposSec: repos > 0 ? repos : 90, chargeKg: null,
  }));
}

/**
 * Normalise un programme sans jamais en jeter le contenu utile.
 *
 * Un exercice sans identifiant ne peut rien afficher : il est écarté. Une séance
 * qui n'a plus aucun exercice ne peut pas être démarrée : elle est écartée
 * aussi. Tout le reste est conservé tel quel — nom, justification, champs
 * inconnus d'une version future.
 *
 * @param {any} prog
 */
export function normaliserProgramme(prog) {
  if (!prog || typeof prog !== "object") return null;
  const seances = toArray(prog.seances).map((s) => {
    if (!s || typeof s !== "object") return null;
    const exercices = toArray(s.exercices)
      .filter((e) => e && typeof e === "object" && e.exerciceId)
      .map((e) => ({ ...e, series: normaliserSeries(e.series, e) }));
    return exercices.length ? { ...s, exercices } : null;
  }).filter(Boolean);
  return { ...prog, seances };
}

/**
 * Complète les LISTES d'un profil sans jamais toucher à ce que l'utilisateur a
 * choisi. Un profil venu d'une ancienne version, d'une sauvegarde importée ou
 * d'un stockage abîmé peut ne pas porter ces clés ; l'interface les parcourt
 * pourtant sans condition (`profil.limitations.includes(...)`), et une seule
 * absence suffisait à faire échouer le premier rendu.
 *
 * @param {any} p profil brut, éventuellement null
 * @returns {any} profil complété, ou null s'il n'y en a pas
 */
export function normaliserProfil(p) {
  if (!p || typeof p !== "object") return null;
  const listes = [
    "equipements", "limitations", "musclesPrioritaires",
    "objectifsSecondaires", "exercicesAimes", "exercicesRefuses",
  ];
  const out = { ...p };
  for (const cle of listes) out[cle] = toArray(p[cle]);
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
