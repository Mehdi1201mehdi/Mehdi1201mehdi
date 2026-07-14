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
