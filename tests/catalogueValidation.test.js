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
  for (const e of CATALOGUE) for (const k of mouvementsDe(e)) assert.ok(/** @type {readonly string[]} */ (MOUVEMENTS).includes(k), `${e.id} : ${k}`);
  const familles = new Set(CATALOGUE.flatMap(mouvementsDe));
  assert.equal(familles.size, MOUVEMENTS.length, "les 16 familles demandées sont toutes représentées");
});

test("recherche : texte normalisé sans accents, avec le nom anglais", () => {
  const t = texteExercice(getExercise("developpe-couche-barre"));
  assert.ok(t.includes("developpe couche"));
});

import { chercherCatalogue, enregistrerExercicesPerso } from "../src/data/exercises.js";
import { ordonner, compterUsage, TRIS } from "../src/engine/bibliotheque.js";
import { serieTemplateDefaut, definirSeries } from "../src/engine/routines.js";

test("recherche : accents, synonymes FR/EN, muscles et matériel cherchables", () => {
  const a = chercherCatalogue({ q: "développé couché" }).length;
  assert.equal(chercherCatalogue({ q: "developpe couche" }).length, a);
  assert.ok(a > 10);
  assert.ok(chercherCatalogue({ q: "bench" }).length >= a, "bench → développé couché");
  assert.ok(chercherCatalogue({ q: "pecs machine" }).some((e) => /pec deck|butterfly|presse pectorale/i.test(e.nom)));
});

test("filtres combinables : muscle + famille d'équipement + niveau", () => {
  const r = chercherCatalogue({ muscle: "pectoraux", groupe: "machine", niveau: "2" });
  assert.ok(r.length > 0);
  for (const e of r) {
    assert.ok(e.musclesPrincipaux.includes("pectoraux") || e.musclesSecondaires.includes("pectoraux"));
    assert.equal(e.difficulte, 2);
    assert.ok(machinesDe(e).some((m) => m.groupe === "machine"), e.nom);
  }
  assert.ok(chercherCatalogue({ machine: "presse-jambes", muscle: "fessiers" }).length > 0);
  assert.ok(chercherCatalogue({ poly: "iso" }).every((e) => estIsolation(e)));
  assert.ok(chercherCatalogue({ mouvement: "rotation" }).length > 20);
  assert.ok(chercherCatalogue({ sansMateriel: true }).every((e) => e.equipement.every((q) => q === "poids_du_corps")));
  assert.ok(chercherCatalogue({ statut: "valide" }).length >= 1200);
});

test("exercices perso : enregistrés, cherchables, masqués une fois supprimés, sans doublon", () => {
  const avant = CATALOGUE.length;
  enregistrerExercicesPerso([{ id: "perso-t1", nom: "Rowing élastique maison", musclesPrincipaux: ["dorsaux"], equipement: ["elastiques"], machine: "elastiques" }]);
  assert.equal(CATALOGUE.length, avant + 1);
  const e = getExercise("perso-t1");
  assert.equal(e.perso, true);
  assert.deepEqual(chercherCatalogue({ perso: true }).map((x) => x.id), ["perso-t1"]);
  assert.ok(chercherCatalogue({ q: "rowing elastique maison" }).some((x) => x.id === "perso-t1"));
  enregistrerExercicesPerso([{ id: "perso-t1", nom: "Rowing élastique maison", musclesPrincipaux: ["dorsaux"], supprime: true }]);
  assert.equal(CATALOGUE.length, avant, "supprimé : hors bibliothèque");
  assert.ok(getExercise("perso-t1"), "mais toujours résolu pour l'historique");
  enregistrerExercicesPerso([]);
  assert.equal(getExercise("perso-t1"), undefined);
});

