// @ts-check
/**
 * APPRENTISSAGE LOCAL : le moteur doit se recalibrer sur l'historique réel,
 * mais jamais s'emballer sur du bruit. Ces tests vérifient les deux.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { getExercise } from "../src/data/exercises.js";
import { CLES_MOTEUR } from "../src/data/muscles-moteur.js";
import { demiVie, etatMusculaire } from "../src/engine/fatigue.js";
import {
  PARAMS_APPRENTISSAGE, perfSerie, perfExercice,
  observations, facteursRecuperation, expliquerApprentissage,
} from "../src/engine/apprentissage.js";

const T0 = Date.parse("2026-05-04T18:00:00Z");
const iso = (h) => new Date(T0 + h * 36e5).toISOString();

/** Séance d'un seul exercice, `n` séries à `kg` × `reps`. */
const seance = (h, exId, kg, reps, n = 4) => ({
  id: "s" + h, date: iso(h), seanceNom: "test",
  exercices: [{ exerciceId: exId, series: Array.from({ length: n }, () => ({ chargeKg: kg, reps, rir: 1 })) }],
});

/* ============================ INDICATEUR DE PERFORMANCE ============================ */

test("perfSerie : 1RM estimé, replis reps puis durée, null si inexploitable", () => {
  assert.equal(Math.round(perfSerie({ chargeKg: 100, reps: 5 })), 117);   // Epley
  assert.equal(perfSerie({ chargeKg: null, reps: 12 }), 12);              // poids du corps
  assert.equal(perfSerie({ chargeKg: null, reps: null, dureeSec: 45 }), 45); // gainage
  assert.equal(perfSerie({ chargeKg: 0, reps: 0 }), null);
  assert.equal(perfSerie(null), null);
});

test("perfExercice : garde la MEILLEURE série, pas la moyenne", () => {
  const ex = { series: [{ chargeKg: 60, reps: 8 }, { chargeKg: 80, reps: 5 }, { chargeKg: 50, reps: 10 }] };
  assert.equal(Math.round(perfExercice(ex)), Math.round(80 * (1 + 5 / 30)));
  assert.equal(perfExercice({ series: [] }), null);
  assert.equal(perfExercice(null), null);
});

/* ============================ OBSERVATIONS ============================ */

test("observations : ne retient que les retours RAPIDES sur un même exercice", () => {
  const logs = [
    seance(0, "developpe-couche-barre", 80, 8),
    seance(48, "developpe-couche-barre", 80, 7),    // 48 h → retenu
    seance(48 + 200, "developpe-couche-barre", 82, 8), // +200 h → ignoré
  ];
  const obs = observations(logs, getExercise, T0 + 400 * 36e5);
  assert.equal(obs.length, 1, "seule la paire à 48 h informe sur la récupération");
  assert.equal(obs[0].dtH, 48);
  assert.ok(obs[0].ecart < 0, "80×7 est moins bien que 80×8");
});

test("observations : ignore l'historique trop ancien et les séances futures", () => {
  const vieux = -PARAMS_APPRENTISSAGE.FENETRE_JOURS * 24 - 100;
  const logs = [
    seance(vieux, "squat-barre", 100, 5),
    seance(vieux + 48, "squat-barre", 100, 4),
    seance(1000, "squat-barre", 100, 5),   // dans le futur par rapport à `maintenant`
  ];
  assert.deepEqual(observations(logs, getExercise, T0), []);
});

test("observations : robustesse (logs vides, dates invalides, exercice inconnu)", () => {
  assert.deepEqual(observations(null, getExercise), []);
  assert.deepEqual(observations([{ date: "pas une date" }], getExercise), []);
  assert.deepEqual(observations([
    { date: iso(0), exercices: [{ exerciceId: "exercice-fantome", series: [{ chargeKg: 50, reps: 8 }] }] },
    { date: iso(24), exercices: [{ exerciceId: "exercice-fantome", series: [{ chargeKg: 50, reps: 6 }] }] },
  ], getExercise, T0 + 100 * 36e5), []);
});

/* ============================ CALIBRATION ============================ */

test("facteursRecuperation : sans données, aucun ajustement (facteur 1 partout)", () => {
  const f = facteursRecuperation([], getExercise, T0);
  for (const cle of CLES_MOTEUR) assert.equal(f[cle], 1, cle);
});

test("facteursRecuperation : sous le seuil d'observations, on n'ajuste RIEN", () => {
  // 3 paires seulement, toutes en forte baisse : tentant, mais insuffisant.
  const logs = [];
  for (let i = 0; i < PARAMS_APPRENTISSAGE.MIN_OBS - 1; i++) {
    logs.push(seance(i * 100, "developpe-couche-barre", 80, 8));
    logs.push(seance(i * 100 + 48, "developpe-couche-barre", 70, 7));
  }
  const f = facteursRecuperation(logs, getExercise, T0 + 1000 * 36e5);
  assert.equal(f.pectoraux, 1, "3 observations ne doivent produire aucune correction");
});

