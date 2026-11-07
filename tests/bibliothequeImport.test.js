// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOGUE, chargerCatalogueEtendu, chercherCatalogue, getExercise } from "../src/data/exercises.js";
import { FEDB_EXERCISES } from "../src/data/exercises-fedb.js";
import { MUSCLES, EQUIPMENTS, EQUIPMENT_LABELS, MOVEMENT_PATTERNS } from "../src/models.js";

test("free-exercise-db : métadonnées seules, licence et source sur chaque fiche", () => {
  assert.ok(FEDB_EXERCISES.length > 800, `${FEDB_EXERCISES.length} exercices importés`);
  for (const e of FEDB_EXERCISES) {
    assert.equal(e.source, "free-exercise-db");
    assert.match(e.licence, /Unlicense/);
    assert.deepEqual(e.instructions, [], `${e.id} : aucun texte d'instructions importé`);
    assert.equal(e.media.miniature, null, `${e.id} : aucune image importée`);
    assert.ok(e.musclesPrincipaux.length > 0, `${e.id} : muscle principal`);
    for (const m of [...e.musclesPrincipaux, ...e.musclesSecondaires]) assert.ok(MUSCLES.includes(m), `${e.id} : muscle « ${m} »`);
    for (const q of e.equipement) assert.ok(EQUIPMENTS.includes(q) || q === "autre", `${e.id} : matériel « ${q} »`);
    assert.ok(e.patron === null || MOVEMENT_PATTERNS.includes(e.patron), `${e.id} : patron « ${e.patron} »`);
    assert.ok(e.difficulte >= 1 && e.difficulte <= 4);
    // Nom anglais toujours retrouvable : en alias quand le nom affiché est français.
    if (e.nomsAlternatifs.length) assert.notEqual(e.nomsAlternatifs[0], e.nom);
  }
  assert.ok(EQUIPMENT_LABELS.autre, "libellé du matériel « autre »");
});

test("catalogue complet : identifiants et noms uniques, pas de doublon déguisé", async () => {
  await chargerCatalogueEtendu();
  const ids = new Set(), noms = new Set();
  for (const e of CATALOGUE) {
    assert.ok(!ids.has(e.id), `identifiant en double : ${e.id}`);
    ids.add(e.id);
    const n = e.nom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
    assert.ok(!noms.has(n), `nom en double : ${e.nom}`);
    noms.add(n);
  }
  assert.ok(CATALOGUE.length >= 343 + 800, `catalogue : ${CATALOGUE.length} exercices`);
});

test("recherche bilingue : nom français ou nom anglais d'origine", async () => {
  await chargerCatalogueEtendu();
  const fr = chercherCatalogue({ q: "curl marteau alterne" });
  assert.ok(fr.some((e) => e.id === "fedb-alternate-hammer-curl"));
  const en = chercherCatalogue({ q: "alternate hammer curl" });
  assert.ok(en.some((e) => e.id === "fedb-alternate-hammer-curl"));
  assert.equal(getExercise("fedb-alternate-hammer-curl").nom, "Curl marteau alterné (haltères)");
});
