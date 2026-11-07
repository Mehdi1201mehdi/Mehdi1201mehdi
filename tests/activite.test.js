// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { caloriesSeance, bilanSemaine, lundiLocal, formatDuree, MET_MUSCULATION } from "../src/engine/activite.js";

const log = (iso, dureeSec, charge = 50, reps = 10) => ({ id: iso, date: iso, dureeSec, exercices: [{ exerciceId: "x", series: [{ chargeKg: charge, reps }] }] });

test("caloriesSeance : MET × poids × heures, plafonnée, zéro si inconnu", () => {
  assert.equal(caloriesSeance(3600, 80), MET_MUSCULATION * 80);
  assert.equal(caloriesSeance(1800, 80), Math.round(MET_MUSCULATION * 80 * 0.5));
  assert.equal(caloriesSeance(10 * 3600, 80), MET_MUSCULATION * 80 * 3, "une séance oubliée ouverte 10 h compte pour 3 h max");
  assert.equal(caloriesSeance(0, 80), 0);
  assert.equal(caloriesSeance(3600, 0), 0);
  assert.equal(caloriesSeance(undefined, undefined), 0);
});

test("lundiLocal : ramène n'importe quel jour au lundi 00:00", () => {
  const l = lundiLocal(new Date(2026, 10, 7, 15, 30)); // samedi 7 nov. 2026
  assert.equal(l.getDay(), 1);
  assert.equal(l.getDate(), 2);
  assert.equal(l.getHours(), 0);
  assert.equal(lundiLocal(new Date(2026, 10, 8)).getDate(), 2, "dimanche → lundi précédent");
});

test("bilanSemaine : semaine en cours vs précédente, à partir des vraies séances", () => {
  const ref = new Date(2026, 10, 7, 12);        // samedi
  const logs = [
    log(new Date(2026, 10, 3, 18).toISOString(), 3600),        // mardi (cette semaine)
    log(new Date(2026, 10, 5, 18).toISOString(), 2700, 60),    // jeudi
    log(new Date(2026, 9, 28, 18).toISOString(), 3000, 40),    // semaine précédente
    log(new Date(2026, 9, 20, 18).toISOString(), 3000),        // il y a 2 semaines : ignorée
  ];
  const b = bilanSemaine(logs, 80, ref);
  assert.equal(b.seances, 2);
  assert.equal(b.dureeMin, 105);
  assert.equal(b.volume, 500 + 600);
  assert.equal(b.kcal, caloriesSeance(3600, 80) + caloriesSeance(2700, 80));
  assert.equal(b.precedente.seances, 1);
  assert.equal(b.precedente.volume, 400);
  assert.equal(b.ecartVolumePct, Math.round((1100 - 400) / 400 * 100));
  assert.equal(b.ecartSeances, 1);
});

test("bilanSemaine : pas de pourcentage sans semaine de référence, robustesse aux données vides", () => {
  const b = bilanSemaine([log(new Date().toISOString(), 1800)], 70);
  assert.equal(b.ecartVolumePct, null);
  const vide = bilanSemaine(null, 70);
  assert.equal(vide.seances, 0);
  assert.equal(vide.kcal, 0);
  assert.equal(bilanSemaine([{ date: "pas une date" }], 70).seances, 0);
});

test("formatDuree : minutes et heures lisibles", () => {
  assert.equal(formatDuree(45), "45 min");
  assert.equal(formatDuree(125), "2 h 05");
  assert.equal(formatDuree(-3), "0 min");
});
