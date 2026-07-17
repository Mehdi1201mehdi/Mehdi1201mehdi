// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nouvelleSession, nouvelleSerie, ajouterSerie, retirerDerniereSerie,
  serialiser, restaurer, estReprenable, dureeSecondes,
} from "../src/engine/liveSession.js";

const seanceExemple = {
  id: "s1",
  exercices: [
    { exerciceId: "pompes", series: [{ type: "travail" }, { type: "travail" }, { type: "travail" }] },
    { exerciceId: "gainage", series: [{ type: "travail", dureeSec: 40 }] },
  ],
};

test("nouvelleSession : crée une entrée par exercice avec le bon nb de séries", () => {
  const live = nouvelleSession(seanceExemple, "2026-07-17T08:00:00Z");
  assert.equal(live.seanceId, "s1");
  assert.equal(live.fini, false);
  assert.equal(live.debut, "2026-07-17T08:00:00Z");
  assert.equal(live.data.pompes.series.length, 3);
  assert.equal(live.data.gainage.series.length, 1);
  // exercice en temps → série avec dureeSec
  assert.equal(live.data.gainage.series[0].dureeSec, 40);
  assert.equal(live.data.pompes.series[0].dureeSec, null);
});

test("nouvelleSerie : vierge, reps par défaut", () => {
  assert.deepEqual(nouvelleSerie(), { charge: "", reps: "", rir: "", dureeSec: null, done: false });
  assert.equal(nouvelleSerie(30).dureeSec, 30);
});

test("ajouterSerie : copie format temps et charge de la dernière", () => {
  const st = { series: [{ charge: 40, reps: 8, rir: 2, dureeSec: null, done: true }] };
  ajouterSerie(st);
  assert.equal(st.series.length, 2);
  assert.equal(st.series[1].charge, 40); // charge reprise
  assert.equal(st.series[1].reps, "");   // reps vierges
  assert.equal(st.series[1].done, false);
  // exercice en temps
  const stT = { series: [{ charge: "", reps: "", rir: "", dureeSec: 45, done: true }] };
  ajouterSerie(stT);
  assert.equal(stT.series[1].dureeSec, 45);
});

test("retirerDerniereSerie : garde au moins une série", () => {
  const st = { series: [nouvelleSerie(), nouvelleSerie()] };
  retirerDerniereSerie(st);
  assert.equal(st.series.length, 1);
  retirerDerniereSerie(st);
  assert.equal(st.series.length, 1); // ne descend pas sous 1
});

test("serialiser/restaurer : aller-retour fidèle", () => {
  const live = nouvelleSession(seanceExemple);
  live.data.pompes.series[0].charge = 30;
  live.data.pompes.series[0].reps = 12;
  live.data.pompes.series[0].done = true;
  const rond = restaurer(serialiser(live));
  assert.equal(rond.data.pompes.series[0].charge, 30);
  assert.equal(rond.data.pompes.series[0].reps, 12);
  assert.equal(rond.data.pompes.series[0].done, true);
});

test("restaurer : objets invalides → null", () => {
  assert.equal(restaurer(null), null);
  assert.equal(restaurer({}), null);
  assert.equal(restaurer({ seanceId: "x" }), null);
  assert.equal(restaurer({ seanceId: "x", data: { e: { series: "pas un tableau" } } }), null);
});

test("estReprenable : vrai seulement si séance connue + saisie présente", () => {
  const prog = { seances: [{ id: "s1", exercices: [] }] };
  const vide = nouvelleSession(seanceExemple);
  assert.equal(estReprenable(serialiser(vide), prog), false); // rien saisi
  const commence = nouvelleSession(seanceExemple);
  commence.data.pompes.series[0].done = true;
  assert.equal(estReprenable(serialiser(commence), prog), true);
  // séance inconnue du programme
  assert.equal(estReprenable(serialiser(commence), { seances: [] }), false);
  // séance finie
  const finie = nouvelleSession(seanceExemple); finie.fini = true;
  finie.data.pompes.series[0].done = true;
  assert.equal(estReprenable(serialiser(finie), prog), false);
});

test("dureeSecondes : différence en secondes, robustesse", () => {
  assert.equal(dureeSecondes("2026-07-17T08:00:00Z", "2026-07-17T08:45:30Z"), 2730);
  assert.equal(dureeSecondes("2026-07-17T08:00:00Z", "2026-07-17T07:00:00Z"), null); // fin < début
  assert.equal(dureeSecondes("pas une date", "2026-07-17T08:00:00Z"), null);
});
