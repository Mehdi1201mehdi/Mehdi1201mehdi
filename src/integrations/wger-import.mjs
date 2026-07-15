// @ts-check
/**
 * Importeur wger → notre schéma d'exercices.
 *
 * wger.de expose une API publique en lecture (contenu CC-BY-SA). Cet
 * environnement de dev BLOQUE wger.de (proxy egress), donc ce script est
 * conçu pour tourner là où le réseau est ouvert — typiquement **GitHub
 * Actions** (workflow `.github/workflows/import-wger.yml`). Il écrit
 * `src/data/exercises-extra.js` (constante EXTRA_EXERCISES), qui enrichit le
 * CATALOGUE (recherche / remplacement / démonstration).
 *
 * Les fonctions de mapping sont PURES et testées hors ligne
 * (`tests/wger-import.test.js`). Seuls fetch/pagination nécessitent le réseau.
 *
 * Usage : node src/integrations/wger-import.mjs [--limit=250] [--out=chemin]
 */
import { writeFile } from "node:fs/promises";
import { EXERCISES } from "../data/exercises.js";

const API = "https://wger.de/api/v2";
const LANG_EN = 2; // identifiant de langue "English" chez wger

/* ---------- mapping référentiels (par mots-clés du nom, robuste aux ids) ---------- */
export function mapMuscle(nom) {
  const n = String(nom || "").toLowerCase();
  const t = [
    [/pector/, "pectoraux"], [/latissimus|lats?\b/, "dorsaux"], [/trapez/, "trapezes"],
    [/deltoid|shoulder/, "epaules"], [/biceps femoris|hamstring|ischio/, "ischios"],
    [/biceps|brachialis/, "biceps"], [/triceps/, "triceps"], [/forearm|brachioradialis/, "avant_bras"],
    [/rectus abdominis|abdomin|serratus|oblique/, "abdominaux"], [/erector|spinae|lower back/, "lombaires"],
    [/quadriceps|quads?\b/, "quadriceps"], [/glute/, "fessiers"], [/adductor/, "adducteurs"],
    [/abductor/, "abducteurs"], [/gastrocnemius|soleus|calf|calves/, "mollets"],
  ];
  for (const [re, m] of t) if (re.test(n)) return m;
  return null;
}

export function mapEquipment(nom) {
  const n = String(nom || "").toLowerCase();
  if (/sz-bar|ez.?bar/.test(n)) return "barre_ez";
  if (/barbell/.test(n)) return "barre";
  if (/dumbbell/.test(n)) return "halteres";
  if (/kettlebell/.test(n)) return "kettlebell";
  if (/pull-?up bar/.test(n)) return "barre_traction";
  if (/incline bench|bench/.test(n)) return "banc";
  if (/swiss ?ball|stability/.test(n)) return "swiss_ball";
  if (/cable/.test(n)) return "poulie";
  if (/gym mat|mat\b/.test(n)) return "poids_du_corps";
  if (/none|bodyweight|body weight/.test(n)) return "poids_du_corps";
  return null; // inconnu → ignoré
}

const CAT_DEFAUT = {
  abs: { patron: "gainage", type: "gainage" },
  arms: { patron: "flexion_bras", type: "hypertrophie" },
  back: { patron: "tirage_horizontal", type: "hypertrophie" },
  calves: { patron: "isolation_jambe", type: "hypertrophie" },
  cardio: { patron: "cardio", type: "cardio" },
  chest: { patron: "poussee_horizontale", type: "hypertrophie" },
  legs: { patron: "squat", type: "force" },
  shoulders: { patron: "poussee_verticale", type: "hypertrophie" },
};

/** Devine le patron biomécanique à partir du nom, avec repli sur la catégorie. */
export function infererPatron(nom, categorie) {
  const n = String(nom || "").toLowerCase();
  const rgx = [
    [/squat/, "squat"], [/deadlift|romanian|hip thrust|good morning|hip hinge/, "charniere_hanche"],
    [/lunge|split squat|step.?up/, "fente"], [/calf|calves/, "isolation_jambe"],
    [/bench press|chest press|push.?up|fly|dips?/, "poussee_horizontale"],
    [/overhead press|shoulder press|military|pike/, "poussee_verticale"],
    [/pulldown|pull.?up|chin.?up/, "tirage_vertical"], [/row\b|rowing/, "tirage_horizontal"],
    [/curl/, "flexion_bras"], [/extension|pushdown|skull|kickback/, "extension_bras"],
    [/lateral raise|front raise|rear delt|face pull/, "isolation_jambe"],
    [/plank|crunch|sit.?up|leg raise|hollow|dead bug/, "gainage"],
    [/run|jog|bike|cycling|rowing machine|elliptical|jump rope/, "cardio"],
  ];
  for (const [re, p] of rgx) if (re.test(n)) return p;
  return (CAT_DEFAUT[String(categorie || "").toLowerCase()] || { patron: "poussee_horizontale" }).patron;
}

