// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { PROGRAMMES_SALLE, programmeSalleParId } from "../src/data/programmes-salle.js";
import { getExercise, CATALOGUE } from "../src/data/exercises.js";
import { SALLE_EXERCISES } from "../src/data/exercises-salle.js";
import { MUSCLES, EQUIPMENTS } from "../src/models.js";

test("exercices de salle : schéma valide (muscles, équipement, reps)", () => {
  const mus = new Set(MUSCLES), eq = new Set(EQUIPMENTS);
  for (const e of SALLE_EXERCISES) {
    assert.ok(e.id && e.nom && e.description, `${e.id} : champs manquants`);
    assert.ok(e.musclesPrincipaux.length, `${e.id} : aucun muscle principal`);
    for (const k of ["musclesPrincipaux", "musclesSecondaires", "musclesStabilisateurs"]) {
      for (const m of e[k] || []) assert.ok(mus.has(m), `${e.id} : muscle inconnu « ${m} »`);
    }
    for (const k of ["equipement", "equipementsAlternatifs"]) {
      for (const q of e[k] || []) assert.ok(eq.has(q), `${e.id} : équipement inconnu « ${q} »`);
    }
    assert.ok(Array.isArray(e.repsPertinent) && e.repsPertinent.length === 2, `${e.id} : repsPertinent invalide`);
  }
});

test("catalogue : aucun identifiant dupliqué après fusion", () => {
  const ids = CATALOGUE.map((e) => e.id);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  assert.deepEqual(dup, [], `identifiants dupliqués : ${dup.join(", ")}`);
  assert.ok(CATALOGUE.length >= 90, "le catalogue doit contenir les exercices de salle");
});

test("PROGRAMMES_SALLE : chaque exercice référencé existe", () => {
  let n = 0;
  for (const p of PROGRAMMES_SALLE) {
    for (const s of p.seances) {
      for (const ex of s.exercices) {
        assert.ok(getExercise(ex.ref), `${p.id} → exercice introuvable « ${ex.ref} »`);
        n++;
      }
    }
  }
  assert.ok(n > 300, `attendu plus de 300 exercices prescrits, obtenu ${n}`);
});

test("PROGRAMMES_SALLE : métadonnées et volumes cohérents", () => {
  const ids = new Set();
  for (const p of PROGRAMMES_SALLE) {
    assert.ok(!ids.has(p.id), `identifiant en collision : ${p.id}`);
    ids.add(p.id);
    assert.ok(p.nom && p.accroche && p.description && p.progression, `${p.id} : textes manquants`);
    assert.ok(p.seances.length >= 1, `${p.id} : aucune séance`);
    assert.ok(p.joursParSemaine >= 1 && p.joursParSemaine <= 7, `${p.id} : jours/semaine invalide`);
    for (const s of p.seances) {
      assert.ok(s.nom && s.exercices.length, `${p.id}/${s.nom} : séance vide`);
      assert.ok(s.groupesCibles.length, `${p.id}/${s.nom} : aucun groupe ciblé`);
      for (const m of s.groupesCibles) assert.ok(MUSCLES.includes(m), `${p.id} : groupe inconnu « ${m} »`);
      for (const ex of s.exercices) {
        assert.ok(ex.reps || ex.duree, `${p.id} → ${ex.ref} : ni répétitions ni durée`);
        if (ex.reps) {
          assert.equal(ex.reps.length, 2, `${p.id} → ${ex.ref} : fourchette invalide`);
          assert.ok(ex.reps[0] <= ex.reps[1], `${p.id} → ${ex.ref} : fourchette inversée`);
        }
        assert.ok(ex.series >= 1 && ex.series <= 10, `${p.id} → ${ex.ref} : nb de séries invalide`);
        assert.ok(ex.repos >= 0 && ex.repos <= 300, `${p.id} → ${ex.ref} : repos invalide`);
      }
    }
  }
});

test("programmeSalleParId", () => {
  assert.equal(programmeSalleParId("prise-de-masse-salle")?.nom, "Prise de masse");
  assert.equal(programmeSalleParId("inexistant"), null);
  assert.equal(PROGRAMMES_SALLE.length, 18);
});
