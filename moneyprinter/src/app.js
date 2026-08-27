/* Point d'entrée : routage par ancre, en-tête, barre d'onglets.
   Trois écrans, pas un de plus — sur un téléphone, une navigation qu'on doit
   apprendre est une navigation ratée. */

import { h, icone, vider, message } from "./dom.js";
import { noter } from "./journal.js";
import * as api from "./api.js";
import { vueCreer } from "./vues/creer.js";
import { vueVideos } from "./vues/videos.js";
import { vueReglages } from "./vues/reglages.js";

const ECRANS = [
  { route: "#/creer", titre: "Créer", icone: "etincelle", vue: vueCreer },
  { route: "#/videos", titre: "Vidéos", icone: "film", vue: vueVideos },
  { route: "#/reglages", titre: "Réglages", icone: "reglage", vue: vueReglages },
];

const contenu = document.getElementById("contenu");
const titreEcran = document.getElementById("titre-ecran");
const barreOnglets = document.getElementById("onglets");

let ecranActuel = null;
let optionsRoute = {};

function aller(route, options = {}) {
  optionsRoute = options;
  if (location.hash === route) rendre();
  else location.hash = route;
}

/* Le sujet est mémorisé au lancement pour que la liste des vidéos ait un titre
   avant même que le serveur ait écrit le script. */
const allerAvecJournal = (route, options = {}) => {
  if (options.nouvelle) {
    const brouillon = lireSujetBrouillon();
    if (brouillon) noter(options.nouvelle, brouillon);
  }
  aller(route, options);
};

function lireSujetBrouillon() {
  try {
    const b = JSON.parse(localStorage.getItem("moneyprinter.brouillon.v1")) || {};
    return (b.sujet || "").trim() || (b.script || "").trim().slice(0, 80);
  } catch {
    return "";
  }
}

function rendre() {
  const route = location.hash || "#/creer";
  const ecran = ECRANS.find((e) => e.route === route) || ECRANS[0];

  if (ecranActuel && typeof ecranActuel.detruire === "function") ecranActuel.detruire();

  titreEcran.textContent = ecran.titre;
  document.title = `${ecran.titre} · Studio Vidéo`;

  vider(contenu);
  ecranActuel = ecran.vue(allerAvecJournal, optionsRoute);
  optionsRoute = {};
  contenu.append(ecranActuel);
  contenu.scrollTo?.({ top: 0 });
  window.scrollTo({ top: 0 });

  for (const bouton of barreOnglets.querySelectorAll(".onglet")) {
    const actif = bouton.dataset.route === ecran.route;
    bouton.classList.toggle("onglet--on", actif);
    bouton.setAttribute("aria-current", actif ? "page" : "false");
  }
}

function construireOnglets() {
  for (const ecran of ECRANS) {
    const bouton = h("a", {
      class: "onglet",
      href: ecran.route,
      dataset: { route: ecran.route },
    }, [
      icone(ecran.icone, 22),
      h("span", { text: ecran.titre }),
    ]);
    barreOnglets.append(bouton);
  }
}

/* La détection passe avant le premier rendu : l'écran Réglages doit pouvoir
   dire d'emblée si l'adresse est déduite ou s'il faut la saisir. */
await api.detecterOrigine();

construireOnglets();
window.addEventListener("hashchange", rendre);
if (!location.hash) location.hash = "#/creer";
rendre();

/* Un serveur injoignable est la panne numéro un : autant le dire une fois, au
   démarrage, plutôt que de laisser chaque bouton échouer séparément. */
if (!api.baseDefinie()) {
  message("Aucun serveur configuré. Ouvre Réglages.", "erreur");
} else if (!api.origineAutoDetectee()) {
  api.ping().catch(() => {
    message("Moteur injoignable. Vérifie l'adresse dans Réglages.", "erreur");
  });
}

/* Service worker : la coquille de l'app reste disponible hors ligne, ce qui
   permet au moins d'ouvrir l'écran Réglages et de comprendre ce qui manque. */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* Contexte non sécurisé (http:// hors localhost) : l'app fonctionne,
         simplement sans installation ni cache hors ligne. */
    });
  });
}
