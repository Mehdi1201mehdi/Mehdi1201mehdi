// @ts-check
/**
 * Importeur de GIFs animés depuis un dataset d'exercices cloné (ex.
 * hasaneyldrm/exercises-dataset). Tourne dans GitHub Actions (réseau ouvert) —
 * voir .github/workflows/import-gifs.yml.
 *
 * Il construit `src/data/gifs.js` : { exId → URL de GIF }. Les GIFs sont
 * RÉFÉRENCÉS par URL (raw.githubusercontent) — non copiés — avec attribution.
 *
 * Usage : node src/integrations/gifs-import.mjs --dir=ext --repo=owner/name --branch=main
 */
import { readFile, readdir, writeFile, stat } from "node:fs/promises";
import { join, extname, relative, basename } from "node:path";
import { CATALOGUE } from "../data/exercises.js";
import { termePour } from "./exercisedb.js";

export function normName(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Index des exercices du dataset : normName → {name,id,gifUrl}. */
export function indexerDataset(entrees) {
  const idx = new Map();
  for (const e of entrees) {
    const n = normName(e.name);
    if (n && !idx.has(n)) idx.set(n, e);
  }
  return idx;
}

/** Résout l'URL de GIF d'une entrée : local raw d'abord, sinon gifUrl absolue. */
export function resoudreGif(entry, gifIndex, rawBase) {
  if (!entry) return null;
  const parId = entry.id != null ? gifIndex.get(String(entry.id).toLowerCase()) : null;
  if (parId) return rawBase + parId;
  const g = entry.gifUrl || entry.gif || entry.image;
  if (typeof g === "string" && /^https?:\/\//.test(g)) return g;
  if (typeof g === "string" && g) return rawBase + g.replace(/^\.?\//, "");
  return null;
}

/* Mots trop courants pour discriminer un exercice (bruit de correspondance). */
const STOP = new Set([
  "the", "a", "an", "and", "or", "with", "to", "of", "on", "for",
  "your", "in", "out", "exercise", "variation", "version",
]);

/** Racine grossière : gère les pluriels de la gym (dumbbells→dumbbell, curls→curl). */
export function racine(t) {
  if (t.endsWith("ss")) return t;                 // press, glass : invariable
  if (t.length > 3 && t.endsWith("s")) {
    const r = t.slice(0, -1);
    return r.endsWith("sse") ? r.slice(0, -1) : r; // presses→presse→press
  }
  return t;
}

/** Découpe un nom en jetons significatifs (sans mots vides, racinés). */
export function jetons(s) {
  return normName(s).split(" ")
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map(racine);
}

/** Score de recouvrement (Jaccard) entre deux listes de jetons. */
export function scoreJetons(a, b) {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a), sb = new Set(b);
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = new Set([...sa, ...sb]).size;
  return inter / union;
}

/**
 * Construit la correspondance exId → URL d'image pour notre catalogue.
 * 3 niveaux : (1) correspondance exacte du nom normalisé, (2) inclusion,
 * (3) meilleur recouvrement de jetons (Jaccard) au-dessus d'un seuil — ce
 * dernier niveau couvre la grande majorité des exercices importés (wger).
 */
export function construireMapping(catalogue, datasetIndex, gifIndex, rawBase, termeFn) {
  const out = {};
  // Pré-calcul des jetons de chaque entrée du dataset (une seule fois).
  const idxJetons = [];
  for (const [n, e] of datasetIndex) idxJetons.push([jetons(n), e]);

  for (const exo of catalogue) {
    const termes = [...new Set([termeFn(exo.id), exo.nom].map(normName).filter(Boolean))];
    let entry = null;

    // (1) correspondance exacte
    for (const t of termes) { if (datasetIndex.has(t)) { entry = datasetIndex.get(t); break; } }

    // (2) inclusion (l'un contient l'autre)
    if (!entry) {
      for (const t of termes) {
        for (const [n, e] of datasetIndex) { if (n.includes(t) || t.includes(n)) { entry = e; break; } }
        if (entry) break;
      }
    }

    // (3) meilleur recouvrement de jetons
    if (!entry) {
      const jTermes = termes.map(jetons).filter((j) => j.length);
      let meilleur = 0, gagnant = null;
      for (const [jn, e] of idxJetons) {
        for (const jt of jTermes) {
          const s = scoreJetons(jt, jn);
          if (s > meilleur) { meilleur = s; gagnant = e; }
        }
      }
      if (gagnant && meilleur >= 0.3) entry = gagnant;
    }

    const url = resoudreGif(entry, gifIndex, rawBase);
    if (url) out[exo.id] = url;
  }
  return out;
}

/* ---------- lecture du dataset cloné (Node/Actions uniquement) ---------- */
async function walk(dir, filtre, acc = []) {
  for (const nom of await readdir(dir)) {
    if (nom === ".git") continue;
    const p = join(dir, nom);
    const s = await stat(p);
    if (s.isDirectory()) await walk(p, filtre, acc);
    else if (filtre(p)) acc.push(p);
  }
  return acc;
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
  const dir = args.dir || "ext";
  const repo = args.repo || "hasaneyldrm/exercises-dataset";
  const branch = args.branch || "main";
  const out = args.out || new URL("../data/gifs.js", import.meta.url).pathname;
  const rawBase = `https://raw.githubusercontent.com/${repo}/${branch}/`;

  // exercices du dataset (tout .json contenant un tableau d'objets avec "name")
  const jsons = await walk(dir, (p) => extname(p) === ".json");
  const entrees = [];
  for (const f of jsons) {
    try {
      const j = JSON.parse(await readFile(f, "utf8"));
      const arr = Array.isArray(j) ? j : (j.exercises || j.data || []);
      if (Array.isArray(arr)) for (const e of arr) if (e && typeof e.name === "string") entrees.push(e);
    } catch (e) { /* ignore */ }
  }
  // index des fichiers .gif : id/basename(lower) → chemin relatif
  const gifs = await walk(dir, (p) => extname(p).toLowerCase() === ".gif");
  const gifIndex = new Map();
  for (const g of gifs) gifIndex.set(basename(g, extname(g)).toLowerCase(), relative(dir, g).split("\\").join("/"));

  const datasetIndex = indexerDataset(entrees);
  const mapping = construireMapping(CATALOGUE, datasetIndex, gifIndex, rawBase, termePour);

  const n = Object.keys(mapping).length;
  if (n === 0) { console.log("Aucune correspondance trouvée — fichier gifs.js laissé inchangé."); return; }
  const entete = `// @ts-check\n/** Généré par src/integrations/gifs-import.mjs — ne pas éditer.\n`
    + ` * GIFs référencés depuis ${repo} (branche ${branch}). ${n} exercices associés le ${new Date().toISOString().slice(0, 10)}.\n */\n`;
  await writeFile(out, entete + "export const GIFS = " + JSON.stringify(mapping, null, 1) + ";\n", "utf8");
  console.log(`✅ ${n} GIFs associés (sur ${CATALOGUE.length} exercices) — dataset : ${entrees.length} entrées, ${gifs.length} fichiers .gif`);
  const manquants = CATALOGUE.filter((e) => !mapping[e.id]);
  console.log(`ℹ️ ${manquants.length} sans image (souvent des étirements/mobilité/cardio absents du dataset) :`);
  for (const e of manquants) console.log(`   - ${e.nom}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error("Échec import GIFs :", e.message); process.exit(1); });
}
