// @ts-check
/**
 * MANIFESTE MÉDIA — un cadre vide se lit comme un bug, une silhouette se lit
 * comme une décision. Ces tests verrouillent la chaîne de repli et surtout le
 * fait qu'elle ne débouche JAMAIS sur du vide.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FORMAT_DEMO, TYPES, ICONE_MATERIEL, materielPrincipal, musclesCibles,
  mediaExercice, couverture, chargementMedia,
} from "../src/data/media-manifest.js";
import { CATALOGUE } from "../src/data/exercises.js";
import { EXTRA_EXERCISES } from "../src/data/exercises-extra.js";

const GIFS_TEST = { "squat-barre": "https://raw.githubusercontent.com/x/y/main/videos/0043.gif" };

/* ===================== CHAÎNE DE REPLI ===================== */

test("un exercice avec animation renvoie l'animation", () => {
  const m = mediaExercice({ id: "squat-barre", nom: "Squat", muscles: ["quadriceps"] }, GIFS_TEST);
  assert.equal(m.type, "animation");
  assert.match(m.url || "", /^https:\/\//);
  assert.match(m.alt, /Squat/);
});

test("sans animation mais avec muscles : la silhouette, pas le vide", () => {
  // Elle ne montre pas le geste, mais elle montre la CIBLE — ce qui vaut mieux
  // qu'un cadre vide que l'utilisateur prend pour un défaut d'affichage.
  const m = mediaExercice({ id: "inconnu", nom: "Truc", muscles: ["pectoraux"] }, GIFS_TEST);
  assert.equal(m.type, "silhouette");
  assert.equal(m.url, null);
  assert.deepEqual(m.muscles.principaux, ["pectoraux"]);
});

test("sans animation ni muscles : un marque-place typé, jamais rien", () => {
  const m = mediaExercice({ id: "vide", nom: "Sans données" }, GIFS_TEST);
  assert.equal(m.type, "placeholder");
  assert.ok(m.alt.length > 0, "un texte alternatif est toujours fourni");
});

test("la chaîne ne débouche jamais sur un type inconnu, même sur des données abîmées", () => {
  for (const exo of [null, undefined, {}, { id: 42 }, { id: "x", muscles: "pectoraux" }]) {
    const m = mediaExercice(/** @type {any} */ (exo), GIFS_TEST);
    assert.ok(TYPES.includes(m.type), `type ${m.type}`);
    assert.ok(m.alt && m.alt.length > 0, "alt manquant");
    assert.ok(m.ratio, "ratio manquant");
  }
});

test("une URL non https est refusée : elle casserait la page en production", () => {
  // GitHub Pages sert en https ; une image en http est bloquée par le
  // navigateur et laisse un cadre cassé sans message.
  const m = mediaExercice({ id: "a", nom: "A", muscles: ["dos"] }, { a: "http://exemple.test/x.gif" });
  assert.equal(m.type, "silhouette", "on retombe proprement au lieu d'afficher une image bloquée");
});

/* ===================== MUSCLES ===================== */

test("musclesCibles : principal et secondaire ne se recouvrent pas", () => {
  // Colorer tout de la même façon revient à ne rien dire.
  const m = musclesCibles({ muscles: ["pectoraux"], musclesSecondaires: ["pectoraux", "triceps"] });
  assert.deepEqual(m.principaux, ["pectoraux"]);
  assert.deepEqual(m.secondaires, ["triceps"], "le doublon est retiré du secondaire");
});

test("musclesCibles : accepte une chaîne seule comme une liste", () => {
  assert.deepEqual(musclesCibles({ muscles: "dos" }).principaux, ["dos"]);
  assert.deepEqual(musclesCibles({}).principaux, []);
  assert.deepEqual(musclesCibles(null).secondaires, []);
});

/* ===================== MATÉRIEL ===================== */

test("materielPrincipal : reconnaît le matériel, accents compris", () => {
  assert.equal(materielPrincipal({ materiel: ["Haltères"] }), "halteres");
  assert.equal(materielPrincipal({ materiel: "barre" }), "barre");
  assert.equal(materielPrincipal({ equipement: ["Machine"] }), "machine");
  // Défaut utile : un exercice sans matériel déclaré est au poids du corps dans
  // l'immense majorité des cas.
  assert.equal(materielPrincipal({}), "poids-du-corps");
  assert.equal(materielPrincipal(null), "poids-du-corps");
});

test("ICONE_MATERIEL : chaque famille a une icône, aucune valeur vide", () => {
  for (const [k, v] of Object.entries(ICONE_MATERIEL)) {
    assert.ok(v && typeof v === "string", `${k} sans icône`);
  }
});

/* ===================== COUVERTURE ===================== */

test("couverture : compte juste, et ne divise pas par zéro", () => {
  const l = [{ id: "squat-barre", muscles: ["quadriceps"] }, { id: "x", muscles: ["dos"] }, { id: "y" }];
  const c = couverture(l, GIFS_TEST);
  assert.equal(c.total, 3);
  assert.equal(c.animation, 1);
  assert.equal(c.silhouette, 1);
  assert.equal(c.placeholder, 1);
  assert.equal(c.pct, 33);
  assert.equal(couverture([]).pct, 0);
  assert.equal(couverture(/** @type {any} */ (null)).total, 0);
});

test("couverture réelle du catalogue : aucun exercice ne tombe au marque-place", () => {
  // Un marque-place est un dernier recours acceptable, mais s'il concerne des
  // dizaines d'exercices c'est que les données muscles sont trouées.
  const vus = new Map();
  for (const e of [...CATALOGUE, ...EXTRA_EXERCISES]) if (e && e.id && !vus.has(e.id)) vus.set(e.id, e);
  const c = couverture([...vus.values()]);
  assert.ok(c.animation >= 275, `${c.animation} animations, plancher 275`);
  assert.ok(c.placeholder <= 5, `${c.placeholder} exercices sans animation NI muscles`);
});

/* ===================== CHARGEMENT ===================== */

test("chargementMedia : les premières vignettes seulement sont pressées", () => {
  // 343 exercices = 343 requêtes au rendu : plusieurs dizaines de Mo sur un
  // forfait mobile, et l'écran se fige sur un appareil d'entrée de gamme.
  assert.equal(chargementMedia(0).loading, "eager");
  assert.equal(chargementMedia(5).loading, "eager");
  assert.equal(chargementMedia(6).loading, "lazy");
  assert.equal(chargementMedia(300).loading, "lazy");
  assert.equal(chargementMedia(300).fetchpriority, "low");
});

test("chargementMedia : index absurde → chargement paresseux, jamais d'erreur", () => {
  for (const i of [NaN, -1, /** @type {any} */ ("trois"), null]) {
    assert.equal(chargementMedia(i).loading, "lazy", String(i));
  }
});

test("FORMAT_DEMO : le ratio correspond aux médias réellement servis (180×180)", () => {
  assert.equal(FORMAT_DEMO.largeur, FORMAT_DEMO.hauteur, "les GIF du dataset sont carrés");
  assert.equal(FORMAT_DEMO.ratio, "1 / 1");
});
