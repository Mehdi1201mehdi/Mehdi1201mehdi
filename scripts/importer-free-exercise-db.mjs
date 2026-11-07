#!/usr/bin/env node
// @ts-check
/**
 * Import des MÉTADONNÉES de free-exercise-db (https://github.com/yuhonas/free-exercise-db,
 * Unlicense / domaine public) vers src/data/exercises-fedb.js.
 *
 * Ce qui est importé : des FAITS — nom anglais, muscles principaux et
 * secondaires, matériel, niveau, mécanique, catégorie. Ce qui ne l'est PAS :
 * les textes d'instructions et les images. Le jeu de données dérive de
 * wrkout/exercises.json, dont la provenance de ces textes et photos n'est pas
 * documentée ; on ne les redistribue pas tant qu'elle ne l'est pas. Les fiches
 * importées s'affichent donc sans consignes (l'app le dit), avec le schéma
 * anatomique des muscles.
 *
 * Nom français : construit par règles (mouvement + qualificatifs + matériel).
 * Quand un mot du nom anglais n'est pas reconnu, on GARDE le nom anglais
 * plutôt que d'inventer une traduction approximative. Le nom anglais reste
 * toujours dans `nomsAlternatifs` (recherche bilingue).
 *
 * Doublons : un exercice déjà présent dans le catalogue (même nom anglais
 * normalisé, même nom français, ou correspondance déclarée ci-dessous) n'est
 * pas importé une seconde fois.
 *
 * Usage : node scripts/importer-free-exercise-db.mjs <chemin/exercises.json>
 * (outil de développement : l'application, elle, reste sans étape de build).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2];
if (!source) { console.error("Usage : node scripts/importer-free-exercise-db.mjs <exercises.json>"); process.exit(1); }
const brut = JSON.parse(fs.readFileSync(source, "utf8"));

// CATALOGUE (avant chargement des extensions) = exercices maison + salle.
const { CATALOGUE, EXERCISES_BY_ID } = await import(path.join(RACINE, "src/data/exercises.js"));
const { EXTRA_EXERCISES } = await import(path.join(RACINE, "src/data/exercises-extra.js"));
const EXISTANTS = [...CATALOGUE, ...EXTRA_EXERCISES];

/* ---------- correspondances de champs ---------- */
const MUSCLES = {
  abdominals: "abdominaux", hamstrings: "ischios", adductors: "adducteurs", quadriceps: "quadriceps",
  biceps: "biceps", shoulders: "epaules", chest: "pectoraux", "middle back": "dorsaux", calves: "mollets",
  glutes: "fessiers", "lower back": "lombaires", lats: "dorsaux", triceps: "triceps", traps: "trapezes",
  forearms: "avant_bras", abductors: "abducteurs",
  // « neck » : aucun muscle équivalent dans l'app → exercice non importé (pas d'approximation).
};
const MATERIEL = {
  barbell: ["barre"], dumbbell: ["halteres"], cable: ["poulie"], machine: ["machine_guidee"],
  kettlebells: ["kettlebell"], bands: ["elastiques"], "medicine ball": ["medecine_ball"],
  "exercise ball": ["swiss_ball"], "foam roll": ["rouleau"], "e-z curl bar": ["barre_ez"],
  "body only": ["poids_du_corps"], other: ["autre"],
};
const MATERIEL_TXT = {
  barbell: "barre", dumbbell: "haltères", cable: "poulie", machine: "machine", kettlebells: "kettlebell",
  bands: "élastique", "medicine ball": "médecine-ball", "exercise ball": "swiss ball", "foam roll": "rouleau",
  "e-z curl bar": "barre EZ",
};
const NIVEAU = { beginner: 2, intermediate: 3, expert: 4 };

