// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseReponse, termePour, chercherDemonstration, lienYouTube } from "../src/integrations/exercisedb.js";

test("parseReponse tolère les différentes formes de payload", () => {
  const a = parseReponse({ data: { exercises: [{ name: "Push Up", gifUrl: "http://x/pushup.gif", instructions: ["a", "b"] }] } });
  assert.equal(a.gifUrl, "http://x/pushup.gif");
  assert.equal(a.name, "Push Up");
  const b = parseReponse({ data: [{ name: "Row", imageUrl: "http://x/row.png" }] });
  assert.equal(b.gifUrl, "http://x/row.png");
  const c = parseReponse([{ gifUrl: "http://x/z.gif" }]);
  assert.equal(c.gifUrl, "http://x/z.gif");
});

test("parseReponse renvoie null si aucun média", () => {
  assert.equal(parseReponse({ data: { exercises: [] } }), null);
  assert.equal(parseReponse({}), null);
});

test("termePour mappe nos ids vers le vocabulaire ExerciseDB, avec repli sur le nom", () => {
  assert.equal(termePour("pompes"), "push up");
  assert.equal(termePour("developpe-couche-barre"), "barbell bench press");
  assert.ok(typeof termePour("id-inconnu") === "string");
});

test("chercherDemonstration renvoie le GIF via un fetch simulé", async () => {
  const fakeFetch = async () => ({ json: async () => ({ data: { exercises: [{ name: "Squat", gifUrl: "http://x/squat.gif" }] } }) });
  const res = await chercherDemonstration("squat-poids-du-corps", { fetchImpl: fakeFetch });
  assert.equal(res.gifUrl, "http://x/squat.gif");
});

test("hors ligne : fetch échoue → null (dégradation propre), lien YouTube toujours disponible", async () => {
  const fetchKO = async () => { throw new Error("offline"); };
  const res = await chercherDemonstration("pompes", { fetchImpl: fetchKO, timeout: 50 });
  assert.equal(res, null);
  assert.match(lienYouTube("pompes"), /youtube\.com/);
});