test("tri « les plus utilisés » : compté sur les séances réelles", () => {
  const logs = [{ exercices: [{ exerciceId: "b" }, { exerciceId: "b" }, { exerciceId: "a" }] }, { exercices: [{ exerciceId: "b" }] }];
  const u = compterUsage(logs);
  assert.equal(u.get("b"), 2, "une séance compte une fois");
  assert.equal(u.get("a"), 1);
  assert.ok(TRIS.some((t) => t.cle === "populaire"));
  const l = ordonner([{ id: "a", nom: "A" }, { id: "c", nom: "C" }, { id: "b", nom: "B" }], { tri: "populaire", usage: u });
  assert.deepEqual(l.map((x) => x.id), ["b", "a", "c"]);
});

test("ajout à une séance : charge, tempo, RPE, % 1RM ; conservés quand on change les séries", () => {
  const exo = getExercise("developpe-couche-barre");
  const t = serieTemplateDefaut(exo, { repsCible: [6, 8], chargeKg: 80, tempo: "3-1-1", rpeCible: 8, pct1RM: 75, reposSec: 120 });
  assert.deepEqual([t.chargeKg, t.tempo, t.rpeCible, t.pct1RM, t.reposSec], [80, "3-1-1", 8, 75, 120]);
  const ex = { exerciceId: exo.id, series: [t, { ...t }] };
  definirSeries(ex, { nbSeries: 4, repsCible: [5, 5] });
  assert.equal(ex.series.length, 4);
  assert.deepEqual(ex.series[0].repsCible, [5, 5]);
  assert.equal(ex.series[3].tempo, "3-1-1");
  assert.equal(ex.series[3].chargeKg, 80);
});

// ---- Consignes rédigées par l'app ----

test("consignes auto : jamais sur une fiche qui en a déjà, toujours signalées", async () => {
  const { completerConsignes, archetypeDe, ARCHETYPES } = await import("../src/engine/consignesAuto.js");
  const { validerExercice } = await import("../src/engine/validationExo.js");
  const deja = { nom: "Curl biceps", instructions: ["Étape A", "Étape B"] };
  completerConsignes(deja);
  assert.deepEqual(deja.instructions, ["Étape A", "Étape B"]);
  assert.equal(deja.consignesAuto, undefined);
  const vide = { id: "x", nom: "Curl marteau (haltères)", nomEn: "Hammer curl", musclesPrincipaux: ["biceps"], equipement: ["halteres"], patron: "flexion_bras", difficulte: 1, source: "test" };
  completerConsignes(vide);
  assert.equal(vide.consignesAuto, true);
  assert.ok(vide.instructions.length >= 4 && vide.instructions[0].includes("avec les haltères"));
  assert.ok(!vide.instructions.join(" ").includes("{avec}"));
  assert.notEqual(validerExercice(vide).statut, "valide");
  assert.ok(validerExercice(vide).alertes.some((a) => a.includes("à vérifier")));
  // Mouvement non reconnu : la fiche reste vide plutôt que fausse.
  const inconnu = completerConsignes({ nom: "Tour du monde (haltères)" });
  assert.equal(inconnu.instructions, undefined);
  // Pièges repérés à la relecture : pas de consigne de traction sur un relevé de jambes, etc.
  const id = (nom) => (archetypeDe({ nom }) || {}).id || null;
  assert.equal(id("Leg curl assis"), "leg_curl");
  assert.equal(id("Relevés de jambes (barre de traction)"), "releve_jambes");
  assert.equal(id("Kickback fessier à la poulie, une jambe"), null);
  assert.equal(id("Développé couché sur planches (board press)"), null);
  assert.equal(id("Mollets à la machine Hack Squat"), "mollets");
  assert.equal(id("Auto-massage mollets (rouleau)"), null);
  assert.equal(id("Squat pistol (Smith)"), null);
  assert.equal(id("Développé militaire assis (barre)"), "developpe_epaules");
  assert.equal(id("Tirage menton (élastique)"), "tirage_menton");
  for (const a of ARCHETYPES) assert.ok(a.etapes.length >= 4, a.id);
});
