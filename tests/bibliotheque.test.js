// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { getExercise } from "../src/data/exercises.js";
import { PROGRAMMES_SALLE } from "../src/data/programmes-salle.js";
import {
  DUREES, FREQUENCES, MATERIELS,
  equipementsProgramme, correspondMateriel, filtrerProgrammes, nbCriteresActifs,
  MAX_RECENTS, TRIS, basculerFavori, ajouterRecent, ordonner, resoudreIds,
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

/* ==================== Favoris, récents, tri ==================== */

test("basculerFavori : ajoute en tête, retire, et ne mute jamais l'entrée", () => {
  const base = ["a"];
  const avec = basculerFavori(base, "b");
  assert.deepEqual(avec, ["b", "a"], "le dernier choisi passe en tête");
  assert.deepEqual(base, ["a"], "la liste d'origine ne bouge pas");
  assert.deepEqual(basculerFavori(avec, "b"), ["a"], "second appel : on retire");
});

test("basculerFavori : entrées abîmées → liste propre, jamais d'erreur", () => {
  assert.deepEqual(basculerFavori(/** @type {any} */ (null), "a"), ["a"]);
  assert.deepEqual(basculerFavori(/** @type {any} */ ([1, null, "a"]), "b"), ["b", "a"]);
  assert.deepEqual(basculerFavori(["a"], ""), ["a"], "identifiant vide : sans effet");
});

test("ajouterRecent : le plus récent en tête, sans doublon", () => {
  let r = [];
  r = ajouterRecent(r, "squat");
  r = ajouterRecent(r, "bench");
  r = ajouterRecent(r, "squat");
  assert.deepEqual(r, ["squat", "bench"], "squat remonte, il n'apparaît pas deux fois");
});

test("ajouterRecent : plafonné, sinon la rangée devient un mur", () => {
  let r = [];
  for (let i = 0; i < 40; i++) r = ajouterRecent(r, "ex" + i);
  assert.equal(r.length, MAX_RECENTS);
  assert.equal(r[0], "ex39", "le dernier consulté reste en tête");
  assert.equal(ajouterRecent([], "a", 3).length, 1);
  let court = [];
  for (let i = 0; i < 10; i++) court = ajouterRecent(court, "e" + i, 3);
  assert.equal(court.length, 3);
});

test("ordonner : les favoris passent devant, quel que soit le tri", () => {
  // C'est le seul intérêt d'avoir des favoris.
  const l = [
    { id: "c", nom: "Curl", musclesPrincipaux: ["biceps"] },
    { id: "a", nom: "Abdos", musclesPrincipaux: ["abdominaux"] },
    { id: "s", nom: "Squat", musclesPrincipaux: ["quadriceps"] },
  ];
  const parAlpha = ordonner(l, { tri: "alpha" }).map((e) => e.id);
  assert.deepEqual(parAlpha, ["a", "c", "s"]);
  const avecFav = ordonner(l, { tri: "alpha", favoris: ["s"] }).map((e) => e.id);
  assert.equal(avecFav[0], "s", "le favori d'abord");
  assert.deepEqual(avecFav.slice(1), ["a", "c"], "le reste garde le tri demandé");
});

test("ordonner : « pertinence » conserve l'ordre du catalogue", () => {
  const l = [{ id: "z", nom: "Zèbre" }, { id: "a", nom: "Abeille" }];
  assert.deepEqual(ordonner(l, { tri: "pertinence" }).map((e) => e.id), ["z", "a"]);
  assert.deepEqual(ordonner(l, { tri: "inconnu" }).map((e) => e.id), ["z", "a"], "tri inconnu → pertinence");
});

test("ordonner : tri par muscle, puis par nom à l'intérieur du muscle", () => {
  const l = [
    { id: "b2", nom: "Curl marteau", musclesPrincipaux: ["biceps"] },
    { id: "d1", nom: "Rowing", musclesPrincipaux: ["dos"] },
    { id: "b1", nom: "Curl barre", musclesPrincipaux: ["biceps"] },
  ];
  assert.deepEqual(ordonner(l, { tri: "muscle" }).map((e) => e.id), ["b1", "b2", "d1"]);
});

test("ordonner : liste vide ou abîmée → tableau, jamais d'erreur", () => {
  assert.deepEqual(ordonner(/** @type {any} */ (null)), []);
  assert.equal(ordonner([null, undefined, { id: "a", nom: "A" }], { tri: "alpha" }).length, 3);
});

test("resoudreIds : un exercice disparu ne laisse pas de trou", () => {
  // Un exercice supprimé du catalogue, ou un import qui a changé, ne doit pas
  // produire une vignette vide dans la rangée des récents.
  const get = (id) => (id === "vivant" ? { id, nom: "Vivant" } : null);
  assert.deepEqual(resoudreIds(["vivant", "disparu"], get).map((e) => e.id), ["vivant"]);
  assert.deepEqual(resoudreIds(/** @type {any} */ (null), get), []);
  // Un accesseur qui lève ne doit pas faire tomber l'écran entier.
  assert.deepEqual(resoudreIds(["x"], () => { throw new Error("boum"); }), []);
});

test("TRIS : chaque mode a une clé et un nom, aucun doublon", () => {
  for (const t of TRIS) assert.ok(t.cle && t.nom, JSON.stringify(t));
  const cles = TRIS.map((t) => t.cle);
  assert.equal(new Set(cles).size, cles.length);
});
