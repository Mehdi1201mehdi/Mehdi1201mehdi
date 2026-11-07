// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOGUE, DOUBLONS_MASQUES, chargerCatalogueEtendu, chercherCatalogue, getExercise } from "../src/data/exercises.js";
import { FEDB_EXERCISES } from "../src/data/exercises-fedb.js";
import * as M from "../src/models.js";

// Listes vues comme des chaînes : on teste justement des valeurs venues d'un import.
const MUSCLES = /** @type {readonly string[]} */ (M.MUSCLES);
const EQUIPMENTS = /** @type {readonly string[]} */ (M.EQUIPMENTS);
const MOVEMENT_PATTERNS = /** @type {readonly string[]} */ (M.MOVEMENT_PATTERNS);
const { EQUIPMENT_LABELS } = M;

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
  assert.ok(CATALOGUE.length >= 1100, `catalogue : ${CATALOGUE.length} exercices`);
});

test("pas de doublon à un article près (« Squat à la barre » / « Squat (barre) »)", async () => {
  await chargerCatalogueEtendu();
  const VIDES = new Set(["a", "la", "le", "les", "de", "du", "des", "au", "aux", "avec", "en", "sur", "l", "d", "et"]);
  const cle = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim()
    .split(" ").filter((w) => w && !VIDES.has(w)).map((w) => w.replace(/s$/, "")).sort().join(" ");
  const vus = new Map();
  for (const e of CATALOGUE) {
    const k = cle(e.nom);
    assert.ok(!vus.has(k), `doublon probable : « ${e.nom} » (${e.id}) et « ${vus.get(k)} »`);
    vus.set(k, `${e.nom} » (${e.id})`);
  }
});

test("doublons masqués : absents du catalogue, toujours résolus, cible visible", async () => {
  await chargerCatalogueEtendu();
  const visibles = new Set(CATALOGUE.map((e) => e.id));
  for (const [masque, cible] of Object.entries(DOUBLONS_MASQUES)) {
    assert.ok(!visibles.has(masque), `${masque} ne doit plus être proposé`);
    assert.ok(getExercise(masque), `${masque} reste résolu pour l'historique`);
    assert.ok(visibles.has(cible), `${masque} → ${cible} : la fiche gardée est visible`);
  }
});

test("noms français : au moins 90 % des fiches free-exercise-db affichées", async () => {
  await chargerCatalogueEtendu();
  const fedb = CATALOGUE.filter((e) => e.source === "free-exercise-db");
  const enAnglais = fedb.filter((e) => !(e.nomsAlternatifs || []).length);
  assert.ok(enAnglais.length / fedb.length < 0.1, `${enAnglais.length} noms anglais sur ${fedb.length}`);
  // Le nom anglais d'origine reste cherchable quand un nom français a été donné.
  for (const e of fedb) if (e.nomsAlternatifs.length) assert.notEqual(e.nom, e.nomsAlternatifs[0]);
  // Les corrections vérifiées à la main sont bien appliquées.
  assert.equal(getExercise("fedb-cable-incline-pushdown").nom, "Pull-down bras tendus sur banc incliné (poulie)");
  assert.equal(getExercise("fedb-dips-chest-version").nom, "Dips (version pectoraux)");
});

test("recherche bilingue : nom français ou nom anglais d'origine", async () => {
  await chargerCatalogueEtendu();
  const fr = chercherCatalogue({ q: "curl marteau alterne" });
  assert.ok(fr.some((e) => e.id === "fedb-alternate-hammer-curl"));
  const en = chercherCatalogue({ q: "alternate hammer curl" });
  assert.ok(en.some((e) => e.id === "fedb-alternate-hammer-curl"));
  assert.equal(getExercise("fedb-alternate-hammer-curl").nom, "Curl marteau alterné (haltères)");
});
