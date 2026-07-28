// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { getExercise } from "../src/data/exercises.js";
import { PROGRAMMES_SALLE } from "../src/data/programmes-salle.js";
import {
  DUREES, FREQUENCES, MATERIELS,
  equipementsProgramme, correspondMateriel, filtrerProgrammes, nbCriteresActifs,
} from "../src/engine/bibliotheque.js";

test("equipementsProgramme : liste le matériel réellement utilisé, sans doublon", () => {
  const pr = PROGRAMMES_SALLE.find((p) => p.id === "initiation-muscu");
  const eq = equipementsProgramme(pr, getExercise);
  assert.ok(eq.length > 0, "un programme de salle utilise forcément du matériel");
  assert.deepEqual(eq, [...new Set(eq)].sort(), "trié et dédupliqué");
  // programme entièrement en machines → pas de barre libre
  assert.ok(!eq.includes("barre"), `initiation ne devrait pas exiger la barre : ${eq.join(", ")}`);
});

test("correspondMateriel : « charges libres » exclut tout ce qui demande une machine", () => {
  let retenus = 0;
  for (const pr of PROGRAMMES_SALLE) {
    if (!correspondMateriel(pr, "libre", getExercise)) continue;
    retenus++;
    for (const q of equipementsProgramme(pr, getExercise)) {
      assert.ok(!/machine|poulie|rameur/.test(q),
        `${pr.nom} passe le filtre « charges libres » alors qu'il demande ${q}`);
    }
  }
  assert.ok(retenus > 0, "le filtre « charges libres » ne doit pas vider la bibliothèque");
});

test("correspondMateriel : « machines & poulies » exclut barres et haltères", () => {
  let retenus = 0;
  for (const pr of PROGRAMMES_SALLE) {
    if (!correspondMateriel(pr, "machines", getExercise)) continue;
    retenus++;
    for (const q of equipementsProgramme(pr, getExercise)) {
      assert.ok(!/^barre|halteres|rack/.test(q),
        `${pr.nom} passe le filtre « machines » alors qu'il demande ${q}`);
    }
  }
  assert.ok(retenus > 0, "le filtre « machines & poulies » ne doit pas vider la bibliothèque");
});

test("correspondMateriel : « salle complète » n'exclut rien", () => {
  for (const pr of PROGRAMMES_SALLE) {
    assert.equal(correspondMateriel(pr, "salle", getExercise), true, pr.nom);
  }
  // filtre inconnu → pas de filtrage (on n'efface jamais la bibliothèque)
  assert.equal(correspondMateriel(PROGRAMMES_SALLE[0], "n'importe quoi", getExercise), true);
});

test("filtrerProgrammes : sans critère, rend toute la bibliothèque", () => {
  assert.equal(filtrerProgrammes(PROGRAMMES_SALLE, {}, getExercise).length, PROGRAMMES_SALLE.length);
  assert.equal(filtrerProgrammes(PROGRAMMES_SALLE, { objectif: null, niveau: null }, getExercise).length, PROGRAMMES_SALLE.length);
});

test("filtrerProgrammes : les critères se cumulent", () => {
  const parNiveau = filtrerProgrammes(PROGRAMMES_SALLE, { niveau: "debutant" }, getExercise);
  const cumule = filtrerProgrammes(PROGRAMMES_SALLE, { niveau: "debutant", duree: "court" }, getExercise);
  assert.ok(cumule.length <= parNiveau.length, "ajouter un critère ne peut pas élargir le résultat");
  for (const pr of cumule) {
    assert.equal(pr.niveau, "debutant");
    assert.ok(pr.dureeMin <= 45, `${pr.nom} dure ${pr.dureeMin} min`);
  }
});

test("filtrerProgrammes : chaque tranche de durée est exacte et couvre tout", () => {
  let total = 0;
  for (const d of DUREES) {
    const res = filtrerProgrammes(PROGRAMMES_SALLE, { duree: d.cle }, getExercise);
    total += res.length;
    for (const pr of res) assert.ok(d.test(pr.dureeMin), `${pr.nom} (${pr.dureeMin} min) hors tranche ${d.label}`);
  }
  assert.equal(total, PROGRAMMES_SALLE.length, "les tranches doivent partitionner la bibliothèque");
});

test("filtrerProgrammes : chaque tranche de fréquence est exacte et couvre tout", () => {
  let total = 0;
  for (const f of FREQUENCES) {
    const res = filtrerProgrammes(PROGRAMMES_SALLE, { frequence: f.cle }, getExercise);
    total += res.length;
    for (const pr of res) assert.ok(f.test(pr.joursParSemaine), `${pr.nom} (${pr.joursParSemaine}×) hors tranche ${f.label}`);
  }
  assert.equal(total, PROGRAMMES_SALLE.length);
});

test("filtrerProgrammes : chaque facette rend au moins un programme", () => {
  // Un filtre qui ne rend jamais rien est un filtre inutile à l'écran.
  const facettes = [
    ...["prise_muscle", "perte_graisse", "force", "recomposition"].map((v) => ({ objectif: v })),
    ...["debutant", "intermediaire", "avance"].map((v) => ({ niveau: v })),
    ...DUREES.map((d) => ({ duree: d.cle })),
    ...FREQUENCES.map((f) => ({ frequence: f.cle })),
    ...MATERIELS.map((m) => ({ materiel: m.cle })),
  ];
  for (const c of facettes) {
    const n = filtrerProgrammes(PROGRAMMES_SALLE, c, getExercise).length;
    assert.ok(n > 0, `filtre vide : ${JSON.stringify(c)}`);
  }
});

test("nbCriteresActifs : compte les critères posés", () => {
  assert.equal(nbCriteresActifs({}), 0);
  assert.equal(nbCriteresActifs({ niveau: null, duree: null }), 0);
  assert.equal(nbCriteresActifs({ niveau: "avance", duree: "long", materiel: "salle" }), 3);
});

test("filtrerProgrammes : robustesse aux entrées absentes", () => {
  assert.deepEqual(filtrerProgrammes(null, { niveau: "avance" }), []);
  assert.deepEqual(filtrerProgrammes(undefined, {}), []);
  assert.doesNotThrow(() => filtrerProgrammes(PROGRAMMES_SALLE, { materiel: "libre" }));
  assert.deepEqual(equipementsProgramme(null, getExercise), []);
});
