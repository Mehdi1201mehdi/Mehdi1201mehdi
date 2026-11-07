// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { alternatives } from "../src/engine/replacement.js";
import { getExercise } from "../src/data/exercises.js";
import { equipementDisponible, estContreIndique } from "../src/engine/constraints.js";
import { makeProfil } from "./helpers.js";

test("remplacer un développé couché barre → jusqu'à 3 alternatives pectoraux, matériel dispo", () => {
  const profil = makeProfil();
  const alts = alternatives("developpe-couche-barre", profil);
  assert.ok(alts.length >= 1 && alts.length <= 3);
  assert.equal(alts[0].etiquette, "Meilleur équivalent");
  for (const a of alts) {
    assert.ok(a.exercice.musclesPrincipaux.includes("pectoraux"), "conserve le muscle principal");
    assert.ok(equipementDisponible(a.exercice, profil.equipements));
    assert.ok(!estContreIndique(a.exercice, profil.limitations));
    assert.ok(typeof a.explication === "string" && a.explication.length > 5);
  }
});

test("un exercice refusé n'apparaît jamais dans les alternatives", () => {
  const profil = makeProfil({ exercicesRefuses: ["developpe-couche-halteres"] });
  const alts = alternatives("developpe-couche-barre", profil);
  for (const a of alts) assert.notEqual(a.exercice.id, "developpe-couche-halteres");
});

test("épaule sensible → aucune alternative contre-indiquée pour l'épaule", () => {
  const profil = makeProfil({ limitations: ["epaule"] });
  const alts = alternatives("developpe-couche-barre", profil);
  for (const a of alts) assert.ok(!a.exercice.contreIndications.includes("epaule"));
});

test("matériel limité (maison, haltères) → alternatives réalisables à la maison", () => {
  const profil = makeProfil({ equipements: ["poids_du_corps", "halteres"], lieu: "maison" });
  const alts = alternatives("developpe-couche-barre", profil);
  for (const a of alts) assert.ok(equipementDisponible(a.exercice, ["poids_du_corps", "halteres"]));
});

import { variantes, scoreEquivalence } from "../src/engine/replacement.js";
import { chargerCatalogueEtendu } from "../src/data/exercises.js";

test("catalogue étendu : remplaçants rédigés en priorité ; jamais de fiche importée si limitation déclarée", async () => {
  await chargerCatalogueEtendu();
  const sansLimite = alternatives("developpe-couche-barre", makeProfil());
  assert.ok(sansLimite.length >= 1);
  const prudent = alternatives("developpe-couche-barre", makeProfil({ limitations: ["genou"] }));
  for (const a of prudent) assert.equal(a.exercice.source, undefined, `${a.exercice.id} : fiche importée proposée malgré une limitation`);
});

test("familles respectées : un cardio n'est remplacé que par un cardio, un développé jamais par un cardio", async () => {
  await chargerCatalogueEtendu();
  for (const a of alternatives("rameur", makeProfil({ equipements: ["rameur", "velo", "tapis_course", "poids_du_corps"] }))) {
    assert.equal(a.exercice.typeExercice, "cardio");
  }
  for (const a of alternatives("developpe-couche-barre", makeProfil())) assert.notEqual(a.exercice.typeExercice, "cardio");
});

test("score pondéré : muscle principal et patron communs l'emportent ; fiche rédigée légèrement favorisée", () => {
  const o = getExercise("developpe-couche-barre");
  const proche = { ...o, id: "x", source: undefined };
  const importe = { ...o, id: "y", source: "free-exercise-db" };
  assert.ok(scoreEquivalence(o, proche) > scoreEquivalence(o, importe));
  const autreMuscle = { ...o, id: "z", musclesPrincipaux: ["quadriceps"], patron: "squat" };
  assert.ok(scoreEquivalence(o, proche) - scoreEquivalence(o, autreMuscle) >= 9);
});

test("variantes : même patron et même muscle principal, plus facile < difficulté < plus difficile", async () => {
  await chargerCatalogueEtendu();
  const o = getExercise("developpe-couche-barre");
  const v = variantes("developpe-couche-barre");
  for (const e of [...v.plusFacile, ...v.plusDifficile, ...v.unilaterale]) {
    assert.equal(e.patron, o.patron);
    assert.equal(e.musclesPrincipaux[0], o.musclesPrincipaux[0]);
  }
  for (const e of v.plusFacile) assert.ok(e.difficulte < o.difficulte);
  for (const e of v.plusDifficile) assert.ok(e.difficulte > o.difficulte);
  for (const e of v.unilaterale) assert.equal(e.unilateral, true);
  assert.deepEqual(variantes("inconnu"), { plusFacile: [], plusDifficile: [], unilaterale: [], bilaterale: [] });
});
