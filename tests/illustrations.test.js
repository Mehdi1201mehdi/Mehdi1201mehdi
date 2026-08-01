// @ts-check
/**
 * ILLUSTRATIONS — ce qui fait une FAMILLE se vérifie mécaniquement.
 *
 * Une illustration ajoutée plus tard avec une autre épaisseur de trait, un
 * aplat de couleur ou une taille différente casserait la cohérence sans rien
 * casser du code. Ces tests attrapent exactement ça.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ILLUSTRATIONS, illustration, CADRE, TRAITS } from "../src/ui/illustrations.js";

const toutes = Object.entries(ILLUSTRATIONS);

test("chaque illustration se dessine et se décrit", () => {
  assert.ok(toutes.length >= 4, "il en faut assez pour couvrir les écrans vides");
  for (const [cle, i] of toutes) {
    assert.ok(i.titre && i.titre.length > 5, `${cle} : titre manquant`);
    const svg = i.dessin();
    assert.match(svg, /^<svg /, `${cle} : ce n'est pas un SVG`);
    assert.match(svg, /<\/svg>$/, `${cle} : SVG non refermé`);
    assert.ok(svg.includes(`aria-label="${i.titre}"`), `${cle} : le titre doit être exposé`);
  }
});

test("toutes partagent le même cadre — sinon elles ne s'alignent pas", () => {
  for (const [cle, i] of toutes) {
    assert.ok(i.dessin().includes(`viewBox="0 0 ${CADRE.largeur} ${CADRE.hauteur}"`),
      `${cle} : cadre différent des autres`);
  }
});

test("aucune illustration ne sort de son cadre", () => {
  // Un tracé qui dépasse serait rogné au rendu, de façon invisible en test.
  for (const [cle, i] of toutes) {
    const svg = i.dessin();
    for (const m of svg.matchAll(/\b(?:x|cx|x1|x2)="(-?[\d.]+)"/g)) {
      assert.ok(+m[1] >= 0 && +m[1] <= CADRE.largeur, `${cle} : abscisse ${m[1]} hors cadre`);
    }
    for (const m of svg.matchAll(/\b(?:y|cy|y1|y2)="(-?[\d.]+)"/g)) {
      assert.ok(+m[1] >= 0 && +m[1] <= CADRE.hauteur, `${cle} : ordonnée ${m[1]} hors cadre`);
    }
  }
});

test("tracé uniquement, jamais d'aplat de couleur", () => {
  // L'iconographie de l'app est au trait. Un aplat détonnerait immédiatement.
  for (const [cle, i] of toutes) {
    for (const m of i.dessin().matchAll(/fill="([^"]+)"/g)) {
      const v = m[1];
      const permis = v === "none" || v === "var(--surface)" || v === "var(--accent)";
      assert.ok(permis, `${cle} : remplissage interdit « ${v} »`);
    }
  }
});

test("deux épaisseurs de trait, pas trois", () => {
  const permises = new Set([String(TRAITS.sujet), String(TRAITS.decor)]);
  for (const [cle, i] of toutes) {
    for (const m of i.dessin().matchAll(/stroke-width="([^"]+)"/g)) {
      assert.ok(permises.has(m[1]), `${cle} : épaisseur ${m[1]} hors du système`);
    }
  }
});

test("les couleurs viennent des jetons du thème, jamais en dur", () => {
  for (const [cle, i] of toutes) {
    for (const m of i.dessin().matchAll(/stroke="([^"]+)"/g)) {
      // `none` n'est pas une couleur : c'est l'absence de contour, légitime sur
      // un point plein.
      if (m[1] === "none") continue;
      assert.match(m[1], /^var\(--/, `${cle} : couleur en dur « ${m[1]} »`);
    }
  }
});

test("chaque scène est posée sur un sol — sans quoi le dessin flotte", () => {
  for (const [cle, i] of toutes) {
    assert.match(i.dessin(), /<line x1="14" y1="84"/, `${cle} : ligne de sol manquante`);
  }
});

test("extrémités et jointures arrondies partout", () => {
  for (const [cle, i] of toutes) {
    assert.match(i.dessin(), /stroke-linecap="round"/, `${cle} : extrémités carrées`);
    assert.match(i.dessin(), /stroke-linejoin="round"/, `${cle} : jointures carrées`);
  }
});

test("illustration() : clé inconnue → rien, jamais un carré vide", () => {
  assert.equal(illustration("nexiste-pas"), "");
  assert.equal(illustration(""), "");
  assert.equal(illustration(/** @type {any} */ (null)), "");
  assert.ok(illustration("courbe").length > 40, "une clé connue rend bien un dessin");
});

test("les écrans vides de l'app sont tous couverts", () => {
  for (const cle of ["courbe", "volumes", "recherche", "plan"]) {
    assert.ok(ILLUSTRATIONS[cle], `illustration manquante : ${cle}`);
  }
});
