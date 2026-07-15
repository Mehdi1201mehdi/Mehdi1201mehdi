// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { mapMuscle, mapEquipment, infererPatron, mapExercice } from "../src/integrations/wger-import.mjs";

test("mapMuscle : noms wger → nos identifiants", () => {
  assert.equal(mapMuscle("Pectoralis major"), "pectoraux");
  assert.equal(mapMuscle("Latissimus dorsi"), "dorsaux");
  assert.equal(mapMuscle("Biceps femoris"), "ischios");
  assert.equal(mapMuscle("Quadriceps femoris"), "quadriceps");
  assert.equal(mapMuscle("Gastrocnemius"), "mollets");
  assert.equal(mapMuscle("Truc inconnu"), null);
});

test("mapEquipment : matériel wger → nos identifiants", () => {
  assert.equal(mapEquipment("Barbell"), "barre");
  assert.equal(mapEquipment("SZ-Bar"), "barre_ez");
  assert.equal(mapEquipment("Dumbbell"), "halteres");
  assert.equal(mapEquipment("none (Bodyweight exercise)"), "poids_du_corps");
  assert.equal(mapEquipment("Pull-up bar"), "barre_traction");
});

test("infererPatron : déduit le patron depuis le nom, repli catégorie", () => {
  assert.equal(infererPatron("Barbell Squat", "Legs"), "squat");
  assert.equal(infererPatron("Romanian Deadlift", "Legs"), "charniere_hanche");
  assert.equal(infererPatron("Bench Press", "Chest"), "poussee_horizontale");
  assert.equal(infererPatron("Bent Over Row", "Back"), "tirage_horizontal");
  assert.equal(infererPatron("Biceps Curl", "Arms"), "flexion_bras");
  assert.equal(infererPatron("Machin bizarre", "Chest"), "poussee_horizontale"); // repli catégorie
});

const baseWger = {
  id: 42, uuid: "abcd1234-5678-90ab-cdef-000000000000",
  category: { id: 11, name: "Chest" },
  muscles: [{ name: "Pectoralis major", name_en: "Pectoralis major" }],
  muscles_secondary: [{ name: "Triceps brachii", name_en: "Triceps brachii" }],
  equipment: [{ name: "Barbell" }],
  images: [{ image: "https://wger.de/media/x.png", is_main: true }],
  exercises: [{ language: 2, name: "Wide Bench Press", description: "<p>Allonge-toi.</p>" }],
};

test("mapExercice : conversion complète vers notre schéma", () => {
  const exo = mapExercice(baseWger, { curatedNames: new Set() });
  assert.ok(exo.id.startsWith("wger-"));
  assert.equal(exo.nom, "Wide Bench Press");
  assert.deepEqual(exo.musclesPrincipaux, ["pectoraux"]);
  assert.deepEqual(exo.musclesSecondaires, ["triceps"]);
  assert.deepEqual(exo.equipement, ["barre"]);
  assert.equal(exo.patron, "poussee_horizontale");
  assert.equal(exo.media.miniature, "https://wger.de/media/x.png");
  assert.equal(exo.source, "wger");
  assert.equal(exo.description.includes("<"), false, "HTML nettoyé");
});

test("mapExercice : déduplication avec le cœur curé", () => {
  const exo = mapExercice(baseWger, { curatedNames: new Set(["wide bench press"]) });
  assert.equal(exo, null);
});

test("mapExercice : sans muscle explicite → repli sur la catégorie ; sans équipement → poids du corps", () => {
  const b = { id: 1, category: { name: "Abs" }, muscles: [], muscles_secondary: [], equipment: [], images: [], exercises: [{ language: 2, name: "Hollow Hold", description: "" }] };
  const exo = mapExercice(b, { curatedNames: new Set() });
  assert.deepEqual(exo.musclesPrincipaux, ["abdominaux"]);
  assert.deepEqual(exo.equipement, ["poids_du_corps"]);
  assert.equal(exo.patron, "gainage");
});
