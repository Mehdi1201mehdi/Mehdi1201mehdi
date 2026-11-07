#!/usr/bin/env node
// @ts-check
/**
 * Prépare le dossier `www/` embarqué dans l'application Android (Capacitor).
 *
 * Le site reste SANS BUILD : GitHub Pages sert toujours les fichiers du dépôt
 * tels quels. Ce script ne fait que COPIER les fichiers de l'application web
 * dans `www/` (ignoré par Git), que `npx cap sync android` place ensuite dans
 * l'APK. Rien n'est transpilé, minifié ni transformé, à une exception près :
 * le fichier de configuration d'environnement `src/config/plateforme.js` est
 * réécrit pour signaler à l'app qu'elle tourne dans l'APK.
 *
 * Usage : node scripts/preparer-android.mjs
 */
import { cpSync, existsSync, mkdirSync, rmSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const SORTIE = join(RACINE, "www");

// Ce qui compose l'application web. Tout le reste (tests, docs, audits, outils
// d'import, serveur relais, projet Android) n'a rien à faire dans l'APK.
const FICHIERS = ["index.html", "boot.js", "style.css", "manifest.webmanifest", "sw.js"];
const DOSSIERS = ["assets", "src"];
// Scripts Node d'import de données (exécutés en CI, pas dans le navigateur).
const EXCLUS = [/\.mjs$/];

rmSync(SORTIE, { recursive: true, force: true });
mkdirSync(SORTIE, { recursive: true });

for (const f of FICHIERS) {
  const src = join(RACINE, f);
  if (!existsSync(src)) throw new Error(`Fichier manquant : ${f}`);
  cpSync(src, join(SORTIE, f));
}
for (const d of DOSSIERS) {
  cpSync(join(RACINE, d), join(SORTIE, d), {
    recursive: true,
    filter: (src) => !EXCLUS.some((re) => re.test(src)),
  });
}

// Signale la plateforme : l'app peut adapter ce qui diffère dans l'APK
// (téléchargement des sauvegardes, notifications…).
writeFileSync(join(SORTIE, "src/config/plateforme.js"),
  "// Généré par scripts/preparer-android.mjs — ne pas modifier.\nexport const PLATEFORME = \"android\";\n");

// Bilan
let n = 0, octets = 0;
const compter = (dir) => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) compter(p); else { n++; octets += s.size; }
  }
};
compter(SORTIE);
console.log(`www/ prêt : ${n} fichiers, ${(octets / 1024 / 1024).toFixed(1)} Mo (${relative(process.cwd(), SORTIE) || "www"}).`);
