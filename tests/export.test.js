// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { csvEscape, toCSV, seancesVersCSV, metriquesVersCSV, nomFichierExport } from "../src/engine/export.js";

test("csvEscape : échappe séparateur, guillemets et retours à la ligne", () => {
  assert.equal(csvEscape("simple"), "simple");
  assert.equal(csvEscape("a;b"), '"a;b"');
  assert.equal(csvEscape('a"b'), '"a""b"');
  assert.equal(csvEscape("a\nb"), '"a\nb"');
  assert.equal(csvEscape(null), "");
  assert.equal(csvEscape(undefined), "");
  assert.equal(csvEscape(12), "12");
});

test("toCSV : BOM UTF-8 + en-têtes + CRLF", () => {
  const csv = toCSV(["A", "B"], [["1", "2"], ["3;3", "4"]]);
  assert.ok(csv.startsWith("﻿"), "commence par le BOM UTF-8");
  const corps = csv.slice(1);
  const lignes = corps.split("\r\n").filter(Boolean);
  assert.equal(lignes[0], "A;B");
  assert.equal(lignes[1], "1;2");
  assert.equal(lignes[2], '"3;3";4');
});

test("seancesVersCSV : une ligne par série, résolution du nom d'exercice", () => {
  const logs = [
    {
      date: "2026-07-10T18:30:00.000Z", seanceNom: "Push A",
      exercices: [
        { exerciceId: "dc", douleur: false, series: [{ reps: 8, chargeKg: 60, rir: 2 }, { reps: 6, chargeKg: 62.5, rir: 1 }] },
        { exerciceId: "dips", douleur: true, series: [] },
      ],
    },
  ];
  const csv = seancesVersCSV(logs, (id) => ({ dc: "Développé couché", dips: "Dips" }[id] || id));
  const lignes = csv.slice(1).split("\r\n").filter(Boolean);
  assert.equal(lignes.length, 4); // en-tête + 2 séries + 1 exo sans série (douleur signalée sans data)
  assert.match(lignes[1], /2026-07-10;Push A;Développé couché;1;8;60;;2;non/);
  assert.match(lignes[2], /2026-07-10;Push A;Développé couché;2;6;62.5;;1;non/);
  assert.match(lignes[3], /2026-07-10;Push A;Dips;;;;;;oui/);
});

test("seancesVersCSV : liste vide -> uniquement l'en-tête", () => {
  const csv = seancesVersCSV([]);
  const lignes = csv.slice(1).split("\r\n").filter(Boolean);
  assert.equal(lignes.length, 1);
});

test("metriquesVersCSV : poids et mensurations, valeurs manquantes vides", () => {
  const metrics = [
    { date: "2026-07-01T07:00:00.000Z", poidsKg: 81.4 },
    { date: "2026-07-08T07:00:00.000Z", taille: 88, bras: 36 },
  ];
  const csv = metriquesVersCSV(metrics);
  const lignes = csv.slice(1).split("\r\n").filter(Boolean);
  assert.equal(lignes[1], "2026-07-01;81.4;;;;");
  assert.equal(lignes[2], "2026-07-08;;88;;36;");
});

test("nomFichierExport : préfixe + date courte", () => {
  assert.equal(nomFichierExport("seances", "2026-07-15T12:00:00.000Z"), "seances-2026-07-15.csv");
});
