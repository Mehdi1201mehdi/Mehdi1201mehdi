// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { volumeProgramme, bilanVolume, fourchetteVolume, MUSCLES_SUIVIS } from "../src/engine/volume.js";
import { genererProgramme } from "../src/engine/generator.js";
import { getExercise } from "../src/data/exercises.js";
import { makeProfil } from "./helpers.js";

test("les 11 groupes du cahier des charges sont suivis", () => {
  assert.equal(MUSCLES_SUIVIS.length, 11);
});

test("volume et fréquence : principal = 1 série, secondaire = ½", () => {
  const prog = { seances: [
    { id: "a", exercices: [{ exerciceId: "developpe-couche-halteres", series: [{ type: "echauffement" }, { type: "travail" }, { type: "travail" }, { type: "travail" }] }] },
    { id: "b", exercices: [{ exerciceId: "developpe-couche-halteres", series: [{ type: "travail" }, { type: "travail" }] }] },
  ] };
  const exo = getExercise("developpe-couche-halteres");
  const v = volumeProgramme(prog, getExercise);
  assert.equal(v.pectoraux.series, 5, "approche exclue");
  assert.equal(v.pectoraux.frequence, 2);
  const sec = exo.musclesSecondaires[0];
  assert.equal(v[sec].series, 2.5);
});

test("fourchettes croissantes avec le niveau", () => {
  assert.ok(fourchetteVolume("pectoraux", "avance")[1] > fourchetteVolume("pectoraux", "debutant")[1]);
  assert.ok(fourchetteVolume("mollets", "intermediaire")[0] < fourchetteVolume("pectoraux", "intermediaire")[0]);
});

test("objectif harmonieux : aucun groupe sous son minimum quand la durée le permet", () => {
  const p = makeProfil({ objectif: "harmonie", joursParSemaine: 4, dureeSeanceMin: 75 });
  const prog = genererProgramme(p);
  const bas = bilanVolume(prog, getExercise, p.niveau).filter((b) => b.statut === "bas");
  assert.ok(bas.length <= 2, `groupes sous le minimum : ${bas.map((b) => b.muscle).join(", ")}`);
  prog.seances.forEach((s) => assert.ok(s.dureeEstimeeMin <= 75 + 8, `${s.nom} ${s.dureeEstimeeMin} min`));
});

test("muscle prioritaire : volume au moins égal à la version sans priorité, durée respectée", () => {
  const sans = genererProgramme(makeProfil({ joursParSemaine: 4, dureeSeanceMin: 75 }));
  const avec = genererProgramme(makeProfil({ joursParSemaine: 4, dureeSeanceMin: 75, musclesPrioritaires: ["biceps"] }));
  assert.ok(volumeProgramme(avec, getExercise).biceps.series >= volumeProgramme(sans, getExercise).biceps.series);
});