/* ---------- mapping d'un exercice wger (exerciseinfo) ---------- */
function slugify(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

/**
 * Convertit un objet "exerciseinfo" wger vers notre schéma.
 * @param {any} base
 * @param {{curatedNames:Set<string>}} ctx
 * @returns {any|null}
 */
export function mapExercice(base, ctx) {
  const trads = base.exercises || base.translations || [];
  const en = trads.find((t) => (t.language === LANG_EN || t.language === "english")) || trads[0];
  if (!en || !en.name) return null;
  const nom = String(en.name).trim();
  if (ctx.curatedNames.has(nom.toLowerCase())) return null; // évite les doublons avec le cœur curé

  const categorie = base.category && (base.category.name || base.category);
  const principaux = [...new Set((base.muscles || []).map((m) => mapMuscle(m.name_en || m.name)).filter(Boolean))];
  const secondaires = [...new Set((base.muscles_secondary || []).map((m) => mapMuscle(m.name_en || m.name)).filter(Boolean))];
  if (principaux.length === 0) {
    const parCat = { Abs: "abdominaux", Arms: "biceps", Back: "dorsaux", Calves: "mollets", Cardio: "corps_entier", Chest: "pectoraux", Legs: "quadriceps", Shoulders: "epaules" }[categorie];
    if (parCat) principaux.push(parCat); else return null;
  }
  let equipement = [...new Set((base.equipment || []).map((e) => mapEquipment(e.name)).filter(Boolean))];
  if (equipement.length === 0) equipement = ["poids_du_corps"];

  const image = (base.images || []).find((i) => i.is_main) || (base.images || [])[0];
  const description = String(en.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const patron = infererPatron(nom, categorie);
  const type = (CAT_DEFAUT[String(categorie || "").toLowerCase()] || { type: "hypertrophie" }).type;

  return {
    id: "wger-" + (base.uuid ? String(base.uuid).slice(0, 8) : base.id) + "-" + slugify(nom),
    slug: slugify(nom), nom, nomsAlternatifs: [],
    description: description.slice(0, 400) || "Exercice importé depuis wger.",
    instructions: [], erreurs: [], respiration: "", securite: "",
    difficulte: 2, typeExercice: type, patron, chaine: "fermee", unilateral: false,
    musclesPrincipaux: principaux, musclesSecondaires: secondaires, musclesStabilisateurs: [],
    equipement, equipementsAlternatifs: [], position: "", amplitude: "complète", tempoDefaut: "2-0-1",
    repsPertinent: type === "cardio" ? [1, 1] : (type === "gainage" ? [1, 1] : [8, 12]),
    dureeSec: (type === "cardio" || type === "gainage") ? 40 : null,
    chargeRelative: "moyen", contreIndications: [], tags: ["wger", String(categorie || "").toLowerCase()].filter(Boolean),
    media: { miniature: image ? image.image : null, video: null },
    statut: "importe", auteur: "wger (CC-BY-SA)", revision: new Date().toISOString().slice(0, 10),
    source: "wger", licence: "CC-BY-SA",
  };
}

/* ---------- récupération réseau (nécessite un accès Internet) ---------- */
async function fetchJSON(url) {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} sur ${url}`);
  return r.json();
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
  const limite = Number(args.limit || 250);
  const out = args.out || new URL("../data/exercises-extra.js", import.meta.url).pathname;

  const curatedNames = new Set(EXERCISES.map((e) => e.nom.toLowerCase()));
  const vus = new Set();
  const resultats = [];
  // Endpoint "exerciseinfo" (l'ancien "exercisebaseinfo" a été retiré de l'API wger).
  // Filtre par langue via "language__code" (et non plus un id numérique).
  let url = `${API}/exerciseinfo/?language__code=en&limit=50&format=json`;

  while (url && resultats.length < limite) {
    process.stdout.write(`… ${url}\n`);
    const page = await fetchJSON(url);
    for (const base of page.results || []) {
      const exo = mapExercice(base, { curatedNames });
      if (exo && !vus.has(exo.slug)) { vus.add(exo.slug); resultats.push(exo); }
      if (resultats.length >= limite) break;
    }
    url = page.next;
  }

  const entete = `// @ts-check\n/** Généré par src/integrations/wger-import.mjs — ne pas éditer à la main.\n`
    + ` * Source : wger.de (API v2), contenu CC-BY-SA. ${resultats.length} exercices importés le ${new Date().toISOString().slice(0, 10)}.\n */\n`;
  await writeFile(out, entete + "export const EXTRA_EXERCISES = " + JSON.stringify(resultats, null, 1) + ";\n", "utf8");
  console.log(`✅ ${resultats.length} exercices écrits dans ${out}`);
}

// exécuté directement (pas lors d'un import de test)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error("Échec import wger :", e.message); process.exit(1); });
}