/* ---------- nom français par règles ---------- */
// Mouvements (le plus long d'abord) : motif anglais → [nom français, genre].
// Genre : m, f, mp (masculin pluriel), fp — sert à accorder les qualificatifs.
const MOUVEMENTS = [
  ["close grip bench press", "Développé couché prise serrée"], ["bench press", "Développé couché"],
  ["military press", "Développé militaire"], ["shoulder press", "Développé épaules"], ["overhead press", "Développé au-dessus de la tête"],
  ["arnold press", "Développé Arnold"], ["push press", "Push press"], ["calf press", "Extension des mollets à la presse", "f"],
  ["leg press", "Presse à cuisses", "f"], ["chest press", "Développé pectoraux"], ["floor press", "Développé au sol"],
  ["jm press", "JM press"], ["press", "Développé"],
  ["romanian deadlift", "Soulevé de terre roumain"], ["stiff legged deadlift", "Soulevé de terre jambes tendues"],
  ["sumo deadlift", "Soulevé de terre sumo"], ["rack pull", "Rack pull (soulevé partiel)"], ["deadlift", "Soulevé de terre"],
  ["good morning", "Good morning"], ["hip thrust", "Hip thrust"], ["glute bridge", "Pont fessier"], ["butt lift", "Pont fessier"],
  ["glute ham raise", "Glute-ham raise"], ["pull through", "Pull-through"], ["side bridge", "Planche latérale", "f"],
  ["hip raise", "Relevé de bassin"], ["hip lift", "Relevé de bassin"], ["bridge", "Pont"],
  ["front squat", "Squat avant"], ["hack squat", "Hack squat"], ["goblet squat", "Squat goblet"], ["split squat", "Squat fendu"],
  ["pistol squat", "Squat pistol"], ["box squat", "Squat sur box"], ["sumo squat", "Squat sumo"], ["jump squat", "Squat sauté"],
  ["squat", "Squat"], ["lunge", "Fente", "f"], ["step up", "Montée sur banc", "f"],
  ["muscle up", "Muscle-up"], ["pull up", "Traction", "f"], ["pullup", "Traction", "f"], ["chin up", "Traction en supination", "f"],
  ["chin", "Traction en supination", "f"], ["pulldown", "Tirage vertical"], ["upright row", "Tirage menton"], ["high pull", "Tirage haut"],
  ["face pull", "Face pull"], ["inverted row", "Rowing inversé"], ["bench pull", "Tirage à plat ventre (bench pull)"], ["row", "Rowing"],
  ["shrug", "Haussement d'épaules"], ["pullover", "Pull-over"],
  ["push up", "Pompes", "fp"], ["pushup", "Pompes", "fp"],
  ["hammer curl", "Curl marteau"], ["preacher curl", "Curl pupitre"], ["concentration curl", "Curl concentré"],
  ["leg curl", "Leg curl"], ["wrist curl", "Curl des poignets"], ["zottman curl", "Curl Zottman"], ["drag curl", "Drag curl"],
  ["spider curl", "Spider curl"], ["curl", "Curl"],
  ["triceps extension", "Extension des triceps", "f"], ["tricep extension", "Extension des triceps", "f"],
  ["overhead extension", "Extension des triceps au-dessus de la tête", "f"],
  ["skull crusher", "Barre au front", "f"], ["skullcrusher", "Barre au front", "f"],
  ["pushdown", "Extension des triceps à la poulie", "f"], ["kickback", "Kickback"], ["dip", "Dips", "mp"],
  ["rear lateral raise", "Oiseau"], ["side lateral raise", "Élévation latérale", "f"], ["lateral raise", "Élévation latérale", "f"],
  ["front raise", "Élévation frontale", "f"], ["rear delt raise", "Oiseau"], ["deltoid raise", "Élévation des deltoïdes", "f"], ["delt raise", "Élévation des deltoïdes", "f"],
  ["reverse flye", "Oiseau"], ["reverse fly", "Oiseau"], ["calf raise", "Extension des mollets", "f"],
  ["leg raise", "Relevé de jambes"], ["knee raise", "Relevé de genoux"], ["leg lift", "Relevé de jambes"], ["leg extension", "Leg extension"],
  ["leg pull in", "Rapprochement des genoux"], ["shoulder raise", "Élévation des épaules", "f"], ["raise", "Élévation", "f"],
  ["crossover", "Crossover à la poulie"], ["flye", "Écarté"], ["fly", "Écarté"],
  ["crunch", "Crunch"], ["sit up", "Sit-up"], ["plank", "Planche", "f"], ["russian twist", "Rotation russe", "f"],
  ["rollout", "Roulette abdominale", "f"], ["side bend", "Flexion latérale du buste", "f"], ["wood chop", "Bûcheron (wood chop)"],
  ["mountain climber", "Mountain climbers (grimpeur)"], ["external rotation", "Rotation externe de l'épaule", "f"],
  ["internal rotation", "Rotation interne de l'épaule", "f"], ["torso rotation", "Rotation du buste", "f"], ["twist", "Rotation du buste", "f"],
  ["hyperextension", "Extension lombaire", "f"], ["back extension", "Extension lombaire", "f"],
  ["hip adduction", "Adduction de hanche", "f"], ["thigh adductor", "Adduction de hanche", "f"], ["thigh abductor", "Abduction de hanche", "f"],
  ["hip extension", "Extension de hanche", "f"], ["hip flexion", "Flexion de hanche", "f"],
  ["clean and jerk", "Épaulé-jeté"], ["power clean", "Épaulé en puissance"], ["hang clean", "Épaulé suspendu"], ["clean", "Épaulé"],
  ["power snatch", "Arraché en puissance"], ["hang snatch", "Arraché suspendu"], ["snatch", "Arraché"], ["jerk", "Jeté"],
  ["thruster", "Thruster"], ["swing", "Swing"], ["turkish get up", "Turkish get-up"], ["windmill", "Moulin (windmill)"],
  ["farmer's walk", "Marche du fermier", "f"], ["atlas stone", "Pierre d'Atlas", "f"], ["tire flip", "Retournement de pneu"],
  ["sled push", "Poussée de traîneau", "f"], ["sled drag", "Traction de traîneau", "f"], ["battling rope", "Battle ropes", "fp"],
  ["rope climb", "Grimper à la corde"], ["rope jumping", "Corde à sauter", "f"], ["wrist roller", "Rouleau à poignets"],
  ["plate pinch", "Pince à disques", "f"], ["chest pass", "Passe poitrine", "f"], ["slam", "Slam"], ["throw", "Lancer"],
  ["box jump", "Saut sur box"], ["depth jump", "Saut en contrebas"], ["jump", "Saut"], ["hop", "Sauts", "mp"], ["bound", "Bonds", "mp"],
  ["sprint", "Sprint"], ["jogging", "Footing"], ["running", "Course", "f"], ["walking", "Marche", "f"], ["recumbent bike", "Vélo couché"],
  ["bicycling", "Vélo"], ["air bike", "Vélo à air (air bike)"], ["stairmaster", "Simulateur d'escalier"], ["step mill", "Simulateur d'escalier"],
  ["skating", "Patinage"],
  ["stretch", "Étirement"],
];
// Qualificatifs : [motif anglais, masculin, féminin (null = invariable), accorde ?]. Les positions
// (assis, debout, allongé, à genoux) désignent la PERSONNE : elles restent au masculin, comme en salle.
const QUALIFS = [
  ["behind the neck", "derrière la nuque"], ["behind the back", "derrière le dos"], ["one arm", "unilatéral", "unilatérale", true],
  ["single arm", "unilatéral", "unilatérale", true], ["one leg", "sur une jambe"], ["single leg", "sur une jambe"],
  ["close grip", "prise serrée"], ["wide grip", "prise large"], ["reverse grip", "prise inversée"], ["medium grip", "prise moyenne"],
  ["mixed grip", "prise mixte"], ["neutral grip", "prise neutre"], ["palms facing in", "prise neutre"], ["palm in", "prise neutre"],
  ["palm down", "prise pronation"], ["palm up", "prise supination"], ["pronated", "prise pronation"], ["supinated", "prise supination"],
  ["bent over", "buste penché"], ["bent knee", "genoux fléchis"], ["stiff legged", "jambes tendues"], ["stiff leg", "jambes tendues"],
  ["feet elevated", "pieds surélevés"], ["elevated", "surélevé", "surélevée", true], ["wide stance", "écart large"],
  ["narrow stance", "écart serré"], ["close stance", "écart serré"], ["full range", "amplitude complète"],
  ["alternating", "alterné", "alternée", true], ["alternate", "alterné", "alternée", true],
  ["incline", "incliné", "inclinée", true], ["decline", "décliné", "déclinée", true], ["seated", "assis"], ["standing", "debout"],
  ["lying", "allongé"], ["kneeling", "à genoux"], ["supine", "sur le dos"], ["prone", "sur le ventre"],
  ["reverse", "inversé", "inversée", true], ["overhead", "au-dessus de la tête"], ["front", "avant"], ["rear", "arrière"],
  ["side", "latéral", "latérale", true], ["weighted", "lesté", "lestée", true], ["isometric", "isométrique"], ["deficit", "en déficit"],
  ["wide", "large"], ["narrow", "serré", "serrée", true], ["flat", "à plat"], ["hanging", "suspendu", "suspendue", true],
  ["straight arm", "bras tendus"], ["straight leg", "jambes tendues"], ["single", "unilatéral", "unilatérale", true],
  ["double", "à deux charges"], ["sumo", "sumo"], ["split", "fendu", "fendue", true], ["speed", "de vitesse"],
  ["dynamic", "dynamique"], ["assisted", "assisté", "assistée", true], ["tuck", "groupé", "groupée", true],
  ["treadmill", "sur tapis"], ["stationary", "d'appartement"], ["oblique", "obliques"], ["on floor", "au sol"], ["floor", "au sol"],
  ["on bench", "sur banc"], ["from bench", "sur banc"], ["to bench", "sur banc"], ["bench", "sur banc"], ["lateral", "latéral", "latérale", true],
];
// Mots ignorés : liaisons, matériel (rendu par la parenthèse) et muscle déjà nommé par le mouvement.
const VIDES = new Set(["with", "the", "a", "an", "on", "to", "and", "of", "for", "in", "from", "barbell", "dumbbell", "dumbbells", "cable",
  "machine", "kettlebell", "kettlebells", "band", "bands", "bar", "ez", "e", "z", "exercise", "smith", "lever", "leverage", "db",
  "medicine", "ball", "s", "using", "your", "attachment", "rope", "handle", "grip", "arm", "arms", "two", "both", "palm",
  "triceps", "tricep", "biceps", "bicep", "chest", "shoulder", "delt", "quad", "hamstring", "lat", "ab", "glute", "version",
  "style", "position", "plate", "pulley"]);
