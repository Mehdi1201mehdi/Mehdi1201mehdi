// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { genererProgramme } from "../src/engine/generator.js";
import { getExercise } from "../src/data/exercises.js";
import { makeProfil, SANS_MATERIEL } from "./helpers.js";

const idsDe = (prog) => prog.seances.map((s) => s.exercices.map((e) => e.exerciceId));
const tousExos = (prog) => prog.seances.flatMap((s) => s.exercices);

test("débutant sans matériel, 3 jours → full body, exercices au poids du corps uniquement", () => {
  const prog = genererProgramme(makeProfil({ ...SANS_MATERIEL, joursParSemaine: 3, objectif: "remise_forme" }));
  assert.equal(prog.split, "full_body");
  assert.equal(prog.seances.length, 3);
  for (const s of prog.seances) {
    assert.ok(s.exercices.length >= 3, "au moins 3 exercices par séance");
    for (const e of s.exercices) {
      const exo = getExercise(e.exerciceId);
      assert.deepEqual(exo.equipement, ["poids_du_corps"], `${exo.id} ne doit nécessiter que le poids du corps`);
    }
  }
});

test("intermédiaire en salle, 4 jours → split haut/bas, 4 séances", () => {
  const prog = genererProgramme(makeProfil({ joursParSemaine: 4, dureeSeanceMin: 60 }));
  assert.equal(prog.split, "haut_bas");
  assert.equal(prog.seances.length, 4);
  for (const s of prog.seances) assert.ok(s.exercices.length >= 4);
});

test("séance limitée à 30 minutes → moins d'exercices qu'à 60 minutes", () => {
  const p30 = genererProgramme(makeProfil({ dureeSeanceMin: 30 }));
  const p60 = genererProgramme(makeProfil({ dureeSeanceMin: 60 }));
  const n30 = p30.seances[0].exercices.length;
  const n60 = p60.seances[0].exercices.length;
  assert.ok(n30 >= 3, "au moins 3 exercices même en 30 min");
  assert.ok(n30 < n60, `30 min (${n30}) doit contenir moins d'exercices que 60 min (${n60})`);
});

test("utilisateur refusant les squats → aucun mouvement de patron 'squat'", () => {
  const refuses = ["squat-poids-du-corps", "goblet-squat", "squat-barre", "presse-cuisses"];
  const prog = genererProgramme(makeProfil({ exercicesRefuses: refuses }));
  for (const e of tousExos(prog)) {
    const exo = getExercise(e.exerciceId);
    assert.notEqual(exo.patron, "squat", `${exo.id} est un squat, interdit`);
    assert.ok(!refuses.includes(exo.id));
  }
});

test("utilisateur sans banc → aucun exercice nécessitant un banc", () => {
  /** @type {import("../src/models.js").Profil["equipements"]} */
  const equipements = ["poids_du_corps", "halteres", "barre", "rack", "poulie", "barre_traction", "machine_guidee", "machine_leviers"];
  const prog = genererProgramme(makeProfil({ equipements }));
  for (const e of tousExos(prog)) {
    const exo = getExercise(e.exerciceId);
    assert.ok(!exo.equipement.includes("banc"), `${exo.id} nécessite un banc`);
  }
});

test("déterminisme : deux générations avec le même profil donnent la même sélection", () => {
  const profil = makeProfil({ joursParSemaine: 3 });
  const a = idsDe(genererProgramme(profil, { now: "2026-01-01T00:00:00Z" }));
  const b = idsDe(genererProgramme(profil, { now: "2026-01-01T00:00:00Z" }));
  assert.deepEqual(a, b);
});

test("pas de charge en kg imposée pour une première séance", () => {
  const prog = genererProgramme(makeProfil());
  for (const e of tousExos(prog)) {
    for (const s of e.series) assert.equal(s.chargeKg, null, "aucune charge arbitraire imposée");
  }
});

test("chaque exercice porte une justification lisible", () => {
  const prog = genererProgramme(makeProfil());
  for (const e of tousExos(prog)) {
    assert.ok(typeof e.justification === "string" && e.justification.length > 5);
  }
  assert.ok(prog.justificationGlobale.length > 10);
});

test("pas de doublon biomécanique lourd : au plus un patron 'squat' par séance", () => {
  const prog = genererProgramme(makeProfil({ joursParSemaine: 4 }));
  for (const s of prog.seances) {
    const patrons = s.exercices.map((e) => getExercise(e.exerciceId).patron);
    const squats = patrons.filter((p) => p === "squat").length;
    assert.ok(squats <= 1, `séance ${s.nom} : ${squats} squats`);
  }
});

// ---- Répartition choisie par l'utilisateur ----

test("répartition imposée : « bro_split » donne un groupe musculaire par séance", () => {
  const prog = genererProgramme(makeProfil({ joursParSemaine: 5, niveau: "intermediaire", objectif: "prise_muscle", lieu: "salle",
    equipements: ["poids_du_corps", "halteres", "barre", "banc", "poulie", "machine_guidee", "rack", "barre_traction"], split: "bro_split" }));
  assert.equal(prog.split, "bro_split");
  assert.deepEqual(prog.seances.map((s) => s.nom), ["Pectoraux", "Dos", "Jambes", "Épaules", "Bras"]);
  for (const s of prog.seances) assert.ok(s.exercices.length >= 3, `${s.nom} : ${s.exercices.length} exercices`);
  // Séance « Pectoraux » : le premier exercice vise bien les pectoraux.
  assert.ok(getExercise(prog.seances[0].exercices[0].exerciceId).musclesPrincipaux.includes("pectoraux"));
  // Aucun doublon dans une même séance.
  for (const s of prog.seances) assert.equal(new Set(s.exercices.map((e) => e.exerciceId)).size, s.exercices.length);
});

test("répartition « auto » ou inconnue : la règle par défaut reste inchangée", () => {
  const base = /** @type {any} */ ({ joursParSemaine: 4, niveau: "intermediaire", objectif: "prise_muscle" });
  assert.equal(genererProgramme(makeProfil({ ...base })).split, "haut_bas");
  assert.equal(genererProgramme(makeProfil({ ...base, split: "auto" })).split, "haut_bas");
  assert.equal(genererProgramme(makeProfil({ ...base, split: "nimporte" })).split, "haut_bas");
  assert.equal(genererProgramme(makeProfil({ ...base, split: "full_body" })).split, "full_body");
});

test("« bro_split » à 4 et 3 séances : aucun grand groupe oublié", () => {
  const eq = ["poids_du_corps", "halteres", "barre", "banc", "poulie", "machine_guidee", "rack", "barre_traction"];
  const p4 = genererProgramme(makeProfil(/** @type {any} */ ({ joursParSemaine: 4, niveau: "intermediaire", objectif: "prise_muscle", lieu: "salle", equipements: eq, split: "bro_split" })));
  assert.deepEqual(p4.seances.map((s) => s.nom), ["Pectoraux", "Dos", "Jambes", "Épaules · Bras"]);
  const muscles = new Set(p4.seances.flatMap((s) => s.exercices.flatMap((e) => getExercise(e.exerciceId).musclesPrincipaux)));
  for (const m of ["pectoraux", "dorsaux", "quadriceps", "epaules", "biceps", "triceps"]) assert.ok(muscles.has(m), `${m} absent`);
  const p3 = genererProgramme(makeProfil(/** @type {any} */ ({ joursParSemaine: 3, niveau: "intermediaire", objectif: "prise_muscle", lieu: "salle", equipements: eq, split: "bro_split" })));
  assert.equal(p3.seances.length, 3);
});
