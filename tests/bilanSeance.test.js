// @ts-check
/**
 * BILAN DE SÉANCE — « 12 400 kg », c'est beaucoup ou peu ? La seule comparaison
 * qui compte est celle avec soi-même. Ces tests verrouillent ce qui la rend
 * honnête : on compare ce qui est comparable, et on se tait sinon.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  volumeSeance, nbSeries, seanceReference, comparerSeance, phraseBilan,
} from "../src/engine/bilanSeance.js";

const jour = (n) => new Date(Date.UTC(2026, 0, n, 12)).toISOString();
const log = (id, date, seanceId, exos) => ({ id, date, seanceId, dureeSec: 3600, exercices: exos });
const exo = (exerciceId, series) => ({ exerciceId, series });
const s = (chargeKg, reps) => ({ chargeKg, reps });

/* ======================= MESURES ======================= */

test("volumeSeance et nbSeries : sommes justes, données abîmées tolérées", () => {
  const l = log("a", jour(1), "s1", [
    exo("squat", [s(100, 5), s(100, 5)]),
    exo("bench", [s(80, 8)]),
  ]);
  assert.equal(volumeSeance(l), 100 * 5 + 100 * 5 + 80 * 8);
  assert.equal(nbSeries(l), 3);
  for (const v of [null, {}, { exercices: "x" }, { exercices: [null, { series: null }] }]) {
    assert.equal(volumeSeance(/** @type {any} */ (v)), 0, JSON.stringify(v));
    assert.equal(nbSeries(/** @type {any} */ (v)), 0);
  }
});

/* ======================= RÉFÉRENCE ======================= */

test("seanceReference : le même identifiant de séance prime", () => {
  const courant = log("c", jour(20), "jambes", [exo("squat", [s(120, 5)])]);
  const anterieurs = [
    log("x", jour(19), "bras", [exo("curl", [s(20, 10)])]),
    log("y", jour(10), "jambes", [exo("squat", [s(110, 5)])]),
  ];
  assert.equal(seanceReference(courant, anterieurs).id, "y");
});

test("seanceReference : sans identifiant commun, il faut un vrai recouvrement", () => {
  // Comparer un jour de jambes à un jour de bras ne veut rien dire.
  const courant = log("c", jour(20), null, [exo("squat", [s(120, 5)]), exo("presse", [s(200, 8)])]);
  const trop_different = [log("x", jour(19), null, [exo("curl", [s(20, 10)]), exo("triceps", [s(30, 10)])])];
  assert.equal(seanceReference(courant, trop_different), null);

  const proche = [log("y", jour(18), null, [exo("squat", [s(110, 5)]), exo("fentes", [s(40, 10)])])];
  assert.equal(seanceReference(courant, proche).id, "y", "50 % d'exercices communs suffit");
});

test("seanceReference : la plus RÉCENTE des candidates, et jamais elle-même", () => {
  const courant = log("c", jour(20), "jambes", [exo("squat", [s(120, 5)])]);
  const anterieurs = [
    log("vieux", jour(2), "jambes", [exo("squat", [s(100, 5)])]),
    log("recent", jour(15), "jambes", [exo("squat", [s(115, 5)])]),
    courant,
  ];
  assert.equal(seanceReference(courant, anterieurs).id, "recent");
});

test("seanceReference : historique vide → null", () => {
  assert.equal(seanceReference(log("c", jour(1), "s", [exo("squat", [s(100, 5)])]), []), null);
  assert.equal(seanceReference(log("c", jour(1), "s", [exo("squat", [s(100, 5)])]), /** @type {any} */ (null)), null);
});

/* ======================= COMPARAISON ======================= */

test("comparerSeance : première séance → l'app se TAIT et dit pourquoi", () => {
  // Pas de « +100 % » trompeur contre un historique vide.
  const c = comparerSeance(log("c", jour(1), "s1", [exo("squat", [s(100, 5)])]), []);
  assert.equal(c.comparable, false);
  assert.match(c.raison || "", /première séance/i);
  assert.deepEqual(c.progres, []);
});

test("comparerSeance : séance vide → rien à comparer, aucune erreur", () => {
  for (const l of [null, {}, { exercices: [] }]) {
    const c = comparerSeance(/** @type {any} */ (l), [log("a", jour(1), "s", [exo("squat", [s(100, 5)])])]);
    assert.equal(c.comparable, false);
    assert.ok(c.raison);
  }
});

