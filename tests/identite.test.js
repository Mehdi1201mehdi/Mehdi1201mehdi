// @ts-check
/**
 * IDENTITÉ — le fichier existe pour qu'on puisse renommer l'application depuis
 * UN endroit. Ces tests verrouillent la seule chose qui rendrait ce fichier
 * dangereux : la confusion entre un LIBELLÉ (qu'on change librement) et un
 * IDENTIFIANT TECHNIQUE (qui, changé, coupe l'accès à l'historique).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { IDENTITE, titreComplet } from "../src/config/identite.js";

test("les identifiants techniques ne sont PAS dérivés du nom", () => {
  // C'est le piège du fichier : si `cleStockage` était construite à partir de
  // `nom`, renommer l'application viderait l'écran de tout l'historique au
  // rechargement suivant. Ils doivent rester des constantes indépendantes.
  const slug = IDENTITE.nom.toLowerCase().replace(/[^a-z0-9]/g, "");
  assert.ok(!IDENTITE.cleStockage.toLowerCase().replace(/[^a-z0-9]/g, "").startsWith(slug + "v")
    || IDENTITE.cleStockage === "coachperso.ia.v1", "la clé de stockage doit être figée, pas calculée");
  assert.equal(IDENTITE.cleStockage, "coachperso.ia.v1");
  assert.equal(IDENTITE.idSauvegarde, "coach-perso-ia");
});

test("titreComplet : nom seul si le sur-titre est vide", () => {
  assert.equal(titreComplet(), `${IDENTITE.nom} — ${IDENTITE.surTitre}`);
  const sans = { ...IDENTITE, surTitre: "" };
  // Reproduit la règle sans dépendre de l'état du module.
  assert.equal(sans.surTitre ? `${sans.nom} — ${sans.surTitre}` : sans.nom, sans.nom);
});

test("aucun champ affiché n'est vide, sauf le slogan qui a le droit de l'être", () => {
  for (const cle of ["nom", "surTitre", "signature", "cleStockage", "idSauvegarde"]) {
    assert.ok(String(IDENTITE[cle]).trim().length > 0, `champ « ${cle} » vide`);
  }
  assert.equal(typeof IDENTITE.slogan, "string", "le slogan doit exister, même vide");
});

test("le nom n'est plus écrit en dur dans le code de l'interface", () => {
  // Le fichier de configuration ne sert à rien si une copie du nom subsiste
  // ailleurs : on renommerait l'application et il en resterait une trace.
  for (const f of ["src/ui/app.js", "src/store/state.js", "src/engine/backup.js"]) {
    const src = readFileSync(new URL("../" + f, import.meta.url), "utf8");
    const lignes = src.split("\n").filter((l) =>
      l.includes(IDENTITE.nom) && !l.trimStart().startsWith("*") && !l.trimStart().startsWith("//"));
    assert.deepEqual(lignes, [], `${f} : le nom est encore écrit en dur`);
  }
});

test("index.html et le manifeste restent cohérents avec l'identité", () => {
  // Ces deux-là sont lus avant tout script : ils s'éditent à la main, et rien
  // n'avertit quand on oublie. Ce test est cet avertissement.
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(html.includes(`<title>${titreComplet()}</title>`), "le <title> ne correspond pas à titreComplet()");
  assert.ok(html.includes(`content="${IDENTITE.nom}"`), "apple-mobile-web-app-title ne correspond pas au nom");
  const man = JSON.parse(readFileSync(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(man.short_name, IDENTITE.nom);
  assert.equal(man.name, titreComplet());
});
