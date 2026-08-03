// @ts-check
/**
 * PHOTOS DE PROGRESSION — une photo de son corps est la donnée la plus intime
 * qu'une app de musculation puisse détenir. Ces tests verrouillent ce qui la
 * protège (rien ne part, rien ne ment) et ce qui la rend utile (la bonne paire,
 * le bon poids, la bonne taille de fichier).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  POSES, COTE_MAX, QUALITE, nouvellePhoto, dimensionsCibles, trierPhotos, ecartJours,
  paireComparaison, poidsProche, resumeStockage, formaterOctets, incoherences,
} from "../src/engine/photos.js";

const ph = (date, pose = "face", extra = {}) => ({ ...nouvellePhoto({ date, pose, ...extra }) });

/* ======================= FICHES ======================= */

test("nouvellePhoto : identifiant unique même à la même seconde", () => {
  const a = nouvellePhoto({ date: "2026-01-15" });
  const b = nouvellePhoto({ date: "2026-01-15" });
  assert.notEqual(a.id, b.id, "deux photos du même jour s'écraseraient");
  assert.match(a.id, /^ph_2026-01-15_/, "la date reste lisible à l'œil dans l'identifiant");
});

test("nouvellePhoto : valeurs aberrantes neutralisées, jamais d'erreur", () => {
  const p = nouvellePhoto({
    date: "pas une date", pose: "de biais", poidsKg: 900,
    largeur: -5, hauteur: NaN, octets: -3, note: "x".repeat(400),
  });
  assert.match(p.date, /^\d{4}-\d{2}-\d{2}$/, "retombe sur aujourd'hui");
  assert.equal(p.pose, "face", "pose inconnue → pose par défaut");
  assert.equal(p.poidsKg, null, "900 kg n'est pas un poids de corps");
  assert.equal(p.largeur, 0);
  assert.equal(p.hauteur, 0);
  assert.equal(p.octets, 0);
  assert.equal(p.note.length, 120, "note tronquée, pas rejetée");
});

test("nouvellePhoto : un poids plausible est conservé, arrondi au dixième", () => {
  assert.equal(nouvellePhoto({ poidsKg: 82.37 }).poidsKg, 82.4);
});

/* ======================= REDIMENSIONNEMENT ======================= */

test("dimensionsCibles : une photo de téléphone est ramenée au côté long", () => {
  // 4000 × 3000 = ~5 Mo. Dix photos suffiraient à saturer le quota.
  const d = dimensionsCibles(4000, 3000);
  assert.equal(Math.max(d.largeur, d.hauteur), COTE_MAX);
  assert.equal(d.largeur, 1280);
  assert.equal(d.hauteur, 960);
  // Le rapport de forme est conservé : sinon la silhouette est déformée et la
  // comparaison ne veut plus rien dire.
  assert.ok(Math.abs(d.largeur / d.hauteur - 4000 / 3000) < 0.01);
});

test("dimensionsCibles : portrait aussi bien que paysage", () => {
  const d = dimensionsCibles(3000, 4000);
  assert.equal(d.hauteur, 1280);
  assert.equal(d.largeur, 960);
});

test("dimensionsCibles : une petite image n'est JAMAIS agrandie", () => {
  // Agrandir n'ajoute aucun détail et multiplie le poids du fichier.
  assert.deepEqual(dimensionsCibles(800, 600), { largeur: 800, hauteur: 600 });
  assert.deepEqual(dimensionsCibles(1280, 720), { largeur: 1280, hauteur: 720 });
});

test("dimensionsCibles : une image très allongée garde un petit côté ≥ 1", () => {
  // Arrondi à zéro → canevas invalide → capture qui échoue sans explication.
  const d = dimensionsCibles(9000, 3);
  assert.ok(d.hauteur >= 1, `hauteur ${d.hauteur}`);
  assert.equal(d.largeur, COTE_MAX);
});

