/* Enregistrement du service worker (externalisé pour permettre une CSP stricte
   sans 'unsafe-inline' sur les scripts). */
if ("serviceWorker" in navigator) {
  var hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (hadController) window.location.reload();
  });
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").then(function (r) { r.update && r.update(); }).catch(function () {});
  });
}

/* Nouvelle version détectée : on prévient l'app, qui propose de recharger.
   Sans cela, l'utilisateur pouvait rester sur une version périmée. */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.ready.then((reg) => {
    reg.addEventListener("updatefound", () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener("statechange", () => {
        if (sw.state === "installed" && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent("coachperso:maj"));
        }
      });
    });
  }).catch(() => {});
}