const ATTRIBUTS_MATERIEL = [["smith machine", "Smith"], ["exercise ball", "swiss ball"], ["stability ball", "swiss ball"],
  ["medicine ball", "médecine-ball"], ["ez bar", "barre EZ"], ["e z curl bar", "barre EZ"], ["trap bar", "trap bar"],
  ["low pulley", "poulie basse"], ["high pulley", "poulie haute"], ["landmine", "landmine"], ["bands", "élastiques"],
  ["band", "élastique"], ["chains", "chaînes"], ["chain", "chaînes"], ["rope", "corde"]];
// Étirements et auto-massages : cible musculaire → complément français.
const CIBLES = [
  ["hip flexor", "des fléchisseurs de hanche"], ["iliotibial tract", "de la bandelette ilio-tibiale"],
  ["latissimus dorsi", "du grand dorsal"], ["anterior tibialis", "du tibial antérieur"], ["lower back", "du bas du dos"],
  ["upper back", "du haut du dos"], ["front deltoid", "du deltoïde antérieur"], ["hamstring", "des ischio-jambiers"],
  ["quadricep", "des quadriceps"], ["quadriceps", "des quadriceps"], ["quad", "des quadriceps"], ["glute", "des fessiers"],
  ["calve", "des mollets"], ["calf", "des mollets"], ["groin", "des adducteurs"], ["adductor", "des adducteurs"],
  ["piriformi", "du piriforme"], ["piriformis", "du piriforme"], ["peroneal", "des péroniers"], ["rhomboid", "des rhomboïdes"],
  ["brachiali", "du brachial"], ["brachialis", "du brachial"], ["biceps", "des biceps"], ["triceps", "des triceps"],
  ["chest", "des pectoraux"], ["shoulder", "des épaules"], ["lat", "du grand dorsal"], ["foot", "de la voûte plantaire"],
  ["abdominal", "des abdominaux"],
];
const CERCLES = { arm: "des bras", ankle: "des chevilles", hip: "de hanches", knee: "de genoux", shoulder: "d'épaules", wrist: "de poignets", elbow: "de coudes" };

