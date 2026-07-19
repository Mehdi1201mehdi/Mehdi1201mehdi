// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  lundiDe, volumeLog, volumeTotal, volumeParSemaine, dureeMoyenneMin,
  volumeParMuscle, statsSemaine,
} from "../src/engine/stats.js";

test("lundiDe : renvoie le lundi de la semaine", () => {
  // 2026-07-15 est un mercredi → lundi = 2026-07-13
  assert.equal(lundiDe("2026-07-15T10:00:00Z"), "2026-07-13");
  // un lundi reste le même jour
  assert.equal(lundiDe("2026-07-13T23:00:00Z"), "2026-07-13");
});

test("volumeLog / volumeTotal : charge × reps", () => {
  const log = { exercices: [{ exerciceId: "x", series: [{ chargeKg: 50, reps: 10 }, { chargeKg: 50, reps: 8 }] }] };
  assert.equal(volumeLog(log), 50 * 10 + 50 * 8);
  assert.equal(volumeTotal([log, log]), 2 * (500 + 400));
});

test("volumeParSemaine : agrège par semaine ISO", () => {
  const logs = [
    { date: "2026-07-13T10:00:00Z", exercices: [{ series: [{ chargeKg: 100, reps: 5 }] }] }, // lundi
    { date: "2026-07-15T10:00:00Z", exercices: [{ series: [{ chargeKg: 100, reps: 5 }] }] }, // même semaine
    { date: "2026-07-20T10:00:00Z", exercices: [{ series: [{ chargeKg: 100, reps: 5 }] }] }, // semaine suivante
  ];
  const sem = volumeParSemaine(logs);
  assert.equal(sem.length, 2);
  assert.equal(sem[0].v, 1000); // 2 × 500
  assert.equal(sem[1].v, 500);
});

test("dureeMoyenneMin : moyenne des durées mesurées, null si aucune", () => {
  assert.equal(dureeMoyenneMin([{ dureeSec: 1800 }, { dureeSec: 3600 }]), 45);
  assert.equal(dureeMoyenneMin([{ dureeSec: 3000 }, {}]), 50); // ignore les séances sans durée
  assert.equal(dureeMoyenneMin([{}, {}]), null);
});

test("volumeParMuscle : répartit sur les muscles principaux", () => {
  const cat = {
    squat: { musclesPrincipaux: ["quadriceps", "fessiers"] },
    pompes: { musclesPrincipaux: ["pectoraux"] },
  };
  const get = (id) => cat[id];
  const logs = [{
    exercices: [
      { exerciceId: "squat", series: [{ chargeKg: 100, reps: 10 }] }, // vol 1000 → 500/muscle
      { exerciceId: "pompes", series: [{ chargeKg: 0, reps: 20 }] },  // poids du corps → 20 reps
    ],
  }];
  const parMuscle = volumeParMuscle(logs, get);
  const map = Object.fromEntries(parMuscle.map((x) => [x.muscle, x.v]));
  assert.equal(map.quadriceps, 500);
  assert.equal(map.fessiers, 500);
  assert.equal(map.pectoraux, 20);
  // trié décroissant
  assert.ok(parMuscle[0].v >= parMuscle[parMuscle.length - 1].v);
});

test("statsSemaine : séances/volume/durée de la semaine courante", () => {
  const ref = new Date("2026-07-15T12:00:00Z"); // mercredi
  const logs = [
    { date: "2026-07-13T10:00:00Z", dureeSec: 3600, exercices: [{ series: [{ chargeKg: 100, reps: 5 }] }] },
    { date: "2026-07-06T10:00:00Z", dureeSec: 1800, exercices: [{ series: [{ chargeKg: 100, reps: 5 }] }] }, // semaine passée
  ];
  const s = statsSemaine(logs, ref);
  assert.equal(s.seances, 1);
  assert.equal(s.volume, 500);
  assert.equal(s.dureeMin, 60);
});
