// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { getExercise, chargerCatalogueEtendu, CATALOGUE } from "../src/data/exercises.js";
import {
  mesuresExercice, vitesseKmh, allureSecParKm, texteDuree, lireDureeMinutes, lireDistanceKm,
  meilleuresPerfs, detecterRecordsMesures,
} from "../src/engine/mesures.js";

test("mesures déduites : musculation, cardio à distance, cardio en répétitions, isométrique", async () => {
  await chargerCatalogueEtendu();
  assert.deepEqual(mesuresExercice(getExercise("developpe-couche-barre")), { charge: true, reps: true, distance: false, duree: false, isometrique: false });
  const course = CATALOGUE.find((e) => /run/i.test(e.id) && e.typeExercice === "cardio");
  assert.ok(course, "le catalogue contient une course");
  assert.equal(mesuresExercice(course).distance, true);
  assert.equal(mesuresExercice(course).charge, false, "jamais de charge sur une course");
  assert.equal(mesuresExercice(getExercise("rameur")).distance, true);
  const burpees = mesuresExercice(getExercise("burpees"));
  assert.equal(burpees.distance, false);
  assert.equal(burpees.reps, true);
  assert.equal(burpees.charge, false);
  const gainage = CATALOGUE.find((e) => e.typeExercice === "gainage");
  assert.deepEqual(mesuresExercice(gainage), { charge: true, reps: false, distance: false, duree: true, isometrique: true });
  assert.equal(mesuresExercice({ typeExercice: "force", mesures: { distance: true, reps: false } }).distance, true, "le champ explicite l'emporte");
  assert.equal(mesuresExercice(null).reps, true);
});

test("vitesse et allure", () => {
  assert.equal(vitesseKmh(5000, 1500), 12);            // 5 km en 25 min
  assert.equal(allureSecParKm(5000, 1500), 300);        // 5:00 / km
  assert.equal(vitesseKmh(0, 1500), null);
  assert.equal(vitesseKmh(5000, 0), null);
});

test("saisies : minutes (virgule, deux-points) et kilomètres", () => {
  assert.equal(lireDureeMinutes("25"), 1500);
  assert.equal(lireDureeMinutes("25,5"), 1530);
  assert.equal(lireDureeMinutes("25:30"), 1530);
  assert.equal(lireDureeMinutes("1:02:05"), 3725);
  assert.equal(lireDureeMinutes(""), null);
  assert.equal(lireDureeMinutes("abc"), null);
  assert.equal(lireDistanceKm("5,2"), 5200);
  assert.equal(lireDistanceKm("0"), null);
  assert.equal(texteDuree(45), "45 s");
  assert.equal(texteDuree(1530), "25:30");
  assert.equal(texteDuree(3725), "1:02:05");
});

const log = (id, exerciceId, series) => ({ id, date: id, exercices: [{ exerciceId, series }] });

test("meilleuresPerfs : chaque indicateur ne vient que des séries qui le portent", () => {
  const p = meilleuresPerfs([
    log("a", "course", [{ distanceM: 5000, dureeSec: 1500 }, { distanceM: 3000, dureeSec: 840 }]),
    log("b", "dc", [{ chargeKg: 80, reps: 8 }, { chargeKg: 85, reps: 5 }]),
    log("c", "planche", [{ dureeSec: 90 }]),
  ]);
  assert.equal(p.course.distanceMax, 5000);
  assert.equal(Math.round(p.course.vitesseMax * 10) / 10, 12.9);   // 3 km en 14 min
  assert.equal(p.course.chargeMax, 0, "une course n'a pas de charge maximale");
  assert.equal(p.dc.chargeMax, 85);
  assert.equal(p.dc.distanceMax, 0);
  assert.equal(p.dc.volumeSeanceMax, 80 * 8 + 85 * 5);
  assert.equal(p.planche.dureeMax, 90);
  assert.equal(p.planche.vitesseMax, 0);
});

test("detecterRecordsMesures : distance, vitesse, durée, volume — jamais mélangés", () => {
  const avant = [
    log("a", "course", [{ distanceM: 5000, dureeSec: 1500 }]),
    log("b", "planche", [{ dureeSec: 60 }]),
    log("c", "dc", [{ chargeKg: 80, reps: 8 }]),
  ];
  const nouveau = { id: "n", date: "n", exercices: [
    { exerciceId: "course", series: [{ distanceM: 6000, dureeSec: 1700 }] },
    { exerciceId: "planche", series: [{ dureeSec: 75 }] },
    { exerciceId: "dc", series: [{ chargeKg: 80, reps: 8 }, { chargeKg: 80, reps: 8 }] },
    { exerciceId: "nouvel-exo", series: [{ chargeKg: 50, reps: 10 }] },
  ] };
  const r = detecterRecordsMesures(avant, nouveau);
  const types = r.map((x) => `${x.exerciceId}:${x.type}`).sort();
  assert.deepEqual(types, ["course:distance", "course:vitesse", "dc:volume", "planche:duree"]);
  assert.ok(!r.some((x) => x.exerciceId === "nouvel-exo"), "une première séance n'est pas un record");
  assert.ok(!r.some((x) => x.exerciceId === "course" && x.type === "duree"), "la durée d'une course n'est pas un record de maintien");
});