const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
const INVARIABLES = new Set(["press", "dips", "abs", "biceps", "triceps", "calves", "glutes", "lats", "ups", "hops", "chins", "bodyweight",
  "cross", "across", "this", "is", "us", "plus", "gironda", "atlas", "vs", "less", "piriformis", "brachialis", "pass", "iliotibial"]);
const singulier = (t) => t.split(" ").map((m) => {
  if (INVARIABLES.has(m) || m.length < 4 || !m.endsWith("s")) return m;
  if (/(ss|us|is)$/.test(m)) return m;
  if (/(sh|ch|x)es$/.test(m)) return m.slice(0, -2);
  return m.slice(0, -1);
}).join(" ");
const echapper = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const motif = (en) => new RegExp(`\\b${echapper(en)}\\b`);

function cibleDe(t) {
  for (const [en, fr] of CIBLES) if (motif(en).test(t)) return { fr, t: t.replace(motif(en), " ") };
  return null;
}

function nomFrancais(nomEn, equipement, categorie) {
  let t = ` ${singulier(norm(nomEn).replace(/-/g, " "))} `;
  // Auto-massage au rouleau : « Hamstring-SMR » → « Auto-massage des ischio-jambiers (rouleau) ».
  if (/\bsmr\b/.test(t)) {
    const c = cibleDe(t.replace(/\bsmr\b/, " "));
    return c && !c.t.split(" ").some((w) => w && !VIDES.has(w)) ? `Auto-massage ${c.fr} (rouleau)` : null;
  }
  // « Arm Circles » → « Cercles des bras ».
  const mc = t.match(/^\s*(?:standing )?(arm|ankle|hip|knee|shoulder|wrist|elbow) circle\s*(?:\(?prone\)?)?\s*$/);
  if (mc) return `Cercles ${CERCLES[mc[1]]}${/prone/.test(t) ? " sur le ventre" : /standing/.test(t) ? " debout" : ""}`;
  // Attributs de matériel AVANT le mouvement : « Front Dumbbell Raise » doit trouver « front raise ».
  const attributs = [];
  for (const [en, fr] of ATTRIBUTS_MATERIEL) {
    if (motif(en).test(t)) { if (!attributs.includes(fr)) attributs.push(fr); t = t.replace(motif(en), " "); }
  }
  t = ` ${t.split(" ").filter((w) => w && !["barbell", "dumbbell", "dumbbells", "cable", "machine", "kettlebell", "kettlebells", "lever", "leverage", "db", "smith", "two"].includes(w)).join(" ")} `;
  let mouvement = null, genre = "m";
  for (const [en, fr, g] of MOUVEMENTS) {
    const re = new RegExp(`\\b${echapper(en)}s?\\b`);
    if (re.test(t)) { mouvement = fr; genre = g || "m"; t = t.replace(re, " "); break; }
  }
  // Étirement sans le mot « stretch » (catégorie du jeu de données) : « Seated Hamstring ».
  if (!mouvement && categorie === "stretching") mouvement = "Étirement";
  if (!mouvement) return null;
  let cible = "";
  if (mouvement === "Étirement") {
    const c = cibleDe(t);
    if (!c) return null;            // un étirement sans cible n'apprend rien : on garde l'anglais
    cible = ` ${c.fr}`; t = c.t;
  }
  const qualifs = [];
  for (const [en, m, f, accorde] of QUALIFS) {
    if (!motif(en).test(t)) continue;
    let q = m;
    if (accorde && f) {
      q = genre === "f" ? f : genre === "fp" ? `${f}s` : genre === "mp" ? (m.endsWith("s") ? m : `${m}s`) : m;
      if (genre === "mp" && m.endsWith("al")) q = m.replace(/al$/, "aux");
    }
    if (!qualifs.includes(q)) qualifs.push(q);
    t = t.replace(motif(en), " ");
  }
  const restes = t.split(" ").filter((w) => w && !VIDES.has(w));
  if (restes.length) return null;       // mot non reconnu : on garde le nom anglais
  // Pas de « au-dessus de la tête » redondant après « Développé épaules », pas
  // de « (poulie) » répété après un mouvement qui la nomme déjà.
  const qs = qualifs.filter((q) => !(q === "au-dessus de la tête" && /épaules|au-dessus/.test(mouvement)));
  // Cardio sur machine (tapis, vélo, escalier) : « (machine) » n'ajoute rien.
  let mat = attributs[0] || (categorie === "cardio" ? "" : MATERIEL_TXT[equipement]) || "";
  if (mat && mouvement.toLowerCase().includes(mat)) mat = "";
  if (mat === "poulie" && /poulie/.test(mouvement)) mat = "";
  return `${mouvement}${cible}${qs.length ? " " + qs.join(" ") : ""}${mat ? ` (${mat})` : ""}`;
}

