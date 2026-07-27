// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { PROGRAMMES, programmeParId, totalExercices } from "../src/data/programmes.js";
import { getExercise } from "../src/data/exercises.js";

test("PROGRAMMES : chaque exercice référencé existe dans le catalogue", () => {
  let n = 0;
  for (const p of PROGRAMMES) {
    for (const s of p.seances) {
      for (const ex of s.exercices) {
        assert.ok(getExercise(ex.ref), `exercice introuvable : ${p.id} → ${ex.ref}`);
        n++;
      }
    }
  }
  assert.ok(n > 50, "la bibliothèque doit contenir assez d'exercices");
});

test("PROGRAMMES : métadonnées cohérentes", () => {
  const ids = new Set();
  for (const p of PROGRAMMES) {
    assert.ok(!ids.has(p.id), `identifiant dupliqué : ${p.id}`);
    ids.add(p.id);
    assert.ok(p.nom && p.description && p.progression, `${p.id} : textes manquants`);
    assert.ok(p.seances.length >= 3, `${p.id} : au moins 3 séances`);
    assert.ok(p.joursParSemaine >= 3 && p.joursParSemaine <= 6);
    for (const s of p.seances) {
      assert.ok(s.nom && s.exercices.length, `${p.id}/${s.nom} : séance vide`);
      for (const ex of s.exercices) {
        // soit des répétitions, soit une durée (gainage) — jamais les deux vides
        assert.ok(ex.reps || ex.duree, `${p.id} → ${ex.ref} : ni reps ni durée`);
        if (ex.reps) {
          assert.equal(ex.reps.length, 2);
          assert.ok(ex.reps[0] <= ex.reps[1], `${ex.ref} : fourchette inversée`);
        }
        assert.ok(ex.series >= 1 && ex.series <= 10);
        assert.ok(ex.repos >= 30 && ex.repos <= 300);
      }
    }
  }
});

test("programmeParId / totalExercices", () => {
  assert.equal(programmeParId("force-5x5")?.nom, "Force 5×5");
  assert.equal(programmeParId("inexistant"), null);
  assert.equal(totalExercices(programmeParId("fullbody-debutant")), 12);
});
