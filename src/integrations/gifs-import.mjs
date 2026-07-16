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

/** Construit la correspondance exId → URL de GIF pour notre catalogue. */
export function construireMapping(catalogue, datasetIndex, gifIndex, rawBase, termeFn) {
  const out = {};
  for (const exo of catalogue) {
    const termes = [...new Set([termeFn(exo.id), exo.nom].map(normName).filter(Boolean))];
    let entry = null;
    for (const t of termes) { if (datasetIndex.has(t)) { entry = datasetIndex.get(t); break; } }
    if (!entry) { // recherche par inclusion
      for (const t of termes) {
        for (const [n, e] of datasetIndex) { if (n === t || n.includes(t) || t.includes(n)) { entry = e; break; } }
        if (entry) break;
      }
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
  const entete = `// @ts-check\n/** Généré par src/integrations/gifs-import.mjs — ne pas éditer.\n`
    + ` * GIFs référencés depuis ${repo} (branche ${branch}). ${n} exercices associés le ${new Date().toISOString().slice(0, 10)}.\n */\n`;
  await writeFile(out, entete + "export const GIFS = " + JSON.stringify(mapping, null, 1) + ";\n", "utf8");
  console.log(`✅ ${n} GIFs associés (sur ${CATALOGUE.length} exercices) — dataset : ${entrees.length} entrées, ${gifs.length} fichiers .gif`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error("Échec import GIFs :", e.message); process.exit(1); });
}