/* ---------- patron biomécanique (sert au catalogue et aux filtres) ---------- */
function patronDe(x, muscles) {
  const n = norm(x.name);
  if (x.category === "cardio") return "cardio";
  if (x.category === "stretching") return null;
  const p = muscles[0];
  if (/lunge|split squat|step up/.test(n)) return "fente";
  if (/squat|leg press/.test(n)) return "squat";
  if (/deadlift|good morning|hip thrust|bridge|swing|clean|snatch|pull through/.test(n)) return "charniere_hanche";
  if (/pull ?up|chin ?up|pulldown/.test(n)) return "tirage_vertical";
  if (/row|face pull/.test(n)) return "tirage_horizontal";
  if (p === "biceps" || /curl/.test(n) && p !== "ischios") return p === "ischios" ? "isolation_jambe" : "flexion_bras";
  if (p === "triceps") return "extension_bras";
  if (p === "pectoraux") return "poussee_horizontale";
  if (p === "epaules") return x.force === "push" && /press|jerk/.test(n) ? "poussee_verticale" : null;
  if (["quadriceps", "ischios", "mollets", "adducteurs", "abducteurs", "fessiers"].includes(p)) return x.mechanic === "compound" ? "squat" : "isolation_jambe";
  if (p === "abdominaux" || p === "lombaires") return "gainage";
  return null;
}
function typeDe(x, muscles) {
  if (x.category === "stretching") return "mobilite";
  if (x.category === "cardio" || x.category === "plyometrics") return "cardio";
  if (["strongman", "olympic weightlifting", "powerlifting"].includes(x.category)) return "force";
  if (muscles[0] === "abdominaux") return "gainage";
  if (x.mechanic === "isolation") return "isolation";
  return x.equipment === "barbell" ? "force" : "hypertrophie";
}
const LIB_TYPE = { force: "Exercice de force", hypertrophie: "Exercice polyarticulaire", isolation: "Exercice d'isolation",
  gainage: "Exercice de gainage / abdominaux", cardio: "Exercice cardio / pliométrique", mobilite: "Étirement / mobilité" };
