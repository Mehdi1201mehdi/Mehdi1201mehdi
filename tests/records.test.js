// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  e1rmEpley, FORMULE_1RM, meilleursParExercice, classementRecords, detecterRecords,
} from "../src/engine/records.js";

test("e1rmEpley : formule d'Epley", () => {
  assert.equal(e1rmEpley(100, 0), 0);
  assert.equal(e1rmEpley(0, 5), 0);
  assert.equal(Math.round(e1rmEpley(100, 5)), 117); // 100*(1+5/30)=116.67
  assert.ok(FORMULE_1RM.includes("Epley"));
});

const logsA = [
  { exercices: [{ exerciceId: "developpe", series: [{ chargeKg: 60, reps: 8 }, { chargeKg: 60, reps: 6 }] }] },
  { exercices: [{ exerciceId: "developpe", series: [{ chargeKg: 62.5, reps: 6 }] }] },
];

test("meilleursParExercice : max poids/reps/e1rm/volume", () => {
  const b = meilleursParExercice(logsA);
  assert.equal(b.developpe.poidsMax, 62.5);
  assert.equal(b.developpe.repsMax, 8);
  // meilleur e1rm : max(60*(1+8/30)=76, 62.5*(1+6/30)=75) → 76
  assert.equal(Math.round(b.developpe.e1rmMax), 76);
  assert.equal(b.developpe.volMax, 60 * 8);
});

test("classementRecords : trié par 1RM, nom résolu", () => {
  const cl = classementRecords(logsA, (id) => id.toUpperCase());
  assert.equal(cl[0].nom, "DEVELOPPE");
  assert.equal(cl[0].e1rm, 76);
  assert.equal(cl[0].poidsMax, 62.5);
});

test("detecterRecords : nouveau 1RM détecté", () => {
  const nouveau = { exercices: [{ exerciceId: "developpe", series: [{ chargeKg: 65, reps: 8 }] }] };
  const prs = detecterRecords(logsA, nouveau);
  assert.equal(prs.length, 1);
  assert.equal(prs[0].type, "1rm");
  assert.equal(prs[0].exerciceId, "developpe");
  assert.ok(prs[0].valeur > prs[0].ancien);
});

test("detecterRecords : aucun record si moins bon", () => {
  const nouveau = { exercices: [{ exerciceId: "developpe", series: [{ chargeKg: 50, reps: 5 }] }] };
  assert.deepEqual(detecterRecords(logsA, nouveau), []);
});

test("detecterRecords : record de reps au poids du corps (charge 0)", () => {
  const histo = [{ exercices: [{ exerciceId: "pompes", series: [{ chargeKg: 0, reps: 20 }] }] }];
  const nouveau = { exercices: [{ exerciceId: "pompes", series: [{ chargeKg: 0, reps: 25 }] }] };
  const prs = detecterRecords(histo, nouveau);
  assert.equal(prs.length, 1);
  assert.equal(prs[0].type, "reps");
  assert.equal(prs[0].valeur, 25);
  assert.equal(prs[0].ancien, 20);
});

test("detecterRecords : premier passage d'un exercice = record", () => {
  const nouveau = { exercices: [{ exerciceId: "nouveau-exo", series: [{ chargeKg: 40, reps: 10 }] }] };
  const prs = detecterRecords(logsA, nouveau);
  assert.equal(prs.length, 1);
  assert.equal(prs[0].exerciceId, "nouveau-exo");
  assert.equal(prs[0].ancien, 0);
});
