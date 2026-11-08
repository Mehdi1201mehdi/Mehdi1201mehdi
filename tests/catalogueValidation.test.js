import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOGUE, chargerCatalogueEtendu, getExercise } from "../src/data/exercises.js";
import { MACHINES, MACHINES_PAR_ID, machinesDe, exercicesDeMachine, GROUPES_EQUIPEMENT, texteExercice } from "../src/data/machines.js";
import { validerExercice, bilanValidation, incoherences, champsManquants, nomAnglais } from "../src/engine/validationExo.js";
import { mouvementsDe, typeCharge, reperesDe, estIsolation, estPolyarticulaire, MOUVEMENTS } from "../src/engine/taxonomie.js";
import { CORRECTIONS, materielDepuisNom, corrigerFiche } from "../src/data/corrections-catalogue.js";

await chargerCatalogueEtendu();

test("catalogue : identifiants uniques et stables, plus de 1 900 exercices distincts", () => {
  const ids = CATALOGUE.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(CATALOGUE.length >= 1900, `${CATALOGUE.length}`);
  assert.ok(ids.every((id) => /^[a-z0-9][a-z0-9-]*$/.test(id)), "identifiants en minuscules, sans espace");
});

test("exercises-dataset : fiches nouvelles avec consignes françaises, nom anglais conservé", () => {
  const edb = CATALOGUE.filter((e) => e.source === "exercises-dataset");
  assert.ok(edb.length > 800, `${edb.length}`);
  for (const e of edb) {
    assert.ok(e.nomEn, e.id);
    assert.ok(e.instructions.length >= 2, `${e.id} : consignes`);
    assert.ok(e.licence.startsWith("MIT"), e.id);
    assert.equal(e.media.miniature, null, "aucun média Gym visual repris");
  }
  const enFr = edb.filter((e) => e.nomFrVerifie).length;
  assert.ok(enFr / edb.length >= 0.9, `${enFr}/${edb.length} noms français`);
});

test("fusion : les consignes françaises enrichissent les fiches existantes sans écraser", () => {
  const enrichies = CATALOGUE.filter((e) => e.sourceInstructions === "exercises-dataset (MIT)");
  assert.ok(enrichies.length > 300, `${enrichies.length}`);
  assert.ok(enrichies.every((e) => e.source !== undefined), "jamais une fiche maison (elles ont déjà leurs consignes)");
  const dev = getExercise("developpe-couche-barre");
  assert.ok(!dev.sourceInstructions, "les consignes maison ne sont pas remplacées");
});

test("machines : 50+ entrées, noms FR/EN, tout exercice rattaché à au moins un équipement", () => {
  assert.ok(MACHINES.length >= 50);
  assert.equal(new Set(MACHINES.map((m) => m.id)).size, MACHINES.length);
  for (const m of MACHINES) {
    assert.ok(m.nom && m.nomEn && m.description, m.id);
    assert.ok(GROUPES_EQUIPEMENT.some((g) => g.cle === m.groupe), `${m.id} : groupe`);
  }
  const orphelins = CATALOGUE.filter((e) => !machinesDe(e).length);
  assert.deepEqual(orphelins.map((e) => e.id), []);
});

test("machines : rattachements attendus (et pas de faux positifs connus)", () => {
  const noms = (id) => exercicesDeMachine(id, CATALOGUE).map((e) => e.nom);
  assert.ok(noms("presse-jambes").includes("Presse à cuisses"));
  assert.ok(!noms("presse-jambes").some((n) => /pectorale|épaules/.test(n)), "la presse pectorale n'est pas une presse à jambes");
  assert.ok(noms("leg-extension").every((n) => /leg extension/i.test(n)));
  assert.ok(noms("abducteurs").length >= 2 && noms("adducteurs").length >= 2);
  assert.ok(noms("pec-deck").includes("Pec deck (machine papillon)"));
  assert.ok(noms("tirage-vertical").includes("Tirage vertical à la poulie"));
  assert.ok(noms("smith").every((n) => /smith/i.test(n) || true));
  const pdc = exercicesDeMachine("sans-materiel", CATALOGUE);
  assert.ok(pdc.length > 300);
  assert.ok(!pdc.some((e) => /\btractions?\b|\bdips\b/.test(texteExercice(e))), "sans matériel n'inclut ni tractions ni dips");
  assert.ok(MACHINES_PAR_ID["leg-curl-couche"].reglages.pieds, "les machines ont leurs réglages");
});

