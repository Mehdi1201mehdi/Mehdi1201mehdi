// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  references1RM, chargeEntrainement, chargeParPeriode, progressionMensuelle, variationPct,
  cleMois, libelleMois, DEFINITIONS_CHARGE,
} from "../src/engine/analyse.js";
import { serieExercice, metriquesPour, METRIQUES_EXO } from "../src/engine/stats.js";
import { e1rmFiable, REPS_MAX_1RM, detecterRecords, classementRecords } from "../src/engine/records.js";

const log = (date, exercices) => ({ id: date, date, exercices });

test("1RM fiable : séries de 1 à 12 reps seulement", () => {
  assert.equal(REPS_MAX_1RM, 12);
  assert.equal(Math.round(e1rmFiable(100, 5)), 117);
  assert.equal(e1rmFiable(40, 20), 0, "20 reps : pas de 1RM");
  // Une série d'endurance n'efface plus un vrai record de force.
  const histo = [log("2026-10-01", [{ exerciceId: "dc", series: [{ chargeKg: 100, reps: 5 }] }])];
  const nouveau = log("2026-10-08", [{ exerciceId: "dc", series: [{ chargeKg: 70, reps: 25 }] }]);
  assert.deepEqual(detecterRecords(histo, nouveau).filter((r) => r.type === "1rm"), []);
  assert.equal(classementRecords([...histo, nouveau])[0].e1rm, 117);
});

test("tonnage, volume et intensité : trois mesures distinctes", () => {
  const logs = [
    log("2026-10-01", [
      { exerciceId: "dc", series: [{ chargeKg: 100, reps: 5 }, { chargeKg: 80, reps: 10 }] },
      { exerciceId: "pompes", series: [{ chargeKg: 0, reps: 20 }] },
      { exerciceId: "course", series: [{ distanceM: 5000, dureeSec: 1500 }] },
    ]),
  ];
  const c = chargeEntrainement(logs);
  assert.equal(c.seances, 1);
  assert.equal(c.series, 4);
  assert.equal(c.reps, 35);
  assert.equal(c.tonnageKg, 100 * 5 + 80 * 10);       // 1300 : les pompes à 0 kg n'en ajoutent pas
  assert.equal(c.repsChargees, 15);
  assert.equal(c.intensiteKgRep, 86.7);               // 1300 / 15
  // 1RM de référence du DC = 100 × (1 + 5/30) = 116,7 ; pondéré par reps :
  // (100/116,7 × 5 + 80/116,7 × 10) / 15 = 74 %
  assert.equal(c.intensiteRelPct, 74);
  assert.equal(c.distanceM, 5000);
  assert.equal(c.dureeCardioSec, 1500);
  assert.ok(DEFINITIONS_CHARGE.tonnage && DEFINITIONS_CHARGE.volume && DEFINITIONS_CHARGE.intensite);
});

test("chargeParPeriode : mois et semaines, périodes vides comprises", () => {
  const logs = [
    log("2026-09-10T18:00:00.000Z", [{ exerciceId: "dc", series: [{ chargeKg: 50, reps: 10 }] }]),
    log("2026-11-02T18:00:00.000Z", [{ exerciceId: "dc", series: [{ chargeKg: 60, reps: 10 }] }]),
  ];
  const mois = chargeParPeriode(logs, "mois", 3, new Date("2026-11-07T12:00:00Z"));
  assert.deepEqual(mois.map((m) => [m.cle, m.tonnageKg]), [["2026-09", 500], ["2026-10", 0], ["2026-11", 600]]);
  assert.equal(mois[0].label, "sept. 2026");
  const sem = chargeParPeriode(logs, "semaine", 2, new Date("2026-11-07T12:00:00Z"));
  assert.deepEqual(sem.map((s) => [s.cle, s.seances]), [["2026-10-26", 0], ["2026-11-02", 1]]);
});

test("progression mensuelle : meilleure valeur ou total selon la métrique", () => {
  const logs = [
    log("2026-09-03T18:00:00Z", [{ exerciceId: "dc", series: [{ chargeKg: 80, reps: 8 }] }]),
    log("2026-09-20T18:00:00Z", [{ exerciceId: "dc", series: [{ chargeKg: 85, reps: 6 }] }]),
    log("2026-10-15T18:00:00Z", [{ exerciceId: "dc", series: [{ chargeKg: 90, reps: 5 }] }]),
    log("2026-09-05T18:00:00Z", [{ exerciceId: "run", series: [{ distanceM: 5000, dureeSec: 1500 }] }]),
    log("2026-09-25T18:00:00Z", [{ exerciceId: "run", series: [{ distanceM: 7000, dureeSec: 2400 }] }]),
  ];
  const poids = progressionMensuelle(logs, "dc", "poids");
  assert.deepEqual(poids.map((p) => [p.mois, p.v, p.delta, p.deltaPct]), [["2026-09", 85, null, null], ["2026-10", 90, 5, 6]]);
  const dist = progressionMensuelle(logs, "run", "distance");
  assert.deepEqual(dist.map((p) => [p.mois, p.v, p.seances]), [["2026-09", 12, 2]], "la distance s'additionne sur le mois");
  assert.equal(variationPct(0, 5), null);
  assert.equal(cleMois("2026-03-15T10:00:00"), "2026-03");
  assert.equal(libelleMois("2026-12"), "déc. 2026");
});