test("dimensionsCibles : dimensions absurdes → 0, pas de NaN", () => {
  for (const [l, h] of [[0, 100], [100, 0], [-4, 5], [NaN, 10], ["a", "b"]]) {
    const d = dimensionsCibles(/** @type {any} */ (l), /** @type {any} */ (h));
    assert.deepEqual(d, { largeur: 0, hauteur: 0 }, `${l}×${h}`);
  }
});

test("qualité JPEG : assez haute pour la peau, assez basse pour le quota", () => {
  assert.ok(QUALITE >= 0.6 && QUALITE <= 0.85, `qualité ${QUALITE}`);
});

/* ======================= TRI ET COMPARAISON ======================= */

test("trierPhotos : ordre chronologique, entrée non modifiée", () => {
  const source = [ph("2026-03-01"), ph("2026-01-01"), ph("2026-02-01")];
  const copie = source.slice();
  const t = trierPhotos(source);
  assert.deepEqual(t.map((p) => p.date), ["2026-01-01", "2026-02-01", "2026-03-01"]);
  assert.deepEqual(source, copie, "la liste d'origine ne doit pas bouger");
});

test("trierPhotos : entrées abîmées écartées sans planter", () => {
  assert.deepEqual(trierPhotos(/** @type {any} */ (null)), []);
  assert.equal(trierPhotos([null, undefined, {}, ph("2026-01-01")]).length, 1);
});

test("paireComparaison : la plus ancienne contre la plus récente", () => {
  // Deux photos de la même semaine ne montreraient rien, et on conclurait que
  // la fonction ne sert à rien.
  const l = [ph("2026-01-01"), ph("2026-01-05"), ph("2026-06-01")];
  const p = paireComparaison(l);
  assert.equal(p.avant.date, "2026-01-01");
  assert.equal(p.apres.date, "2026-06-01");
  assert.equal(p.jours, 151);
});

test("paireComparaison : jamais une pose contre une autre", () => {
  // Une photo de face contre une de dos ne prouve rien.
  const l = [ph("2026-01-01", "face"), ph("2026-06-01", "dos")];
  assert.equal(paireComparaison(l, "face"), null, "une seule photo de face");
  assert.equal(paireComparaison(l, "dos"), null);
  const avecDeux = [...l, ph("2026-09-01", "dos")];
  const p = paireComparaison(avecDeux, "dos");
  assert.equal(p.avant.date, "2026-06-01");
  assert.equal(p.apres.date, "2026-09-01");
});

test("paireComparaison : moins de deux photos → rien à comparer", () => {
  assert.equal(paireComparaison([]), null);
  assert.equal(paireComparaison([ph("2026-01-01")]), null);
  assert.equal(paireComparaison(/** @type {any} */ (null)), null);
});

test("paireComparaison : l'écart de poids n'est calculé que s'il est connu", () => {
  const avecPoids = [ph("2026-01-01", "face", { poidsKg: 86 }), ph("2026-06-01", "face", { poidsKg: 81.5 })];
  assert.equal(paireComparaison(avecPoids).deltaPoids, -4.5);
  const sansPoids = [ph("2026-01-01"), ph("2026-06-01", "face", { poidsKg: 81 })];
  assert.equal(paireComparaison(sansPoids).deltaPoids, null, "un seul poids connu : on ne prétend rien");
});

test("ecartJours : symétrique, et 0 sur une date illisible", () => {
  assert.equal(ecartJours("2026-01-01", "2026-01-31"), 30);
  assert.equal(ecartJours("2026-01-31", "2026-01-01"), 30);
  assert.equal(ecartJours("2026-01-01", "2026-01-01"), 0);
  assert.equal(ecartJours("n'importe quoi", "2026-01-01"), 0);
  // Un changement d'heure ne doit pas produire 29 ou 31 jours.
  assert.equal(ecartJours("2026-03-01", "2026-04-01"), 31);
});

/* ======================= POIDS RATTACHÉ ======================= */

test("poidsProche : reprend la pesée la plus proche de la photo", () => {
  const m = [{ date: "2026-01-01", poidsKg: 86 }, { date: "2026-01-14", poidsKg: 84.2 }];
  assert.equal(poidsProche(m, "2026-01-13"), 84.2);
  assert.equal(poidsProche(m, "2026-01-02"), 86);
});

