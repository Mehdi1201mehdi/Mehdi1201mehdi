// @ts-check
// Le service worker met en cache une liste écrite à la main : un module oublié
// marche en ligne et casse hors connexion, sans qu'aucun autre test le voie.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const racine = new URL("..", import.meta.url).pathname;
const sw = readFileSync(join(racine, "sw.js"), "utf8");
const assets = new Set([...sw.matchAll(/"(\.\/[^"]+)"/g)].map((m) => m[1]));

/** @param {string} dir @returns {string[]} */
const fichiers = (dir) => readdirSync(join(racine, dir)).flatMap((n) => {
  const rel = `${dir}/${n}`;
  return statSync(join(racine, rel)).isDirectory() ? fichiers(rel) : [rel];
});

test("sw.js : tous les modules de src/ sont dans la liste hors ligne", () => {
  const manquants = fichiers("src").filter((f) => f.endsWith(".js") && !assets.has(`./${f}`));
  assert.deepEqual(manquants, []);
});

test("sw.js : chaque fichier listé existe réellement", () => {
  const absents = [...assets].filter((a) => a !== "./" && !a.endsWith("/")).filter((a) => {
    try { statSync(join(racine, a)); return false; } catch (e) { return true; }
  });
  assert.deepEqual(absents, []);
});