test("métriques par type : jamais de 1RM pour une course, ni de distance pour un développé", () => {
  assert.deepEqual(metriquesPour({ charge: false, reps: false, distance: true, duree: true, isometrique: false }), ["distance", "vitesse", "dureeTotale"]);
  assert.deepEqual(metriquesPour({ charge: true, reps: false, distance: false, duree: true, isometrique: true }), ["maintien", "poids"]);
  assert.deepEqual(metriquesPour({ charge: true, reps: true, distance: false, duree: false, isometrique: false }), ["1rm", "poids", "volume", "reps"]);
  for (const k of ["distance", "vitesse", "dureeTotale", "maintien"]) assert.ok(METRIQUES_EXO.some((m) => m.cle === k));
  const logs = [
    log("2026-09-05", [{ exerciceId: "run", series: [{ distanceM: 5000, dureeSec: 1500 }] }]),
    log("2026-09-06", [{ exerciceId: "run", series: [{ chargeKg: null, reps: 30 }] }]),   // ancienne saisie : pas de point cardio
    log("2026-09-07", [{ exerciceId: "planche", series: [{ dureeSec: 60 }, { dureeSec: 75 }] }]),
  ];
  assert.deepEqual(serieExercice(logs, "run", "vitesse").map((p) => p.v), [12]);
  assert.deepEqual(serieExercice(logs, "run", "distance").map((p) => p.v), [5]);
  assert.deepEqual(serieExercice(logs, "run", "dureeTotale").map((p) => p.v), [25]);
  assert.deepEqual(serieExercice(logs, "planche", "maintien").map((p) => p.v), [75]);
});

test("références 1RM : meilleure estimation fiable par exercice", () => {
  const r = references1RM([log("a", [{ exerciceId: "dc", series: [{ chargeKg: 100, reps: 5 }, { chargeKg: 60, reps: 30 }] }])]);
  assert.equal(Math.round(r.dc), 117);
});

import { comparaisonMemeStade } from "../src/engine/analyse.js";
test("comparaison à même stade : le début du mois n'est pas comparé au mois entier", () => {
  const logs = [
    log("2026-10-03T18:00:00Z", [{ exerciceId: "dc", series: [{ chargeKg: 50, reps: 10 }] }]),   // 1–7 oct. : compte
    log("2026-10-20T18:00:00Z", [{ exerciceId: "dc", series: [{ chargeKg: 50, reps: 10 }] }]),   // après le 7 : ne compte pas
    log("2026-11-05T18:00:00Z", [{ exerciceId: "dc", series: [{ chargeKg: 60, reps: 10 }] }]),
  ];
  const c = comparaisonMemeStade(logs, "mois", new Date("2026-11-07T20:00:00Z"));
  assert.equal(c.actuelle.tonnageKg, 600);
  assert.equal(c.precedente.tonnageKg, 500, "seul le 3 octobre est au même stade");
  const s = comparaisonMemeStade(logs, "semaine", new Date("2026-11-07T20:00:00Z"));   // samedi
  assert.equal(s.actuelle.seances, 1);
  assert.equal(s.precedente.seances, 0);
});

import { rpeSerie, effortMoyen, seriesDe } from "../src/engine/analyse.js";
test("RPE : saisi en priorité, sinon déduit du RIR (10 − RIR), moyenne au demi-point", () => {
  assert.deepEqual(rpeSerie({ rpe: 8.5, rir: 1.5 }), { rpe: 8.5, deduit: false });
  assert.deepEqual(rpeSerie({ rir: 2 }), { rpe: 8, deduit: true });
  assert.equal(rpeSerie({ chargeKg: 80, reps: 8 }), null);
  assert.deepEqual(effortMoyen([{ rpe: 9 }, { rir: 3 }, { reps: 5 }]), { rpe: 8, n: 2, deduites: 1 });
  assert.deepEqual(effortMoyen([]), { rpe: null, n: 0, deduites: 0 });
  const log = { exercices: [{ exerciceId: "a", series: [{ rpe: 7 }] }, { exerciceId: "b", series: [{ rpe: 9 }] }] };
  assert.equal(seriesDe(log).length, 2);
  assert.equal(effortMoyen(seriesDe(log, "b")).rpe, 9);
});

import { plateaux } from "../src/engine/analyse.js";
test("plateaux : record non battu depuis ≥ 21 jours ET ≥ 3 séances", () => {
  const L = (d, kg, reps) => log(`2026-${d}T18:00:00Z`, [{ exerciceId: "dc", series: [{ chargeKg: kg, reps }] }]);
  const ref = Date.parse("2026-11-07T12:00:00Z");
  const stagne = [L("09-20", 80, 5), L("09-27", 85, 5), L("10-04", 82.5, 5), L("10-11", 85, 4), L("10-18", 85, 5), L("10-25", 80, 6)];
  const p = plateaux(stagne, { ref });
  assert.equal(p.length, 1);
  assert.equal(p[0].exerciceId, "dc");
  assert.equal(p[0].seancesDepuis, 4);
  assert.ok(p[0].depuisJours >= 21);
  // progression récente → pas de plateau
  assert.deepEqual(plateaux([...stagne, L("11-01", 90, 5)], { ref }), []);
  // trop peu de recul en jours → pas de plateau
  assert.deepEqual(plateaux([L("10-25", 85, 5), L("10-28", 80, 5), L("10-31", 80, 5), L("11-03", 80, 5)], { ref }), []);
});
