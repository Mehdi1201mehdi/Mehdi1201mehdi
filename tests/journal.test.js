// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { trierLogs, nettoyerSerie, validerLog, isoLocal, construireLog, ajouterLog, remplacerLog, supprimerLog, parMois } from "../src/engine/journal.js";

const ex = (id, series) => ({ exerciceId: id, series });

test("ajout après coup : séance datée, triée dans l'historique, marquée ajoutée", () => {
  const logs = [{ id: "a", date: "2026-11-01T18:00:00.000Z", exercices: [] }, { id: "c", date: "2026-11-10T18:00:00.000Z", exercices: [] }];
  const log = construireLog({ id: "b", jour: "2026-11-05", heure: "19:00", dureeMin: 50, nom: "Jambes", exercices: [ex("squat-barre", [{ chargeKg: 80, reps: 8, rir: 2 }])], ressenti: -0.4 });
  assert.equal(validerLog(log, Date.parse("2026-11-20T12:00:00")), null);
  assert.equal(log.ajoutManuel, true);
  assert.equal(log.dureeSec, 3000);
  assert.equal(Date.parse(log.fin) - Date.parse(log.debut), 3000 * 1000);
  assert.equal(log.ressenti, -0.4);
  const r = ajouterLog(logs, log);
  assert.deepEqual(r.map((l) => l.id), ["a", "b", "c"], "trié chronologiquement");
  assert.equal(logs.length, 2, "tableau d'origine intact");
});

test("validation : futur, aucune série, aucun exercice refusés", () => {
  const t = Date.parse("2026-11-20T12:00:00");
  assert.match(String(validerLog(construireLog({ id: "x", jour: "2026-12-01", exercices: [ex("squat-barre", [{ reps: 5 }])] }), t)), /futur/);
  assert.match(String(validerLog(construireLog({ id: "x", jour: "2026-11-01", exercices: [] }), t)), /exercice/);
  assert.match(String(validerLog(construireLog({ id: "x", jour: "2026-11-01", exercices: [ex("squat-barre", [{ chargeKg: 50 }])] }), t)), /exercice|série/);
  assert.match(String(validerLog({ date: "n'importe quoi", exercices: [] }, t)), /Date/);
});

test("séries nettoyées : bornes, vides retirées, cardio et temps acceptés", () => {
  assert.deepEqual(nettoyerSerie({ chargeKg: "60", reps: "8.4", rir: "" }), { chargeKg: 60, reps: 8, rir: null, dureeSec: null, distanceM: null });
  assert.equal(nettoyerSerie({ chargeKg: 60 }), null, "charge sans répétitions = rien mesuré");
  assert.equal(nettoyerSerie({ chargeKg: 9999, reps: 5 }).chargeKg, 700);
  assert.equal(nettoyerSerie({ reps: -3 }), null);
  assert.equal(nettoyerSerie({ distanceM: 5000, dureeSec: 1500 }).distanceM, 5000);
  assert.equal(nettoyerSerie({ dureeSec: 60 }).dureeSec, 60);
  assert.equal(nettoyerSerie({ reps: 10, type: "echauffement" }).type, "echauffement");
});

test("correction : mêmes identifiant et champs d'origine, date modifiée → retrié", () => {
  const base = { id: "a", date: "2026-11-01T18:00:00.000Z", seanceId: "seance-0", seanceNom: "Haut A", adaptation: "courte", exercices: [ex("squat-barre", [{ reps: 5, chargeKg: 100 }])] };
  const logs = [base, { id: "b", date: "2026-11-03T18:00:00.000Z", exercices: [] }];
  const corr = construireLog({ id: "a", base, jour: "2026-11-05", heure: "18:00", dureeMin: 60, exercices: [ex("squat-barre", [{ reps: 5, chargeKg: 102.5 }])] });
  assert.equal(corr.seanceId, "seance-0"); assert.equal(corr.adaptation, "courte"); assert.equal(corr.seanceNom, "Haut A");
  assert.ok(corr.modifieLe); assert.equal(corr.ajoutManuel, undefined);
  const r = remplacerLog(logs, "a", corr);
  assert.deepEqual(r.map((l) => l.id), ["b", "a"]);
  assert.equal(r[1].exercices[0].series[0].chargeKg, 102.5);
});

test("suppression et ressenti retiré proprement", () => {
  assert.deepEqual(supprimerLog([{ id: "a" }, { id: "b" }], "a").map((l) => l.id), ["b"]);
  const l = construireLog({ id: "a", base: { id: "a", ressenti: 1, exercices: [] }, jour: "2026-11-01", exercices: [ex("squat-barre", [{ reps: 3 }])], ressenti: null });
  assert.equal(l.ressenti, undefined);
});

test("groupement par mois, le plus récent d'abord", () => {
  const g = parMois([{ id: "a", date: "2026-10-03T10:00:00" }, { id: "b", date: "2026-11-02T10:00:00" }, { id: "c", date: "2026-11-15T10:00:00" }]);
  assert.equal(g.length, 2);
  assert.equal(g[0].cle, "2026-11"); assert.deepEqual(g[0].logs.map((l) => l.id), ["c", "b"]);
  assert.match(g[0].libelle, /^Novembre 2026$/);
});

test("isoLocal et tri stable", () => {
  assert.equal(new Date(/** @type {string} */ (isoLocal("2026-11-05", "07:30"))).getHours(), 7);
  assert.equal(isoLocal("", "07:30"), null);
  assert.deepEqual(trierLogs([{ id: 1, date: "2026-01-01" }, { id: 2, date: "2026-01-01" }]).map((l) => l.id), [1, 2]);
});
