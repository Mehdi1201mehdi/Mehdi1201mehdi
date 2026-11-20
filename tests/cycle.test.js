// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { phasesCycle, creerCycle, etatCycle, besoinDeload, bilanCycle, programmeSuivant, dureeCycleConseillee, lundiDe } from "../src/engine/cycle.js";
import { genererProgramme } from "../src/engine/generator.js";
import { getExercise } from "../src/data/exercises.js";
import { makeProfil } from "./helpers.js";

const J = 864e5;

test("phases : 4 à 12 semaines, deload en dernière semaine, adaptation au début", () => {
  for (let n = 4; n <= 12; n++) {
    const p = phasesCycle(n, "intermediaire");
    assert.equal(p.length, n);
    assert.equal(p[0], "adaptation");
    assert.equal(p[n - 1], "recuperation");
  }
  assert.equal(phasesCycle(2).length, 4, "plancher à 4 semaines");
  assert.equal(phasesCycle(20).length, 12, "plafond à 12 semaines");
});

test("phases : jamais plus de 5 semaines de charge d'affilée hors débutant", () => {
  for (const niv of ["intermediaire", "avance"]) for (let n = 4; n <= 12; n++) {
    let suite = 0, max = 0;
    for (const ph of phasesCycle(n, niv)) { suite = ph === "recuperation" ? 0 : suite + 1; max = Math.max(max, suite); }
    assert.ok(max <= 6, `${niv} ${n} sem : ${max} semaines de charge`);
  }
  assert.deepEqual(phasesCycle(8, "debutant").slice(0, 2), ["adaptation", "adaptation"]);
  assert.ok(!phasesCycle(8, "debutant").includes("intensification"), "pas d'intensification pour un débutant");
  assert.equal(phasesCycle(6, "avance")[4], "intensification", "semaine avant le deload");
});

test("durée conseillée selon le niveau", () => {
  assert.equal(dureeCycleConseillee({ niveau: "debutant" }), 8);
  assert.equal(dureeCycleConseillee({ niveau: "intermediaire" }), 6);
  assert.equal(dureeCycleConseillee({ niveau: "avance" }), 5);
});

test("état du cycle : semaine courante, phase, fin", () => {
  const prog = genererProgramme(makeProfil({ joursParSemaine: 3 }));
  const debut = new Date("2026-11-02T10:00:00"); // lundi
  const c = creerCycle(prog, makeProfil({ niveau: "intermediaire" }), { debut, semaines: 6 });
  assert.equal(new Date(c.debut).getDay(), 1);
  const e1 = etatCycle(c, [], new Date("2026-11-04T12:00:00"));
  assert.equal(e1.semaine, 1); assert.equal(e1.phase, "adaptation"); assert.equal(e1.termine, false);
  const e6 = etatCycle(c, [], new Date("2026-12-09T12:00:00"));
  assert.equal(e6.semaine, 6); assert.equal(e6.phase, "recuperation");
  const fini = etatCycle(c, [], new Date("2026-12-15T12:00:00"));
  assert.equal(fini.termine, true);
});

const log = (date, exerciceId, charge, reps, rir = 2, extra = {}) => ({
  id: date + exerciceId, date, seanceId: "seance-0",
  exercices: [{ exerciceId, series: [{ chargeKg: charge, reps, rir }, { chargeKg: charge, reps, rir }, { chargeKg: charge, reps, rir }], ...extra }],
});

