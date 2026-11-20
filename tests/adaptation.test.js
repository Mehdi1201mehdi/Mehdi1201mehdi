// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { prochaineSeance, adapterSeance, dureeSeance } from "../src/engine/adaptation.js";
import { genererProgramme } from "../src/engine/generator.js";
import { getExercise } from "../src/data/exercises.js";
import { makeProfil } from "./helpers.js";

const prog = genererProgramme(makeProfil({ joursParSemaine: 3 }), { now: "2026-11-01T00:00:00.000Z" });
const fait = (date, i) => ({ id: date, date, seanceId: prog.seances[i].id, exercices: [] });

test("rotation : la séance suivant la dernière faite, rien n'est sauté", () => {
  const r = prochaineSeance(prog, [fait("2026-11-16T18:00:00", 0)], { maintenant: new Date("2026-11-18T09:00:00"), joursPlanifies: [1, 3, 5] });
  assert.equal(r.seance.id, prog.seances[1].id);
  assert.equal(r.manquees, 0);
  assert.equal(r.message, null);
});

test("séance manquée : on reprend là où on s'est arrêté, sans doubler", () => {
  // Lundi manqué, on est mercredi : la séance A est proposée (pas B).
  const r = prochaineSeance(prog, [fait("2026-11-14T18:00:00", 2)], { maintenant: new Date("2026-11-18T09:00:00"), joursPlanifies: [1, 3, 5] });
  assert.equal(r.seance.id, prog.seances[0].id);
  assert.equal(r.manquees, 1);
  assert.match(r.message, /reprend/);
  // Samedi, deux séances manquées, il reste 2 jours pour 3 séances : jamais deux par jour.
  const r2 = prochaineSeance(prog, [fait("2026-11-14T18:00:00", 2)], { maintenant: new Date("2026-11-21T09:00:00"), joursPlanifies: [1, 3, 5] });
  assert.equal(r2.joursRestants, 2);
  assert.match(r2.message, /Aucune séance doublée/);
});

test("rotation : les séances d'un ancien programme ne comptent pas", () => {
  const r = prochaineSeance(prog, [fait("2026-10-20T18:00:00", 1)], { maintenant: new Date("2026-11-18T09:00:00") });
  assert.equal(r.seance.id, prog.seances[0].id);
});

test("version courte : tient dans le temps donné et garde le mouvement principal", () => {
  const s = prog.seances[0];
  const c = adapterSeance(s, { mode: "courte", minutes: 30, getExercise });
  assert.ok(c.dureeEstimeeMin <= 32, `durée ${c.dureeEstimeeMin} min`);
  assert.ok(c.exercices.length >= 2);
  const principal = s.exercices.find((e) => e.role === "principal");
  assert.ok(c.exercices.some((e) => e.exerciceId === principal.exerciceId), "principal conservé");
  assert.equal(c.origineId, s.id);
  assert.notEqual(c.id, s.id);
  assert.equal(s.exercices.length, prog.seances[0].exercices.length, "séance d'origine intacte");
});

test("version courte : les muscles prioritaires passent avant les autres isolations", () => {
  const s = prog.seances[0];
  const iso = s.exercices.filter((e) => e.role === "isolation");
  if (!iso.length) return;
  const muscle = getExercise(iso[0].exerciceId).musclesPrincipaux[0];
  const c = adapterSeance(s, { mode: "courte", minutes: 35, getExercise, musclesPrioritaires: [muscle] });
  const gardesIso = c.exercices.filter((e) => e.role === "isolation").map((e) => e.exerciceId);
  if (gardesIso.length) assert.ok(gardesIso.includes(iso[0].exerciceId));
});

test("version allégée (fatigue) et semaine de récupération : −1 série, −10 %, plus de réserve", () => {
  const s = prog.seances[0];
  for (const a of [adapterSeance(s, { mode: "allegee" }), adapterSeance(s, { phase: "recuperation" })]) {
    assert.equal(a.chargeFacteur, 0.9);
    a.exercices.forEach((e, i) => {
      const avant = s.exercices[i].series.filter((x) => x.type !== "echauffement");
      const apres = e.series.filter((x) => x.type !== "echauffement");
      assert.equal(apres.length, Math.max(2, avant.length > 2 ? avant.length - 1 : avant.length));
      apres.forEach((x, k) => { if (avant[k].rirCible != null) assert.ok(x.rirCible >= avant[k].rirCible); });
    });
  }
});

test("phase de progression : séance inchangée ; intensification : réserve −1 mais jamais 0 sur un principal", () => {
  const s = prog.seances[0];
  assert.equal(adapterSeance(s, { phase: "progression" }), s);
  const i = adapterSeance(s, { phase: "intensification" });
  i.exercices.filter((e) => e.role === "principal").forEach((e) => e.series.filter((x) => x.type !== "echauffement").forEach((x) => assert.ok(x.rirCible >= 1)));
});

test("dureeSeance compte l'échauffement général", () => {
  assert.equal(dureeSeance({ exercices: [] }), 8);
});