const LIB_MUSCLE = { pectoraux: "pectoraux", dorsaux: "dorsaux", trapezes: "trapèzes", epaules: "épaules", biceps: "biceps",
  triceps: "triceps", avant_bras: "avant-bras", abdominaux: "abdominaux", lombaires: "lombaires", quadriceps: "quadriceps",
  ischios: "ischio-jambiers", fessiers: "fessiers", adducteurs: "adducteurs", abducteurs: "abducteurs", mollets: "mollets" };

/* ---------- doublons ---------- */
const cleEn = (s) => singulier(norm(s).replace(/-/g, " ")).split(" ").filter((w) => w && !["the", "with", "a", "on", "to", "and"].includes(w)).sort().join(" ");
const dejaEn = new Set();
const dejaFr = new Set();
for (const e of EXISTANTS) {
  dejaFr.add(norm(e.nom));
  for (const a of e.nomsAlternatifs || []) dejaEn.add(cleEn(a));
  if (e.slug) dejaEn.add(cleEn(e.slug.replace(/-/g, " ")));
}
// Correspondances vérifiées à la main (même mouvement, noms trop différents).
const EQUIVALENTS = {
  "Rowing_Stationary": "rameur",
  "Running_Treadmill": "wger-654793c2-run-treadmill",
  "Elliptical_Trainer": "wger-95a300de-elliptical",
};

