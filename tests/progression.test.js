// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { recommander, incrementCharge } from "../src/engine/progression.js";
import { getExercise } from "../src/data/exercises.js";

const perf = (series, douleur = false) => ({ series, douleur });
const serie = (chargeKg, reps, rir = 2) => ({ chargeKg, reps, rir, dureeSec: null });

test("première séance sans historique → action 'debut', aucune charge imposée", () => {
  const r = recommander("developpe-couche-halteres", [8, 12], null);
  assert.equal(r.action, "debut");
  assert.equal(r.chargeKg, null);
});

test("toutes séries au sommet de plage avec RIR ≥ 2 → augmenter la charge", () => {
  const r = recommander("developpe-couche-halteres", [8, 12], perf([serie(20, 12), serie(20, 12), serie(20, 12)]));
  assert.equal(r.action, "augmenter");
  assert.equal(r.chargeKg, 22, "haltères : +2 kg");
  assert.match(r.audit, /\+2 kg/);
});

test("une séance ratée (séries sous la plage) → maintenir", () => {
  const r = recommander("developpe-couche-halteres", [8, 12], perf([serie(20, 12), serie(20, 7), serie(20, 6)]));
  assert.equal(r.action, "maintenir");
  assert.equal(r.chargeKg, 20);
});

test("échec sur deux séances consécutives → réduire ~10 %", () => {
  const dern = perf([serie(20, 6), serie(20, 6)]);
  const avant = perf([serie(20, 7), serie(20, 6)]);
  const r = recommander("developpe-couche-halteres", [8, 12], dern, avant);
  assert.equal(r.action, "reduire");
  assert.equal(r.chargeKg, 18);
});

test("douleur signalée → suspension de la progression + renvoi vers un pro", () => {
  const r = recommander("developpe-couche-halteres", [8, 12], perf([serie(20, 10)], true));
  assert.equal(r.action, "stop_douleur");
  assert.match(r.message, /professionnel de santé/);
});

test("exercice au poids du corps au sommet de plage → progression vers une variante", () => {
  const r = recommander("pompes", [8, 20], perf([serie(0, 20), serie(0, 20), serie(0, 20)]));
  assert.equal(r.action, "progresser_variante");
  assert.equal(r.modeReps, true);
});

test("incrément de charge : barre bas du corps = 5 kg, haltères = 2 kg", () => {
  assert.equal(incrementCharge(getExercise("squat-barre")).pas, 5);
  assert.equal(incrementCharge(getExercise("developpe-couche-halteres")).pas, 2);
  assert.equal(incrementCharge(getExercise("pompes")).mode, "reps");
});

test("exemple du cahier des charges : 3 × 10 à 50 kg, RIR 2 → viser 11 reps à 50 kg", () => {
  const r = recommander("developpe-couche-barre", [8, 12], perf([serie(50, 10), serie(50, 10), serie(50, 10)]));
  assert.equal(r.action, "maintenir");
  assert.equal(r.chargeKg, 50);
  assert.deepEqual(r.objectifReps, [11, 11, 11]);
  assert.match(r.message, /11 · 11 · 11/);
});

test("pas de +1 rep sur une série faite à l'échec", () => {
  const r = recommander("developpe-couche-barre", [8, 12], perf([serie(50, 10, 2), serie(50, 9, 0)]));
  assert.deepEqual(r.objectifReps, [11, 9]);
});

test("RPE converti en RIR (RPE 10 = échec)", () => {
  const r = recommander("developpe-couche-barre", [8, 12], perf([{ chargeKg: 50, reps: 10, rir: null, rpe: 10 }]));
  assert.deepEqual(r.objectifReps, [10]);
});

test("hausse plafonnée à 10 % : 8 kg d'haltères au sommet → on prolonge la plage avant +2 kg", () => {
  const r = recommander("developpe-couche-halteres", [8, 12], perf([serie(8, 12), serie(8, 12), serie(8, 12)]));
  assert.equal(r.action, "maintenir");
  assert.deepEqual(r.objectifReps, [13, 13, 13]);
  assert.match(r.message, /10 %/);
  const r2 = recommander("developpe-couche-halteres", [8, 12], perf([serie(8, 14), serie(8, 14), serie(8, 14)]));
  assert.equal(r2.action, "augmenter");
});

test("technique dégradée : aucune hausse, mêmes répétitions", () => {
  const r = recommander("developpe-couche-halteres", [8, 12], { series: [serie(20, 12), serie(20, 12)], douleur: false, techniqueDegradee: true });
  assert.equal(r.action, "maintenir");
  assert.equal(r.chargeKg, 20);
  assert.deepEqual(r.objectifReps, [12, 12]);
});

test("stagnation détectée sur l'historique, avec la cause", async () => {
  const { detecterStagnation } = await import("../src/engine/progression.js");
  const d = (j) => new Date(Date.parse("2026-11-01") + j * 864e5).toISOString();
  const h = [0, 1, 2, 3].map((k) => ({ date: d(10 - k * 3), series: [serie(60, 8, 4), serie(60, 8, 4), serie(60, 8, 4)] }));
  const st = detecterStagnation(h);
  assert.ok(st);
  assert.ok(st.causes.some((c) => /Intensité/.test(c)));
  const prog = [0, 1, 2, 3].map((k) => ({ date: d(10 - k * 3), series: [serie(60 - k * 2.5, 8)] }));
  assert.equal(detecterStagnation(prog), null, "progression régulière : pas de stagnation");
  const r = recommander("developpe-couche-barre", [8, 12], h[0], h[1], h);
  assert.ok(r.stagnation);
  assert.match(r.message, /séances sans progrès/);
});
