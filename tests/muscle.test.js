// @ts-check
/**
 * FICHE MUSCLE — la carte colorait les zones sans qu'on puisse savoir pourquoi.
 * Ces tests verrouillent les chiffres et surtout les conventions : elles doivent
 * concorder avec le reste du moteur, sinon deux écrans annoncent deux volumes
 * différents pour la même séance.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SEMAINES, lundi, ficheMuscle, moyenneHebdo, tendance } from "../src/engine/muscle.js";
import { volumeParMuscle } from "../src/engine/stats.js";

const CAT = {
  "developpe-couche": { id: "developpe-couche", musclesPrincipaux: ["pectoraux"], musclesSecondaires: ["triceps", "epaules"] },
  "dips": { id: "dips", musclesPrincipaux: ["pectoraux", "triceps"], musclesSecondaires: [] },
  "curl": { id: "curl", musclesPrincipaux: ["biceps"], musclesSecondaires: [] },
  "traction": { id: "traction", musclesPrincipaux: ["dos"], musclesSecondaires: ["biceps"] },
};
const get = (id) => CAT[id] || null;
const s = (chargeKg, reps) => ({ chargeKg, reps });
const log = (id, date, exos) => ({ id, date, exercices: exos });
const exo = (exerciceId, series) => ({ exerciceId, series });

/* ======================= SEMAINES ======================= */

test("lundi : ramène n'importe quel jour au lundi de sa semaine", () => {
  assert.equal(lundi("2026-01-07T12:00:00Z"), "2026-01-05", "mercredi → lundi");
  assert.equal(lundi("2026-01-05T12:00:00Z"), "2026-01-05", "lundi → lui-même");
  assert.equal(lundi("2026-01-11T12:00:00Z"), "2026-01-05", "dimanche → lundi de LA MÊME semaine");
  assert.equal(lundi("pas une date"), "");
});

/* ======================= FICHE ======================= */

test("ficheMuscle : muscle jamais travaillé → l'app se tait et dit pourquoi", () => {
  const f = ficheMuscle("mollets", [log("a", "2026-01-07T12:00:00Z", [exo("curl", [s(20, 10)])])], get);
  assert.equal(f.mesurable, false);
  assert.match(f.raison || "", /aucune séance/i);
  assert.equal(f.volume, 0);
  assert.deepEqual(f.exercices, []);
});

test("ficheMuscle : le volume est RÉPARTI entre les muscles principaux", () => {
  // Sinon un exercice polyarticulaire gonflerait le total du corps : les dips
  // compteraient 1000 kg pour les pectoraux ET 1000 pour les triceps.
  const logs = [log("a", "2026-01-07T12:00:00Z", [exo("dips", [s(100, 10)])])];  // 1000 kg
  assert.equal(ficheMuscle("pectoraux", logs, get).volume, 500);
  assert.equal(ficheMuscle("triceps", logs, get).volume, 500);
});

test("ficheMuscle : le volume concorde avec volumeParMuscle, écran pour écran", () => {
  // Deux écrans qui annoncent deux volumes différents pour la même séance, c'est
  // le genre d'incohérence qui fait douter de tout le reste.
  const logs = [
    log("a", "2026-01-07T12:00:00Z", [exo("developpe-couche", [s(80, 8), s(80, 8)]), exo("dips", [s(0, 12)])]),
    log("b", "2026-01-14T12:00:00Z", [exo("developpe-couche", [s(85, 6)])]),
  ];
  const parMuscle = Object.fromEntries(volumeParMuscle(logs, get).map((x) => [x.muscle, x.v]));
  for (const m of ["pectoraux", "triceps"]) {
    assert.equal(ficheMuscle(m, logs, get).volume, parMuscle[m], `désaccord sur ${m}`);
  }
});

test("ficheMuscle : le poids du corps compte ses répétitions, sinon il disparaît", () => {
  const logs = [log("a", "2026-01-07T12:00:00Z", [exo("dips", [s(0, 12), s(0, 10)])])];
  const f = ficheMuscle("pectoraux", logs, get);
  assert.equal(f.volume, 11, "22 répétitions réparties sur deux muscles principaux");
  assert.equal(f.series, 2);
});

test("ficheMuscle : principal et secondaire comptés SÉPARÉMENT", () => {
  // Les additionner reviendrait à prétendre qu'un développé couché entraîne les
  // triceps autant que les pectoraux.
  const logs = [log("a", "2026-01-07T12:00:00Z", [exo("developpe-couche", [s(80, 8), s(80, 8)])])];
  const tri = ficheMuscle("triceps", logs, get);
  assert.equal(tri.mesurable, true);
  assert.equal(tri.principaux, 0);
  assert.equal(tri.secondaires, 2);
  assert.equal(tri.volume, 0, "un rôle secondaire n'ajoute pas de volume principal");
  assert.equal(tri.exercices[0].role, "secondaire");
});

