// @ts-check
/**
 * NOTIFICATIONS — une app de musculation qui harcèle se fait désinstaller, et
 * une permission refusée l'est DÉFINITIVEMENT. Ces tests verrouillent les
 * garde-fous : on n'insiste jamais, on explique toujours pourquoi c'est éteint.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { TAG_REPOS, etatNotifs } from "../src/ui/notifs.js";

const fenetre = (permission) => ({ Notification: permission ? { permission } : undefined });

test("etatNotifs : navigateur sans notifications → refus expliqué, pas de plantage", () => {
  const e = etatNotifs({});
  assert.equal(e.supporte, false);
  assert.equal(e.actif, false);
  assert.ok(e.raison.length > 10, "l'interface doit pouvoir dire pourquoi");
});

test("etatNotifs : autorisé → actif, sans message parasite", () => {
  const e = etatNotifs(fenetre("granted"));
  assert.equal(e.supporte, true);
  assert.equal(e.actif, true);
  assert.equal(e.raison, "", "rien à expliquer quand ça marche");
});

test("etatNotifs : refusé → dit d'aller dans les réglages du NAVIGATEUR", () => {
  // Un refus est définitif : redemander depuis l'app ne produit rien. Si le
  // message ne dit pas où aller, l'utilisateur croit que l'app est cassée.
  const e = etatNotifs(fenetre("denied"));
  assert.equal(e.actif, false);
  assert.match(e.raison, /réglages du navigateur/i);
});

test("etatNotifs : jamais demandé → invite claire, sans culpabiliser", () => {
  const e = etatNotifs(fenetre("default"));
  assert.equal(e.actif, false);
  assert.match(e.raison, /écran verrouillé/i, "la raison doit dire à quoi ça sert");
});

test("etatNotifs : permission inconnue traitée comme « pas encore accordée »", () => {
  const e = etatNotifs(fenetre("quelque-chose"));
  assert.equal(e.actif, false, "dans le doute, on n'envoie rien");
});

test("TAG_REPOS : un identifiant fixe, sinon les notifications s'empilent", () => {
  // Après huit séries, huit lignes dans le centre de notifications : personne
  // ne garde une app qui fait ça.
  assert.equal(typeof TAG_REPOS, "string");
  assert.ok(TAG_REPOS.length > 4);
});

test("le module n'ouvre aucune connexion réseau", async () => {
  // Ce sont des notifications LOCALES : pas de serveur, pas de push, pas
  // d'abonnement. L'app doit rester utilisable entièrement hors ligne.
  const src = await import("node:fs").then((fs) =>
    fs.promises.readFile(new URL("../src/ui/notifs.js", import.meta.url), "utf8"));
  for (const interdit of ["fetch(", "XMLHttpRequest", "pushManager", "WebSocket", "https://"]) {
    assert.ok(!src.includes(interdit), `présence de « ${interdit} » dans notifs.js`);
  }
});
