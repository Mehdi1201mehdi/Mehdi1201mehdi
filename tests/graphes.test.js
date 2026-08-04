// @ts-check
/**
 * SPARKLINE DE FOND — elle se pose DERRIÈRE un chiffre, à cheval sur les bords
 * de sa tuile. Ce qui la rend fragile n'est pas le tracé mais les cas limites :
 * une série trop courte, une série plate, une valeur absurde. Un SVG mal formé
 * ne lève aucune erreur — il ne s'affiche simplement pas, ou pire, il déborde.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { sparkAire } from "../src/ui/graphes.js";

test("sparkAire : moins de trois points ne dit rien → rien n'est dessiné", () => {
  // Deux points, c'est un segment : la « forme d'une progression » qu'on prétend
  // montrer n'existe pas. Mieux vaut une tuile nette qu'un trait décoratif.
  for (const v of [[], [5], [5, 9]]) assert.equal(sparkAire(v), "");
  assert.equal(sparkAire(/** @type {any} */ (null)), "");
  assert.equal(sparkAire(/** @type {any} */ ("12,8,4")), "");
});

test("sparkAire : série valide → SVG bien formé, sans coordonnée invalide", () => {
  const svg = sparkAire([1200, 3400, 2800, 5100, 4900, 6200]);
  assert.match(svg, /^<svg /);
  assert.match(svg, /<\/svg>$/);
  assert.equal((svg.match(/<path /g) || []).length, 2, "une aire remplie + un tracé");
  assert.ok(!/NaN|Infinity|undefined/.test(svg), `coordonnée invalide : ${svg.slice(0, 200)}`);
  // Un fond ne doit jamais être annoncé aux lecteurs d'écran : le chiffre qu'il
  // accompagne porte déjà l'information.
  assert.match(svg, /aria-hidden="true"/);
  assert.match(svg, /focusable="false"/);
});

test("sparkAire : s'étire pour remplir la tuile — c'est un fond, pas une data-viz", () => {
  // `preserveAspectRatio="none"` serait un défaut sur un graphique lu ; ici
  // c'est la condition pour que la courbe touche les deux bords à toute largeur.
  assert.match(sparkAire([1, 2, 3, 4]), /preserveAspectRatio="none"/);
});

test("sparkAire : une série plate ne divise pas par zéro", () => {
  const svg = sparkAire([500, 500, 500, 500]);
  assert.ok(!/NaN/.test(svg), "une série constante doit produire une ligne, pas des NaN");
});

test("sparkAire : les valeurs non numériques sont écartées, pas propagées", () => {
  const svg = sparkAire(/** @type {any} */ ([100, "x", 300, null, 500, undefined, 700]));
  assert.ok(svg, "quatre valeurs exploitables suffisent");
  assert.ok(!/NaN/.test(svg));
});

test("sparkAire : un creux à zéro descend jusqu'en bas", () => {
  // Une semaine sans séance est l'information la plus utile de la courbe. Si
  // l'échelle se recalait sur le minimum, ce trou deviendrait un simple plateau.
  const svg = sparkAire([4000, 0, 4200, 4100]);
  const ys = [...svg.matchAll(/[ ,](\d+(?:\.\d+)?)(?=[ ,L])/g)].map((m) => Number(m[1]));
  assert.ok(ys.some((y) => y >= 84), "le zéro doit atteindre le bas du cadre (90)");
});

test("sparkAire : chaque instance a son propre dégradé", () => {
  // Deux sparklines sur un même écran partageant un `id` : la seconde écrase la
  // définition de la première, qui perd son remplissage.
  const a = sparkAire([1, 2, 3, 4]).match(/id="(sp\w+)"/)?.[1];
  const b = sparkAire([1, 2, 3, 4]).match(/id="(sp\w+)"/)?.[1];
  assert.ok(a && b && a !== b, `identifiants identiques : ${a}`);
});
