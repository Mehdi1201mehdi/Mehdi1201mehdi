// @ts-check
/**
 * Assistant déterministe — analyse une question en langage naturel et la classe
 * en INTENTION, sans aucune IA (pas de LLM, pas de réseau). Fonctions PURES et
 * testables ; la couche UI (app.js) branche ensuite chaque intention sur le
 * moteur existant (alternatives, nutrition, records, catalogue…).
 *
 * NB : l'app reste déterministe par défaut. Un mode « coach IA » facultatif
 * (Transformers.js) peut être activé explicitement par l'utilisateur — c'est un
 * choix assumé qui déroge à la règle « aucune IA embarquée ».
 */

const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Synonymes courants → clé de muscle canonique du catalogue. */
const MUSCLE_SYNONYMES = {
  pectoraux: ["pec", "pecs", "pectoraux", "pectoral", "poitrine", "torse"],
  dorsaux: ["dos", "dorsaux", "dorsal", "lats", "grand dorsal"],
  epaules: ["epaule", "epaules", "deltoide", "deltoides", "deltos"],
  biceps: ["biceps", "bicep"],
  triceps: ["triceps", "tricep"],
  quadriceps: ["quadriceps", "quadri", "quadris", "cuisse", "cuisses"],
  ischios: ["ischio", "ischios", "ischio-jambier", "ischio-jambiers", "arriere de cuisse"],
  fessiers: ["fessier", "fessiers", "fesse", "fesses", "glute", "glutes"],
  mollets: ["mollet", "mollets"],
  abdominaux: ["abdo", "abdos", "abdominaux", "abdominal", "ventre", "sangle", "gainage"],
  trapezes: ["trapeze", "trapezes"],
  avant_bras: ["avant-bras", "avant bras", "avants-bras"],
};

/** Détecte le muscle mentionné dans la question (ou null). Comparaison par mot
 *  entier pour éviter les faux positifs (« abdos » contient « dos »). */
export function detecterMuscle(q) {
  const n = norm(q);
  const motEntier = (s) => new RegExp("\\b" + norm(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(n);
  for (const [cle, syns] of Object.entries(MUSCLE_SYNONYMES)) {
    if (syns.some(motEntier)) return cle;
  }
  return null;
}

/**
 * Classe la question en intention.
 * @returns {{intent:string, muscle:(string|null)}}
 */
export function detecterIntention(q) {
  const n = norm(q);
  const muscle = detecterMuscle(q);
  if (/(remplac|alternativ|a la place|au lieu|substitu|autre exo)/.test(n)) return { intent: "remplacer", muscle };
  if (/(record|1rm|mon max|perso best|\bpr\b|meilleur.*(charge|perf|soulev))/.test(n)) return { intent: "records", muscle };
  if (/(eau|hydrat|boire|combien.*litre)/.test(n)) return { intent: "eau", muscle };
  if (/(calorie|kcal|prot|macro|glucide|lipide|nutrition|manger|besoin.*(cal|energ|nutri))/.test(n)) return { intent: "nutrition", muscle };
  if (/(seance|entrain).*(aujourd|du jour|ce soir|maintenant)|aujourd.*(seance|entrain|faire)|quoi.*(faire )?(aujourd|maintenant)/.test(n)) return { intent: "seance_jour", muscle };
  if (/(repos|recup|temps.*serie|combien.*(de )?repos|pause entre)/.test(n)) return { intent: "repos", muscle };
  if (/(progress|augment|surcharg|plus lourd|monter.*charge|quand.*(augment|change))/.test(n)) return { intent: "progression", muscle };
  if (muscle || /(exo|exercice|travailler|muscler|renforcer|bosser|entrainer|developper)/.test(n)) return { intent: "exos_muscle", muscle };
  if (/(bonjour|salut|coucou|hello|aide|aider|peux.?tu|que (sais|peux)|comment (ca|ca) marche|c'est quoi)/.test(n)) return { intent: "aide", muscle };
  return { intent: "inconnu", muscle };
}

/**
 * Meilleur exercice du catalogue correspondant à un texte libre, par recouvrement
 * de mots (nom + noms alternatifs). Renvoie l'exercice ou null.
 * @param {string} texte
 * @param {{id:string,nom:string,nomsAlternatifs?:string[]}[]} liste
 */
export function trouverExoParNom(texte, liste) {
  const cible = [...new Set(norm(texte).split(/[^a-z0-9]+/).filter((t) => t.length > 2))];
  if (!cible.length) return null;
  // Deux mots correspondent s'ils sont égaux ou si l'un préfixe l'autre
  // (« traction » ≈ « tractions », « developpe » ≈ « developpes »).
  const proche = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)));
  let best = null, bestScore = 0;
  for (const e of liste || []) {
    const hay = norm(e.nom + " " + (e.nomsAlternatifs || []).join(" "));
    const toks = hay.split(/[^a-z0-9]+/).filter((t) => t.length > 2);
    let score = 0;
    for (const t of cible) if (toks.some((x) => proche(x, t))) score++;
    if (score > bestScore) { bestScore = score; best = e; }
  }
  return bestScore >= 1 ? best : null;
}
