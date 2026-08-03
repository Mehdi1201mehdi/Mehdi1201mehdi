// @ts-check
/**
 * SCANNER — le pire défaut possible d'un scanner de code-barres, c'est
 * d'annoncer un produit qui n'est pas celui qu'on tient. Ces tests verrouillent
 * les trois défenses : chiffre de contrôle, confirmations multiples, et refus
 * explicite quand l'appareil ne sait pas scanner.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FORMATS, CONFIRMATIONS, PERIODE_MS, chiffreControle, codeValide, normaliserCode,
  confirmateur, scannerDisponible, messageErreurCamera,
} from "../src/ui/scanner.js";

/* ====================== CHIFFRE DE CONTRÔLE ====================== */

test("chiffreControle : clés GS1 de codes réels", () => {
  // Nutella 400 g (EAN-13) : 3017620422003 → clé 3.
  assert.equal(chiffreControle("301762042200"), 3);
  // Coca-Cola 330 ml : 5449000000996 → clé 6.
  assert.equal(chiffreControle("544900000099"), 6);
  // EAN-8 : 96385074 → clé 4.
  assert.equal(chiffreControle("9638507"), 4);
  // UPC-A : 036000291452 → clé 2.
  assert.equal(chiffreControle("03600029145"), 2);
});

test("chiffreControle : refuse ce qui n'est pas un nombre", () => {
  for (const v of ["", "12a45", " 123", null, undefined, {}]) {
    assert.equal(chiffreControle(/** @type {any} */ (v)), null, JSON.stringify(v));
  }
});

test("codeValide : accepte les vrais codes, rejette les chiffres inversés", () => {
  assert.equal(codeValide("3017620422003"), true, "Nutella");
  assert.equal(codeValide("5449000000996"), true, "Coca-Cola");
  assert.equal(codeValide("96385074"), true, "EAN-8");
  assert.equal(codeValide("036000291452"), true, "UPC-A");
  // Deux chiffres intervertis : une lecture partielle typique. La clé change.
  assert.equal(codeValide("3017620422030"), false);
  assert.equal(codeValide("3017620422004"), false, "clé fausse d'une unité");
});

test("codeValide : longueurs hors norme refusées", () => {
  // Sans ça, un fragment de code lu de travers déclencherait une requête réseau
  // et afficherait un produit qui n'a rien à voir.
  for (const c of ["", "1", "1234567", "123456789", "12345678901", "123456789012345"]) {
    assert.equal(codeValide(c), false, `longueur ${c.length}`);
  }
  assert.equal(codeValide("30176204220a3"), false, "lettre au milieu");
  assert.equal(codeValide(null), false);
});

/* ====================== NORMALISATION ====================== */

test("normaliserCode : un UPC-A devient l'EAN-13 correspondant", () => {
  // Sans ce zéro de tête, tout produit importé ressort « introuvable » alors
  // qu'il est bien dans Open Food Facts.
  assert.equal(normaliserCode("036000291452"), "0036000291452");
  assert.equal(normaliserCode("3017620422003"), "3017620422003", "un EAN-13 ne bouge pas");
  assert.equal(normaliserCode("96385074"), "96385074", "un EAN-8 non plus");
});

test("normaliserCode : espaces et tirets tolérés, code faux refusé", () => {
  assert.equal(normaliserCode(" 3017 6204 22003 "), "3017620422003");
  assert.equal(normaliserCode("3017-6204-22003"), "3017620422003");
  assert.equal(normaliserCode("3017620422004"), "", "clé fausse → chaîne vide");
  assert.equal(normaliserCode("abc"), "");
  assert.equal(normaliserCode(undefined), "");
});

/* ====================== CONFIRMATIONS ====================== */

test("confirmateur : une seule lecture ne suffit jamais", () => {
  const c = confirmateur(3);
  assert.equal(c.ajouter("3017620422003"), "");
  assert.equal(c.ajouter("3017620422003"), "");
  assert.equal(c.ajouter("3017620422003"), "3017620422003", "à la troisième");
});

test("confirmateur : deux produits côte à côte ne « votent » pas l'un pour l'autre", () => {
  // Le compteur repart à zéro dès qu'un code différent apparaît : sans ça,
  // alterner entre deux paquets finirait par valider l'un des deux.
  const c = confirmateur(3);
  c.ajouter("3017620422003");
  c.ajouter("5449000000996");
  c.ajouter("3017620422003");
  assert.equal(c.ajouter("5449000000996"), "", "aucun des deux n'a trois lectures d'affilée");
  assert.equal(c.ajouter("5449000000996"), "");
  assert.equal(c.ajouter("5449000000996"), "5449000000996");
});