test("facteursRecuperation : performance qui s'effondre au retour → récupération plus LENTE", () => {
  const logs = [];
  for (let i = 0; i < 10; i++) {
    logs.push(seance(i * 200, "developpe-couche-barre", 80, 8));
    logs.push(seance(i * 200 + 48, "developpe-couche-barre", 68, 7)); // nette chute
  }
  const f = facteursRecuperation(logs, getExercise, T0 + 2100 * 36e5);
  assert.ok(f.pectoraux > 1.05, `demi-vie devrait être allongée, facteur = ${f.pectoraux}`);
  assert.ok(f.pectoraux <= 1 + PARAMS_APPRENTISSAGE.BORNE + 1e-9, `correction non bornée : ${f.pectoraux}`);
  // Les muscles non concernés ne bougent pas.
  assert.equal(f.quadriceps, 1);
});

test("facteursRecuperation : performance qui tient au retour → récupération plus RAPIDE", () => {
  const logs = [];
  for (let i = 0; i < 10; i++) {
    logs.push(seance(i * 200, "squat-barre", 100, 6));
    logs.push(seance(i * 200 + 48, "squat-barre", 106, 6)); // progresse malgré le retour rapide
  }
  const f = facteursRecuperation(logs, getExercise, T0 + 2100 * 36e5);
  assert.ok(f.quadriceps < 0.95, `demi-vie devrait être raccourcie, facteur = ${f.quadriceps}`);
  assert.ok(f.quadriceps >= 1 - PARAMS_APPRENTISSAGE.BORNE - 1e-9, `correction non bornée : ${f.quadriceps}`);
});

test("facteursRecuperation : performance stable → pas de correction sur du bruit", () => {
  const logs = [];
  for (let i = 0; i < 12; i++) {
    logs.push(seance(i * 200, "developpe-couche-barre", 80, 8));
    // ±1 rep en alternance : bruit, pas tendance
    logs.push(seance(i * 200 + 48, "developpe-couche-barre", 80, i % 2 ? 8 : 8));
  }
  const f = facteursRecuperation(logs, getExercise, T0 + 2600 * 36e5);
  assert.equal(f.pectoraux, 1, "une performance stable ne doit rien changer");
});

test("facteursRecuperation : la confiance grandit avec le nombre d'observations", () => {
  const construire = (n) => {
    const logs = [];
    for (let i = 0; i < n; i++) {
      logs.push(seance(i * 200, "developpe-couche-barre", 80, 8));
      logs.push(seance(i * 200 + 48, "developpe-couche-barre", 68, 7));
    }
    return facteursRecuperation(logs, getExercise, T0 + (n * 200 + 100) * 36e5).pectoraux;
  };
  const peu = construire(PARAMS_APPRENTISSAGE.MIN_OBS + 1);
  const beaucoup = construire(PARAMS_APPRENTISSAGE.OBS_PLEINE + 4);
  assert.ok(beaucoup > peu, `plus de données doit peser plus fort : ${peu} → ${beaucoup}`);
});

/* ============================ EFFET RÉEL SUR LE MODÈLE ============================ */

test("demiVie : le facteur appris allonge ou raccourcit, et refuse l'aberrant", () => {
  const base = demiVie(10, 0.2, "grand");
  assert.ok(demiVie(10, 0.2, "grand", 1.3) > base);
  assert.ok(demiVie(10, 0.2, "grand", 0.8) < base);
  assert.equal(demiVie(10, 0.2, "grand", 1), base);
  // valeurs impossibles : on retombe sur le modèle générique ou sur les bornes
  assert.equal(demiVie(10, 0.2, "grand", 0), base);
  assert.equal(demiVie(10, 0.2, "grand", NaN), base);
  assert.equal(demiVie(10, 0.2, "grand", 99), demiVie(10, 0.2, "grand", 2));
});

test("etatMusculaire : un facteur > 1 laisse effectivement plus de fatigue", () => {
  const logs = [seance(0, "developpe-couche-barre", 90, 6, 6)];
  const t = T0 + 30 * 36e5;
  const normal = etatMusculaire(logs, getExercise, t).pectoraux.readiness;
  const lent = etatMusculaire(logs, getExercise, t, { facteurs: { pectoraux: 1.3 } }).pectoraux.readiness;
  const rapide = etatMusculaire(logs, getExercise, t, { facteurs: { pectoraux: 0.75 } }).pectoraux.readiness;
  assert.ok(lent < normal, `récupération lente → readiness plus bas (${lent} vs ${normal})`);
  assert.ok(rapide > normal, `récupération rapide → readiness plus haut (${rapide} vs ${normal})`);
  // un facteur sur un muscle n'affecte pas les autres
  assert.equal(
    etatMusculaire(logs, getExercise, t).quadriceps.readiness,
    etatMusculaire(logs, getExercise, t, { facteurs: { pectoraux: 1.3 } }).quadriceps.readiness);
});

test("expliquerApprentissage : n'expose que ce qui a réellement été ajusté", () => {
  const logs = [];
  for (let i = 0; i < 10; i++) {
    logs.push(seance(i * 200, "developpe-couche-barre", 80, 8));
    logs.push(seance(i * 200 + 48, "developpe-couche-barre", 68, 7));
  }
  const ex = expliquerApprentissage(logs, getExercise, T0 + 2100 * 36e5);
  assert.equal(ex.length, 1);
  assert.equal(ex[0].muscle, "pectoraux");
  assert.equal(ex[0].sens, "plus lente");
  assert.ok(ex[0].n >= PARAMS_APPRENTISSAGE.MIN_OBS);
  assert.ok(ex[0].ecartMoyen < 0);
  // aucune donnée → rien à expliquer (et surtout pas une liste de 18 muscles à 1)
  assert.deepEqual(expliquerApprentissage([], getExercise, T0), []);
});