test("deload : un signal isolé ne suffit pas, plusieurs signaux réels oui", () => {
  const t = Date.parse("2026-11-20T12:00:00");
  // Une seule mauvaise séance
  const calme = [log("2026-11-18T10:00:00", "squat-barre", 100, 8)];
  assert.equal(besoinDeload(calme, { maintenant: t }).deload, false);
  // 7 semaines d'affilée + baisse de perf sur 2 exercices + échecs
  const logs = [];
  for (let k = 8; k >= 1; k--) {
    // Un mercredi par semaine (t est un vendredi) : semaines consécutives.
    const d = new Date(t - k * 7 * J - 2 * J).toISOString();
    logs.push(log(d, "squat-barre", 100, 8, 1), log(d, "developpe-couche-barre", 80, 8, 1));
  }
  logs.push(log(new Date(t - J).toISOString(), "squat-barre", 90, 6, 0), log(new Date(t - J).toISOString(), "developpe-couche-barre", 70, 6, 0));
  const r = besoinDeload(logs, { maintenant: t });
  assert.equal(r.deload, true);
  assert.ok(r.raisons.some((x) => /baisse/.test(x)));
  assert.ok(r.raisons.some((x) => /semaines d'entraînement d'affilée/.test(x)), r.raisons.join(" | "));
  // Une semaine allégée récente remet le compteur à zéro.
  const apresDeload = besoinDeload(logs, { maintenant: t, dernierDeload: new Date(t - 10 * J).toISOString() });
  assert.ok(!apresDeload.raisons.some((x) => /d'affilée/.test(x)));
});

test("bilan de cycle : assiduité, progrès, stagnation, décisions — à partir des séances réelles", () => {
  const profil = makeProfil({ joursParSemaine: 3, niveau: "intermediaire" });
  const prog = genererProgramme(profil);
  const c = creerCycle(prog, profil, { debut: new Date("2026-09-07T10:00:00"), semaines: 6 });
  const ids = [...new Set(prog.seances.flatMap((s) => s.exercices.map((e) => e.exerciceId)))];
  const [progresse, stagne] = ids;
  const logs = [];
  for (let sem = 0; sem < 6; sem++) for (let j = 0; j < 3; j++) {
    const d = new Date(Date.parse(c.debut) + (sem * 7 + j * 2) * J + 36e6).toISOString();
    logs.push({ id: d, date: d, seanceId: prog.seances[j].id, exercices: [
      { exerciceId: progresse, series: [{ chargeKg: 50 + sem * 2.5, reps: 10, rir: 2 }] },
      { exerciceId: stagne, series: [{ chargeKg: 40, reps: 10, rir: 2 }] },
    ] });
  }
  const b = bilanCycle(c, logs, getExercise, prog, profil);
  assert.equal(b.seances, 18); assert.equal(b.prevues, 18); assert.equal(b.assiduite, 1);
  assert.equal(b.exercices.find((e) => e.id === progresse).statut, "progres");
  assert.equal(b.exercices.find((e) => e.id === stagne).statut, "stagne");
  assert.ok(b.aRemplacer.includes(stagne));
  assert.ok(b.decisions.length >= 1);
  // Le cycle suivant remplace l'exercice qui a stagné, sans toucher au profil.
  const avantProfil = JSON.stringify(profil);
  const s = programmeSuivant(b, profil, prog, genererProgramme, "2026-10-19T00:00:00.000Z");
  assert.equal(JSON.stringify(profil), avantProfil, "profil non modifié");
  const nouveaux = s.programme.seances.flatMap((x) => x.exercices.map((e) => e.exerciceId));
  assert.ok(!nouveaux.includes(stagne), "exercice stagnant remplacé par une variante");
  assert.ok(s.retires.includes(stagne));
});

test("bilan : faible assiduité → on garde la structure, pas d'ajout de volume", () => {
  const profil = makeProfil({ joursParSemaine: 4 });
  const prog = genererProgramme(profil);
  const c = creerCycle(prog, profil, { debut: new Date("2026-09-07T10:00:00"), semaines: 6 });
  const d = new Date(Date.parse(c.debut) + 2 * J).toISOString();
  const b = bilanCycle(c, [{ id: "x", date: d, seanceId: prog.seances[0].id, exercices: [] }], getExercise, prog, profil);
  assert.ok(b.assiduite < 0.6);
  assert.equal(b.tendanceVolume, "maintenir");
  assert.match(b.decisions[0], /Assiduité/);
});

test("lundiDe renvoie le lundi 00:00", () => {
  const l = lundiDe(new Date("2026-11-22T18:00:00")); // dimanche
  assert.equal(l.getDay(), 1); assert.equal(l.getHours(), 0); assert.equal(l.getDate(), 16);
});
