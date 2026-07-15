// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { grilleMois, moisAdjacent, NOMS_MOIS } from "../src/engine/calendar.js";

test("grilleMois : juillet 2026 commence un mercredi -> 2 cases vides avant le 1er", () => {
  // vérifié : 1er juillet 2026 est un mercredi (index ISO lundi=0 -> mercredi=2)
  const g = grilleMois(2026, 7, []);
  assert.equal(g.cases[0], null);
  assert.equal(g.cases[1], null);
  assert.equal(g.cases[2]?.jour, 1);
  assert.equal(g.nomMois, "juillet");
  assert.equal(g.cases.length % 7, 0, "la grille est complétée à des semaines pleines");
});

test("grilleMois : compte les séances par jour et les totaux du mois", () => {
  const logs = [
    { date: "2026-07-01T18:00:00.000Z" },
    { date: "2026-07-01T19:30:00.000Z" }, // 2 séances le même jour
    { date: "2026-07-15T18:00:00.000Z" },
    { date: "2026-08-01T18:00:00.000Z" }, // hors mois, ignoré
  ];
  const g = grilleMois(2026, 7, logs);
  const j1 = g.cases.find((c) => c?.jour === 1);
  const j15 = g.cases.find((c) => c?.jour === 15);
  const j2 = g.cases.find((c) => c?.jour === 2);
  assert.equal(j1.seances, 2);
  assert.equal(j15.seances, 1);
  assert.equal(j2.seances, 0);
  assert.equal(g.joursEntraines, 2);
  assert.equal(g.totalSeances, 3);
});

test("grilleMois : février d'une année bissextile a 29 jours", () => {
  const g = grilleMois(2028, 2, []);
  const jours = g.cases.filter(Boolean);
  assert.equal(jours.length, 29);
  assert.equal(jours.at(-1).jour, 29);
});

test("grilleMois : février d'une année non bissextile a 28 jours", () => {
  const g = grilleMois(2026, 2, []);
  const jours = g.cases.filter(Boolean);
  assert.equal(jours.length, 28);
});

test("grilleMois : logs vides ou sans date ne plantent pas", () => {
  const g = grilleMois(2026, 7, [{}, { date: null }, { date: "" }]);
  assert.equal(g.totalSeances, 0);
});

test("moisAdjacent : navigation simple dans la même année", () => {
  assert.deepEqual(moisAdjacent(2026, 7, 1), { annee: 2026, mois: 8 });
  assert.deepEqual(moisAdjacent(2026, 7, -1), { annee: 2026, mois: 6 });
});

test("moisAdjacent : franchissement d'année (décembre -> janvier et inverse)", () => {
  assert.deepEqual(moisAdjacent(2026, 12, 1), { annee: 2027, mois: 1 });
  assert.deepEqual(moisAdjacent(2026, 1, -1), { annee: 2025, mois: 12 });
});

test("moisAdjacent : grand delta (plusieurs années)", () => {
  assert.deepEqual(moisAdjacent(2026, 6, 13), { annee: 2027, mois: 7 });
  assert.deepEqual(moisAdjacent(2026, 6, -30), { annee: 2023, mois: 12 });
});

test("NOMS_MOIS : 12 mois en français", () => {
  assert.equal(NOMS_MOIS.length, 12);
  assert.equal(NOMS_MOIS[0], "janvier");
  assert.equal(NOMS_MOIS[11], "décembre");
});
