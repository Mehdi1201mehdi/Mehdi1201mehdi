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
