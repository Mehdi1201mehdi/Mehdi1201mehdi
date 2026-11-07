// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { TERMES, TERMES_PAR_ID, CATEGORIES_DICO } from "../src/data/dictionnaire.js";
import {
  normaliser, scoreTerme, chercher, comparer, lettre, grouperParLettre,
  termesLies, compterParCategorie, termeDuJour,
} from "../src/engine/dictionnaire.js";

const ECRANS = new Set(["dash", "prog", "cat", "recup", "set", "stats", "food", "anatoly", "coach", "outils"]);

test("données : identifiants uniques, catégories connues, champs obligatoires remplis", () => {
  const ids = new Set();
  const cats = new Set(CATEGORIES_DICO.map((c) => c.id));
  for (const t of TERMES) {
    assert.ok(!ids.has(t.id), `doublon ${t.id}`); ids.add(t.id);
    assert.ok(cats.has(t.cat), `${t.id} : catégorie inconnue ${t.cat}`);
    assert.ok(typeof t.terme === "string" && t.terme.trim().length >= 2, `${t.id} : terme vide`);
    for (const champ of ["def", "expl", "ex"]) {
      assert.ok(typeof t[champ] === "string" && t[champ].trim().length > 10, `${t.id} : ${champ} vide`);
    }
    assert.ok(Array.isArray(t.syn) && t.syn.length > 0, `${t.id} : au moins un synonyme`);
    if (t.app) {
      assert.ok(t.app.txt.trim().length > 5, `${t.id} : texte « dans l'app » vide`);
      if (t.app.ecran) assert.ok(ECRANS.has(t.app.ecran), `${t.id} : écran inconnu ${t.app.ecran}`);
    }
  }
  assert.ok(TERMES.length >= 120, `au moins 120 termes (${TERMES.length})`);
});

test("données : chaque catégorie a des termes, aucun renvoi « voir » cassé", () => {
  const n = compterParCategorie(TERMES);
  for (const c of CATEGORIES_DICO) assert.ok(n[c.id] >= 8, `catégorie ${c.id} trop mince (${n[c.id] || 0})`);
  for (const t of TERMES) for (const v of t.voir || []) assert.ok(TERMES_PAR_ID[v], `${t.id} → ${v} introuvable`);
});

test("normaliser : insensible à la casse, aux accents et à l'apostrophe", () => {
  assert.equal(normaliser("Échauffement"), "echauffement");
  assert.equal(normaliser("  ÉCHEC   musculaire "), "echec musculaire");
  assert.equal(normaliser("Exercice d'isolation"), "exercice d isolation");
  assert.equal(normaliser("%1RM"), "%1rm");
  assert.equal(normaliser(null), "");
});

test("scoreTerme : nom exact > synonyme exact > préfixe > texte", () => {
  const t = { terme: "Série dégressive", syn: ["Drop set", "Strip set"], def: "Une série prolongée avec une charge plus légère." };
  assert.equal(scoreTerme(t, "serie degressive"), 100);
  assert.equal(scoreTerme(t, "drop set"), 90);
  assert.ok(scoreTerme(t, "série") >= 80);
  assert.ok(scoreTerme(t, "drop") >= 70);
  assert.equal(scoreTerme(t, "prolongée légère"), 20);
  assert.equal(scoreTerme(t, "kettlebell"), 0);
  assert.equal(scoreTerme(t, ""), 1, "requête vide : tout correspond");
});

test("chercher : un synonyme anglais tapé en salle retrouve le terme français", () => {
  assert.equal(chercher(TERMES, { q: "PR" })[0].id, "record");
  assert.equal(chercher(TERMES, { q: "drop set" })[0].id, "drop-set");
  assert.equal(chercher(TERMES, { q: "DOMS" })[0].id, "doms");
  assert.equal(chercher(TERMES, { q: "rir" })[0].id, "rir");
  assert.equal(chercher(TERMES, { q: "surcharge" })[0].id, "surcharge-progressive");
});

test("chercher : filtre par catégorie et par favoris, tri alphabétique sans requête", () => {
  const nut = chercher(TERMES, { cat: "nutrition" });
  assert.ok(nut.length > 0 && nut.every((t) => t.cat === "nutrition"));
  for (let i = 1; i < nut.length; i++) assert.ok(comparer(nut[i - 1].terme, nut[i].terme) <= 0, "ordre alphabétique");
  const fav = chercher(TERMES, { favoris: ["rpe", "rir", "inconnu"], seulsFavoris: true });
  assert.deepEqual(fav.map((t) => t.id).sort(), ["rir", "rpe"]);
  assert.equal(chercher(TERMES, { q: "zzzz-introuvable" }).length, 0);
});

test("lettre et grouperParLettre : É rangé avec E, intertitres dans l'ordre", () => {
  assert.equal(lettre("Échec musculaire"), "E");
  assert.equal(lettre("1RM"), "#");
  const g = grouperParLettre(chercher(TERMES, {}));
  assert.ok(g.length > 10);
  const total = g.reduce((s, x) => s + x.termes.length, 0);
  assert.equal(total, TERMES.length, "aucun terme perdu au regroupement");
  const lettres = g.map((x) => x.lettre);
  assert.equal(new Set(lettres).size, lettres.length, "une seule section par lettre");
});

test("termesLies : résout dans l'ordre et ignore les identifiants inconnus", () => {
  const lies = termesLies({ voir: ["rir", "nexiste-pas", "rpe"] }, TERMES_PAR_ID);
  assert.deepEqual(lies.map((t) => t.id), ["rir", "rpe"]);
  assert.deepEqual(termesLies({}, TERMES_PAR_ID), []);
});

test("termeDuJour : stable sur une journée, varie d'un jour à l'autre", () => {
  const a = termeDuJour(TERMES, "2026-11-07");
  assert.equal(termeDuJour(TERMES, "2026-11-07"), a);
  const jours = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"].map((j) => termeDuJour(TERMES, j)?.id);
  assert.ok(new Set(jours).size > 1, "le terme change selon le jour");
  assert.equal(termeDuJour([], "2026-11-07"), null);
});
