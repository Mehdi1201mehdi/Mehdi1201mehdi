// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { gifUrlWX, parseWX, chercherWorkoutX } from "../src/integrations/workoutx.js";

test("gifUrlWX : URL <img> avec clé en query api-key", () => {
  const u = gifUrlWX("0001", "wx_abc");
  assert.equal(u, "https://api.workoutxapp.com/v1/gifs/0001.gif?api-key=wx_abc");
});

test("parseWX : construit l'URL GIF authentifiée depuis l'id", () => {
  const r = parseWX([{ id: "0043", name: "Barbell Bench Press", instructions: ["a", "b"] }], "wx_k");
  assert.equal(r.id, "0043");
  assert.match(r.gifUrl, /\/v1\/gifs\/0043\.gif\?api-key=wx_k$/);
  assert.deepEqual(r.instructions, ["a", "b"]);
});

test("parseWX : tolère data/exercises et renvoie null si vide", () => {
  assert.equal(parseWX({ data: [] }, "k"), null);
  assert.equal(parseWX([], "k"), null);
  assert.ok(parseWX({ exercises: [{ id: "1" }] }, "k"));
});

test("chercherWorkoutX : GIF via fetch simulé (header clé envoyé)", async () => {
  let vuHeader = null;
  const fake = async (url, opts) => { vuHeader = opts.headers["X-WorkoutX-Key"]; return { ok: true, json: async () => [{ id: "0007", name: "Squat" }] }; };
  const res = await chercherWorkoutX("squat", "wx_test", { fetchImpl: fake });
  assert.equal(vuHeader, "wx_test");
  assert.match(res.gifUrl, /0007\.gif\?api-key=wx_test/);
});

test("chercherWorkoutX : sans clé ou hors ligne → null", async () => {
  assert.equal(await chercherWorkoutX("squat", "", {}), null);
  const ko = async () => { throw new Error("offline"); };
  assert.equal(await chercherWorkoutX("squat", "wx_k", { fetchImpl: ko, timeout: 50 }), null);
});
