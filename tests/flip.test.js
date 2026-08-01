// @ts-check
/**
 * ÉLÉMENTS PARTAGÉS — le cœur de FLIP est de l'arithmétique, donc il se teste
 * sans navigateur. Une erreur de signe ici ferait partir le titre du mauvais
 * côté : le genre de défaut qu'on voit tout de suite à l'écran mais qu'on
 * n'attrape jamais deux fois de suite à la main.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { calculerFlip, transformFlip, SEUIL_PX } from "../src/ui/flip.js";

const r = (x, y, width, height) => ({ x, y, width, height });

test("calculerFlip : le décalage ramène l'élément à sa position de départ", () => {
  // L'élément était en haut à gauche, il arrive plus bas et à droite.
  const f = calculerFlip(r(20, 100, 200, 40), r(60, 300, 200, 40));
  assert.equal(f.dx, -40, "il doit repartir vers la gauche");
  assert.equal(f.dy, -200, "et vers le haut");
  assert.equal(f.sx, 1);
  assert.equal(f.sy, 1);
  assert.equal(f.utile, true);
});

test("calculerFlip : l'échelle est calculée séparément en X et en Y", () => {
  // Un titre qui rétrécit ne change pas dans les mêmes proportions en largeur
  // et en hauteur : une échelle unique le déformerait.
  const f = calculerFlip(r(0, 0, 300, 60), r(0, 0, 150, 40));
  assert.equal(f.sx, 2);
  assert.equal(f.sy, 1.5);
  assert.equal(f.utile, true);
});

test("calculerFlip : un déplacement imperceptible n'est pas animé", () => {
  // Deux pixels ne se voient pas ; les animer coûterait une image pour rien.
  const f = calculerFlip(r(10, 10, 100, 20), r(12, 11, 100, 20));
  assert.equal(f.utile, false, `dx=${f.dx} dy=${f.dy} sous le seuil de ${SEUIL_PX} px`);
  // Juste au-dessus du seuil, en revanche, on anime.
  assert.equal(calculerFlip(r(0, 0, 100, 20), r(SEUIL_PX + 1, 0, 100, 20)).utile, true);
});

test("calculerFlip : un grossissement de 1 % est ignoré, 5 % ne l'est pas", () => {
  assert.equal(calculerFlip(r(0, 0, 101, 20), r(0, 0, 100, 20)).utile, false);
  assert.equal(calculerFlip(r(0, 0, 105, 20), r(0, 0, 100, 20)).utile, true);
});

test("calculerFlip : entrées manquantes ou dégénérées → aucune animation", () => {
  const nul = { dx: 0, dy: 0, sx: 1, sy: 1, utile: false };
  assert.deepEqual(calculerFlip(null, r(0, 0, 10, 10)), nul, "élément absent avant");
  assert.deepEqual(calculerFlip(r(0, 0, 10, 10), null), nul, "élément absent après");
  // Un élément masqué mesure 0 : diviser par sa taille donnerait l'infini.
  assert.deepEqual(calculerFlip(r(0, 0, 10, 10), r(0, 0, 0, 0)), nul, "arrivée invisible");
  assert.deepEqual(calculerFlip(r(0, 0, 0, 10), r(0, 0, 10, 10)), nul, "départ invisible");
});

test("calculerFlip : aller-retour symétrique", () => {
  const a = r(20, 100, 300, 60), b = r(60, 300, 150, 40);
  const aller = calculerFlip(a, b), retour = calculerFlip(b, a);
  assert.equal(aller.dx, -retour.dx);
  assert.equal(aller.dy, -retour.dy);
  assert.ok(Math.abs(aller.sx * retour.sx - 1) < 1e-9, "les échelles sont inverses");
});

test("transformFlip : produit un transform CSS valide et composable", () => {
  const css = transformFlip({ dx: -40, dy: -200, sx: 2, sy: 1.5 });
  assert.match(css, /^translate3d\(-40\.0px, -200\.0px, 0\) scale\(2\.0000, 1\.5000\)$/);
  // translate3d, pas translate : la couche est promue sur le compositeur.
  assert.match(css, /translate3d/);
});
