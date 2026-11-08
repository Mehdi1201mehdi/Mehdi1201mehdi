// @ts-nocheck
/**
 * Moteur de noms français d'exercices, partagé par les importeurs
 * (free-exercise-db, exercises-dataset MIT).
 *
 * Principe : mouvement reconnu + qualificatifs accordés + matériel entre
 * parenthèses. Si un mot du nom anglais n'est pas reconnu, la fonction rend
 * null et l'importeur garde le nom anglais : jamais de traduction approximative.
 *
 * `creerNommeur(options)` permet à un importeur d'AJOUTER du vocabulaire
 * (placé avant les tables de base) sans changer les noms des autres sources.
 */
export const MOUVEMENTS = [
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
export const QUALIFS = [
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
export const VIDES = new Set(["with", "the", "a", "an", "on", "to", "and", "of", "for", "in", "from", "barbell", "dumbbell", "dumbbells", "cable",
  "machine", "kettlebell", "kettlebells", "band", "bands", "bar", "ez", "e", "z", "exercise", "smith", "lever", "leverage", "db",
  "medicine", "ball", "s", "using", "your", "attachment", "rope", "handle", "grip", "arm", "arms", "two", "both", "palm",
  "triceps", "tricep", "biceps", "bicep", "chest", "shoulder", "delt", "quad", "hamstring", "lat", "ab", "glute", "version",
  "style", "position", "plate", "pulley"]);
export const ATTRIBUTS_MATERIEL = [["smith machine", "Smith"], ["exercise ball", "swiss ball"], ["stability ball", "swiss ball"],
  ["medicine ball", "médecine-ball"], ["smith", "Smith"], ["ez bar", "barre EZ"], ["e z curl bar", "barre EZ"], ["trap bar", "trap bar"],
  ["low pulley", "poulie basse"], ["high pulley", "poulie haute"], ["landmine", "landmine"], ["bands", "élastiques"],
  ["band", "élastique"], ["chains", "chaînes"], ["chain", "chaînes"], ["rope", "corde"]];
// Étirements et auto-massages : cible musculaire → complément français.
export const CIBLES = [
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

export const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
export const INVARIABLES = new Set(["press", "dips", "abs", "biceps", "triceps", "calves", "glutes", "lats", "ups", "hops", "chins", "bodyweight",
  "cross", "across", "this", "is", "us", "plus", "gironda", "atlas", "vs", "less", "piriformis", "brachialis", "pass", "iliotibial"]);
export const singulier = (t) => t.split(" ").map((m) => {
  if (INVARIABLES.has(m) || m.length < 4 || !m.endsWith("s")) return m;
  if (/(ss|us|is)$/.test(m)) return m;
  if (/(sh|ch|x)es$/.test(m)) return m.slice(0, -2);
  return m.slice(0, -1);
}).join(" ");
const echapper = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const motif = (en) => new RegExp(`\\b${echapper(en)}\\b`);

/**
 * @param {{mouvements?: any[], qualifs?: any[], vides?: string[], attributs?: any[], cibles?: any[], materielTxt?: Record<string,string>, avant?: (t:string)=>string, surInconnu?: (restes:string[], nom:string)=>void}} [o]
 */
export function creerNommeur(o = {}) {
  const MVT = [...(o.mouvements || []), ...MOUVEMENTS];
  const QLF = [...(o.qualifs || []), ...QUALIFS];
  const VID = new Set([...VIDES, ...(o.vides || [])]);
  const ATT = [...(o.attributs || []), ...ATTRIBUTS_MATERIEL];
  const CIB = [...(o.cibles || []), ...CIBLES];
  const MATERIEL_TXT = o.materielTxt || {};
  const avant = o.avant || ((t) => t);
function cibleDe(t) {
  for (const [en, fr] of CIB) if (motif(en).test(t)) return { fr, t: t.replace(motif(en), " ") };
  return null;
}

return function nomFrancais(nomEn, equipement, categorie) {
  let t = ` ${singulier(avant(norm(nomEn)).replace(/-/g, " "))} `;
  // Auto-massage au rouleau : « Hamstring-SMR » → « Auto-massage des ischio-jambiers (rouleau) ».
  if (/\bsmr\b/.test(t)) {
    const c = cibleDe(t.replace(/\bsmr\b/, " "));
    return c && !c.t.split(" ").some((w) => w && !VID.has(w)) ? `Auto-massage ${c.fr} (rouleau)` : null;
  }
  // « Arm Circles » → « Cercles des bras ».
  const mc = t.match(/^\s*(?:standing )?(arm|ankle|hip|knee|shoulder|wrist|elbow) circle\s*(?:\(?prone\)?)?\s*$/);
  if (mc) return `Cercles ${CERCLES[mc[1]]}${/prone/.test(t) ? " sur le ventre" : /standing/.test(t) ? " debout" : ""}`;
  // Attributs de matériel AVANT le mouvement : « Front Dumbbell Raise » doit trouver « front raise ».
  const attributs = [];
  for (const [en, fr] of ATT) {
    if (motif(en).test(t)) { if (!attributs.includes(fr)) attributs.push(fr); t = t.replace(motif(en), " "); }
  }
  t = ` ${t.split(" ").filter((w) => w && !["barbell", "dumbbell", "dumbbells", "cable", "machine", "kettlebell", "kettlebells", "lever", "leverage", "db", "smith", "two"].includes(w)).join(" ")} `;
  let mouvement = null, genre = "m";
  for (const [en, fr, g] of MVT) {
    const re = new RegExp(`\\b${echapper(en)}s?\\b`);
    if (re.test(t)) { mouvement = fr; genre = g || "m"; t = t.replace(re, " "); break; }
  }
  // Étirement sans le mot « stretch » (catégorie du jeu de données) : « Seated Hamstring ».
  if (!mouvement && categorie === "stretching") mouvement = "Étirement";
  if (!mouvement) { if (o.surInconnu) o.surInconnu(["∅mouvement"], nomEn); return null; }
  let cible = "";
  if (mouvement === "Étirement") {
    const c = cibleDe(t);
    if (!c) return null;            // un étirement sans cible n'apprend rien : on garde l'anglais
    cible = ` ${c.fr}`; t = c.t;
  }
  const qualifs = [];
  for (const [en, m, f, accorde] of QLF) {
    if (!motif(en).test(t)) continue;
    let q = m;
    if (accorde && f) {
      q = genre === "f" ? f : genre === "fp" ? `${f}s` : genre === "mp" ? (m.endsWith("s") ? m : `${m}s`) : m;
      if (genre === "mp" && m.endsWith("al")) q = m.replace(/al$/, "aux");
    }
    if (!qualifs.includes(q)) qualifs.push(q);
    t = t.replace(motif(en), " ");
  }
  const restes = t.split(" ").filter((w) => w && !VID.has(w));
  if (restes.length) { if (o.surInconnu) o.surInconnu(restes, nomEn); return null; }       // mot non reconnu : on garde le nom anglais
  // Pas de « au-dessus de la tête » redondant après « Développé épaules », pas
  // de « (poulie) » répété après un mouvement qui la nomme déjà.
  const qs = qualifs.filter((q) => !(q === "au-dessus de la tête" && /épaules|au-dessus/.test(mouvement)) && !mouvement.toLowerCase().includes(q.toLowerCase()));
  // Cardio sur machine (tapis, vélo, escalier) : « (machine) » n'ajoute rien.
  // Plusieurs accessoires (« barre EZ » + « élastique ») : tous nommés, sinon deux exercices distincts portent le même nom.
  let mat = attributs.join(" et ") || (categorie === "cardio" ? "" : MATERIEL_TXT[equipement]) || "";
  if (mat && mouvement.toLowerCase().includes(mat)) mat = "";
  if (mat === "poulie" && /poulie/.test(mouvement)) mat = "";
  return `${mouvement}${cible}${qs.length ? " " + qs.join(" ") : ""}${mat ? ` (${mat})` : ""}`;
};
}
