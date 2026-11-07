// @ts-check
// Pont natif (src/ui/natif.js) : inerte sur le web, actif dans l'APK.
// Les plugins Capacitor sont simulés : on vérifie les appels réellement faits.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

const g = /** @type {any} */ (globalThis);
afterEach(() => { delete g.window; });

/** Charge une copie fraîche du module (son état interne de permission repart à zéro). */
async function charger() {
  return import(`../src/ui/natif.js?v=${Math.random()}`);
}

function simulerApk({ permission = "granted" } = {}) {
  const appels = [];
  g.window = {
    Capacitor: {
      isNativePlatform: () => true,
      Plugins: {
        Filesystem: { writeFile: async (o) => { appels.push(["writeFile", o]); return { uri: "file:///cache/" + o.path }; } },
        Share: { share: async (o) => { appels.push(["share", o]); } },
        LocalNotifications: {
          checkPermissions: async () => ({ display: permission }),
          requestPermissions: async () => ({ display: permission }),
          schedule: async (o) => { appels.push(["schedule", o]); },
          cancel: async (o) => { appels.push(["cancel", o]); },
          removeDeliveredNotifications: async (o) => { appels.push(["removeDelivered", o]); },
        },
      },
    },
  };
  return appels;
}

test("web : tout est inerte, l'app garde son comportement habituel", async () => {
  const n = await charger();
  assert.equal(n.estNatif(), false);
  assert.equal(n.notifsNativesDispo(), false);
  assert.equal(await n.partagerFichier("a.json", "{}"), false);
  assert.equal(await n.programmerFinRepos(Date.now() + 60000, "t", "c"), false);
  await n.annulerFinRepos(); // ne lève rien
});

test("APK : la sauvegarde est écrite puis partagée (la WebView ne sait pas télécharger)", async () => {
  const appels = simulerApk();
  const n = await charger();
  assert.equal(n.estNatif(), true);
  assert.equal(await n.partagerFichier("sauvegarde.json", "{\"a\":1}", "Sauvegarde"), true);
  assert.deepEqual(appels[0], ["writeFile", { path: "sauvegarde.json", data: "{\"a\":1}", directory: "CACHE", encoding: "utf8" }]);
  assert.equal(appels[1][0], "share");
  assert.deepEqual(appels[1][1].files, ["file:///cache/sauvegarde.json"]);
});

test("APK : fin de repos programmée à l'heure exacte, puis annulée au retour", async () => {
  const appels = simulerApk();
  const n = await charger();
  const fin = Date.now() + 90000;
  assert.equal(await n.programmerFinRepos(fin, "Repos terminé", "Série suivante"), true);
  const sch = appels.find((a) => a[0] === "schedule")[1].notifications[0];
  assert.equal(sch.schedule.at.getTime(), fin);
  assert.equal(sch.schedule.allowWhileIdle, true);
  assert.equal(sch.title, "Repos terminé");
  await n.annulerFinRepos();
  assert.ok(appels.some((a) => a[0] === "cancel"));
  assert.ok(appels.some((a) => a[0] === "removeDelivered"));
});

test("APK : rien n'est programmé si la permission est refusée ou le repos déjà échu", async () => {
  const appels = simulerApk({ permission: "denied" });
  const n = await charger();
  assert.equal(await n.programmerFinRepos(Date.now() + 60000, "t", "c"), false);
  assert.equal(await n.programmerFinRepos(Date.now() - 1000, "t", "c"), false);
  assert.ok(!appels.some((a) => a[0] === "schedule"));
});