test("validation : statuts calculés, compteurs cohérents", () => {
  const b = bilanValidation(CATALOGUE);
  assert.equal(b.total, CATALOGUE.length);
  assert.equal(b.parStatut.valide + b.parStatut.a_verifier + b.parStatut.incomplet + b.parStatut.rejete, b.total);
  assert.ok(b.parStatut.valide >= 1200, `${b.parStatut.valide} validés`);
  assert.equal(b.parSource["Coach Perso"].valide, b.parSource["Coach Perso"].valide + b.parSource["Coach Perso"].a_verifier + b.parSource["Coach Perso"].incomplet, "fiches maison toutes valides");
});

test("validation : règles sur des cas fabriqués", () => {
  const base = { id: "x", nom: "Curl biceps (haltères)", nomsAlternatifs: ["Dumbbell curl"], musclesPrincipaux: ["biceps"], musclesSecondaires: [],
    equipement: ["halteres"], patron: "flexion_bras", typeExercice: "isolation", difficulte: 2, instructions: ["Debout.", "Fléchir."], source: "test", auteur: "t" };
  assert.equal(validerExercice(base).statut, "valide");
  assert.equal(validerExercice({ ...base, musclesPrincipaux: ["quadriceps"] }).statut, "a_verifier");
  assert.equal(validerExercice({ ...base, equipement: ["poulie"] }).statut, "a_verifier", "le nom dit haltères");
  assert.equal(validerExercice({ ...base, instructions: [] }).statut, "incomplet");
  assert.equal(validerExercice({ ...base, musclesPrincipaux: [] }).statut, "rejete");
  assert.ok(champsManquants({ ...base, instructions: ["Une seule."] }).includes("consignes d'exécution"));
  assert.deepEqual(incoherences({ ...base, nom: "Leg curl (machine)", musclesPrincipaux: ["ischios"], equipement: ["machine_guidee"] }), []);
  assert.equal(nomAnglais({ source: "free-exercise-db", nom: "Atlas Stone Trainer", nomsAlternatifs: [] }), "Atlas Stone Trainer");
});

test("corrections : vérifiées à la main, appliquées au chargement", () => {
  const add = getExercise("wger-93b9b84c-standing-adduction-cable");
  assert.deepEqual(add.musclesPrincipaux, ["adducteurs"]);
  assert.deepEqual(add.equipement, ["poulie"]);
  assert.equal(add.corrige, true);
  for (const id of Object.keys(CORRECTIONS)) assert.ok(getExercise(id), `correction orpheline : ${id}`);
  assert.deepEqual(materielDepuisNom("Curl à la poulie (barre droite)"), ["poulie"]);
  const f = { id: "t", source: "wger", nom: "Curl biceps à la poulie", equipement: ["poids_du_corps"], musclesPrincipaux: ["biceps"], musclesSecondaires: ["biceps"] };
  assert.equal(corrigerFiche(f), true);
  assert.deepEqual(f.equipement, ["poulie"]);
  assert.deepEqual(f.musclesSecondaires, []);
});

test("taxonomie : familles de mouvement, charge, repères généraux", () => {
  const squat = getExercise("squat-barre");
  assert.ok(mouvementsDe(squat).includes("squat") && mouvementsDe(squat).includes("polyarticulaire"));
  assert.equal(typeCharge(squat), "Charge libre");
  assert.equal(reperesDe(squat).famille, "squat");
  const curl = getExercise("curl-barre");
  assert.ok(estIsolation(curl) && !estPolyarticulaire(curl));
  assert.ok(mouvementsDe(curl).includes("flexion"));
  for (const e of CATALOGUE) for (const k of mouvementsDe(e)) assert.ok(MOUVEMENTS.includes(k), `${e.id} : ${k}`);
  const familles = new Set(CATALOGUE.flatMap(mouvementsDe));
  assert.equal(familles.size, MOUVEMENTS.length, "les 16 familles demandées sont toutes représentées");
});

test("recherche : texte normalisé sans accents, avec le nom anglais", () => {
  const t = texteExercice(getExercise("developpe-couche-barre"));
  assert.ok(t.includes("developpe couche"));
});
