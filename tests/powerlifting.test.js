// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  e1rmBrzycki, estimer1RM, arrondir, tablePourcentages, disquesParCote, echauffement, FORMULES_1RM,
} from "../src/engine/powerlifting.js";
import { rampeEchauffement } from "../src/engine/powerlifting.js";

test("arrondir : au pas donné (plus proche)", () => {
  assert.equal(arrondir(101.2, 2.5), 100);   // plus proche de 100
  assert.equal(arrondir(101.3, 2.5), 102.5); // plus proche de 102.5
  assert.equal(arrondir(63.2, 1.25), 63.75);
});

test("e1rmBrzycki : formule et bornes", () => {
  assert.equal(e1rmBrzycki(100, 0), 0);
  assert.equal(e1rmBrzycki(100, 40), 0); // reps >= 37 → non défini
  assert.equal(Math.round(e1rmBrzycki(100, 5)), 113); // 100*36/32 = 112.5
});

test("estimer1RM : Epley par défaut, arrondi 0,5", () => {
  assert.equal(estimer1RM(100, 5), 116.5); // 116.67 → 116.5
  assert.equal(estimer1RM(100, 5, "brzycki"), 112.5);
  assert.ok(FORMULES_1RM.epley.label.includes("Epley"));
});

test("tablePourcentages : charges arrondies", () => {
  const t = tablePourcentages(100, [100, 90, 80], 2.5);
  assert.deepEqual(t, [{ pct: 100, kg: 100 }, { pct: 90, kg: 90 }, { pct: 80, kg: 80 }]);
  const t2 = tablePourcentages(97, [90], 2.5);
  assert.equal(t2[0].kg, 87.5); // 87.3 → 87.5
});

test("disquesParCote : chargement exact", () => {
  const r = disquesParCote(100, 20); // 80 kg de disques → 40/côté
  assert.equal(r.possible, true);
  assert.equal(r.exact, true);
  assert.equal(r.totalReel, 100);
  assert.deepEqual(r.parCote, [25, 15]); // 40 = 25 + 15
});

test("disquesParCote : reste si non atteignable exactement", () => {
  const r = disquesParCote(61, 20, [25, 20, 15, 10, 5, 2.5]); // 20.5/côté
  assert.equal(r.possible, true);
  assert.equal(r.exact, false);
  assert.ok(r.resteKg > 0);
});

test("disquesParCote : charge < barre → impossible", () => {
  const r = disquesParCote(15, 20);
  assert.equal(r.possible, false);
  assert.match(r.message, /barre/);
});

test("disquesParCote : barre seule", () => {
  const r = disquesParCote(20, 20);
  assert.equal(r.possible, true);
  assert.equal(r.exact, true);
  assert.deepEqual(r.parCote, []);
});

test("echauffement : progression jusqu'au travail", () => {
  const e = echauffement(100, 20);
  assert.equal(e[0].kg, 20); // barre à vide
  assert.equal(e[e.length - 1].pct, 100);
  assert.equal(e[e.length - 1].kg, 100);
  // charges croissantes
  for (let i = 1; i < e.length; i++) assert.ok(e[i].kg >= e[i - 1].kg);
});

test("echauffement : charge légère → juste la barre", () => {
  const e = echauffement(18, 20);
  assert.equal(e.length, 1);
  assert.equal(e[0].kg, 20);
});

// ---- Échauffement calculé en séance ----

test("rampeEchauffement : barre à vide puis 50 / 70 / 85 %, jamais la charge de travail", () => {
  const r = rampeEchauffement(100, { barre: 20, pas: 2.5 });
  assert.deepEqual(r.map((x) => x.charge), [20, 50, 70, 85]);
  assert.deepEqual(r.map((x) => x.reps), [8, 5, 3, 1]);
  assert.ok(r.every((x) => x.charge < 100));
});

test("rampeEchauffement : sans barre, pas de palier à vide", () => {
  const r = rampeEchauffement(40, { barre: 0, pas: 2.5 });
  assert.deepEqual(r.map((x) => x.charge), [20, 27.5, 35]);
  assert.equal(r[0].pct, 50);
});

test("rampeEchauffement : charge légère → pas de doublon ni de palier ≥ travail", () => {
  const r = rampeEchauffement(25, { barre: 20, pas: 2.5 });
  const charges = r.map((x) => x.charge);
  assert.equal(new Set(charges).size, charges.length);
  assert.ok(charges.every((c) => c < 25 && c >= 20));
  assert.deepEqual(rampeEchauffement(20, { barre: 20 }), []);
  assert.deepEqual(rampeEchauffement(0), []);
  assert.deepEqual(rampeEchauffement(/** @type {any} */ ("abc")), []);
});

test("rampeEchauffement : en livres (barre 45, pas 5)", () => {
  const r = rampeEchauffement(225, { barre: 45, pas: 5 });
  assert.deepEqual(r.map((x) => x.charge), [45, 115, 160, 190]);
});