/* ---------- import ---------- */
const sortie = [];
const ecartes = { neck: 0, doublon: 0, sansMuscle: 0 };
const nomsPris = new Set(dejaFr);
const idsPris = new Set(Object.keys(EXERCISES_BY_ID).concat(EXTRA_EXERCISES.map((e) => e.id)));
let nomsFr = 0;
for (const x of brut) {
  if (EQUIVALENTS[x.id]) { ecartes.doublon++; continue; }
  const prim = [...new Set((x.primaryMuscles || []).map((m) => MUSCLES[m]).filter(Boolean))];
  if (!prim.length) { if ((x.primaryMuscles || []).includes("neck")) ecartes.neck++; else ecartes.sansMuscle++; continue; }
  if (dejaEn.has(cleEn(x.name))) { ecartes.doublon++; continue; }
  const sec = [...new Set((x.secondaryMuscles || []).map((m) => MUSCLES[m]).filter((m) => m && !prim.includes(m)))];
  const fr = nomFrancais(x.name, x.equipment, x.category);
  let nom = fr || x.name;
  if (fr) nomsFr++;
  if (nomsPris.has(norm(nom))) {
    if (fr && !nomsPris.has(norm(x.name))) { nom = x.name; nomsFr--; }   // collision : le nom anglais, distinct
    else { ecartes.doublon++; continue; }
  }
  nomsPris.add(norm(nom));
  const slug = norm(x.name).replace(/'/g, "").replace(/ /g, "-");
  const id = `fedb-${slug}`;
  if (idsPris.has(id)) { ecartes.doublon++; continue; }
  idsPris.add(id);
  const type = typeDe(x, prim);
  const equip = x.equipment ? (MATERIEL[x.equipment] || []) : (x.category === "stretching" || x.category === "plyometrics" ? ["poids_du_corps"] : []);
  const n = norm(x.name);
  const unilateral = /\b(one|single) (arm|leg)\b|\balternat|\bunilateral\b/.test(n);
  const position = /\bseated\b/.test(n) ? "assis" : /\bstanding\b/.test(n) ? "debout" : /\blying\b|\bsupine\b|\bprone\b/.test(n) ? "allongé" : /\bkneeling\b/.test(n) ? "à genoux" : "";
  const enTemps = type === "mobilite" || (type === "gainage" && x.force === "static");
  const desc = `${LIB_TYPE[type]} — muscles principaux : ${prim.map((m) => LIB_MUSCLE[m] || m).join(", ")}`
    + (sec.length ? ` ; secondaires : ${sec.map((m) => LIB_MUSCLE[m] || m).join(", ")}` : "")
    + `. Fiche importée sans consignes détaillées.`;
  sortie.push({
    id, slug, nom, nomsAlternatifs: nom === x.name ? [] : [x.name],
    description: desc, instructions: [], erreurs: [], respiration: "", securite: "",
    difficulte: NIVEAU[x.level] || 3, typeExercice: type, patron: patronDe(x, prim),
    chaine: x.mechanic === "compound" ? "fermee" : "ouverte", unilateral,
    musclesPrincipaux: prim, musclesSecondaires: sec, musclesStabilisateurs: [],
    equipement: equip, equipementsAlternatifs: [], position, amplitude: "complète",
    tempoDefaut: type === "force" ? "2-1-1" : "2-0-1",
    repsPertinent: type === "force" ? [4, 8] : type === "isolation" ? [10, 15] : type === "cardio" ? [8, 15] : [8, 12],
    dureeSec: enTemps ? 30 : null, chargeRelative: "moyen", contreIndications: [],
    tags: ["free-exercise-db", x.category].filter(Boolean),
    media: { miniature: null, video: null }, statut: "importe",
    auteur: "free-exercise-db (domaine public)", revision: "2026-11-07",
    source: "free-exercise-db", licence: "Unlicense (domaine public)", sourceId: x.id,
  });
}

const fichier = path.join(RACINE, "src/data/exercises-fedb.js");
const entete = `// @ts-nocheck
/**
 * Exercices importés de free-exercise-db (https://github.com/yuhonas/free-exercise-db),
 * dédié au domaine public (Unlicense). FICHIER GÉNÉRÉ par
 * scripts/importer-free-exercise-db.mjs — ne pas modifier à la main.
 *
 * Seules les métadonnées factuelles sont reprises (nom, muscles, matériel,
 * niveau, catégorie) : ni textes d'instructions ni images (provenance amont
 * non documentée). Noms français construits par règles ; nom anglais conservé
 * quand un mot n'est pas reconnu. Chargé à la demande avec l'extension wger.
 *
 * ${sortie.length} exercices — ${nomsFr} noms traduits, ${sortie.length - nomsFr} noms anglais conservés.
 * Écartés : ${ecartes.doublon} doublons du catalogue, ${ecartes.neck} exercices de cou (pas de muscle équivalent), ${ecartes.sansMuscle} sans muscle.
 */
`;
fs.writeFileSync(fichier, `${entete}export const FEDB_EXERCISES = ${JSON.stringify(sortie)};\n`);
console.log(JSON.stringify({ importes: sortie.length, nomsFr, nomsEn: sortie.length - nomsFr, ecartes }, null, 1));
