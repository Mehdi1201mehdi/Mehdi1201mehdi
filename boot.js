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