test("comparerSeance : progrès et recul nommés exercice par exercice", () => {
  const ref = log("r", jour(10), "s1", [
    exo("squat", [s(110, 5)]), exo("bench", [s(85, 5)]), exo("row", [s(70, 8)]),
  ]);
  const courant = log("c", jour(17), "s1", [
    exo("squat", [s(120, 5)]),   // +10
    exo("bench", [s(80, 5)]),    // −5
    exo("row", [s(70, 8)]),      // égal : ni l'un ni l'autre
  ]);
  const c = comparerSeance(courant, [ref]);
  assert.equal(c.comparable, true);
  assert.equal(c.jours, 7);
  assert.deepEqual(c.progres.map((p) => p.exerciceId), ["squat"]);
  assert.equal(c.progres[0].delta, 10);
  assert.deepEqual(c.recul.map((p) => p.exerciceId), ["bench"]);
  assert.equal(c.recul[0].delta, -5);
});

test("comparerSeance : un exercice nouveau n'est pas compté comme un progrès", () => {
  // Sans point de comparaison, l'annoncer comme une progression serait faux.
  const ref = log("r", jour(10), "s1", [exo("squat", [s(110, 5)])]);
  const courant = log("c", jour(12), "s1", [exo("squat", [s(110, 5)]), exo("nouveau", [s(50, 10)])]);
  const c = comparerSeance(courant, [ref]);
  assert.deepEqual(c.progres, []);
  assert.deepEqual(c.recul, []);
});

test("comparerSeance : les écarts globaux sont signés", () => {
  const ref = log("r", jour(10), "s1", [exo("squat", [s(100, 5), s(100, 5)])]);          // 1000 kg, 2 séries
  const courant = log("c", jour(12), "s1", [exo("squat", [s(100, 5)])]);                  // 500 kg, 1 série
  courant.dureeSec = 1800; ref.dureeSec = 3600;
  const c = comparerSeance(courant, [ref]);
  assert.equal(c.delta.volume, -500);
  assert.equal(c.delta.series, -1);
  assert.equal(c.delta.duree, -1800);
});

test("comparerSeance : le progrès le plus fort passe en tête", () => {
  const ref = log("r", jour(10), "s1", [exo("a", [s(50, 5)]), exo("b", [s(100, 5)])]);
  const courant = log("c", jour(12), "s1", [exo("a", [s(52, 5)]), exo("b", [s(120, 5)])]);
  const c = comparerSeance(courant, [ref]);
  assert.equal(c.progres[0].exerciceId, "b", "+20 avant +2");
});

/* ======================= PHRASE DE TÊTE ======================= */

test("phraseBilan : un record prime sur tout le reste", () => {
  const c = comparerSeance(log("c", jour(2), "s", [exo("squat", [s(100, 5)])]), []);
  assert.match(phraseBilan(c, 1), /record personnel/i);
  assert.match(phraseBilan(c, 3), /3 records/i);
});

test("phraseBilan : sinon le progrès le plus marquant, chiffré et nommé", () => {
  const ref = log("r", jour(10), "s1", [exo("squat", [s(110, 5)])]);
  const courant = log("c", jour(17), "s1", [exo("squat", [s(120, 5)])]);
  const c = comparerSeance(courant, [ref]);
  const p = phraseBilan(c, 0, () => "Squat");
  assert.match(p, /Squat/);
  assert.match(p, /120 kg/);
  assert.match(p, /10 kg/);
  assert.match(p, /7 j/);
});

test("phraseBilan : une séance plus légère est dite sans fausse louange", () => {
  // « Excellent travail, continue comme ça ! » ne dit rien et on cesse de le
  // lire dès la deuxième séance.
  const ref = log("r", jour(10), "s1", [exo("squat", [s(120, 5), s(120, 5)])]);
  const courant = log("c", jour(12), "s1", [exo("squat", [s(110, 5)])]);
  const p = phraseBilan(comparerSeance(courant, [ref]), 0);
  assert.match(p, /plus légère/i);
  assert.doesNotMatch(p, /excellent|bravo|continue comme/i);
});

test("phraseBilan : sans comparaison possible, une phrase neutre et vraie", () => {
  assert.equal(phraseBilan(comparerSeance(log("c", jour(1), "s", [exo("a", [s(10, 10)])]), []), 0),
    "Séance enregistrée");
  assert.equal(phraseBilan(/** @type {any} */ (null), 0), "Séance enregistrée");
});