test("confirmateur : une image illisible remet le compteur à zéro", () => {
  const c = confirmateur(2);
  c.ajouter("3017620422003");
  c.ajouter("");                      // rien détecté sur cette image
  assert.equal(c.ajouter("3017620422003"), "", "il faut recommencer");
  assert.equal(c.ajouter("3017620422003"), "3017620422003");
});

test("confirmateur : un code au chiffre de contrôle faux n'est jamais retenu", () => {
  const c = confirmateur(2);
  for (let i = 0; i < 10; i++) assert.equal(c.ajouter("3017620422004"), "");
});

test("confirmateur : la progression renseigne l'interface, sans dépasser 1", () => {
  const c = confirmateur(3);
  assert.equal(c.progression, 0);
  c.ajouter("3017620422003"); assert.ok(Math.abs(c.progression - 1 / 3) < 1e-9);
  c.ajouter("3017620422003"); assert.ok(Math.abs(c.progression - 2 / 3) < 1e-9);
  c.ajouter("3017620422003"); assert.equal(c.progression, 1);
  c.ajouter("3017620422003"); assert.equal(c.progression, 1, "jamais au-delà de 1");
  c.reset(); assert.equal(c.progression, 0);
});

test("confirmateur : un seuil absurde retombe sur « au moins une lecture »", () => {
  for (const s of [0, -5, NaN, /** @type {any} */ ("trois")]) {
    const c = confirmateur(s);
    assert.equal(c.ajouter("96385074"), "96385074", `seuil ${s}`);
  }
});

/* ====================== DISPONIBILITÉ ====================== */

test("scannerDisponible : dit NON avec une raison, jamais un bouton inerte", () => {
  const camera = { mediaDevices: { getUserMedia() {} } };

  const sansRien = scannerDisponible({ navigator: {} });
  assert.equal(sansRien.ok, false);
  assert.match(sansRien.raison, /caméra/i);

  const sansDetecteur = scannerDisponible({ navigator: camera });
  assert.equal(sansDetecteur.ok, false);
  assert.match(sansDetecteur.raison, /codes-barres/i);

  const pasSecurise = scannerDisponible({
    navigator: camera, BarcodeDetector: function () {}, isSecureContext: false,
  });
  assert.equal(pasSecurise.ok, false);
  assert.match(pasSecurise.raison, /https|sécuris/i);

  const bon = scannerDisponible({
    navigator: camera, BarcodeDetector: function () {}, isSecureContext: true,
  });
  assert.equal(bon.ok, true);
  assert.equal(bon.raison, "");
});

test("scannerDisponible : chaque refus propose la saisie manuelle", () => {
  const cas = [{ navigator: {} }, { navigator: { mediaDevices: { getUserMedia() {} } } }];
  for (const w of cas) {
    assert.match(scannerDisponible(w).raison, /main/i, "l'utilisateur ne doit jamais rester bloqué");
  }
});

test("messageErreurCamera : traduit les noms techniques en phrases utiles", () => {
  assert.match(messageErreurCamera({ name: "NotAllowedError" }), /refusé/i);
  assert.match(messageErreurCamera({ name: "NotFoundError" }), /aucune caméra/i);
  assert.match(messageErreurCamera({ name: "NotReadableError" }), /déjà utilisée/i);
  assert.match(messageErreurCamera({ name: "OverconstrainedError" }), /arrière/i);
  // Cas inconnu : un message générique, jamais « undefined » ni un code brut.
  const inconnu = messageErreurCamera({ name: "QuelqueChoseDeNouveau" });
  assert.ok(inconnu.length > 20);
  assert.doesNotMatch(inconnu, /undefined|Error/);
  assert.doesNotMatch(messageErreurCamera(null), /undefined/);
});

/* ====================== RÉGLAGES ====================== */

test("réglages : formats alimentaires couverts et cadence raisonnable", () => {
  assert.ok(FORMATS.includes("ean_13"), "le format des produits européens");
  assert.ok(FORMATS.includes("upc_a"), "les produits importés");
  assert.ok(CONFIRMATIONS >= 2, "une seule lecture peut mentir");
  // À 60 Hz le téléphone chauffe pour rien : un code-barres ne bouge pas si vite.
  assert.ok(PERIODE_MS >= 60, `analyse ${1000 / PERIODE_MS} fois par seconde : trop`);
});
