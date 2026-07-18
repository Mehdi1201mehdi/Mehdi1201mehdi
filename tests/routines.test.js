// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  creerRoutine, renommer, ajouterSeance, supprimerSeance, ajouterExercice,
  supprimerExerciceIndex, deplacerExercice, definirSeries, estimerDureeSeance,
  dupliquerRoutine, seanceDepuisLog, serieTemplateDefaut,
} from "../src/engine/routines.js";
import { CATALOGUE, getExercise } from "../src/data/exercises.js";

// Deux exercices réels du catalogue pour les tests.
const EX1 = "pompes";
const EX2 = "squat-poids-du-corps";

test("creerRoutine : structure valide et perso", () => {
  const r = creerRoutine("Push maison");
  assert.equal(r.nom, "Push maison");
  assert.equal(r.perso, true);
  assert.equal(r.split, "perso");
  assert.ok(r.id.startsWith("routine-"));
  assert.deepEqual(r.seances, []);
});

test("creerRoutine : nom vide → défaut", () => {
  assert.equal(creerRoutine("   ").nom, "Ma routine");
  assert.equal(creerRoutine(null).nom, "Ma routine");
});

test("ajouterSeance / supprimerSeance", () => {
  const r = creerRoutine("R");
  const s1 = ajouterSeance(r, "Jour A");
  const s2 = ajouterSeance(r);
  assert.equal(r.seances.length, 2);
  assert.equal(s1.nom, "Jour A");
  assert.equal(s2.nom, "Séance 2");
  supprimerSeance(r, s1.id);
  assert.equal(r.seances.length, 1);
  assert.equal(r.seances[0].id, s2.id);
});

test("renommer : nettoie et garde un fallback", () => {
  const r = creerRoutine("A");
  renommer(r, "  Nouveau  ");
  assert.equal(r.nom, "Nouveau");
  renommer(r, "   ");
  assert.equal(r.nom, "Nouveau"); // vide ignoré → garde l'ancien
});

test("ajouterExercice : id inconnu → null (pas de fausse donnée)", () => {
  const s = ajouterSeance(creerRoutine("R"));
  assert.equal(ajouterExercice(s, "exercice-inexistant-xyz"), null);
  assert.equal(s.exercices.length, 0);
});

test("ajouterExercice : crée le bon nombre de séries de travail", () => {
  const s = ajouterSeance(creerRoutine("R"));
  const ex = ajouterExercice(s, EX1, { nbSeries: 4 });
  assert.ok(ex);
  assert.equal(s.exercices.length, 1);
  assert.equal(ex.series.length, 4);
  assert.ok(ex.series.every((x) => x.type === "travail"));
  assert.ok(s.dureeEstimeeMin > 0);
});

test("supprimerExerciceIndex / deplacerExercice", () => {
  const s = ajouterSeance(creerRoutine("R"));
  ajouterExercice(s, EX1);
  ajouterExercice(s, EX2);
  assert.deepEqual(s.exercices.map((e) => e.exerciceId), [EX1, EX2]);
  deplacerExercice(s, 0, 1);
  assert.deepEqual(s.exercices.map((e) => e.exerciceId), [EX2, EX1]);
  supprimerExerciceIndex(s, 0);
  assert.deepEqual(s.exercices.map((e) => e.exerciceId), [EX1]);
});

test("deplacerExercice : bornes respectées", () => {
  const s = ajouterSeance(creerRoutine("R"));
  ajouterExercice(s, EX1);
  ajouterExercice(s, EX2);
  deplacerExercice(s, 0, -1); // hors borne haut → inchangé
  assert.deepEqual(s.exercices.map((e) => e.exerciceId), [EX1, EX2]);
  deplacerExercice(s, 1, 1); // hors borne bas → inchangé
  assert.deepEqual(s.exercices.map((e) => e.exerciceId), [EX1, EX2]);
});

test("definirSeries : redimensionne selon les paramètres", () => {
  const s = ajouterSeance(creerRoutine("R"));
  const ex = ajouterExercice(s, EX1, { nbSeries: 3 });
  definirSeries(ex, { nbSeries: 5, reposSec: 120, repsCible: [5, 8] });
  assert.equal(ex.series.length, 5);
  assert.equal(ex.series[0].reposSec, 120);
  assert.deepEqual(ex.series[0].repsCible, [5, 8]);
});

test("serieTemplateDefaut : gainage → en temps", () => {
  const gain = CATALOGUE.find((e) => e.typeExercice === "gainage");
  if (gain) {
    const m = serieTemplateDefaut(gain);
    assert.ok(m.dureeSec > 0);
    assert.equal(m.repsCible, null);
  }
});

test("dupliquerRoutine : copie profonde avec nouveaux ids", () => {
  const r = creerRoutine("Original");
  const s = ajouterSeance(r, "A");
  ajouterExercice(s, EX1);
  const copie = dupliquerRoutine(r);
  assert.notEqual(copie.id, r.id);
  assert.notEqual(copie.seances[0].id, r.seances[0].id);
  assert.equal(copie.nom, "Original (copie)");
  assert.equal(copie.seances[0].exercices[0].exerciceId, EX1);
  // indépendance : modifier la copie ne touche pas l'original
  copie.seances[0].exercices.push({ exerciceId: EX2 });
  assert.equal(r.seances[0].exercices.length, 1);
});

test("seanceDepuisLog : reconstruit une séance jouable depuis un historique", () => {
  const log = {
    seanceNom: "Séance A",
    exercices: [
      { exerciceId: EX1, series: [{ reps: 12 }, { reps: 10 }, { reps: 8 }] },
      { exerciceId: "inconnu-zzz", series: [{ reps: 10 }] }, // ignoré
    ],
  };
  const s = seanceDepuisLog(log);
  assert.equal(s.nom, "Séance A (copie)");
  assert.equal(s.exercices.length, 1); // l'inconnu est écarté
  assert.equal(s.exercices[0].exerciceId, EX1);
  assert.equal(s.exercices[0].series.length, 3);
  // reps cible autour de la médiane (10)
  assert.ok(Array.isArray(s.exercices[0].series[0].repsCible));
});

test("estimerDureeSeance : croît avec le volume", () => {
  const s = ajouterSeance(creerRoutine("R"));
  ajouterExercice(s, EX1, { nbSeries: 2 });
  const d1 = estimerDureeSeance(s);
  ajouterExercice(s, EX2, { nbSeries: 4 });
  const d2 = estimerDureeSeance(s);
  assert.ok(d2 > d1);
});