// ---------- séance live → historique (musculation, cardio, isométrique) ----------
import { serieLogDepuisLive, serieAEnregistrer, completerSerie, restaurer, estReprenable } from "../src/engine/liveSession.js";
import { modeSaisie, texteSerieLog, totauxDistance, kmSaisie, minutesSaisie } from "../src/engine/mesures.js";

test("séance de musculation : kg (virgule, livres), reps, RPE conservé et RIR dérivé", () => {
  const s = { charge: "62,5", reps: "8", rir: "8,5", dureeSec: null, done: true, type: "normale" };
  const kg = serieLogDepuisLive(s, { enRpe: true, mode: "reps" });
  assert.equal(kg.chargeKg, 62.5);
  assert.equal(kg.reps, 8);
  assert.equal(kg.rpe, 8.5);
  assert.equal(kg.rir, 1.5);
  assert.equal(kg.dureeSec, null);
  const lb = serieLogDepuisLive({ ...s, charge: "135", rir: "2" }, { lb: true, mode: "reps" });
  assert.equal(lb.chargeKg, 61.235);
  assert.equal(lb.rir, 2);
  assert.equal("rpe" in lb, false, "en mode RIR, aucun RPE n'est inventé");
});

test("séance cardio : km + minutes → mètres + secondes, sans charge, vitesse calculable", () => {
  const live = [
    { charge: "", reps: "", rir: "", dureeSec: 40, done: true, type: "normale", distanceKm: "5,2", dureeMin: "26:00" },
    { charge: "", reps: "", rir: "", dureeSec: 40, done: false, type: "normale" },
  ];
  const gardees = live.filter((s) => serieAEnregistrer(s, "distance"));
  assert.equal(gardees.length, 1, "la série non faite n'est pas enregistrée");
  const log = /** @type {any} */ (serieLogDepuisLive(gardees[0], { mode: "distance" }));
  assert.deepEqual([log.distanceM, log.dureeSec, log.chargeKg, log.reps], [5200, 1560, null, null]);
  assert.equal(texteSerieLog(log).replace(/\u00A0/g, " "), "5,2 km en 26:00 (12,0 km/h)");
  const tot = totauxDistance([log, { distanceM: 3000, dureeSec: 900 }]);
  assert.equal(tot.distanceM, 8200);
  assert.equal(Math.round(tot.vitesseKmh * 10) / 10, 12);   // 8,2 km en 41 min
});

test("séance isométrique : durée faite, lest facultatif, série prévue non faite écartée", () => {
  const faite = { charge: "10", reps: "", rir: "", dureeSec: 75, done: true, type: "normale" };
  const prevue = { charge: "", reps: "", rir: "", dureeSec: 60, done: false, type: "normale" };
  assert.equal(serieAEnregistrer(prevue, "temps"), false, "une durée seulement prévue n'est pas une série faite");
  const log = serieLogDepuisLive(faite, { mode: "temps" });
  assert.deepEqual([log.chargeKg, log.reps, log.dureeSec], [10, null, 75]);
  assert.equal(texteSerieLog(log, (k) => `${k} kg`), "10 kg · 1:15");
  assert.equal(texteSerieLog({ dureeSec: 45 }), "45 s");
});

test("validation sans saisie en mode distance : reprend la série précédente, puis la dernière séance", () => {
  const series = [
    { charge: "", reps: "", rir: "", dureeSec: null, done: true, distanceKm: "2,5", dureeMin: "12:30" },
    { charge: "", reps: "", rir: "", dureeSec: null, done: false },
  ];
  completerSerie(series, 1, { mode: "distance", distancePrecedente: "9", dureePrecedente: "50" });
  assert.equal(series[1].distanceKm, "2,5");
  assert.equal(series[1].dureeMin, "12:30", "le texte « 12:30 » n'est pas tronqué en 12");
  assert.equal(series[1].charge, "", "aucune charge posée sur un cardio");
  const seule = [{ charge: "", reps: "", rir: "", dureeSec: 1200, done: false }];
  completerSerie(seule, 0, { mode: "distance", distancePrecedente: kmSaisie(5000), dureePrecedente: minutesSaisie(1530) });
  assert.deepEqual([seule[0].distanceKm, seule[0].dureeMin], ["5", "25:30"]);
});

test("reprise : la saisie km/min survit à la sérialisation et rend la séance reprenable", () => {
  const brut = { seanceId: "s1", debut: "2026-11-07T10:00:00.000Z", data: { run: { exId: "run", series: [
    { charge: "", reps: "", rir: "", dureeSec: null, done: false, distanceKm: "3", dureeMin: "" },
  ] } } };
  const r = restaurer(brut);
  assert.equal(r.data.run.series[0].distanceKm, "3");
  assert.equal("dureeMin" in r.data.run.series[0], false);
  assert.equal(estReprenable(brut, () => ({ id: "s1" })), true);
});

test("modeSaisie : distance d'après l'exercice, temps d'après le gabarit, reps sinon", async () => {
  await chargerCatalogueEtendu();
  assert.equal(modeSaisie(getExercise("rameur"), { dureeSec: 40 }), "distance");
  const gainage = CATALOGUE.find((e) => e.typeExercice === "gainage");
  assert.equal(modeSaisie(gainage, { dureeSec: 40 }), "temps");
  assert.equal(modeSaisie(gainage, { dureeSec: null }), "reps", "un gabarit en répétitions n'est pas basculé d'office");
  assert.equal(modeSaisie(getExercise("developpe-couche-barre"), {}), "reps");
});
