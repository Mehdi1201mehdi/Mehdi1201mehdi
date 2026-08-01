// @ts-check
/**
 * MÉDAILLES — le rang doit se LIRE sur le dessin.
 *
 * Le design system interdit l'arc-en-ciel : la hiérarchie passe donc par la
 * richesse du tracé, pas par cinq teintes. Ces tests vérifient que cette
 * hiérarchie existe réellement — qu'un rang 5 est bien plus riche qu'un rang 1 —
 * et qu'aucune couleur ne s'est glissée en dur.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { medaille, hexagone, fondRang, RANGS } from "../src/ui/medailles.js";

const tous = Array.from({ length: RANGS }, (_, i) => i + 1);
/** Nombre d'éléments dessinés dans un SVG. */
const elements = (svg) => (svg.match(/<(polygon|circle|path)\b/g) || []).length;

test("hexagone : six sommets, pointe en haut, inscrits dans le rayon", () => {
  const pts = hexagone(32, 32, 26).split(" ").map((p) => p.split(",").map(Number));
  assert.equal(pts.length, 6);
  for (const [x, y] of pts) {
    const d = Math.hypot(x - 32, y - 32);
    assert.ok(Math.abs(d - 26) < 0.2, `sommet à ${d.toFixed(2)} du centre au lieu de 26`);
  }
  // Pointe en haut : un sommet exactement au-dessus du centre.
  assert.ok(pts.some(([x, y]) => Math.abs(x - 32) < 0.2 && y < 32), "aucun sommet au sommet");
});

test("hexagone : centre et rayon respectés quels qu'ils soient", () => {
  const pts = hexagone(10, 20, 5).split(" ").map((p) => p.split(",").map(Number));
  for (const [x, y] of pts) {
    assert.ok(Math.abs(Math.hypot(x - 10, y - 20) - 5) < 0.2);
  }
});

test("fondRang : le rang 1 n'a AUCUN fond — c'est ce qui le distingue du 2", () => {
  assert.equal(fondRang(1), 0);
  for (let r = 2; r <= RANGS; r++) {
    assert.ok(fondRang(r) > fondRang(r - 1), `rang ${r} pas plus rempli que ${r - 1}`);
  }
  assert.ok(fondRang(RANGS) < 0.6, "un fond trop dense masquerait le tracé");
});

test("fondRang : rang hors bornes ramené dans l'échelle", () => {
  assert.equal(fondRang(0), fondRang(1));
  assert.equal(fondRang(99), fondRang(RANGS));
  assert.equal(fondRang(/** @type {any} */ ("x")), fondRang(1));
});

test("medaille : la richesse du dessin croît STRICTEMENT avec le rang", () => {
  // C'est tout le principe : sans couleur pour distinguer les rangs, c'est le
  // nombre d'éléments qui porte la hiérarchie.
  let precedent = 0;
  for (const r of tous) {
    const n = elements(medaille({ rang: r }));
    assert.ok(n > precedent, `rang ${r} : ${n} éléments, pas plus riche que le rang précédent (${precedent})`);
    precedent = n;
  }
});

test("medaille : une seule couleur, jamais d'arc-en-ciel", () => {
  for (const r of tous) {
    for (const etat of [true, false]) {
      const svg = medaille({ rang: r, obtenu: etat });
      const couleurs = new Set([...svg.matchAll(/(?:fill|stroke)="(var\([^)]+\)|#[0-9a-f]{3,8})"/gi)].map((m) => m[1]));
      assert.equal(couleurs.size, 1, `rang ${r} : ${couleurs.size} couleurs → ${[...couleurs].join(", ")}`);
      assert.match([...couleurs][0], /^var\(--/, "couleur en dur");
    }
  }
});

test("medaille : un trophée non obtenu emploie le MÊME dessin, en retrait", () => {
  for (const r of tous) {
    const pris = medaille({ rang: r, obtenu: true });
    const vise = medaille({ rang: r, obtenu: false });
    // Même dessin : on voit ce qu'on vise, pas un cadenas générique.
    assert.ok(Math.abs(elements(pris) - elements(vise)) <= 1,
      `rang ${r} : le dessin change trop entre obtenu et non obtenu`);
    assert.match(vise, /var\(--faint\)/, "un trophée non obtenu doit être en graphite");
    assert.ok(!/class="medaille prise"/.test(vise), "il ne doit pas porter la classe des trophées pris");
  }
});

test("medaille : le dessin tient dans son cadre", () => {
  for (const r of tous) {
    const svg = medaille({ rang: r });
    assert.match(svg, /viewBox="0 0 64 64"/);
    for (const m of svg.matchAll(/points="([^"]+)"/g)) {
      for (const p of m[1].split(" ")) {
        const [x, y] = p.split(",").map(Number);
        assert.ok(x >= 0 && x <= 64 && y >= 0 && y <= 64, `rang ${r} : sommet ${p} hors cadre`);
      }
    }
  }
});

test("medaille : toujours un nom accessible", () => {
  assert.match(medaille({ rang: 3, titre: "Discipliné" }), /aria-label="Discipliné"/);
  // Sans titre fourni, on décrit quand même le rang et l'état.
  assert.match(medaille({ rang: 2, obtenu: false }), /aria-label="[^"]*rang 2[^"]*non obtenu"/);
});

test("medaille : rang aberrant → dessin valide, jamais de SVG cassé", () => {
  for (const r of [0, -3, 99, NaN, /** @type {any} */ ("deux")]) {
    const svg = medaille({ rang: r });
    assert.match(svg, /^<svg /);
    assert.match(svg, /<\/svg>$/);
    assert.ok(elements(svg) >= 2, "un dessin minimal doit rester");
  }
});

test("medaille : deux médailles côte à côte n'ont pas le même identifiant de filtre", () => {
  // Deux `id` identiques dans une page feraient partager le même filtre :
  // le halo de l'une s'appliquerait à l'autre.
  const a = medaille({ rang: 5 }), b = medaille({ rang: 5 });
  const idA = /id="([^"]+)"/.exec(a)[1], idB = /id="([^"]+)"/.exec(b)[1];
  assert.notEqual(idA, idB);
});
