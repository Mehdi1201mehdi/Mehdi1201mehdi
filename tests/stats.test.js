// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  lundiDe, volumeLog, volumeTotal, volumeParSemaine, dureeMoyenneMin,
  volumeParMuscle, recuperationParMuscle, statsSemaine, serieExercice, serieCorps, filtrerDepuis,
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

test("recuperationParMuscle : % basé sur le temps écoulé depuis la dernière séance", () => {
  const cat = {
    squat: { musclesPrincipaux: ["quadriceps"], musclesSecondaires: ["fessiers"] },
    dev: { musclesPrincipaux: ["pectoraux"] },
  };
  const get = (id) => cat[id];
  const now = Date.parse("2026-07-20T00:00:00Z");
  const jour = 864e5;
  const logs = [
    { date: "2026-07-19T00:00:00Z", exercices: [{ exerciceId: "squat", series: [{ chargeKg: 100, reps: 5 }] }] }, // il y a 1 j
    { date: "2026-07-17T00:00:00Z", exercices: [{ exerciceId: "dev", series: [{ chargeKg: 60, reps: 8 }] }] },    // il y a 3 j
  ];
  const rec = recuperationParMuscle(logs, get, now, 3); // fenêtre de récup = 3 jours
  const map = Object.fromEntries(rec.map((r) => [r.muscle, r.pct]));
  // quadriceps + fessiers entraînés il y a 1 j → 1/3 ≈ 33 %
  assert.equal(map.quadriceps, 33);
  assert.equal(map.fessiers, 33); // muscle secondaire compté aussi
  // pectoraux il y a 3 j → 100 % (plafonné)
  assert.equal(map.pectoraux, 100);
  // trié du plus récupéré au moins récupéré
  assert.ok(rec[0].pct >= rec[rec.length - 1].pct);
  assert.equal(Math.round(rec.find((r) => r.muscle === "quadriceps").jours), 1);
});

test("serieExercice : un point par séance, selon la métrique", () => {
  const logs = [
    { date: "2026-07-01T10:00:00Z", exercices: [{ exerciceId: "sq", series: [{ chargeKg: 60, reps: 8 }, { chargeKg: 60, reps: 6 }] }] },
    { date: "2026-07-08T10:00:00Z", exercices: [{ exerciceId: "sq", series: [{ chargeKg: 65, reps: 5 }] }] },
    { date: "2026-07-08T10:00:00Z", exercices: [{ exerciceId: "autre", series: [{ chargeKg: 40, reps: 10 }] }] },
  ];
  assert.deepEqual(serieExercice(logs, "sq", "poids").map((p) => p.v), [60, 65]);
  assert.deepEqual(serieExercice(logs, "sq", "reps").map((p) => p.v), [8, 5]);
  assert.deepEqual(serieExercice(logs, "sq", "volume").map((p) => p.v), [60 * 8 + 60 * 6, 65 * 5]);
  // 1RM : max Epley par séance
  const oneRM = serieExercice(logs, "sq", "1rm").map((p) => p.v);
  assert.equal(Math.round(oneRM[0]), 76);
  assert.equal(oneRM.length, 2);
});

test("serieCorps : filtre le champ et trie", () => {
  const metrics = [
    { date: "2026-07-08", poidsKg: 79 },
    { date: "2026-07-01", poidsKg: 80 },
    { date: "2026-07-05", taille: 85 }, // pas de poidsKg → ignoré
  ];
  assert.deepEqual(serieCorps(metrics, "poidsKg").map((p) => p.v), [80, 79]);
  assert.deepEqual(serieCorps(metrics, "taille").map((p) => p.v), [85]);
});

test("filtrerDepuis : ne garde que la fenêtre demandée", () => {
  const ref = Date.parse("2026-07-20T00:00:00Z");
  const pts = [
    { iso: "2026-06-01T00:00:00Z", v: 1 },
    { iso: "2026-07-15T00:00:00Z", v: 2 },
    { iso: "2026-07-19T00:00:00Z", v: 3 },
  ];
  assert.deepEqual(filtrerDepuis(pts, 0, ref).map((p) => p.v), [1, 2, 3]); // 0 = tout
  assert.deepEqual(filtrerDepuis(pts, 30, ref).map((p) => p.v), [2, 3]);   // 30 jours
  assert.deepEqual(filtrerDepuis(pts, 3, ref).map((p) => p.v), [3]);       // 3 jours
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