test("poidsProche : au-delà de la tolérance, on ne prétend rien", () => {
  // Un poids vieux d'un mois n'est pas celui du jour de la photo : l'afficher
  // serait un mensonge discret, qui fausserait le « −4 kg » de la comparaison.
  const m = [{ date: "2026-01-01", poidsKg: 86 }];
  assert.equal(poidsProche(m, "2026-03-01"), null);
  assert.equal(poidsProche(m, "2026-01-07"), 86, "dans la semaine : accepté");
  assert.equal(poidsProche(m, "2026-01-09"), null, "au-delà : refusé");
});

test("poidsProche : mesures vides, absentes ou aberrantes → null", () => {
  assert.equal(poidsProche([], "2026-01-01"), null);
  assert.equal(poidsProche(/** @type {any} */ (null), "2026-01-01"), null);
  assert.equal(poidsProche([{ date: "2026-01-01", poidsKg: 0 }], "2026-01-01"), null);
  assert.equal(poidsProche([{ date: "2026-01-01" }], "2026-01-01"), null, "mesure de tour de taille seule");
});

/* ======================= STOCKAGE ======================= */

test("formaterOctets : lisible, à la française", () => {
  assert.equal(formaterOctets(512), "512 o");
  assert.equal(formaterOctets(204800), "200 ko");
  assert.equal(formaterOctets(5 * 1024 * 1024), "5 Mo");
  assert.equal(formaterOctets(1.5 * 1024 * 1024), "1,5 Mo", "virgule décimale");
  assert.equal(formaterOctets(-10), "0 o");
  assert.equal(formaterOctets(/** @type {any} */ ("beaucoup")), "0 o");
});

test("resumeStockage : total et alerte au-delà du seuil", () => {
  const petites = [ph("2026-01-01", "face", { octets: 200000 }), ph("2026-02-01", "face", { octets: 180000 })];
  const r = resumeStockage(petites);
  assert.equal(r.nombre, 2);
  assert.equal(r.octets, 380000);
  assert.equal(r.alerte, false);
  const grosses = Array.from({ length: 200 }, () => ph("2026-01-01", "face", { octets: 500000 }));
  assert.equal(resumeStockage(grosses).alerte, true, "le quota du navigateur n'est pas infini");
  assert.deepEqual(resumeStockage([]).nombre, 0);
});

/* ======================= COHÉRENCE ======================= */

test("incoherences : repère les fiches sans image et les images orphelines", () => {
  // Le navigateur peut vider IndexedDB sous pression de stockage. Sans ce
  // contrôle, l'app afficherait des vignettes cassées sans expliquer pourquoi.
  const a = ph("2026-01-01"), b = ph("2026-02-01");
  const r = incoherences([a, b], [a.id, "ph_2025-12-01_orphan"]);
  assert.deepEqual(r.fichesSansImage, [b.id]);
  assert.deepEqual(r.imagesSansFiche, ["ph_2025-12-01_orphan"]);
});

test("incoherences : tout est cohérent → deux listes vides", () => {
  const a = ph("2026-01-01"), b = ph("2026-02-01");
  const r = incoherences([a, b], [a.id, b.id]);
  assert.deepEqual(r.fichesSansImage, []);
  assert.deepEqual(r.imagesSansFiche, []);
  assert.deepEqual(incoherences([], []), { fichesSansImage: [], imagesSansFiche: [] });
  assert.deepEqual(incoherences(/** @type {any} */ (null), /** @type {any} */ (null)),
    { fichesSansImage: [], imagesSansFiche: [] });
});

/* ======================= POSES ======================= */

test("POSES : trois angles, chacun avec sa consigne", () => {
  assert.equal(POSES.length, 3, "au-delà de trois, on ne les refait pas");
  for (const p of POSES) {
    assert.ok(p.cle && p.nom && p.aide.length > 10, `${p.cle} : consigne manquante`);
  }
  const cles = POSES.map((p) => p.cle);
  assert.equal(new Set(cles).size, cles.length);
});
