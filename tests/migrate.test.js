// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SCHEMA_VERSION, etatVide, normaliserEtat, normaliserProfil, normaliserStandardsForce,
  choisirSourcePlusRiche, choisirEtat,
} from "../src/store/migrate.js";

test("etatVide : schéma courant complet", () => {
  const e = etatVide();
  assert.equal(e.version, SCHEMA_VERSION);
  for (const cle of ["profil", "programme", "programmesPerso", "exercicesPerso",
    "sessionEnCours", "logs", "metrics", "foodlog", "reviews", "mediaCache", "reglages"]) {
    assert.ok(cle in e, `clé manquante: ${cle}`);
  }
  assert.deepEqual(e.programmesPerso, []);
  assert.equal(e.sessionEnCours, null);
});

test("normaliserEtat : null/invalide → état vide", () => {
  assert.deepEqual(normaliserEtat(null), etatVide());
  assert.deepEqual(normaliserEtat("x"), etatVide());
  assert.deepEqual(normaliserEtat(42), etatVide());
});

test("normaliserEtat : ancien état v1 conservé + nouvelles clés ajoutées", () => {
  const v1 = {
    version: 1,
    profil: { prenom: "Mehdi" },
    programme: { id: "p1", seances: [] },
    logs: [{ id: "l1", exercices: [] }],
    metrics: [{ date: "2026-01-01", poidsKg: 80 }],
    reglages: { theme: "dark" },
  };
  const out = normaliserEtat(v1);
  // données existantes préservées
  assert.equal(out.profil.prenom, "Mehdi");
  assert.equal(out.programme.id, "p1");
  assert.equal(out.logs.length, 1);
  assert.equal(out.metrics[0].poidsKg, 80);
  // réglage explicite préservé, réglages manquants complétés par défaut
  assert.equal(out.reglages.theme, "dark");
  assert.equal(out.reglages.unites, "metrique");
  // nouvelles clés créées
  assert.deepEqual(out.programmesPerso, []);
  assert.deepEqual(out.exercicesPerso, []);
  assert.equal(out.sessionEnCours, null);
  // version mise à jour
  assert.equal(out.version, SCHEMA_VERSION);
});

test("normaliserEtat : collections abîmées → tableaux/objets sûrs", () => {
  const out = normaliserEtat({ logs: "pas un tableau", foodlog: 5, mediaCache: null });
  assert.deepEqual(out.logs, []);
  assert.deepEqual(out.foodlog, {});
  assert.deepEqual(out.mediaCache, {});
});

test("normaliserEtat : ne mute pas l'entrée", () => {
  const entree = { logs: [{ id: "a" }] };
  const copie = JSON.parse(JSON.stringify(entree));
  normaliserEtat(entree);
  assert.deepEqual(entree, copie);
});

test("choisirSourcePlusRiche : garde la source la plus complète", () => {
  const pauvre = { logs: [], metrics: [], profil: null };
  const riche = { logs: [{}, {}], metrics: [{}], profil: { prenom: "M" } };
  assert.equal(choisirSourcePlusRiche(riche, pauvre), riche);
  assert.equal(choisirSourcePlusRiche(pauvre, riche), riche);
});

test("choisirSourcePlusRiche : à égalité, garde le premier (a)", () => {
  const a = { logs: [{}], metrics: [] };
  const b = { logs: [{}], metrics: [] };
  assert.equal(choisirSourcePlusRiche(a, b), a);
});

test("choisirSourcePlusRiche : gère null", () => {
  const a = { logs: [{}] };
  assert.equal(choisirSourcePlusRiche(a, null), a);
  assert.equal(choisirSourcePlusRiche(null, a), a);
});

test("choisirEtat : dernière écriture gagne via _savedAt", () => {
  const ancien = { _savedAt: 100, logs: [{}, {}, {}] };  // plus riche mais plus vieux
  const recent = { _savedAt: 200, logs: [] };            // plus récent
  assert.equal(choisirEtat(ancien, recent), recent);
  assert.equal(choisirEtat(recent, ancien), recent);
});

test("choisirEtat : une seule source horodatée l'emporte", () => {
  const horodate = { _savedAt: 50, logs: [] };
  const sans = { logs: [{}, {}] };
  assert.equal(choisirEtat(horodate, sans), horodate);
  assert.equal(choisirEtat(sans, horodate), horodate);
});

test("choisirEtat : sans horodatage → repli sur la plus riche", () => {
  const pauvre = { logs: [] };
  const riche = { logs: [{}, {}], metrics: [{}] };
  assert.equal(choisirEtat(pauvre, riche), riche);
});

test("choisirEtat : horodatages égaux → repli sur la plus riche", () => {
  const a = { _savedAt: 100, logs: [] };
  const b = { _savedAt: 100, logs: [{}] };
  assert.equal(choisirEtat(a, b), b);
});

