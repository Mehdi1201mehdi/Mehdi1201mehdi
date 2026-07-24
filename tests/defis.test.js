// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  joursEntraines, serieActuelle, meilleureSerie, seancesDepuis,
  joursActifsDepuis, seancesSemaine, grilleJours, defis,
} from "../src/engine/defis.js";

const L = (d) => ({ date: `${d}T10:00:00`, exercices: [] });

test("serieActuelle : jours consécutifs terminant aujourd'hui ou hier", () => {
  const now = new Date("2026-07-20T12:00:00");
  // 18, 19, 20 consécutifs → série de 3
  const logs = [L("2026-07-20"), L("2026-07-19"), L("2026-07-18"), L("2026-07-15")];
  assert.equal(serieActuelle(logs, now), 3);
  // rien aujourd'hui mais hier → compte quand même
  assert.equal(serieActuelle([L("2026-07-19"), L("2026-07-18")], now), 2);
  // trou → série cassée
  assert.equal(serieActuelle([L("2026-07-17")], now), 0);
});

test("meilleureSerie : plus longue série jamais réalisée", () => {
  const logs = [L("2026-07-01"), L("2026-07-02"), L("2026-07-03"), L("2026-07-10"), L("2026-07-11")];
  assert.equal(meilleureSerie(logs), 3);
  assert.equal(meilleureSerie([]), 0);
  // doublon même jour ne gonfle pas la série
  assert.equal(meilleureSerie([L("2026-07-01"), L("2026-07-01")]), 1);
});

test("seancesDepuis / joursActifsDepuis : fenêtre glissante", () => {
  const now = new Date("2026-07-20T12:00:00");
  const logs = [L("2026-07-20"), L("2026-07-20"), L("2026-07-05"), L("2026-06-01")];
  assert.equal(seancesDepuis(logs, 30, now), 3); // 2× le 20 + le 5
  assert.equal(joursActifsDepuis(logs, 30, now), 2); // 2 jours distincts
});

test("seancesSemaine : lundi→dimanche de la semaine courante", () => {
  const now = new Date("2026-07-15T12:00:00"); // mercredi, semaine du 13
  const logs = [L("2026-07-13"), L("2026-07-15"), L("2026-07-06")];
  assert.equal(seancesSemaine(logs, now), 2);
});

test("grilleJours : n cases, jour du jour marqué", () => {
  const now = new Date("2026-07-20T12:00:00");
  const g = grilleJours([L("2026-07-19")], 7, now);
  assert.equal(g.length, 7);
  assert.equal(g[g.length - 1].iso, "2026-07-20");
  assert.equal(g[g.length - 1].today, true);
  assert.equal(g[g.length - 2].done, true); // le 19 est fait
});

test("defis : dérive les objectifs du profil et des logs", () => {
  const now = new Date("2026-07-15T12:00:00");
  const logs = [L("2026-07-13"), L("2026-07-14")];
  const d = defis(logs, { joursParSemaine: 4 }, now);
  const sem = d.find((x) => x.id === "semaine");
  assert.equal(sem.valeur, 2);
  assert.equal(sem.cible, 4);
  assert.equal(sem.pct, 0.5);
  assert.ok(d.every((x) => x.pct >= 0 && x.pct <= 1));
});
