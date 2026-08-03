// @ts-check
/**
 * DÉMONSTRATIONS — un exercice sans animation, c'est un exercice qu'on exécute
 * mal. Ces tests verrouillent la couverture et surtout empêchent qu'une
 * régénération la fasse RECULER : une passe de l'importeur a rendu 190
 * associations là où le fichier en portait 224. Écraser aurait supprimé 34
 * démonstrations qui marchaient, sans que rien ne le signale.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { GIFS } from "../src/data/gifs.js";
import { CATALOGUE } from "../src/data/exercises.js";
import { EXTRA_EXERCISES } from "../src/data/exercises-extra.js";
import { TERMES } from "../src/integrations/exercisedb.js";

/** Tous les exercices que l'application peut afficher. */
const TOUS = (() => {
  const vus = new Map();
  for (const e of [...CATALOGUE, ...EXTRA_EXERCISES]) if (e && e.id && !vus.has(e.id)) vus.set(e.id, e);
  return [...vus.values()];
})();

/** Plancher de couverture. À n'abaisser que délibérément, jamais par accident. */
const PLANCHER = 275;

test("couverture : la barre ne redescend pas", () => {
  const n = TOUS.filter((e) => GIFS[e.id]).length;
  assert.ok(n >= PLANCHER,
    `${n} exercices avec démonstration, plancher ${PLANCHER}. `
    + "Une régénération vient probablement d'écraser des associations valides.");
});

test("aucune démonstration orpheline : toute entrée vise un exercice réel", () => {
  // Une clé qui ne correspond à aucun exercice n'affiche jamais rien, et
  // personne ne s'en aperçoit.
  const ids = new Set(TOUS.map((e) => e.id));
  const orphelines = Object.keys(GIFS).filter((k) => !ids.has(k));
  assert.deepEqual(orphelines, [], "clés sans exercice correspondant");
});

test("les mouvements de BASE ont tous leur démonstration", () => {
  // Le soulevé de terre en a manqué pendant tout ce temps : le catalogue
  // « extra » n'était jamais soumis au moteur de correspondance.
  const base = [
    "squat-barre", "developpe-couche-barre", "souleve-terre-barre", "rowing-barre",
    "developpe-incline-barre", "tractions", "developpe-epaules-halteres",
    "curl-halteres", "curl-marteau", "barre-au-front", "shrugs", "t-barre",
  ];
  const sans = base.filter((id) => !GIFS[id]);
  assert.deepEqual(sans, [], "mouvements de base sans démonstration");
});

test("toutes les URL pointent vers la source documentée, en https", () => {
  for (const [id, url] of Object.entries(GIFS)) {
    assert.match(url, /^https:\/\//, `${id} : URL non sécurisée`);
    assert.match(url, /^https:\/\/raw\.githubusercontent\.com\//, `${id} : source non documentée`);
  }
});

test("les animations partagées ne se multiplient pas", () => {
  // Une même animation sert légitimement plusieurs variantes d'un mouvement
  // (dips au banc et dips aux barres, oiseaux face au sol et élévations
  // postérieures). Ce test ne les interdit pas : il empêche que le nombre
  // AUGMENTE, ce qui signalerait un moteur de correspondance qui retombe sur le
  // même résultat par défaut — c'est ainsi que six exercices d'abdominaux se
  // sont retrouvés à montrer une course à pied.
  const compte = new Map();
  for (const u of Object.values(GIFS)) compte.set(u, (compte.get(u) || 0) + 1);
  const partagees = [...compte.values()].filter((n) => n > 1).length;
  assert.ok(partagees <= 52, `${partagees} animations partagées (plafond 52)`);
});

test("aucun exercice d'abdominaux ne montre une course à pied", () => {
  // Le cas réel qui a motivé ces tests. Une démonstration fausse est pire que
  // pas de démonstration : on apprend le mauvais geste.
  const COURSE = "0685-oLrKqDH.gif";
  const fautifs = Object.entries(GIFS)
    .filter(([id, u]) => u.endsWith(COURSE) && !/run|course|treadmill|jog|marche/i.test(id));
  assert.deepEqual(fautifs.map(([id]) => id), [], "animation de course sur un exercice qui n'en est pas");
});

test("TERMES : chaque traduction vise un exercice qui existe", () => {
  const ids = new Set(TOUS.map((e) => e.id));
  const fantomes = Object.keys(TERMES).filter((k) => !ids.has(k));
  assert.deepEqual(fantomes, [], "traductions pour des exercices inexistants");
});