/* ================== PROFIL INCOMPLET : LA PANNE DE DÉMARRAGE ================== */

test("normaliserProfil : les listes manquantes deviennent des tableaux vides", () => {
  // Un profil sans `limitations` faisait planter le premier rendu
  // (`profil.limitations.includes(...)`) et l'écran de démarrage restait
  // par-dessus l'application : plus aucun clic ne passait.
  const p = normaliserProfil({ prenom: "Mehdi", objectif: "force" });
  for (const cle of ["equipements", "limitations", "musclesPrioritaires",
    "objectifsSecondaires", "exercicesAimes", "exercicesRefuses"]) {
    assert.ok(Array.isArray(p[cle]), `${cle} devrait être un tableau`);
    assert.equal(p[cle].length, 0);
  }
  assert.equal(p.prenom, "Mehdi", "les champs existants sont intacts");
  assert.equal(p.objectif, "force");
});

test("normaliserProfil : ne touche JAMAIS aux choix déjà faits", () => {
  const p = normaliserProfil({
    equipements: ["barre", "halteres"], limitations: ["epaule"],
    musclesPrioritaires: ["pectoraux"], poidsKg: 78,
  });
  assert.deepEqual(p.equipements, ["barre", "halteres"]);
  assert.deepEqual(p.limitations, ["epaule"]);
  assert.deepEqual(p.musclesPrioritaires, ["pectoraux"]);
  assert.equal(p.poidsKg, 78);
});

test("normaliserProfil : absence de profil, ou profil abîmé", () => {
  assert.equal(normaliserProfil(null), null);
  assert.equal(normaliserProfil(undefined), null);
  assert.equal(normaliserProfil("Mehdi"), null);
  // une liste stockée sous un mauvais type est remplacée, pas propagée
  assert.deepEqual(normaliserProfil({ limitations: "epaule" }).limitations, []);
});

test("normaliserEtat : un état v1 au profil incomplet ressort exploitable", () => {
  const out = normaliserEtat({
    version: 1,
    profil: { prenom: "Mehdi", equipements: ["barre"] },
    logs: [{ id: "l1" }],
  });
  assert.deepEqual(out.profil.limitations, []);
  assert.deepEqual(out.profil.equipements, ["barre"], "matériel déclaré conservé");
  assert.equal(out.logs.length, 1, "aucun historique perdu");
  assert.equal(out.version, SCHEMA_VERSION);
});

/* ---- Seuils de rang saisis à la main ---- */

test("normaliserStandardsForce : garde les entrées bien formées, écarte le reste", () => {
  const out = normaliserStandardsForce({
    "squat-barre": { H: [1, 1.5, 2, 2.5] },
    "developpe-couche-barre": { F: ["0,5", "0,7", "1", "1,4"] },
    "rowing-barre": { H: [1, 2] },            // longueur fausse
    "souleve-terre-barre": { H: "n'importe" }, // type faux
    "vide": {},                                 // rien à garder
  });
  assert.deepEqual(out["squat-barre"], { H: [1, 1.5, 2, 2.5] });
  assert.deepEqual(out["developpe-couche-barre"], { F: [0.5, 0.7, 1, 1.4] }, "virgule française convertie");
  assert.equal(out["rowing-barre"], undefined);
  assert.equal(out["souleve-terre-barre"], undefined);
  assert.equal(out["vide"], undefined);
});

test("normaliserStandardsForce : entrée absente ou aberrante → objet vide, jamais null", () => {
  for (const v of [null, undefined, "texte", 7, [1, 2, 3]]) {
    assert.deepEqual(normaliserStandardsForce(v), {}, JSON.stringify(v));
  }
});

test("normaliserStandardsForce : n'ordonne PAS les seuils — c'est le moteur qui juge", () => {
  // La migration ne fait que du typage : si elle réordonnait, elle réécrirait
  // silencieusement une saisie de l'utilisateur. Le moteur, lui, refuse et
  // retombe sur le repère publié — c'est visible, donc corrigeable.
  const out = normaliserStandardsForce({ "squat-barre": { H: [3, 2, 1, 0.5] } });
  assert.deepEqual(out["squat-barre"].H, [3, 2, 1, 0.5]);
});

test("normaliserEtat : les seuils personnalisés survivent au rechargement", () => {
  const e = normaliserEtat({ reglages: { standardsForce: { "squat-barre": { H: [1, 1.5, 2, 2.5] } } } });
  assert.deepEqual(e.reglages.standardsForce["squat-barre"].H, [1, 1.5, 2, 2.5]);
  // Et les réglages existants ne sont pas perdus au passage.
  assert.equal(e.reglages.theme, "dark");
  assert.deepEqual(normaliserEtat({}).reglages.standardsForce, {}, "défaut : aucun seuil personnalisé");
});