test("ficheMuscle : un exercice à la fois principal ailleurs garde le rôle principal", () => {
  const logs = [log("a", "2026-01-07T12:00:00Z", [
    exo("traction", [s(0, 8)]),                 // biceps secondaire
    exo("curl", [s(20, 10), s(20, 10)]),        // biceps principal
  ])];
  const f = ficheMuscle("biceps", logs, get);
  assert.equal(f.exercices.find((e) => e.exerciceId === "curl").role, "principal");
  assert.equal(f.exercices.find((e) => e.exerciceId === "traction").role, "secondaire");
  assert.equal(f.series, 3, "les trois séries comptent dans le total");
});

test("ficheMuscle : exercices triés par volume décroissant", () => {
  const logs = [log("a", "2026-01-07T12:00:00Z", [
    exo("curl", [s(20, 10)]),                                  // 200
    exo("traction", [s(0, 8)]),                                // secondaire, 0
  ]), log("b", "2026-01-14T12:00:00Z", [exo("curl", [s(30, 10)])])];  // +300
  const f = ficheMuscle("biceps", logs, get);
  assert.equal(f.exercices[0].exerciceId, "curl");
  assert.equal(f.exercices[0].volume, 500, "les deux séances s'additionnent");
});

test("ficheMuscle : dernière sollicitation et nombre de séances", () => {
  const maintenant = Date.parse("2026-01-20T12:00:00Z");
  const logs = [
    log("a", "2026-01-07T12:00:00Z", [exo("curl", [s(20, 10)])]),
    log("b", "2026-01-17T12:00:00Z", [exo("curl", [s(20, 10)])]),
  ];
  const f = ficheMuscle("biceps", logs, get, { maintenant });
  assert.equal(f.dernierJours, 3);
  assert.equal(f.seances, 2);
});

test("ficheMuscle : les semaines à zéro sont conservées — un trou est une information", () => {
  // C'est là qu'on a arrêté de le travailler : le masquer effacerait le seul
  // signal utile du graphique.
  const maintenant = Date.parse("2026-03-02T12:00:00Z");
  const logs = [log("a", "2026-01-05T12:00:00Z", [exo("curl", [s(20, 10)])])];
  const f = ficheMuscle("biceps", logs, get, { maintenant, semaines: 8 });
  assert.equal(f.semaines.length, 8);
  assert.ok(f.semaines.some((x) => x.volume === 0), "les semaines vides doivent apparaître");
  assert.equal(f.semaines[f.semaines.length - 1].semaine, "2026-03-02", "la dernière est la semaine en cours");
});

test("ficheMuscle : entrées abîmées → aucune erreur, verdict prudent", () => {
  for (const l of [null, [], [null], [{ exercices: null }], [{ exercices: [{}] }]]) {
    const f = ficheMuscle("biceps", /** @type {any} */ (l), get);
    assert.equal(f.mesurable, false, JSON.stringify(l));
    assert.ok(f.raison);
  }
  // Un accesseur qui lève ne doit pas faire tomber l'écran.
  const f = ficheMuscle("biceps", [log("a", "2026-01-07T12:00:00Z", [exo("curl", [s(20, 10)])])],
    () => { throw new Error("boum"); });
  assert.equal(f.mesurable, false);
  assert.equal(ficheMuscle("", [], get).mesurable, false);
});

/* ======================= MOYENNE ET TENDANCE ======================= */

test("moyenneHebdo : ne compte que les semaines réellement entraînées", () => {
  // Diviser par le total écraserait la moyenne de quelqu'un qui revient après
  // une pause, et lui ferait croire qu'il en fait deux fois moins.
  const sem = [{ semaine: "a", volume: 0 }, { semaine: "b", volume: 1000 }, { semaine: "c", volume: 0 }, { semaine: "d", volume: 2000 }];
  assert.equal(moyenneHebdo(sem), 1500);
  assert.equal(moyenneHebdo([]), 0);
  assert.equal(moyenneHebdo(/** @type {any} */ (null)), 0);
});

test("tendance : hausse, baisse, stable — avec un seuil qui ignore le bruit", () => {
  const mk = (arr) => arr.map((v, i) => ({ semaine: "s" + i, volume: v }));
  assert.equal(tendance(mk([100, 100, 200, 200])).sens, "hausse");
  assert.equal(tendance(mk([200, 200, 100, 100])).sens, "baisse");
  // Quelques pour cent d'écart, c'est la variation naturelle d'une semaine.
  assert.equal(tendance(mk([100, 100, 103, 102])).sens, "stable");
});

test("tendance : trop peu de semaines → inconnu, jamais un verdict inventé", () => {
  const mk = (arr) => arr.map((v, i) => ({ semaine: "s" + i, volume: v }));
  assert.equal(tendance(mk([100, 200])).sens, "inconnu");
  assert.equal(tendance([]).sens, "inconnu");
  assert.equal(tendance(/** @type {any} */ (null)).sens, "inconnu");
  // Repartir de zéro est une hausse réelle, pas une division par zéro.
  assert.equal(tendance(mk([0, 0, 500, 500])).sens, "hausse");
  assert.equal(tendance(mk([0, 0, 0, 0])).sens, "inconnu");
});

test("SEMAINES : assez pour voir une tendance, pas trop pour rester lisible", () => {
  assert.ok(SEMAINES >= 6 && SEMAINES <= 16);
});
