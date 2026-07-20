// @ts-check
/**
 * Sonde de MÉDIAS (diagnostic, ne modifie rien) — tourne dans GitHub Actions.
 *
 * 1) Inspecte un dataset cloné (ex. hasaneyldrm/exercises-dataset) et compte les
 *    fichiers par extension → dit s'il contient des ANIMATIONS (.gif/.webp/.mp4)
 *    ou uniquement des images fixes (.jpg/.png).
 * 2) Interroge l'API wger et compte combien d'exercices ont une VIDÉO
 *    (convertible en image animée), avec quelques exemples d'URL.
 *
 * Usage : node src/integrations/media-probe.mjs --dir=ext [--pages=6]
 */
import { readdir, stat } from "node:fs/promises";
import { join, extname, relative } from "node:path";

async function walkExt(dir, racine = dir, acc = { counts: {}, samples: {} }) {
  let noms;
  try { noms = await readdir(dir); } catch { return acc; }
  for (const nom of noms) {
    if (nom === ".git") continue;
    const p = join(dir, nom);
    const s = await stat(p);
    if (s.isDirectory()) await walkExt(p, racine, acc);
    else {
      const e = extname(p).toLowerCase() || "(sans)";
      acc.counts[e] = (acc.counts[e] || 0) + 1;
      (acc.samples[e] ||= []);
      if (acc.samples[e].length < 6) acc.samples[e].push(relative(racine, p).split("\\").join("/"));
    }
  }
  return acc;
}

async function sonderWgerVideos(pagesMax) {
  const API = "https://wger.de/api/v2";
  let url = `${API}/exerciseinfo/?language__code=en&limit=100&format=json`;
  let total = 0, avecVideo = 0, pages = 0;
  const exemples = [];
  while (url && pages < pagesMax) {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) { console.log(`  (wger HTTP ${r.status})`); break; }
    const j = await r.json();
    for (const b of j.results || []) {
      total++;
      const vids = b.videos || [];
      if (Array.isArray(vids) && vids.length) {
        avecVideo++;
        if (exemples.length < 3 && vids[0] && vids[0].video) exemples.push(vids[0].video);
      }
    }
    url = j.next; pages++;
  }
  return { total, avecVideo, exemples, pages };
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
  const dir = args.dir || "ext";
  const pagesMax = Number(args.pages || 6);

  console.log("=== 1) Dataset cloné :", dir, "===");
  const { counts: exts, samples } = await walkExt(dir);
  const anim = (exts[".gif"] || 0) + (exts[".webp"] || 0) + (exts[".apng"] || 0);
  const video = (exts[".mp4"] || 0) + (exts[".webm"] || 0) + (exts[".mov"] || 0);
  const fixe = (exts[".jpg"] || 0) + (exts[".jpeg"] || 0) + (exts[".png"] || 0);
  for (const [e, n] of Object.entries(exts).sort((a, b) => b[1] - a[1])) console.log(`  ${e.padEnd(8)} ${n}`);
  console.log(`  → images fixes: ${fixe} · animations (gif/webp): ${anim} · vidéos: ${video}`);
  console.log("  Exemples .jpg :\n   - " + ((samples[".jpg"] || []).join("\n   - ") || "aucun"));
  console.log("  Exemples .gif :\n   - " + ((samples[".gif"] || []).join("\n   - ") || "aucun"));

  console.log("\n=== 2) wger : exercices avec vidéo ===");
  try {
    const w = await sonderWgerVideos(pagesMax);
    console.log(`  Sur ${w.total} exercices (échantillon ${w.pages} pages), ${w.avecVideo} ont une vidéo.`);
    if (w.exemples.length) console.log("  Exemples d'URL vidéo :\n   - " + w.exemples.join("\n   - "));
    console.log(w.avecVideo > 0
      ? "  ✅ Des vidéos wger sont convertibles en images animées (GIF/WebP)."
      : "  ⚠️ Aucune vidéo trouvée sur cet échantillon.");
  } catch (e) {
    console.log("  Échec sonde wger :", e.message);
  }
}

main().catch((e) => { console.error("Sonde échouée :", e.message); process.exit(1); });
