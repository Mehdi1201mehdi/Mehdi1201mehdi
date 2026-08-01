// @ts-check
/**
 * CORPS EN LUMIÈRE — le cadrage et l'intensité sont du calcul pur.
 *
 * Une erreur d'échelle décalerait le canevas par rapport au SVG posé au-dessus :
 * le halo éclairerait à côté du muscle qu'il est censé montrer. C'est visible à
 * l'œil, mais seulement si on pense à regarder le bon écran à la bonne taille.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cadrer, intensite, rayonHalo, VUE, FLOU_MAX_PX } from "../src/ui/anatomieCanvas.js";

test("cadrer : deux vues côte à côte, centrées, proportions conservées", () => {
  // Canevas exactement au format de deux vues : ça remplit tout, sans marge.
  const c = cadrer(VUE.largeur * 2, VUE.hauteur, 2);
  assert.equal(c.echelle, 1);
  assert.equal(c.dx, 0);
  assert.equal(c.dy, 0);
});

test("cadrer : limité par la hauteur → marges horizontales", () => {
  // Canevas très large : c'est la hauteur qui contraint, le corps se centre.
  const c = cadrer(4000, VUE.hauteur, 2);
  assert.equal(c.echelle, 1, "la hauteur impose l'échelle");
  assert.equal(c.dx, (4000 - VUE.largeur * 2) / 2, "centré horizontalement");
  assert.equal(c.dy, 0);
});

test("cadrer : limité par la largeur → marges verticales", () => {
  const c = cadrer(VUE.largeur, VUE.hauteur * 4, 1);
  assert.equal(c.echelle, 1);
  assert.equal(c.dx, 0);
  assert.equal(c.dy, (VUE.hauteur * 4 - VUE.hauteur) / 2, "centré verticalement");
});

test("cadrer : une seule vue occupe deux fois plus de place que dans une paire", () => {
  const une = cadrer(724, 1448, 1), deux = cadrer(724, 1448, 2);
  assert.ok(une.echelle > deux.echelle, `${une.echelle} devrait dépasser ${deux.echelle}`);
  assert.equal(une.echelle / deux.echelle, 2);
});

test("cadrer : dimensions absentes ou nulles → aucun rendu, pas de division par zéro", () => {
  for (const [l, h] of [[0, 100], [100, 0], [-5, 100], [NaN, 100], [100, NaN]]) {
    const c = cadrer(l, h, 2);
    assert.equal(c.echelle, 0, `${l}×${h} devrait être refusé`);
    assert.ok(Number.isFinite(c.dx) && Number.isFinite(c.dy), "aucun NaN ne doit sortir");
  }
});

test("cadrer : un nombre de vues aberrant est ramené à au moins une", () => {
  assert.ok(cadrer(724, 1448, 0).echelle > 0);
  assert.ok(cadrer(724, 1448, /** @type {any} */ (null)).echelle > 0);
});

test("intensite : bornée à 0–1, insensible aux valeurs sales", () => {
  assert.equal(intensite({ pectoraux: 0.5 }, "pectoraux"), 0.5);
  assert.equal(intensite({ pectoraux: 3 }, "pectoraux"), 1, "plafonnée");
  assert.equal(intensite({ pectoraux: -2 }, "pectoraux"), 0, "plancher");
  assert.equal(intensite({}, "pectoraux"), 0, "muscle absent");
  assert.equal(intensite(/** @type {any} */ (null), "pectoraux"), 0);
  assert.equal(intensite({ pectoraux: /** @type {any} */ ("beaucoup") }, "pectoraux"), 0);
  assert.equal(intensite({ pectoraux: NaN }, "pectoraux"), 0);
});

test("rayonHalo : un muscle frais n'émet AUCUNE lumière", () => {
  // Sans ce zéro net, tout le corps baignerait dans une brume permanente et
  // l'information — quels muscles ont travaillé — disparaîtrait.
  assert.equal(rayonHalo(0), 0);
  assert.equal(rayonHalo(0.01), 0);
  assert.ok(rayonHalo(0.1) > 0, "au-delà du seuil, ça rayonne");
});

test("rayonHalo : croissant et borné", () => {
  assert.ok(rayonHalo(0.3) < rayonHalo(0.7), "plus fatigué = plus lumineux");
  assert.ok(rayonHalo(1) <= FLOU_MAX_PX, "au-delà, les halos voisins se confondent");
  assert.equal(rayonHalo(5), rayonHalo(1), "une intensité aberrante ne dépasse pas le maximum");
  assert.equal(rayonHalo(/** @type {any} */ ("x")), 0);
});
