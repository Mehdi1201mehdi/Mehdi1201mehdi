// @ts-check
/**
 * Interface PWA (mono-utilisateur, hors ligne). Relie l'utilisateur au moteur
 * sportif déterministe. Aucune clé d'API ici ; le coach IA (phase 2) passera
 * par un proxy serveur.
 */
import {
  GOALS, GOAL_LABELS, LEVELS, LEVEL_LABELS, EQUIPMENTS, EQUIPMENT_LABELS,
  MUSCLES, MUSCLE_LABELS, MOVEMENT_PATTERNS,
} from "../models.js";
import { getExercise, chercherCatalogue, CATALOGUE, catalogueEtenduCharge, chargerCatalogueEtendu, idsReferencesInconnus, enregistrerExercicesPerso } from "../data/exercises.js";
import { MACHINES, MACHINES_PAR_ID, GROUPES_EQUIPEMENT, machinesDe, exercicesDeMachine, estMachineReglable } from "../data/machines.js";
import { mouvementsDe, LIB_MOUVEMENT, MOUVEMENTS, typeCharge, reperesDe } from "../engine/taxonomie.js";
import { validerExercice, LIB_STATUT, nomAnglais } from "../engine/validationExo.js";
import { GIFS } from "../data/gifs.js";
import { ANATOLY_INFO, ANATOLY_SEMAINES } from "../data/anatoly.js";
import { genererProgramme } from "../engine/generator.js";
import { recommander } from "../engine/progression.js";
import { alternatives, variantes } from "../engine/replacement.js";
import { chercherDemonstration, lienYouTube } from "../integrations/exercisedb.js";
import { muscleDiagram, muscleHeatmap, miniSilhouette, spriteAnatomie } from "./anatomy.js";
import { jouer, amorcerSon } from "./son.js";
import { memoriserFlip, rejouerFlip, oublierFlip } from "./flip.js";
import { dessinerCorps } from "./anatomieCanvas.js";
import { illustration } from "./illustrations.js";
import { medaille } from "./medailles.js";
import { trophees, serieSemainesEnCours } from "../engine/trophees.js";
import { rangForce, NIVEAUX, STANDARDS, LIMITES as LIM_RANG, validerSeuils, standardsEffectifs, AVERTISSEMENT as AVERT_RANG } from "../engine/rang.js";
import { calculerBesoins } from "../engine/nutrition.js";
import { bilan } from "../engine/review.js";
import { chercherFoods, portion } from "../data/foods.js";
import { rechercher as offRechercher, parCodeBarres } from "../integrations/openfoodfacts.js";
import { scannerDisponible, demarrerScan, normaliserCode } from "./scanner.js";
import { vueDico } from "./dico.js";
import { estImperial, uniteCharge, versAffichage, depuisSaisie, texteCharge, texteVolume,
  uniteLongueur, longueurAffichage, longueurDepuisSaisie } from "../engine/unites.js";
import { CHAMPS_MESURES, CHAMPS_SAISIE, GROUPES_MESURES, champMesure, construireReleve, etatAu,
  joursDeMesure, comparerMesures, asymetries, jourLocal } from "../engine/corps.js";
import { estNatif, partagerFichier, notifsNativesDispo, autoriserNotifs, programmerFinRepos, annulerFinRepos } from "./natif.js";
import { bilanSemaine, formatDuree, MET_MUSCULATION } from "../engine/activite.js";
import { caloriesLog } from "../engine/calories.js";
import * as SanteConnect from "../integrations/santeConnect.js";
import { PRESETS_INTERVALLES, normaliserIntervalle, etatIntervalle, dureeTotaleIntervalle } from "../engine/intervalles.js";
import { catalogueCompact, extraireProposition, routineDepuisProposition, htmlLeger, demandeDePlan, differenceRoutines } from "../engine/coachRoutine.js";
import { $, esc, h } from "./dom.js";
import { urlDemo, vignetteExo, vignetteHTML, REDUIRE_MOTION } from "./vignettes.js";
import { anneauSVG, anneauSignature, svgLine, categorieIMC, gaugeIMC, svgBars, sparkAire } from "./graphes.js";
import { IDENTITE, titreComplet } from "../config/identite.js";
import { dire, couperVoix, voixDisponible, phraseSerie, phraseRepos, phraseDecompte, phraseReprise, phraseFin, VOIX_DEFAUT } from "./voix.js";
import { chargementMedia } from "../data/media-manifest.js";
import { IC, mi, IC_MATOS, iconeMateriel, goalIcons, LEVEL_ICONS } from "./icones.js";
import { comparerSeance, phraseBilan } from "../engine/bilanSeance.js";
import { ficheMuscle, moyenneHebdo, tendance } from "../engine/muscle.js";
import { equilibre, resumeEquilibre } from "../engine/equilibre.js";
import { etatNotifs, demanderNotifs, notifier, fermerNotifs } from "./notifs.js";
import { POSES, nouvellePhoto, trierPhotos, paireComparaison, poidsProche, resumeStockage,
  formaterOctets, incoherences } from "../engine/photos.js";
import { reduire, choisirImage, urlObjet } from "./photoCapture.js";
import { photoSet, photoGet, photoDel, photoCles } from "../store/db.js";
import { Etat, seanceDuJour, planningJours } from "../store/state.js";
import {
  nouvelleSession, nouvelleSerie, seriePrecedente, ajouterSerie, retirerDerniereSerie,
  serialiser, restaurer, estReprenable, dureeSecondes,
  reconcilier, TYPES_SERIE, GROUPES_SUPERSET, cyclerType, valeurSerie, completerSerie,
  exercicesDuSuperset, groupeSupersetLibre, reposApresSerie, estEnCours,
  serieAEnregistrer, serieLogDepuisLive,
} from "../engine/liveSession.js";
import {
  mesuresExercice, modeSaisie, meilleuresPerfs, detecterRecordsMesures, texteSerieLog,
  texteDistance, texteVitesse, texteAllure, texteDuree, totauxDistance, lireDistanceKm,
  lireDureeMinutes, kmSaisie, minutesSaisie,
} from "../engine/mesures.js";
import {
  creerRoutine, renommer, ajouterSeance, supprimerSeance, ajouterExercice,
  supprimerExerciceIndex, deplacerExercice, definirSeries, dupliquerRoutine,
  seanceDepuisLog, estimerDureeSeance,
} from "../engine/routines.js";
import { FORMULE_1RM, classementRecords, detecterRecords, e1rmFiable, recordsRecents, recordEnDirect } from "../engine/records.js";
import { construireExport, validerImport, appliquerImport, nomFichierBackup } from "../engine/backup.js";
import { disquesParCote, echauffement, rampeEchauffement } from "../engine/powerlifting.js";
import {
  estimer1RMComplet, pctPourReps, chargesParZone, tableComplete,
  chargePourRPE, pctPourRPE, meilleuresSeries, equilibreForce,
} from "../engine/force.js";
import {
  volumeLog, volumeTotal, volumeParSemaine, dureeMoyenneMin, volumeParMuscle, recuperationParMuscle, statsSemaine,
  METRIQUES_EXO, serieExercice, serieCorps, filtrerDepuis, metriquesPour, seriesParMuscle,
} from "../engine/stats.js";
import { chargeParPeriode, progressionMensuelle, DEFINITIONS_CHARGE, variationPct, comparaisonMemeStade,
  effortMoyen, seriesDe, plateaux } from "../engine/analyse.js";

/** Nom lisible d'un exercice (pour records/stats). */
const nomExo = (id) => (getExercise(id) ? getExercise(id).nom : id);
/* ---------- unités de poids ----------
   Tout est STOCKÉ en kg ; ces aides ne servent qu'à l'affichage et à la saisie.
   En kg, elles rendent exactement ce que l'application affichait déjà. */
const uImp = () => estImperial(Etat.data.reglages);
const uUnite = () => uniteCharge(uImp());
const uAff = (kg) => versAffichage(kg, uImp());
// Virgule décimale française partout à l'écran (« 62,5 kg », pas « 62.5 kg »),
// au dixième près : un 1RM estimé n'a pas de sens au centième.
const uCharge = (kg, o) => texteCharge(kg == null || kg === "" ? kg : Math.round(Number(kg) * 10) / 10, uImp(), { fr: true, ...o });
const uVolume = (kg, o) => texteVolume(kg, uImp(), o);
/** Dépense estimée d'une séance enregistrée (calories.js : MET par exercice). */
const kcalLog = (log) => caloriesLog(log, (Etat.data.profil || {}).poidsKg, getExercise).total;
/** Unité de la séance en cours : figée au démarrage, pour que changer le réglage
 *  en pleine séance ne mélange pas kg et lb dans les champs déjà saisis. */
const uLive = () => !!(LIVE && LIVE.unite === "lb");
const uAffLive = (kg) => versAffichage(kg, uLive());
/** Libellé court du niveau (évite la troncature dans les tuiles stat étroites). */
const NIVEAU_COURT = { debutant: "Débutant", intermediaire: "Inter.", avance: "Avancé" };
const niveauCourt = (niv) => NIVEAU_COURT[niv] || LEVEL_LABELS[niv] || niv;
/** Libellés de muscle pour les vignettes étroites (« Ischio-jambiers » y était tronqué). */
const MUSCLE_COURT = { ischios: "Ischios" };
const muscleCourt = (m) => MUSCLE_COURT[m] || MUSCLE_LABELS[m] || m;

/** Toutes les séances jouables : programme généré + routines perso. */
function toutesSeances() {
  const out = [];
  // Séance générée par le moteur automatique : présente pour que la reprise
  // après fermeture et l'enregistrement fonctionnent comme pour les autres.
  if (Etat.data.seanceAuto) out.push({ seance: Etat.data.seanceAuto, source: { nom: "Automatique" } });
  if (Etat.data.programme) for (const s of Etat.data.programme.seances) out.push({ seance: s, source: Etat.data.programme });
  for (const r of Etat.data.programmesPerso || []) for (const s of r.seances) out.push({ seance: s, source: r });
  return out;
}
/** Résout une séance (et sa routine/programme parent) par id, toutes sources. */
function trouverSeance(seanceId) {
  const f = toutesSeances().find((x) => x.seance.id === seanceId);
  return f ? f.seance : null;
}
function trouverParentSeance(seanceId) {
  const f = toutesSeances().find((x) => x.seance.id === seanceId);
  return f ? f.source : null;
}
import { seancesVersCSV, metriquesVersCSV, nomFichierExport } from "../engine/export.js";
import { echauffementPour, ETIREMENTS, dureeSequence } from "../data/mobilite.js";
import { serieActuelle, meilleureSerie, grilleJours, defis } from "../engine/defis.js";
import { detecterIntention, trouverExoParNom } from "../engine/assistant.js";
import {
  fcMaxTheorique, tableZonesCardio, MORPHOTYPES, tableMorphotypes, dureeSeance,
  maxDepuisSerie, grilleMax, composition, adipositeNavy, categorieAdiposite,
  TESTS_VELO, testVeloParCle, comparerTestsVelo,
} from "../engine/outils.js";
import { PROGRAMMES_SALLE } from "../data/programmes-salle.js";
import { DUREES, FREQUENCES, MATERIELS, filtrerProgrammes, nbCriteresActifs, TRIS, basculerFavori, ajouterRecent, ordonner, resoudreIds, compterUsage } from "../engine/bibliotheque.js";
import { CLES_MOTEUR, LABELS_MOTEUR, DEF_MOTEUR, FIN_VERS_CATALOGUE } from "../data/muscles-moteur.js";
import { coefficientsPour } from "../data/exercise-muscle-map.js";
import { etatMusculaire, zoneDisponibilite, cibleVolumeHebdo, analyserSeance, readinessGroupe, saturation, combinerFatigue } from "../engine/fatigue.js";
import { genererProchaineSeance, resumeCorps, compatibiliteExercice, PLAN_PARAMS } from "../engine/planner.js";
import { expliquerApprentissage, PARAMS_APPRENTISSAGE } from "../engine/apprentissage.js";
import { creerRepos, restantSec, estEcoule, progression, ajusterRepos, restaurerRepos, formatRestant, retardSec, formatRetard, RETARD_SIGNIFICATIF_SEC, decisionReprise, gelerRepos, degelerRepos, reposEffectif, REPOS_CHOIX } from "../engine/repos.js";
import { grilleMois, moisAdjacent, NOMS_JOURS_COURTS } from "../engine/calendar.js";

const todayStr = () => new Date().toISOString().slice(0, 10);

/* ---------- petits utilitaires DOM ----------
   `$` et `h` renvoient volontairement `any` : ce sont trois lignes de plomberie
   DOM dont le résultat est aussitôt utilisé comme `<input>`, `<video>`, élément
   porteur de propriétés maison… Les typer en `Element` obligerait à un cast à
   chaque appel — du bruit sans bénéfice à l'exécution. La vérification de types
   qui compte vit dans `src/engine/*` et `src/data/*`, qui sont purs et typés. */
const view = $("#view");
/**
 * Branche un écouteur sur tous les descendants correspondant au sélecteur.
 * @param {ParentNode} root
 * @param {string} sel
 * @param {string} ev
 * @param {(e:any)=>void} fn
 */
function on(root, sel, ev, fn) { root.querySelectorAll(sel).forEach((n) => n.addEventListener(ev, fn)); }

/* ---------- thème ---------- */
function appliquerTheme() {
  const t = Etat.data.reglages.theme;
  if (t === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
}
// Bouton flottant de l'assistant : une seule liaison, au chargement. Sa
// visibilité, elle, est recalculée à chaque changement d'onglet dans majTabs().
$("#fabCoach")?.addEventListener("click", () => ouvrirCoach());

$("#themeBtn").addEventListener("click", () => {
  // Quatre thèmes depuis l'ajout de « Nuit » : le bouton d'en-tête les fait
  // tourner dans l'ordre, le réglage du Profil permet de choisir directement.
  const ordre = ["auto", "light", "dark", "nuit"];
  const cur = Etat.data.reglages.theme;
  Etat.data.reglages.theme = ordre[(ordre.indexOf(cur) + 1) % ordre.length];
  Etat.sauver(); appliquerTheme();
});

/* ---------- navigation ---------- */
let TAB = "dash";
const TABS = { dash: vDash, prog: vProg, cat: vCatalogue, recup: vRecup, train: vTrain, food: vNutrition, stats: vStats, set: vSet, anatoly: vAnatoly, dico: vDico };
// Sous-écrans hors barre. Depuis le passage aux 5 onglets de FitAI
// (Routines · Exercices · Séance · Récupération · Compte), « Progrès » et la
// séance active ne sont plus dans la barre : ils restent atteignables, l'un
// depuis le Compte (comme la carte « Stats » de FitAI), l'autre au démarrage
// d'une séance. Aucune vue n'a été supprimée.
const TABS_PLUS = ["food", "anatoly", "recup", "train", "dico"];
// Barre du bas (nov. 2026, validée par Mehdi) :
// Accueil · Entraînement · Exercices · Progrès · Profil.
// Un sous-écran allume l'onglet dont il dépend : on sait toujours où l'on est,
// et un tap sur cet onglet ramène à son écran principal.
const ONGLET_PARENT = { train: "prog", anatoly: "prog", recup: "stats", food: "set", dico: "set" };
/** Titre affiché dans l'en-tête compact des écrans autres que l'Accueil. */
const TITRES_ECRAN = { prog: "Entraînement", train: "Séance", stats: "Progrès", food: "Nutrition", cat: "Exercices", anatoly: "Anatoly", set: "Profil", dico: "Dictionnaire", recup: "Récupération" };
/**
 * En-tête : la marque, et rien d'autre.
 *
 * Le titre reprenait le nom de l'écran courant (« Profil », « Catalogue »…).
 * C'était une redondance : la barre d'onglets du bas dit déjà où l'on est, et
 * elle le dit en permanence. FitAI n'affiche jamais que son nom, sur les cinq
 * onglets. Un en-tête qui ne bouge pas donne un point fixe à l'application.
 *
 * `TITRES_ECRAN` reste utilisé ailleurs (titre du document, accessibilité) :
 * seul l'affichage dans la barre du haut change.
 */
function majHeader() {
  const brand = $("#brand"), titre = $("#hdTitle");
  if (!brand || !titre) return;
  brand.classList.toggle("compact", TAB !== "dash");
  titre.textContent = IDENTITE.nom;
}
function majTabs() {
  $("#tabs").querySelectorAll("button[data-tab]").forEach((b) => {
    const on = b.dataset.tab === (ONGLET_PARENT[TAB] || TAB);
    b.classList.toggle("on", on);
    if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); // lecteurs d'écran : onglet actif
  });
  placerPilule();
  // Le bouton flottant suit les écrans de consultation. Il disparaît pendant
  // une séance : là, le pouce ne doit rencontrer que « Enregistrer la série ».
  const fab = $("#fabCoach");
  if (fab) fab.hidden = !Etat.data.profil || TAB === "train";
  const plus = $("#plusBtn");
  if (plus) {
    const on = TABS_PLUS.includes(TAB);
    plus.classList.toggle("on", on);
    if (on) plus.setAttribute("aria-current", "page"); else plus.removeAttribute("aria-current");
  }
}
/**
 * Place la pilule de la barre d'onglets sous l'onglet actif.
 *
 * Elle est positionnée en `transform` : elle GLISSE d'un onglet à l'autre au
 * lieu de clignoter, et le déplacement ne provoque aucun recalcul de mise en
 * page. Purement décorative — l'état réel reste porté par `aria-current` et par
 * la couleur du libellé, donc rien ne dépend d'elle.
 */
function placerPilule() {
  const pil = $("#tabPill"), nav2 = $("#tabs");
  if (!pil || !nav2 || nav2.hidden) return;
  const actif = nav2.querySelector("button[data-tab].on");
  // La pastille n'entoure que l'ICÔNE (comme FitAI), pas tout le bouton : on se
  // cale donc sur le .tb-i, dont la position est relative au bouton, lui-même
  // positionné dans .wrap — d'où l'addition des deux décalages.
  const ico = actif && actif.querySelector(".tb-i");
  if (!actif || !ico) { pil.classList.remove("pret"); return; }
  const w = ico.offsetWidth;
  if (!w) return;   // barre pas encore mesurable (onglets masqués au démarrage)
  pil.style.width = w + "px";
  pil.style.transform = `translate3d(${actif.offsetLeft + ico.offsetLeft}px,0,0)`;
  pil.classList.add("pret");
}
// La largeur des onglets suit celle de l'écran : la pilule doit suivre aussi.
addEventListener("resize", placerPilule);

/** Menu « Plus » : Nutrition, Programme Anatoly, Profil (garde toutes les fonctions). */
function ouvrirPlus() {
  const items = [
    { tab: "food", icone: IC.apple, tint: "mi-green", label: "Nutrition", desc: "Calories, macros, hydratation" },
    { tab: "anatoly", icone: IC.dumbbell, tint: "mi-blue", label: "Programme Anatoly", desc: "Powerbuilding · 8 semaines" },
    { tab: "cat", icone: IC.search, tint: "mi-indigo", label: "Catalogue d'exercices", desc: "Rechercher et filtrer" },
    { tab: "dico", icone: IC.livre, tint: "mi-blue", label: "Dictionnaire fitness", desc: "Termes, techniques, nutrition" },
    { tab: "set", icone: IC.user, tint: "mi-orange", label: "Profil & réglages", desc: "Compte, thème, sauvegarde" },
  ];
  const sheet = h(`<div class="sheet plusmenu"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  const fermer = () => sheet.remove();
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0">Plus</h2><button class="chip" id="x">✕ Fermer</button></div>`));
  items.forEach((it) => {
    const b = h(`<button class="card plusitem"><span class="pm-ic ${it.tint}" aria-hidden="true">${it.icone}</span><span class="pm-main"><b>${esc(it.label)}</b><span class="muted small">${esc(it.desc)}</span></span><span class="chev" aria-hidden="true">›</span></button>`);
    b.addEventListener("click", () => { sheet.remove(); nav(it.tab); });
    inner.append(b);
  });
  sheet.querySelector("#x").addEventListener("click", fermer);
  sheet.addEventListener("click", (e) => { if (e.target === sheet) fermer(); });
  document.body.append(sheet);
}
/** Change d'onglet + entrée d'historique (le bouton retour renavigue). */
function nav(t, remplace = false) {
  if (t !== "train") { arreterChrono(); APERCU = null; }
  TAB = t;
  majTabs();
  majHeader();
  // PAS de `startViewTransition` ici. Mesuré sur processeur bridé ×4 : elle
  // ajoutait 136 ms à CHAQUE changement d'onglet — plus que tous les autres
  // effets visuels réunis. Le navigateur doit photographier l'ancien écran ET
  // le nouveau avant d'animer, et sur un téléphone d'entrée de gamme ce délai
  // se sent : l'onglet ne répond pas tout de suite. L'entrée en cascade donne
  // déjà la sensation de changement d'écran, pour un tiers du prix.
  render(); window.scrollTo(0, 0);
  const etat = { tab: t };
  if (remplace) history.replaceState(etat, ""); else history.pushState(etat, "");
}

$("#tabs").querySelectorAll("button[data-tab]").forEach((b) => b.addEventListener("click", () => { if (b.dataset.tab !== TAB) { try { navigator.vibrate?.(12); } catch (e) {} } nav(b.dataset.tab); }));
$("#plusBtn")?.addEventListener("click", ouvrirPlus);
let LAST_RENDER_KEY = null;
function render() {
  // La caméra du scanner survit à la suppression de son élément vidéo : sans
  // cette coupure, changer d'onglet laisse la diode allumée et vide la batterie.
  arreterScan();
  libererPhotos();
  view.innerHTML = "";
  // L'écran courant est annoncé au CSS : la mise en page large (≥ 1024 px)
  // répartit certains écrans sur deux colonnes.
  view.dataset.ecran = Etat.data.profil ? TAB : "accueil-initial";
  (Etat.data.profil ? TABS[TAB] : vOnboarding)(view);
  // Sous-écran hors barre : un retour visible vers l'onglet dont il dépend
  // (le bouton retour d'Android marche aussi, mais il ne se voit pas).
  const parent = Etat.data.profil && TAB !== "train" ? ONGLET_PARENT[TAB] : null;
  if (parent) {
    const br = h(`<button class="chip retour-onglet" type="button"><span class="cic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg></span>${esc(TITRES_ECRAN[parent] || "Retour")}</button>`);
    br.addEventListener("click", () => nav(parent));
    view.prepend(br);
  }
  // Motion : ne rejouer l'entrée en cascade que lorsque la VUE change vraiment
  // (onglet, ouverture d'un aperçu, démarrage d'une séance, onboarding). Les
  // simples mises à jour dans le même écran (+1 verre d'eau, bascule RIR, mois
  // du calendrier…) ne ré-animent pas toute la page : impression de fluidité et
  // moins de repaints inutiles.
  const key = Etat.data.profil ? `${TAB}|${APERCU || ""}|${LIVE ? LIVE.seanceId : ""}` : "onb";
  if (key !== LAST_RENDER_KEY) {
    LAST_RENDER_KEY = key;
    view.classList.remove("reveal"); void view.offsetWidth; view.classList.add("reveal");
    setTimeout(() => view.classList.remove("reveal"), 950);
    animerStats(view); // compteurs qui montent (grands chiffres), au vrai changement de vue
    // Éléments partagés : ceux qui existaient déjà rejoignent leur nouvelle
    // place au lieu d'apparaître au milieu de la cascade.
    rejouerFlip(view);
  }
}
/** Anime les grands chiffres entiers (stats/KPI) de 0 → valeur à l'ouverture d'un
 *  écran. Ne touche qu'aux entiers purs (avec séparateurs) ; restaure le format
 *  exact d'origine à la fin. Désactivé si l'utilisateur réduit les animations. */
function animerStats(root) {
  try { if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return; } catch (e) { return; }
  root.querySelectorAll(".stat b.num, .kpi b.num").forEach((el) => {
    const raw = el.textContent.trim();
    if (!/^[\d\s ]+$/.test(raw)) return;                 // entier pur uniquement
    const cible = parseInt(raw.replace(/\D/g, ""), 10);
    if (!Number.isFinite(cible) || cible <= 0 || cible > 1e7) return;
    const dur = 650, t0 = performance.now();
    el.textContent = "0";
    const pas = (t) => {
      if (!el.isConnected) return;
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = Math.round(cible * e).toLocaleString("fr-FR");
      if (p < 1) requestAnimationFrame(pas); else el.textContent = raw; // restaure le format exact
    };
    requestAnimationFrame(pas);
  });
}

/* ======================================================================
   RETOURS TACTILES — l'app doit répondre AVANT que le traitement commence
   ====================================================================== */

/** Le mouvement est-il autorisé ? (une seule lecture, réutilisée partout) */
function motionOk() {
  try { return !matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
}

/**
 * Onde émise depuis le point touché, sur les actions primaires.
 *
 * En salle on valide une série sans regarder l'écran : l'onde part du doigt,
 * donc elle confirme que c'est bien LÀ qu'on a appuyé, pas seulement que
 * quelque chose s'est passé. Posée en capture pour fonctionner aussi sur les
 * boutons créés après coup, et retirée à la fin de sa propre animation.
 */
// Le moteur audio ne peut naître QUE dans un geste utilisateur : on l'amorce au
// tout premier appui, une fois pour toutes. Sans cela le premier son d'une
// séance serait avalé par la politique de lecture automatique du navigateur.
addEventListener("pointerdown", amorcerSon, { once: true, capture: true });

document.addEventListener("pointerdown", (ev) => {
  if (!motionOk()) return;
  const cible = ev.target instanceof Element
    ? ev.target.closest("button.primary, button.big, .wcard") : null;
  // `.wcard` peut être une carte non désactivable : on ne teste `disabled` que
  // sur ce qui en porte un.
  if (!cible || (cible instanceof HTMLButtonElement && cible.disabled)) return;
  const r = cible.getBoundingClientRect();
  const taille = Math.max(r.width, r.height) * 2;
  const o = document.createElement("span");
  o.className = "onde";
  o.style.cssText = `left:${ev.clientX - r.left}px;top:${ev.clientY - r.top}px;width:${taille}px;height:${taille}px`;
  o.addEventListener("animationend", () => o.remove());
  cible.appendChild(o);
}, true);

/**
 * Halo qui suit le doigt (ou le curseur) sur les cartes.
 *
 * La carte cesse d'être un rectangle plat : elle réagit à la lumière qu'on lui
 * apporte. Deux variables CSS mises à jour, aucune classe recalculée, aucun
 * reflow — le navigateur ne repeint qu'un dégradé déjà composé.
 */
function suivreLueur(ev) {
  if (!motionOk()) return;
  const c = ev.target instanceof Element ? ev.target.closest(".card:not(.flat)") : null;
  if (!c) return;
  const r = c.getBoundingClientRect();
  c.style.setProperty("--mx", `${((ev.clientX - r.left) / r.width) * 100}%`);
  c.style.setProperty("--my", `${((ev.clientY - r.top) / r.height) * 100}%`);
  c.classList.add("lueur");
}
document.addEventListener("pointermove", suivreLueur, { passive: true, capture: true });
document.addEventListener("pointerdown", suivreLueur, { passive: true, capture: true });
document.addEventListener("pointerleave", (ev) => {
  const c = ev.target instanceof Element ? ev.target.closest(".card") : null;
  if (c) c.classList.remove("lueur");
}, true);

/* ---------- bouton retour (feuilles modales + onglets) ---------- */
window.addEventListener("popstate", (e) => {
  // 1) Une feuille est ouverte → le retour la ferme (et ré-affirme l'onglet
  //    courant pour ne pas naviguer en même temps).
  const sh = $(".sheet");
  if (sh) {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    if (typeof sh.__resolve === "function") sh.__resolve(sh.__cancel); // dialogue → renvoie l'annulation
    else sh.remove();
    history.pushState({ tab: TAB }, "");
    return;
  }
  // 2) Sinon, retour = changement d'onglet.
  if (Etat.data.profil) { TAB = (e.state && e.state.tab) || "dash"; majTabs(); majHeader(); render(); window.scrollTo(0, 0); }
});

/* ---------- dialogues internes (remplacent prompt / alert / confirm) ---------- */
/**
 * Ouvre une petite feuille modale et résout avec la valeur de l'action choisie.
 * Le bouton retour / un tap sur le fond renvoie `cancelVal`.
 * @param {{titre?:string, message?:string, actions:{label:string,valeur:any,primary?:boolean,danger?:boolean}[], cancelVal?:any, onMount?:(inner:HTMLElement, close:(v:any)=>void)=>void}} opts
 */
function dialogue(opts) {
  return new Promise((resolve) => {
    const sheet = h(`<div class="sheet dlg"><div class="inner"></div></div>`);
    const inner = sheet.querySelector(".inner");
    if (opts.titre) inner.append(h(`<h2 style="margin:0 0 6px">${esc(opts.titre)}</h2>`));
    if (opts.message) inner.append(h(`<div class="small muted" style="margin-bottom:10px">${esc(opts.message)}</div>`));
    const close = (v) => { if (sheet.__done) return; sheet.__done = true; sheet.remove(); resolve(typeof v === "function" ? v() : v); };
    sheet.__resolve = close;
    sheet.__cancel = "cancelVal" in opts ? opts.cancelVal : null;
    const row = h(`<div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"></div>`);
    for (const a of opts.actions) {
      const b = h(`<button class="${a.primary ? "primary" : ""} ${a.danger ? "danger" : ""}">${esc(a.label)}</button>`);
      b.addEventListener("click", () => close(a.valeur));
      row.append(b);
    }
    inner.append(row);
    sheet.addEventListener("click", (e) => { if (e.target === sheet) close(sheet.__cancel); });
    document.body.append(sheet);
    if (opts.onMount) opts.onMount(inner, close);
    else row.querySelector("button:last-child")?.focus();
  });
}

/** Demande une valeur texte (remplace prompt). Résout la chaîne, ou null si annulé. */
function demanderTexte(titre, valeurDefaut = "", opts = {}) {
  let input;
  return dialogue({
    titre,
    cancelVal: null,
    actions: [{ label: "Annuler", valeur: null }, { label: opts.ok || "Valider", primary: true, valeur: () => input.value }],
    onMount: (inner, close) => {
      input = h(`<input type="${opts.type || "text"}" ${opts.inputmode ? `inputmode="${opts.inputmode}"` : ""} placeholder="${esc(opts.placeholder || "")}" style="width:100%" />`);
      input.value = valeurDefaut == null ? "" : String(valeurDefaut);
      inner.insertBefore(input, inner.querySelector(".row"));
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); close(input.value); } });
      setTimeout(() => { input.focus(); input.select?.(); }, 0);
    },
  });
}

/** Confirmation (remplace confirm). Résout true/false. */
function confirmer(message, { titre = "Confirmer", ok = "Confirmer", annuler = "Annuler", danger = false } = {}) {
  // `annuler` est personnalisable : devant un choix, « Annuler » ne dit pas ce
  // qui se passe si on l'appuie. « Reprendre la séance » si.
  return dialogue({
    titre, message, cancelVal: false,
    actions: [{ label: annuler, valeur: false }, { label: ok, valeur: true, primary: !danger, danger }],
  });
}

/** Message d'information (remplace alert). */
function info(message, { titre = "" } = {}) {
  return dialogue({ titre, message, cancelVal: true, actions: [{ label: "OK", valeur: true, primary: true }] });
}

/** Notification non bloquante (records, confirmations). */
function toast(message, ms = 3200) {
  const t = h(`<div class="toast" role="status">${esc(message)}</div>`);
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, ms);
}

/* ======================================================================
   ONBOARDING (assistant étape par étape, avec explications)
   ====================================================================== */
let DRAFT = null;
let STEP = 0;

function draftInit() {
  DRAFT = {
    prenom: "", age: 35, sexe: "H", tailleCm: 175, poidsKg: 80, masseGrassePct: null,
    objectif: "recomposition", objectifsSecondaires: [], niveau: "debutant",
    joursParSemaine: 3, dureeSeanceMin: 45, lieu: "maison",
    equipements: ["poids_du_corps"], musclesPrioritaires: [], exercicesAimes: [], exercicesRefuses: [],
    limitations: [], prefCardio: false, unites: "metrique",
    recuperation: 3, sommeilH: 7, stress: 3,
  };
}

const STEPS = [
  { t: "Bienvenue", pourquoi: "Ton prénom personnalise l'app. L'âge et la taille servent à des repères, jamais à un diagnostic.", champ: renderStepIdentite },
  { t: "Ton objectif", pourquoi: "L'objectif détermine le nombre de séries, de répétitions et les temps de repos.", champ: renderStepObjectif },
  { t: "Ton niveau", pourquoi: "Le niveau filtre les exercices trop techniques et ajuste le volume.", champ: renderStepNiveau },
  { t: "Ta disponibilité", pourquoi: "Le nombre de jours choisit le découpage (corps entier, haut/bas…), la durée limite le nombre d'exercices.", champ: renderStepDispo },
  { t: "Ton matériel", pourquoi: "On ne te proposera que des exercices réalisables avec ce que tu as.", champ: renderStepMateriel },
];
// Cinq étapes, pas plus : l'objectif est de commencer à s'entraîner vite.
// Les préférences fines (muscles prioritaires, limitations, récupération) ont
// des valeurs par défaut prudentes et se règlent ensuite dans Profil →
// « Affiner mon entraînement ». Aucune donnée n'est perdue, elle est
// simplement demandée au bon moment.

function vOnboarding(v) {
  if (!DRAFT) draftInit();
  $("#tabs").hidden = true;
  const s = STEPS[STEP];
  const wrap = h(`<div class="stack"></div>`);
  wrap.append(
    h(`<div class="wiz-dots">${STEPS.map((_, i) => `<i class="${i <= STEP ? "on" : ""}"></i>`).join("")}</div>`),
    h(`<div class="eyebrow">Étape ${STEP + 1} / ${STEPS.length}</div>`),
    h(`<h1>${esc(s.t)}</h1>`),
    h(`<div class="notice small">${mi(IC.info, "mi-accent")}${esc(s.pourquoi)}</div>`),
  );
  const body = h(`<div class="card"></div>`);
  s.champ(body);
  wrap.append(body);
  const nav2 = h(`<div class="row" style="margin-top:8px">
     ${STEP > 0 ? `<button class="ghost" id="prev">Précédent</button>` : ""}
     <button class="primary" id="next" style="flex:1">${STEP === STEPS.length - 1 ? "Générer mon programme" : "Suivant"}</button>
   </div>`);
  wrap.append(nav2);
  v.append(wrap);
  $("#prev", v)?.addEventListener("click", () => { STEP--; render(); });
  $("#next", v).addEventListener("click", () => {
    if (STEP < STEPS.length - 1) { STEP++; render(); }
    else finaliserOnboarding();
  });
}

function chips(container, options, getSel, toggle) {
  const box = h(`<div class="row"></div>`);
  for (const [val, lab] of options) {
    const b = h(`<button class="chip ${getSel(val) ? "on" : ""}">${esc(lab)}</button>`);
    b.addEventListener("click", () => { toggle(val); render(); });
    box.append(b);
  }
  container.append(box);
}




/** Choix sous forme de cartes à icône (grille 2 colonnes) — onboarding premium. */
function cardsChoix(container, options, getSel, toggle, icons = {}) {
  const box = h(`<div class="optgrid"></div>`);
  for (const [val, lab] of options) {
    const b = h(`<button class="optcard${getSel(val) ? " on" : ""}"><span class="opt-ic" aria-hidden="true">${icons[val] || "•"}</span><span class="opt-lab">${esc(lab)}</span></button>`);
    b.addEventListener("click", () => { toggle(val); render(); });
    box.append(b);
  }
  container.append(box);
}
function field(container, label, inputEl, hint) {
  const l = h(`<label class="f"><span>${esc(label)}</span></label>`);
  l.append(inputEl); if (hint) l.append(h(`<div class="hint">${esc(hint)}</div>`));
  container.append(l);
}

function renderStepIdentite(c) {
  const nom = h(`<input value="${esc(DRAFT.prenom)}" placeholder="Prénom ou pseudo">`);
  nom.addEventListener("input", () => DRAFT.prenom = nom.value);
  field(c, "Prénom / pseudo", nom);
  const g = h(`<div class="grid2"></div>`);
  const age = h(`<input inputmode="numeric" value="${DRAFT.age}">`); age.addEventListener("input", () => DRAFT.age = +age.value || 35);
  const taille = h(`<input inputmode="numeric" value="${DRAFT.tailleCm}">`); taille.addEventListener("input", () => DRAFT.tailleCm = +taille.value || 175);
  const poids = h(`<input inputmode="decimal" value="${DRAFT.poidsKg}">`); poids.addEventListener("input", () => DRAFT.poidsKg = +poids.value || 80);
  [["Âge", age], ["Taille (cm)", taille], ["Poids (kg)", poids]].forEach(([lab, inp]) => { const l = h(`<label class="f"><span>${lab}</span></label>`); l.append(inp); g.append(l); });
  c.append(g);
}
function renderStepObjectif(c) { cardsChoix(c, GOALS.map((g) => [g, GOAL_LABELS[g]]), (v) => DRAFT.objectif === v, (v) => DRAFT.objectif = v, goalIcons()); }
function renderStepNiveau(c) { cardsChoix(c, LEVELS.map((l) => [l, LEVEL_LABELS[l]]), (v) => DRAFT.niveau === v, (v) => DRAFT.niveau = v, LEVEL_ICONS); }
function renderStepDispo(c) {
  field(c, "Jours par semaine", chipsInline([1, 2, 3, 4, 5, 6].map((n) => [n, `${n} j`]), (v) => DRAFT.joursParSemaine === v, (v) => DRAFT.joursParSemaine = v), "Pour une reprise, 3 jours est idéal.");
  field(c, "Répartition", chipsInline([["auto", "Auto"], ["full_body", "Corps entier"], ["haut_bas", "Haut / Bas"], ["push_pull_legs", "Poussée · Tirage · Jambes"], ["bro_split", "Par groupe"]],
    (v) => (DRAFT.split || "auto") === v, (v) => DRAFT.split = v),
    "Auto choisit selon tes jours par semaine. « Par groupe » : un groupe musculaire par séance (pectoraux, dos, jambes, épaules, bras).");
  field(c, "Durée d'une séance", chipsInline([30, 45, 60, 75].map((n) => [n, `${n} min`]), (v) => DRAFT.dureeSeanceMin === v, (v) => DRAFT.dureeSeanceMin = v));
  field(c, "Lieu", chipsInline([["maison", "Maison"], ["salle", "Salle"], ["exterieur", "Extérieur"]], (v) => DRAFT.lieu === v, (v) => DRAFT.lieu = v));
}
function chipsInline(options, getSel, toggle) {
  const box = h(`<div class="row"></div>`);
  for (const [val, lab] of options) { const b = h(`<button class="chip ${getSel(val) ? "on" : ""}">${esc(lab)}</button>`); b.addEventListener("click", () => { toggle(val); render(); }); box.append(b); }
  return box;
}
function renderStepMateriel(c) {
  c.append(h(`<div class="hint" style="margin-bottom:6px">Sélectionne tout ce dont tu disposes (le poids du corps est toujours inclus).</div>`));
  chips(c, EQUIPMENTS.map((e) => [e, EQUIPMENT_LABELS[e]]),
    (v) => DRAFT.equipements.includes(v),
    (v) => { if (v === "poids_du_corps") return; DRAFT.equipements = DRAFT.equipements.includes(v) ? DRAFT.equipements.filter((x) => x !== v) : [...DRAFT.equipements, v]; });
}
function renderStepPrefs(c) {
  c.append(h(`<div class="eyebrow">Muscles prioritaires (optionnel)</div>`));
  chips(c, MUSCLES.filter((m) => m !== "corps_entier").map((m) => [m, MUSCLE_LABELS[m]]),
    (v) => DRAFT.musclesPrioritaires.includes(v),
    (v) => DRAFT.musclesPrioritaires = DRAFT.musclesPrioritaires.includes(v) ? DRAFT.musclesPrioritaires.filter((x) => x !== v) : [...DRAFT.musclesPrioritaires, v]);
  c.append(h(`<div class="eyebrow" style="margin-top:12px">Limitations / douleurs déclarées</div>`));
  const LIMS = [["dos", "Dos"], ["epaule", "Épaule"], ["genou", "Genou"], ["poignet", "Poignet"], ["cheville", "Cheville"], ["coude", "Coude"], ["hanche", "Hanche"]];
  chips(c, LIMS, (v) => DRAFT.limitations.includes(v),
    (v) => DRAFT.limitations = DRAFT.limitations.includes(v) ? DRAFT.limitations.filter((x) => x !== v) : [...DRAFT.limitations, v]);
  c.append(h(`<div class="warn small" style="margin-top:12px">${mi(IC.cross, "mi-amber")}Cette app ne remplace pas un professionnel de santé. En cas de douleur, blessure ou maladie, demande un avis médical avant de continuer.</div>`));
}
function renderStepRecup(c) {
  field(c, "Qualité de récupération", chipsInline([1, 2, 3, 4, 5].map((n) => [n, `${n}`]), (v) => DRAFT.recuperation === v, (v) => DRAFT.recuperation = v), "1 = épuisé en permanence, 5 = toujours frais.");
  const som = h(`<input inputmode="decimal" value="${DRAFT.sommeilH}">`); som.addEventListener("input", () => DRAFT.sommeilH = +som.value || 7);
  field(c, "Sommeil moyen (h)", som);
  field(c, "Niveau de stress", chipsInline([1, 2, 3, 4, 5].map((n) => [n, `${n}`]), (v) => DRAFT.stress === v, (v) => DRAFT.stress = v));
}

function finaliserOnboarding() {
  Etat.data.profil = DRAFT;
  Etat.data.reglages.unites = DRAFT.unites;
  Etat.data.programme = genererProgramme(DRAFT);
  Etat.sauver();
  DRAFT = null; STEP = 0;
  $("#tabs").hidden = false;
  nav("dash");
}

/* ======================================================================
   TABLEAU DE BORD
   ====================================================================== */
/** Série de jours d'entraînement consécutifs (streak), terminant aujourd'hui ou hier. */
function serieJours(logs) {
  const iso = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  const jours = new Set(logs.map((l) => l.date && l.date.slice(0, 10)).filter(Boolean));
  let n = 0; const d = new Date();
  if (!jours.has(iso(d))) d.setDate(d.getDate() - 1);
  while (jours.has(iso(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
/** Bande « Ma semaine » : Lun→Dim avec statut (fait / aujourd'hui / à venir). */
/**
 * Bilan chiffré de la semaine, sous la bande des jours : temps d'entraînement,
 * volume soulevé, dépense estimée — et l'écart avec la semaine précédente, la
 * seule comparaison qui dise si l'on progresse. Tout vient des séances
 * enregistrées ; la dépense est une estimation et l'écran le dit.
 */
function carteBilanSemaine(logs, p) {
  const b = bilanSemaine(logs, p && p.poidsKg, new Date(), (l) => kcalLog(l));
  const c = h(`<button class="card sem-bilan tap" type="button" aria-label="Voir mes progrès"></button>`);
  const col = (val, lab) => `<span class="sb-col"><b class="num">${val}</b><span>${lab}</span></span>`;
  const vol = uVolume(b.volume, { tonnes: true });
  c.append(h(`<span class="sb-grille">
    ${col(b.dureeMin ? formatDuree(b.dureeMin) : "—", "Temps")}
    ${col(b.seances ? vol : "—", "Volume")}
    ${col(b.kcal ? `≈ ${b.kcal.toLocaleString("fr-FR")}` : "—", "kcal estimées")}
  </span>`));
  let ecart;
  if (!b.seances && !b.precedente.seances) ecart = "Enregistre une séance pour voir ta semaine ici.";
  // Semaine pas encore commencée : « −100 % de volume » un mardi matin ne dit
  // rien d'utile et décourage. On rappelle seulement ce qu'il y a à égaler.
  else if (!b.seances) ecart = `Rien cette semaine pour l'instant · ${b.precedente.seances} séance${b.precedente.seances > 1 ? "s" : ""} la semaine dernière.`;
  else if (b.ecartVolumePct == null) ecart = b.seances ? "Première semaine enregistrée : la comparaison arrive la semaine prochaine." : "Rien cette semaine pour l'instant.";
  else {
    const signe = b.ecartVolumePct > 0 ? "+" : "";
    const sc = b.ecartSeances === 0 ? "autant de séances" : `${b.ecartSeances > 0 ? "+" : ""}${b.ecartSeances} séance${Math.abs(b.ecartSeances) > 1 ? "s" : ""}`;
    ecart = `<b class="${b.ecartVolumePct >= 0 ? "sb-up" : "sb-down"}">${signe}${b.ecartVolumePct} %</b> de volume vs semaine dernière · ${sc}`;
  }
  c.append(h(`<span class="sb-ecart small">${ecart}</span>`));
  c.title = `Dépense estimée : MET × poids × durée (Compendium 2024) — cardio au MET de sa vitesse, musculation ${MET_MUSCULATION} MET. Ce n'est pas une mesure.`;
  c.addEventListener("click", () => nav("stats"));
  return c;
}

function semaineStrip(logs) {
  const iso = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  const noms = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const jours = new Set(logs.map((l) => l.date && l.date.slice(0, 10)).filter(Boolean));
  const now = new Date(), isoToday = iso(now);
  const lundi = new Date(now); lundi.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const box = h(`<div class="week"></div>`);
  for (let i = 0; i < 7; i++) {
    const d = new Date(lundi); d.setDate(lundi.getDate() + i);
    const di = iso(d), done = jours.has(di), today = di === isoToday;
    const cls = done ? "wd done" : today ? "wd today" : "wd";
    const inner = done ? "✓" : today ? "•" : "";
    box.append(h(`<div class="wcol"><span class="wl">${noms[i]}</span><span class="${cls}">${inner}</span></div>`));
  }
  return box;
}
/**
 * Carte « Défis & régularité » — série en cours, record, objectifs hebdo/mensuels
 * et grille d'assiduité (28 jours). 100 % dérivé des vraies séances.
 */
function carteDefis(v) {
  const logs = Etat.data.logs || [];
  if (!logs.length) return; // rien à motiver tant qu'aucune séance
  const serie = serieActuelle(logs);
  const record = meilleureSerie(logs);
  const liste = defis(logs, Etat.data.profil || {});
  const grille = grilleJours(logs, 28);

  // Repliée elle aussi : l'écran Progrès était DÉJÀ à 2,5 écrans avant les
  // trophées, donc au maximum autorisé. Le chiffre qui motive — la série en
  // cours — reste visible dans l'en-tête, replié ou non.
  section(v, "p-defis", "Défis & régularité",
    (b2) => remplirDefis(b2, { serie, record, liste, grille }),
    { resume: serie > 0 ? `${serie} j d'affilée` : "à relancer" });
  carteTrophees(v, logs);
}

/** Contenu de la section « Défis & régularité ». */
function remplirDefis(v, { serie, record, liste, grille }) {
  const c = h(`<div class="card stack defis"></div>`);
  // Bandeau série + record
  const top = h(`<div class="defis-top"></div>`);
  top.append(h(`<div class="defis-streak"><span class="ic ic-orange">${IC.flame}</span><div><b class="num">${serie}</b><span>jour${serie > 1 ? "s" : ""} d'affilée</span></div></div>`));
  top.append(h(`<div class="defis-streak"><span class="ic ic-indigo">${IC.trophy}</span><div><b class="num">${record}</b><span>record de série</span></div></div>`));
  c.append(top);
  // Objectifs (barres)
  liste.forEach((d) => {
    const atteint = d.pct >= 1;
    const row = h(`<div class="defi-row"></div>`);
    row.append(h(`<div class="spread small"><span><b>${esc(d.titre)}</b>${atteint ? ` <span class="badge accent">Atteint ✓</span>` : ""}</span><span class="muted">${esc(d.sousTitre)}</span></div>`));
    row.append(h(`<div class="bar"><div style="width:${Math.round(d.pct * 100)}%${atteint ? ";background:var(--ok)" : ""}"></div></div>`));
    c.append(row);
  });
  // Grille d'assiduité (4 semaines)
  const grid = h(`<div class="defi-grid" aria-label="Assiduité des 28 derniers jours"></div>`);
  grille.forEach((g) => grid.append(h(`<span class="defi-cell${g.done ? " on" : ""}${g.today ? " today" : ""}" title="${g.iso}${g.done ? " · entraîné" : ""}"></span>`)));
  c.append(h(`<div class="muted small" style="margin-top:4px">28 derniers jours</div>`));
  c.append(grid);
  v.append(c);
}

/**
 * Carte « Trophées » — les jalons de LONG TERME.
 *
 * Les défis ci-dessus mesurent la semaine et le mois. Ce qui fait progresser en
 * musculation, ce n'est pas la semaine réussie, c'est la centième séance : cette
 * carte est la seule qui récompense la durée.
 *
 * Elle ne montre jamais un mur de trophées verrouillés — c'est décourageant.
 * Pour chaque famille : ce qui est acquis, et LE prochain palier avec sa
 * progression réelle.
 */
function carteTrophees(v, logs) {
  const nbRecords = classementRecords(logs, nomExo, 999).length;
  const t = trophees(logs, nbRecords);

  // Repliée par défaut : les trophées se consultent, ils ne se surveillent pas.
  // Dépliés, ils faisaient passer l'écran Progrès de 2,5 à 3,7 écrans — au-delà
  // de la limite du design system, que le garde-fou a signalée.
  section(v, "p-trophees", "Trophées", (b2) => remplirTrophees(b2, t),
    { resume: `${t.obtenus}/${t.total}` });
}

/** Contenu de la section Trophées (rempli à l'ouverture, pas au rendu). */
function remplirTrophees(v, t) {
  const c = h(`<div class="card stack"></div>`);
  const enTete = h(`<div class="troph-tete"></div>`);
  enTete.append(h(t.dernier
    ? `<span class="troph-vedette">${medaille({ rang: t.dernier.rang, titre: t.dernier.nom, taille: 60 })}</span>`
    : `<span class="troph-vedette">${medaille({ rang: 1, obtenu: false, titre: "Premier trophée à venir", taille: 60 })}</span>`));
  enTete.append(h(`<span class="troph-tete-txt">
    <b>${t.dernier ? esc(t.dernier.nom) : "Aucun trophée pour l'instant"}</b>
    <span class="muted small">${t.dernier ? esc(t.dernier.familleNom) + " · " : ""}${t.obtenus} sur ${t.total} débloqués</span></span>`));
  c.append(enTete);

  t.familles.forEach((f) => {
    const bloc = h(`<div class="troph-fam"></div>`);
    bloc.append(h(`<div class="spread small"><b>${esc(f.nom)}</b>
      <span class="muted">${fr(f.valeur)} ${esc(f.unite)}</span></div>`));
    const rangee = h(`<div class="troph-rangee" role="list"></div>`);
    f.paliers.forEach((p) => {
      const titre = `${p.nom} — ${p.seuil} ${f.unite}${p.obtenu ? " (obtenu)" : ""}`;
      rangee.append(h(`<span class="troph-item" role="listitem" title="${esc(titre)}">
        ${medaille({ rang: p.rang, obtenu: p.obtenu, titre, taille: 44 })}
        <span class="troph-nom">${esc(p.nom)}</span></span>`));
    });
    bloc.append(rangee);
    if (f.prochain) {
      bloc.append(h(`<div class="bar"><div style="width:${Math.round(f.progression * 100)}%"></div></div>`));
      bloc.append(h(`<div class="muted" style="font-size:var(--fs-caption);margin-top:4px">
        Encore ${fr(f.restant)} ${esc(f.unite)} pour « ${esc(f.prochain.nom)} »</div>`));
    } else {
      bloc.append(h(`<div class="badge accent" style="margin-top:6px">Famille complète ✓</div>`));
    }
    c.append(bloc);
  });
  v.append(c);
}



/** Libellés des patrons de mouvement (champ `patron` du catalogue). */
const PATRON_LABELS = {
  squat: "Squat", charniere_hanche: "Charnière de hanche", fente: "Fente",
  isolation_jambe: "Isolation jambe", poussee_horizontale: "Poussée horizontale",
  poussee_verticale: "Poussée verticale", tirage_horizontal: "Tirage horizontal",
  tirage_vertical: "Tirage vertical", flexion_bras: "Flexion des bras",
  extension_bras: "Extension des bras", gainage: "Gainage", cardio: "Cardio",
};
/** Vue anatomique la plus lisible selon le patron. */
const PATRON_VUE = { charniere_hanche: "back", tirage_horizontal: "back", tirage_vertical: "back" };
/**
 * Démonstration animée maison (SVG + CSS, 100 % hors ligne) : silhouette des
 * muscles ciblés + charge qui parcourt l'amplitude du mouvement selon le patron.
 * Déterministe, sans média distant. Repli propre si le patron est inconnu.
 */
function animDemo(exo, opts = {}) {
  const p = (exo && exo.patron) || "";
  const muscles = (exo && exo.musclesPrincipaux) || [];
  const view = PATRON_VUE[p] || "front";
  const tag = PATRON_LABELS[p] || "Mouvement";
  return `<div class="exdemo${opts.grand ? " grand" : ""}" data-p="${esc(p)}" role="img" aria-label="Démonstration animée : ${esc(tag)}">
    <div class="exdemo-fig">${muscles.length ? miniSilhouette(muscles, view) : ""}</div>
    <span class="exdemo-load" aria-hidden="true">${IC.dumbbell}</span>
    <span class="exdemo-tag">${esc(tag)}</span>
  </div>`;
}
function vDash(v) {
  const p = Etat.data.profil, prog = Etat.data.programme;
  const sj = seanceDuJour(prog);
  const logs = Etat.data.logs;
  const besoins = calculerBesoins(p);
  const jour = todayStr();
  const seanceFaite = logs.some((l) => l.date && l.date.slice(0, 10) === jour);

  // En-tête personnalisé selon l'heure
  const heure = new Date().getHours();
  const salut = heure < 18 ? "Salut" : "Bonsoir";
  // En-tête sur UNE ligne : salutation + série en cours. L'ancien bloc de trois
  // lignes (eyebrow + prénom + « prêt ? ») ne portait aucune information utile.
  const _serie = serieJours(logs);
  // La sous-ligne dit ce qui s'est PASSÉ, pas une formule d'encouragement.
  // « Prêt à atteindre tes objectifs ? » ne portait aucune information : c'est
  // exactement le remplissage générique que la direction produit interdit. Et
  // l'emoji 👋 était la première chose vue de l'application — le design system
  // proscrit l'emoji comme iconographie.
  const _sm = statsSemaine(logs);
  const _cible = Math.max(1, p?.joursParSemaine || 4);
  const _sous = _sm.seances > 0
    ? `${_sm.seances} séance${_sm.seances > 1 ? "s" : ""} sur ${_cible} cette semaine`
    : (logs.length ? "Aucune séance cette semaine — c'est le moment" : "Première séance à enregistrer");
  // LA SCÈNE. Salutation et séance du jour ne sont plus deux boîtes empilées sur
  // un fond plat : elles partagent un décor qui touche les bords de l'écran,
  // éclairé par le haut et éteint en fondu vers le bas. C'est ce qui donne à
  // l'écran un HAUT et un BAS — une hiérarchie qu'aucun titre ne peut créer.
  const scene = h(`<div class="scene bleed"></div>`);
  v.append(scene);
  scene.append(h(`<div class="dash-hi">
    <div class="hi-txt"><h1 class="hi-nom">${esc(salut)} <span class="hi-p">${esc(p.prenom || "Athlète")}</span></h1>
      <div class="hi-sub">${esc(_sous)}</div></div>
    ${_serie > 0 ? `<span class="streak-chip" title="Série en cours">${IC.flame}<b class="num">${_serie}</b><span>j</span></span>` : ""}
  </div>`));

  // Moteur automatique : « Ton corps » + prochaine séance déjà construite.
  // C'est désormais l'action n°1 de l'application.
  // Le moteur s'affiche TOUJOURS (sauf désactivation explicite). Le conditionner
  // à un historique existant le rendait invisible tant qu'aucune séance n'avait
  // été terminée : la fonctionnalité principale n'était jamais découverte.
  // Sans historique, tous les muscles sont frais et il propose une première
  // séance complète — c'est exactement ce qu'on veut voir en arrivant.
  // L'ACTION D'ABORD. La carte « Programme actuel » occupait le haut de l'écran
  // pour annoncer « Aucun programme » : un constat, pas une action, à l'endroit
  // le plus précieux de l'application. La séance du jour passe devant ; le
  // programme reste juste dessous, et disparaît quand il n'y en a pas — un
  // rappel de ce qu'on n'a pas ne rend service à personne.
  const moteurActif = Etat.data.reglages.moteurAuto !== false && !!Etat.data.profil;
  // SÉANCE INTERROMPUE D'ABORD. Constaté à l'audit : après un rechargement (ou
  // l'app fermée par Android) en pleine séance, l'accueil n'affichait que
  // « Prochaine séance · Commencer » — les séries déjà validées étaient bien
  // sauvegardées, mais rien ne disait qu'on pouvait les reprendre.
  const seanceLive = LIVE && !LIVE.fini ? trouverSeance(LIVE.seanceId) : null;
  if (seanceLive) {
    const faites = Object.values(LIVE.data || {}).reduce((n, e) => n + (e.series || []).filter((x) => x.done).length, 0);
    const total = Object.values(LIVE.data || {}).reduce((n, e) => n + (e.series || []).length, 0);
    const pct = total ? Math.round((faites / total) * 100) : 0;
    const carte = h(`<div class="card reprise" role="region" aria-label="Séance en cours">
      <div class="spread"><span class="eyebrow">Séance en cours</span><span class="num reprise-n">${faites}/${total} séries</span></div>
      <h2 class="reprise-t">${esc(seanceLive.nom)}</h2>
      <div class="bar"><div style="width:${pct}%"></div></div>
      <button class="primary big"><span class="btn-ico">${IC.play}</span>Reprendre la séance</button></div>`);
    carte.querySelector("button").addEventListener("click", () => { APERCU = null; nav("train"); });
    scene.append(carte);
  }
  if (moteurActif) carteMoteur(scene);
  // L'arête qui ferme la scène. Un fondu seul laisse l'œil dans le flou ; cette
  // ligne dit où la zone héro s'arrête et où la page reprend.
  scene.append(h(`<span class="scene-edge" aria-hidden="true"></span>`));
  if (prog) v.append(carteProgrammeActuel(prog, logs, p));

  // Entraînement du jour du programme. Masqué quand le moteur pilote : les deux
  // cartes se concurrençaient. Le programme reste entièrement accessible dans
  // son onglet, rien n'est retiré.
  const wc = h(`<div class="card wkcard"></div>`);
  if (sj) {
    const muscles = (sj.groupesCibles || []).map((m) => MUSCLE_LABELS[m] || m).slice(0, 3).join(" · ");
    let pct = seanceFaite ? 1 : 0;
    const enCours = LIVE && LIVE.seanceId === sj.id;
    if (enCours) pct = progressionSeance(sj).pct;
    wc.append(h(`<div class="spread"><span class="eyebrow">${enCours ? "Séance en cours" : "Entraînement du jour"}</span><span class="wk-ic">${IC.dumbbell}</span></div>`));
    wc.append(h(`<h2 style="margin:2px 0 0;font-size:1.3rem">${esc(sj.nom)}</h2>`));
    wc.append(h(`<div class="muted small" style="margin:2px 0 10px">${esc(muscles)}${muscles ? " · " : ""}${sj.exercices.length} exercices · ~${sj.dureeEstimeeMin} min</div>`));
    if (pct > 0) {
      wc.append(h(`<div class="spread small" style="margin-bottom:5px"><span class="muted">Progression</span><span class="num" style="color:var(--accent-ink);font-weight:800">${Math.round(pct * 100)}%</span></div>`));
      wc.append(h(`<div class="bar"><div style="width:${Math.round(pct * 100)}%"></div></div>`));
    }
    const b = h(`<button class="primary big" style="margin-top:11px">${seanceFaite ? "✓ Séance faite — revoir" : `<span class="btn-ico">${IC.play}</span>${enCours ? "Continuer la séance" : "Commencer la séance"}`}</button>`);
    b.addEventListener("click", () => { if (!enCours) LIVE = null; APERCU = enCours ? null : sj.id; nav("train"); });
    wc.append(b);
  } else {
    wc.append(h(`<div class="spread"><span class="eyebrow">Aujourd'hui</span><span class="wk-ic wk-ic-rest">${IC.moon}</span></div>`));
    wc.append(h(`<h2 style="margin:2px 0 0;font-size:1.3rem">Jour de repos</h2>`));
    wc.append(h(`<div class="muted small" style="margin-top:3px">Marche, mobilité ou récupération active.</div>`));
    const b = h(`<button class="secondary big" style="margin-top:11px"><span class="btn-ico">${IC.play}</span>S'entraîner quand même</button>`);
    b.addEventListener("click", () => { LIVE = null; APERCU = null; nav("train"); });
    wc.append(b);
  }
  if (!moteurActif) v.append(wc);

  // Statistiques d'un coup d'œil — grille 2 colonnes, chiffres dominants.
  // Toutes les valeurs viennent de l'historique réel, aucune n'est inventée.
  v.append(h(`<div class="eyebrow dash-lbl">Mes chiffres</div>`));
  v.append(grilleChiffres(logs));
  {
    const duo = carteCorpsEtRecords(logs);
    if (duo) v.append(duo);
  }

  // Ma semaine — bande compacte, juste sous l'action principale.
  v.append(h(`<div class="eyebrow dash-lbl">Ma semaine</div>`));
  v.append(semaineStrip(logs));
  v.append(carteBilanSemaine(logs, p));

  // Raccourcis vers ce qui n'est PAS dans la barre de navigation
  // (elle donne déjà Programme, Séance, Progrès, Profil).
  const qrow = h(`<div class="qrow"></div>`);
  const qbtn = (icone, cls, label, onClick) => {
    const b = h(`<button><span class="qi ${cls}">${icone}</span><span>${label}</span></button>`);
    b.addEventListener("click", onClick);
    return b;
  };
  // « Exercices » est dans la barre du bas : sa place revient aux écrans qui
  // n'y sont pas (calculatrices et dictionnaire n'étaient joignables que par
  // le Profil).
  qrow.append(qbtn(IC.message, "q-blue", "Coach", () => ouvrirCoach()));
  qrow.append(qbtn(IC.calculator || IC.bars, "q-blue", "Calculs", () => ouvrirOutils()));
  qrow.append(qbtn(IC.book || IC.info, "q-blue", "Lexique", () => nav("dico")));
  qrow.append(qbtn(IC.apple, "q-green", "Nutrition", () => nav("food")));
  v.append(qrow);

  // Objectif du jour (façon « Today Target ») : séance, calories, hydratation
  const foodT = (Etat.data.foodlog[jour] || []).reduce((a, f) => a + (f.kcal || 0), 0);
  const eauT = Etat.data.waterlog[jour] || 0;
  const eauCibleMl = Math.round((besoins.eau || 2) * 1000);
  const tc = h(`<div class="card stack tap"></div>`);
  const tcHead = h(`<div class="spread" style="margin-bottom:2px"><div class="eyebrow">Objectif du jour</div><span class="chev">Nutrition ›</span></div>`);
  tc.append(tcHead);
  tc.append(targetLigne(IC.dumbbell, "Séance", seanceFaite ? "Faite ✓" : (sj ? "À faire" : "Repos"), seanceFaite ? 1 : (sj ? 0 : 1), "mi-blue"));
  tc.append(targetLigne(IC.flame, "Calories", `${Math.round(foodT)} / ${besoins.kcal} kcal`, foodT / (besoins.kcal || 1), "mi-orange"));
  tc.append(targetLigne(IC.droplet, "Hydratation", `${(eauT / 1000).toFixed(1)} / ${besoins.eau} L`, eauT / eauCibleMl, "mi-blue"));
  tc.addEventListener("click", () => nav("food"));
  v.append(tc);

  // Historique récent : 3 dernières séances, en lignes compactes (pas en cartes).
  const recents = logs.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3);
  if (recents.length) {
    const head = h(`<div class="spread dash-lbl"><span class="eyebrow">Séances récentes</span><button class="linklike">Voir tout ›</button></div>`);
    head.querySelector("button").addEventListener("click", () => nav("stats"));
    v.append(head);
    const box = h(`<div class="card histo-mini"></div>`);
    recents.forEach((l) => {
      const d = new Date(l.date);
      const jours = Math.round((Date.now() - d.getTime()) / 864e5);
      const quand = jours <= 0 ? "aujourd'hui" : jours === 1 ? "hier" : `il y a ${jours} j`;
      const vol = Math.round(volumeLog(l));
      const min = Math.round((l.dureeSec || 0) / 60);
      box.append(h(`<div class="histo-row"><span class="hr-t"><b>${esc(l.seanceNom || "Séance")}</b><br><span class="muted small">${quand}</span></span><span class="muted small hr-v">${min ? min + " min · " : ""}${uVolume(vol)}</span></div>`));
    });
    v.append(box);
  }

  v.append(h(`<div class="disclaimer">En cas de douleur vive ou inhabituelle, arrête le mouvement. Cette app ne pose aucun diagnostic médical.</div>`));
}
/**
 * Section repliable. Garde l'écran court : seul l'essentiel est ouvert par
 * défaut, le reste est à un tap. L'état d'ouverture est mémorisé par clé.
 * @param {HTMLElement} parent
 * @param {string} cle     identifiant stable (mémorisation de l'état)
 * @param {string} titre
 * @param {(corps:HTMLElement)=>void} remplir
 * @param {{ouvert?:boolean, resume?:string}} [opts]
 */
const SECTIONS_OUVERTES = {};
function section(parent, cle, titre, remplir, opts = {}) {
  const ouvert = SECTIONS_OUVERTES[cle] ?? !!opts.ouvert;
  const wrap = h(`<section class="sect${ouvert ? " on" : ""}"></section>`);
  const head = h(`<button class="sect-head" aria-expanded="${ouvert}"><span class="sect-t">${esc(titre)}${opts.resume ? `<span class="sect-r muted">${esc(opts.resume)}</span>` : ""}</span><span class="sect-chev" aria-hidden="true">${IC.chevron}</span></button>`);
  const corps = h(`<div class="sect-body"></div>`);
  if (ouvert) remplir(corps); else corps.hidden = true;
  head.addEventListener("click", () => {
    const on = corps.hidden;
    SECTIONS_OUVERTES[cle] = on;
    wrap.classList.toggle("on", on);
    head.setAttribute("aria-expanded", String(on));
    if (on && !corps.childElementCount) remplir(corps);
    corps.hidden = !on;
  });
  wrap.append(head, corps);
  parent.append(wrap);
  return wrap;
}

/**
 * État vide / erreur normalisé. Un écran sans contenu doit dire ce qui manque
 * et proposer la sortie, pas afficher une ligne grise.
 *
 * @param {string} icone   pictogramme SVG (IC.*)
 * @param {string} titre   ce qui se passe, en une phrase
 * @param {string} texte   quoi faire ensuite
 * @param {{erreur?:boolean, action?:{label:string, onClick:Function}}} [opts]
 */
function etatVide(icone, titre, texte, opts = {}) {
  const el = h(`<div class="empty-state${opts.erreur ? " err" : ""}" role="${opts.erreur ? "alert" : "status"}">
    <div class="es-ic">${icone}</div><b>${esc(titre)}</b>
    ${texte ? `<div class="muted small">${esc(texte)}</div>` : ""}</div>`);
  if (opts.action) {
    const b = h(`<button class="secondary">${esc(opts.action.label)}</button>`);
    b.addEventListener("click", () => opts.action.onClick());
    el.append(b);
  }
  return el;
}

/** `n` squelettes de ligne : montre la forme du contenu attendu pendant l'attente. */
function squelettes(n = 3) {
  const f = document.createDocumentFragment();
  for (let i = 0; i < n; i++) {
    f.append(h(`<div class="skel-card" aria-hidden="true"><div class="sk-av skeleton"></div>
      <div class="sk-l"><i class="skeleton" style="width:${60 + (i % 3) * 12}%"></i><i class="skeleton" style="width:${35 + (i % 2) * 15}%"></i></div></div>`));
  }
  const wrap = h(`<div role="status" aria-label="Chargement en cours"></div>`);
  wrap.append(f);
  return wrap;
}

function kpi(lab, val) { return h(`<div class="card kpi"><span class="lab">${esc(lab)}</span><b class="num">${esc(val)}</b></div>`); }
/** Carte statistique (icône + valeur + libellé). Composant réutilisable. */
function statCard(icone, valeur, label) {
  // Une tuile porte le plus souvent un nombre court (« 18 », « 9h27 »), traité
  // en gros titre. Mais certaines portent un MOT — « aujourd'hui » — qui à
  // 2,1 rem se faisait couper en « aujo… ». La taille suit donc la longueur
  // réelle, plutôt que d'espérer que tout soit court.
  const txt = String(valeur ?? "");
  const classe = txt.length > 9 ? " stat-long" : txt.length > 5 ? " stat-moyen" : "";
  return h(`<div class="stat"><div class="ic" aria-hidden="true">${icone}</div><b class="num${classe}">${esc(txt)}</b><span class="lab">${esc(label)}</span></div>`);
}
/** État vide soigné (icône + titre + sous-titre). Renvoie une chaîne HTML. */
/** Même état vide, en chaîne HTML — pour les rendus qui composent du markup
    (graphiques SVG). Une seule apparence pour les deux formes. */

/** Ligne d'objectif du jour (icône + libellé + valeur + mini-jauge). */
function targetLigne(icone, label, val, pct, tint = "") {
  const p = Math.round(Math.max(0, Math.min(1, pct || 0)) * 100);
  return h(`<div class="tgt"><span class="ic ${tint}" aria-hidden="true">${icone}</span><div style="flex:1;min-width:0"><div class="spread small"><span>${esc(label)}</span><span class="num muted">${esc(val)}</span></div><div class="bar mt"><div style="width:${p}%"></div></div></div></div>`);
}
/** Barre de macro (libellé + valeur/cible + jauge colorée). Composant réutilisable. */
function macroBar(label, valeur, cible, unite, cls) {
  const v = Math.round(valeur || 0);
  const pct = cible ? Math.min(100, Math.round((v / cible) * 100)) : 0;
  return h(`<div class="macro"><div class="lg spread small"><span>${esc(label)}</span><span class="num muted">${v} / ${cible} ${esc(unite)}</span></div><div class="bar ${cls}"><div style="width:${pct}%"></div></div></div>`);
}

/* ======================================================================
   PROGRAMME
   ====================================================================== */
let EDIT_ROUTINE = null; // id de la routine en cours d'édition (onglet Programme)
let PROG_JOUR_SEL = null; // jour ISO (1=lundi) sélectionné dans le ruban de l'onglet Programme

/** Sous-onglet de l'écran Routines : « mes » routines ou « explorer ». */
let PROG_SOUS = "mes";

/**
 * Carte de routine, reprise de l'onglet Routines de FitAI (capture 1080×2460).
 *
 * Trois étages dans un ordre qui n'est pas arbitraire : le titre et l'action
 * d'abord, parce qu'en salle on vient pour démarrer ; puis les muscles
 * sollicités, qui disent en un coup d'œil ce que la séance va coûter ; puis le
 * rail des vignettes, qui dit ce qu'on va faire. Les deux bandes défilent
 * horizontalement — une routine de dix exercices ne doit pas allonger la carte.
 *
 * @param {{nom:string, soustitre?:string, exercices:any[], onDemarrer?:Function,
 *          onOuvrir?:Function, onMenu?:Function, actif?:boolean}} o
 */
function carteRoutineFitai(o) {
  const card = h(`<div class="rt-card${o.actif ? " on" : ""}"></div>`);

  const head = h(`<div class="rt-head"></div>`);
  const titre = h(`<button class="rt-titre" type="button">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    <span><b>${esc(o.nom)}</b>${o.soustitre ? `<em>${esc(o.soustitre)}</em>` : ""}</span></button>`);
  if (o.onOuvrir) titre.addEventListener("click", () => o.onOuvrir());
  head.append(titre);
  if (o.onDemarrer) {
    const b = h(`<button class="rt-start" type="button"><span class="cic">${IC.play}</span>Démarrer</button>`);
    b.addEventListener("click", (e) => { e.stopPropagation(); o.onDemarrer(); });
    head.append(b);
  }
  if (o.onMenu) {
    const m = h(`<button class="rt-menu" type="button" aria-label="Options de la routine ${esc(o.nom)}">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg></button>`);
    m.addEventListener("click", (e) => { e.stopPropagation(); o.onMenu(e); });
    head.append(m);
  }
  card.append(head);

  const exos = (o.exercices || []).filter(Boolean);

  // Bande des muscles : les principaux, sans doublon, dans l'ordre d'apparition.
  const muscles = [];
  for (const exo of exos) for (const m of (exo.musclesPrincipaux || [])) if (!muscles.includes(m)) muscles.push(m);
  if (muscles.length) {
    const bande = h(`<div class="rt-muscles" role="list"></div>`);
    // Une vignette par muscle, tournée du bon côté et zoomée sur la zone : en
    // corps entier, le muscle surligné ne faisait que quelques pixels.
    muscles.slice(0, 8).forEach((m) => {
      bande.append(h(`<span class="rt-m" role="listitem" title="${esc(MUSCLE_LABELS[m] || m)}">
        <em>${esc(muscleCourt(m))}</em>
        <span class="rt-mfig">${miniSilhouette([m], "auto", { zoom: true, ratio: 0.8 })}</span></span>`));
    });
    card.append(bande);
  }

  // Rail des vignettes : ce que la séance contient, dans l'ordre.
  if (exos.length) {
    const rail = h(`<div class="rt-rail" role="list"></div>`);
    exos.slice(0, 14).forEach((exo) => {
      rail.append(h(`<span class="rt-vig" role="listitem" title="${esc(exo.nom || "")}">${vignetteHTML(exo, "sm")}</span>`));
    });
    card.append(rail);
  }
  return card;
}

function vProg(v) {
  if (EDIT_ROUTINE) { vRoutineEditor(v, EDIT_ROUTINE); return; }
  const prog = Etat.data.programme, p = Etat.data.profil;

  // SANS PROGRAMME, l'écran plantait : `prog.split` sur `null` lève une
  // TypeError et l'onglet Programme n'affichait plus RIEN. Or il n'y a pas
  // toujours de programme — on peut l'avoir supprimé, importé une sauvegarde
  // qui n'en contenait pas, ou piloté l'entraînement au moteur automatique.
  // Un écran blanc à la place d'un écran, c'est un bug ; une proposition, non.
  if (!prog || !Array.isArray(prog.seances)) {
    v.append(h(`<div class="spread" style="margin-bottom:14px">
      <div><div class="eyebrow">Mon programme</div><h1 style="margin:2px 0 0">Aucun programme</h1></div></div>`));
    v.append(h(`<div class="card"><div class="empty-state">${illustration("plan")}
      <b>Pas de programme pour l'instant</b>
      <span class="muted small">Tu peux en générer un à partir de ton profil, en installer un depuis la bibliothèque, ou continuer avec la séance du jour proposée sur l'accueil.</span>
    </div></div>`));
    if (p) {
      const bGen = h(`<button class="primary big" style="width:100%;margin-top:12px">Générer mon programme</button>`);
      bGen.addEventListener("click", () => {
        Etat.data.programme = genererProgramme(p); Etat.sauver();
        toast("Programme généré"); render();
      });
      v.append(bGen);
    }
    const bBib = h(`<button class="secondary big" style="width:100%;margin-top:8px">Parcourir la bibliothèque</button>`);
    bBib.addEventListener("click", ouvrirBibliothequeProgrammes);
    v.append(bBib);
    // Les routines personnelles existent indépendamment du programme : les
    // masquer ici les rendrait introuvables.
    carteRoutines(v);
    return;
  }

  // ---- Deux sous-onglets, comme l'onglet Routines de FitAI.
  const sous = h(`<div class="rt-sous" role="tablist" aria-label="Type de routines"></div>`);
  [["mes", "Mes routines"], ["explorer", "Explorer"]].forEach(([k, lab]) => {
    const b = h(`<button class="rt-sous-b${PROG_SOUS === k ? " on" : ""}" role="tab" aria-selected="${PROG_SOUS === k}">${lab}</button>`);
    b.addEventListener("click", () => { if (PROG_SOUS !== k) { PROG_SOUS = k; render(); } });
    sous.append(b);
  });
  v.append(sous);

  if (PROG_SOUS === "explorer") { blocExplorer(v); return; }

  // ---- Les deux actions de tête : écrire soi-même, ou laisser le moteur.
  const actions = h(`<div class="rt-actions"></div>`);
  const bNew = h(`<button class="rt-a ghost" type="button"><span class="cic">${IC.plus}</span>Nouvelle routine</button>`);
  bNew.addEventListener("click", nouvelleRoutine);
  const bGen = h(`<button class="rt-a solid" type="button"><span class="cic">${IC.spark}</span>Créer</button>`);
  bGen.addEventListener("click", async () => {
    if (!p) { toast("Renseigne d'abord ton profil"); return; }
    if (prog && !await confirmer("Regénérer le programme à partir de ton profil ? L'actuel sera remplacé.", { ok: "Regénérer" })) return;
    Etat.data.programme = genererProgramme(p); Etat.sauver();
    toast("Programme généré"); render();
  });
  actions.append(bNew, bGen);
  v.append(actions);

  // ---- Une carte par séance du programme. Le ruban de jours a laissé la place
  // aux cartes : le jour n'a pas disparu, il est devenu le sous-titre de chaque
  // carte, et toutes les séances sont visibles d'un coup au lieu d'une seule.
  const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const planning = planningJours(prog.seances.length);
  const auj = ((new Date().getDay() + 6) % 7) + 1;
  prog.seances.forEach((s, i) => {
    const jour = planning[i] ? JOURS[planning[i] - 1] : null;
    const exos = (s.exercices || []).map((e) => getExercise(e.exerciceId)).filter(Boolean);
    const meta = [jour, `${s.exercices.length} exos`, s.dureeEstimeeMin ? `${s.dureeEstimeeMin} min` : null]
      .filter(Boolean).join(" · ");
    const ouvrir = () => { LIVE = null; APERCU = s.id; nav("train"); };
    v.append(carteRoutineFitai({
      nom: s.nom, soustitre: meta, exercices: exos,
      actif: planning[i] === auj, onOuvrir: ouvrir, onDemarrer: ouvrir,
    }));
  });
  if (prog.justificationGlobale) v.append(h(`<div class="hint">${esc(prog.justificationGlobale)}</div>`));

  carteRoutines(v);
}

/** Crée une routine vide et ouvre son éditeur. Partagé par les deux entrées. */
async function nouvelleRoutine() {
  const nom = await demanderTexte("Nom de la routine", "Ma routine", { ok: "Créer" });
  if (nom === null) return;
  const r = creerRoutine(nom);
  (Etat.data.programmesPerso ||= []).push(r);
  Etat.sauver(); EDIT_ROUTINE = r.id; render();
}

/**
 * Sous-onglet « Explorer » : les programmes prêts à installer, présentés comme
 * les routines — on doit pouvoir en adopter un et le modifier ensuite, ce que
 * FitAI appelle « save it, it becomes yours to edit ».
 */
function blocExplorer(v) {
  const bFiltres = h(`<button class="rt-a ghost" style="width:100%;margin-bottom:10px" type="button"><span class="cic">${IC.sliders}</span>Filtrer les ${PROGRAMMES_SALLE.length} programmes</button>`);
  bFiltres.addEventListener("click", ouvrirBibliothequeProgrammes);
  v.append(bFiltres);
  PROGRAMMES_SALLE.forEach((pr) => {
    const exos = (pr.seances || []).flatMap((s) => (s.exercices || []).map((e) => getExercise(e.exerciceId))).filter(Boolean);
    const meta = [pr.accroche, `${pr.joursParSemaine} j/sem.`, `${pr.dureeMin} min`].filter(Boolean).join(" · ");
    v.append(carteRoutineFitai({
      nom: pr.nom, soustitre: meta, exercices: exos,
      onOuvrir: () => installerProgrammeClassique(pr),
      onDemarrer: () => installerProgrammeClassique(pr),
    }));
  });
}

/**
 * MES ROUTINES — les programmes écrits à la main, illimités.
 *
 * Extrait de `vProg` : ce bloc n'a rien à voir avec le programme généré, il
 * vivait simplement à la suite. Le séparer permet de l'afficher AUSSI quand il
 * n'y a pas de programme — sans quoi les routines devenaient introuvables au
 * moment précis où elles sont le plus utiles.
 */
let VOIR_ARCHIVES = false;
function carteRoutines(v) {
  const toutes = Etat.data.programmesPerso || [];
  // Une routine archivée quitte la liste sans être supprimée : son historique
  // reste lisible et on la retrouve, repliée, sous les routines actives.
  const miennes = toutes.filter((r) => !r.archive), archivees = toutes.filter((r) => r.archive);
  if (miennes.length) v.append(h(`<div class="eyebrow" style="margin:18px 0 8px">Mes routines</div>`));
  const carte = (r) => {
    // Une routine peut contenir plusieurs séances : le rail montre tous leurs
    // exercices, dans l'ordre, c'est ce qui la décrit le mieux d'un coup d'œil.
    const exos = r.seances.flatMap((s) => (s.exercices || []).map((e) => getExercise(e.exerciceId))).filter(Boolean);
    const meta = `${r.seances.length} séance${r.seances.length > 1 ? "s" : ""} · ${exos.length} exercice${exos.length > 1 ? "s" : ""}`;
    v.append(carteRoutineFitai({
      nom: r.nom, soustitre: meta, exercices: exos,
      onOuvrir: () => { EDIT_ROUTINE = r.id; render(); },
      onDemarrer: () => { EDIT_ROUTINE = r.id; render(); },
      onMenu: () => menuRoutine(r),
    }));
  };
  miennes.forEach(carte);
  if (archivees.length) {
    const bArch = h(`<button class="rt-a ghost rt-arch" type="button" aria-expanded="${VOIR_ARCHIVES}"><span class="cic">${IC.layers}</span>Routines archivées (${archivees.length})</button>`);
    bArch.addEventListener("click", () => { VOIR_ARCHIVES = !VOIR_ARCHIVES; render(); });
    v.append(bArch);
    if (VOIR_ARCHIVES) archivees.forEach(carte);
  }
  const bFromLog = h(`<button class="rt-a ghost" style="width:100%;margin-top:10px" type="button"><span class="cic">${IC.cornerDown}</span>Créer depuis une séance passée</button>`);
  bFromLog.addEventListener("click", dupliquerSeancePassee);
  v.append(bFromLog);
}

/**
 * Menu « ⋮ » d'une routine personnelle.
 *
 * Les trois actions vivaient en boutons alignés sous chaque carte ; chez FitAI
 * elles sont derrière un menu, et la carte ne porte que ce qu'on regarde. Même
 * fonctions, exactement : ouvrir, dupliquer, supprimer.
 */
function menuRoutine(r) {
  const sheet = h(`<div class="sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0">${esc(r.nom)}</h2><button class="chip" id="rX">✕ Fermer</button></div>`));
  const ajouter = (icone, label, fn, danger = false) => {
    const b = h(`<button class="plusitem${danger ? " danger" : ""}" type="button"><span class="cic">${icone}</span><span class="g"><b>${label}</b></span></button>`);
    b.addEventListener("click", async () => { sheet.remove(); await fn(); });
    inner.append(b);
  };
  ajouter(IC.forward, "Ouvrir", () => { EDIT_ROUTINE = r.id; render(); });
  ajouter(IC.copy, "Dupliquer", () => { const d = dupliquerRoutine(r); delete d.archive; Etat.data.programmesPerso.push(d); Etat.sauver(); render(); });
  ajouter(IC.layers, r.archive ? "Désarchiver" : "Archiver", () => {
    if (r.archive) delete r.archive; else r.archive = true;
    Etat.sauver(); render();
    toast(r.archive ? "Routine archivée — elle reste sous « Routines archivées »" : "Routine remise dans tes routines");
  });
  ajouter(IC.trash, "Supprimer", async () => {
    if (!await confirmer(`Supprimer la routine « ${r.nom} » ?`, { danger: true, ok: "Supprimer" })) return;
    Etat.data.programmesPerso = Etat.data.programmesPerso.filter((x) => x.id !== r.id);
    Etat.sauver(); render();
  }, true);
  sheet.querySelector("#rX").addEventListener("click", () => sheet.remove());
  document.body.append(sheet);
}

/**
 * Bibliothèque de programmes : feuille avec filtres cumulables.
 *
 * Cinq facettes (objectif, niveau, durée d'une séance, matériel, fréquence)
 * plutôt qu'une seule liste de puces : devant 18 programmes, la vraie question
 * est « qu'est-ce qui rentre dans mes 45 minutes avec mes haltères ».
 */
function ouvrirBibliothequeProgrammes() {
  const tous = [...PROGRAMMES_SALLE];
  const crit = { objectif: null, niveau: null, duree: null, materiel: null, frequence: null };
  const sheet = h(`<div class="sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0">Programmes</h2><button class="chip" id="bibX">✕ Fermer</button></div>`));
  inner.append(h(`<div class="muted small">Structures d'entraînement écrites avec les exercices de ton catalogue. Installe-en une : elle devient une routine modifiable.</div>`));

  const facettes = h(`<div class="stack facettes"></div>`);
  const liste = h(`<div class="stack" style="margin-top:10px"></div>`);
  const compteur = h(`<div class="spread" style="margin-top:10px"><span class="muted small" id="bibN"></span><button class="linklike" id="bibReset" hidden>Tout effacer</button></div>`);

  /** @type {[string, string, [string, string][]][]} */
  const GROUPES = [
    ["objectif", "Objectif", [["prise_muscle", "Prise de muscle"], ["perte_graisse", "Perte de gras"], ["force", "Force"], ["recomposition", "Remise en forme"]]],
    ["niveau", "Niveau", [["debutant", "Débutant"], ["intermediaire", "Intermédiaire"], ["avance", "Avancé"]]],
    ["duree", "Durée d'une séance", DUREES.map((d) => [d.cle, d.label])],
    ["materiel", "Matériel", MATERIELS.map((m) => [m.cle, m.label])],
    ["frequence", "Séances / semaine", FREQUENCES.map((f) => [f.cle, f.label])],
  ];

  const refresh = () => {
    // Puces : reflètent la sélection courante.
    facettes.querySelectorAll("button[data-cle]").forEach((b) => {
      b.classList.toggle("on", crit[b.dataset.cle] === b.dataset.val);
      b.setAttribute("aria-pressed", String(crit[b.dataset.cle] === b.dataset.val));
    });
    const n = nbCriteresActifs(crit);
    $("#bibReset", compteur).hidden = n === 0;
    liste.innerHTML = "";
    const res = filtrerProgrammes(tous, crit, getExercise);
    $("#bibN", compteur).textContent = res.length
      ? `${res.length} programme${res.length > 1 ? "s" : ""}${n ? ` · ${n} filtre${n > 1 ? "s" : ""}` : ""}`
      : "Aucun résultat";
    if (!res.length) {
      liste.append(h(`<div class="empty-state"><div class="es-ic">${IC.search}</div><b>Aucun programme ne coche tous ces critères</b><div class="muted small">Retire un filtre — la durée ou le matériel sont les plus restrictifs.</div></div>`));
      const b = h(`<button class="secondary big">Effacer les filtres</button>`);
      b.addEventListener("click", () => { Object.keys(crit).forEach((k) => { crit[k] = null; }); refresh(); });
      liste.append(b);
      return;
    }
    res.forEach((pr) => {
      const c = carteProgrammeClassique(pr);
      c.addEventListener("click", () => sheet.remove(), { once: true });
      liste.append(c);
    });
  };

  GROUPES.forEach(([cle, titre, opts]) => {
    const g = h(`<div class="facette"><div class="eyebrow">${titre}</div></div>`);
    const row = h(`<div class="row scrollx"></div>`);
    opts.forEach(([val, lab]) => {
      const b = h(`<button class="chip" data-cle="${cle}" data-val="${val}" aria-pressed="false">${lab}</button>`);
      // Re-toucher une puce active l'annule : un seul geste pour poser et retirer.
      b.addEventListener("click", () => { crit[cle] = crit[cle] === val ? null : val; refresh(); });
      row.append(b);
    });
    g.append(row);
    facettes.append(g);
  });
  inner.append(facettes, compteur, liste);
  $("#bibReset", compteur).addEventListener("click", () => { Object.keys(crit).forEach((k) => { crit[k] = null; }); refresh(); });
  refresh();
  sheet.querySelector("#bibX").addEventListener("click", () => sheet.remove());
  document.body.append(sheet);
}

/** Carte d'un programme classique de la bibliothèque (ouvre l'aperçu). */
function carteProgrammeClassique(pr) {
  const muscles = [...new Set(pr.seances.flatMap((s) => s.groupesCibles))];
  const b = h(`<button class="card wcard sil pgm-card">
    ${miniSilhouette(muscles)}
    <span class="g">
      <b>${esc(pr.nom)}</b><br>
      <span class="muted small">${esc(pr.accroche)}</span><br>
      <span class="pgm-meta"><span class="badge accent">${pr.joursParSemaine}×/sem</span><span class="pill">${esc(LEVEL_LABELS[pr.niveau] || pr.niveau)}</span><span class="pill">~${pr.dureeMin} min</span></span>
    </span>
    <span class="chev" aria-hidden="true">›</span></button>`);
  b.addEventListener("click", () => apercuProgrammeClassique(pr));
  return b;
}

/** Feuille d'aperçu d'un programme classique + bouton d'installation. */
function apercuProgrammeClassique(pr) {
  const sheet = h(`<div class="sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  const fermer = () => sheet.remove();
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0">${esc(pr.nom)}</h2><button class="chip" id="pgX">✕ Fermer</button></div>`));
  inner.append(h(`<div class="muted small">${esc(pr.accroche)}</div>`));
  inner.append(h(`<div class="row" style="margin:10px 0"><span class="badge accent">${pr.joursParSemaine} séances / semaine</span><span class="pill">${esc(LEVEL_LABELS[pr.niveau] || pr.niveau)}</span><span class="pill">~${pr.dureeMin} min</span></div>`));
  inner.append(h(`<div class="small">${esc(pr.description)}</div>`));
  if (pr.echauffement) inner.append(h(`<div class="notice small" style="margin-top:10px"><b>Échauffement :</b> ${esc(pr.echauffement)}</div>`));
  inner.append(h(`<div class="notice small" style="margin-top:10px"><b>Progresser :</b> ${esc(pr.progression)}</div>`));

  const bInst = h(`<button class="primary big" style="margin:14px 0"><span class="btn-ico">${IC.plus}</span>Installer comme routine</button>`);
  bInst.addEventListener("click", async () => {
    const ok = await confirmer(`Ajouter « ${pr.nom} » à tes routines ? Ton programme actuel et ton historique ne sont pas touchés.`, { ok: "Installer" });
    if (!ok) return;
    installerProgrammeClassique(pr);
    fermer();
  });
  inner.append(bInst);

  pr.seances.forEach((s, i) => {
    const c = h(`<div class="card stack" style="margin-bottom:10px"></div>`);
    c.append(h(`<div class="spread"><b>${esc(s.nom)}</b><span class="pill">${s.exercices.length} exos</span></div>`));
    s.exercices.forEach((ex, j) => {
      const exo = getExercise(ex.ref);
      const dureeTxt = ex.duree >= 120 ? `${Math.round(ex.duree / 60)} min` : `${ex.duree} s`;
      const repsTxt = ex.reps && (ex.reps[0] === ex.reps[1] ? `${ex.reps[0]}` : `${ex.reps[0]}–${ex.reps[1]}`);
      const vol = ex.duree ? `${ex.series} × ${dureeTxt}` : `${ex.series} × ${repsTxt}`;
      // repos 0 = enchaîné (format circuit)
      const reposTxt = ex.repos ? formatRepos(ex.repos) : "enchaîné";
      const l = h(`<div class="spread small"><span><span class="anat-num">${j + 1}</span>${esc(exo ? exo.nom : ex.ref)}</span><span class="muted">${vol} · ${reposTxt}</span></div>`);
      if (exo) { l.classList.add("tap"); l.addEventListener("click", () => ouvrirDetail(exo)); }
      c.append(l);
    });
    inner.append(c);
  });
  sheet.querySelector("#pgX").addEventListener("click", fermer);
  document.body.append(sheet);
}

/**
 * Convertit un programme de la bibliothèque en routine perso réelle, via les
 * helpers de engine/routines.js (donc au format exact des routines existantes).
 * N'écrase jamais le programme en cours ni l'historique.
 */
function installerProgrammeClassique(pr) {
  const r = creerRoutine(pr.nom);
  for (const s of pr.seances) {
    const seance = ajouterSeance(r, s.nom);
    seance.groupesCibles = [...s.groupesCibles];
    for (const ex of s.exercices) {
      ajouterExercice(seance, ex.ref, {
        nbSeries: ex.series,
        repsCible: ex.reps || undefined,
        dureeSec: ex.duree || undefined,
        reposSec: ex.repos,
      });
    }
  }
  r.justificationGlobale = `${pr.description} — ${pr.progression}`;
  (Etat.data.programmesPerso ||= []).push(r);
  Etat.sauver();
  toast(`« ${pr.nom} » ajouté à tes routines`);
  render();
}

/** Éditeur d'une routine perso (séances, exercices, séries). */
function vRoutineEditor(v, routineId) {
  const r = (Etat.data.programmesPerso || []).find((x) => x.id === routineId);
  if (!r) { EDIT_ROUTINE = null; render(); return; }
  // Le crayon plutôt que la flèche de lecture : « ▷| Renommer » ne voulait rien
  // dire. Même geste, icône qui le nomme.
  const CRAYON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`;
  const head = h(`<div class="spread"><button class="chip" id="back">← Retour</button><button class="chip" id="ren"><span class="cic">${CRAYON}</span>Renommer</button></div>`);
  v.append(head);
  v.append(h(`<h1 style="margin:6px 0">${esc(r.nom)}</h1>`));
  $("#back", v).addEventListener("click", () => { EDIT_ROUTINE = null; render(); });
  $("#ren", v).addEventListener("click", async () => { const n = await demanderTexte("Nom de la routine", r.nom); if (n !== null) { renommer(r, n); Etat.sauver(); render(); } });
  if (!r.seances.length) v.append(etatVide(illustration("plan"), "Routine vide", "Ajoute une première séance, puis ses exercices : elle apparaîtra ensuite dans l'onglet Séance."));
  r.seances.forEach((s) => v.append(carteSeanceEditor(r, s)));
  const bAddS = h(`<button class="primary" style="margin-top:10px"><span class="btn-ico">${IC.plus}</span>Ajouter une séance</button>`);
  bAddS.addEventListener("click", async () => { const n = await demanderTexte("Nom de la séance", `Séance ${r.seances.length + 1}`, { ok: "Ajouter" }); if (n === null) return; ajouterSeance(r, n); Etat.sauver(); render(); });
  v.append(bAddS);
}

function carteSeanceEditor(r, s) {
  const c = h(`<details class="card" open></details>`);
  c.append(h(`<summary class="spread"><b>${esc(s.nom)}</b><span class="pill">${s.exercices.length} exos · ~${s.dureeEstimeeMin || 0} min</span></summary>`));
  const acts = h(`<div class="row" style="margin:6px 0"></div>`);
  const bRen = h(`<button class="chip"><span class="cic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></span>Renommer</button>`);
  bRen.addEventListener("click", async () => { const n = await demanderTexte("Nom de la séance", s.nom); if (n !== null) { renommer(s, n); Etat.sauver(); render(); } });
  const bDel = h(`<button class="chip danger"><span class="cic">${IC.trash}</span>Séance</button>`);
  bDel.addEventListener("click", async () => { if (await confirmer(`Supprimer la séance « ${s.nom} » ?`, { danger: true, ok: "Supprimer" })) { supprimerSeance(r, s.id); Etat.sauver(); render(); } });
  acts.append(bRen, bDel); c.append(acts);
  // « Muscles sollicités · avant et après », comme le haut du détail de routine
  // de FitAI : on voit ce que la séance coûtera avant même de l'avoir écrite.
  const bande = bandeRecuperation(musclesSeance(s), s);
  if (bande) {
    c.append(h(`<div class="eyebrow" style="margin:10px 0 2px">Muscles sollicités · avant et après</div>`));
    c.append(bande);
  }
  s.exercices.forEach((e, i) => c.append(ligneExoEditor(s, e, i)));
  const bAddE = h(`<button class="chip"><span class="cic">${IC.plus}</span>Exercice</button>`);
  bAddE.addEventListener("click", () => choisirExercice((exId) => { ajouterExercice(s, exId, { nbSeries: 3 }); Etat.sauver(); render(); }));
  c.append(bAddE);
  return c;
}

/**
 * Ligne d'exercice dans l'éditeur de routine.
 *
 * Reprend la ligne du détail de routine de FitAI : poignée de réordonnancement,
 * vignette blanche, barre de niveau, nom, volume, puis les actions — remplacer,
 * éditer — et le muscle ciblé. Les réglages (séries, répétitions, repos) ne
 * disparaissent pas derrière un écran : le crayon les déplie SUR PLACE. On garde
 * l'édition directe de Coach Perso dans la mise en page de FitAI.
 */
function ligneExoEditor(s, e, i) {
  const exo = getExercise(e.exerciceId);
  const t = e.series[0] || {};
  const enTemps = !!t.dureeSec;
  const nom = exo ? exo.nom : e.exerciceId;
  const muscle = exo && (exo.musclesPrincipaux || [])[0];
  const niv = exo ? Math.max(1, Math.min(4, exo.difficulte || 1)) : 1;
  const resume = `${e.series.length} série${e.series.length > 1 ? "s" : ""} × `
    + (enTemps ? `${t.dureeSec || 40} s` : (t.repsCible || [8, 12]).join("-") + " reps")
    + ` ; ${formatRepos(t.reposSec || 90)} de repos`;

  const row = h(`<div class="red-row"></div>`);

  // Poignée : un appui propose de monter ou descendre. Le glisser-déposer
  // demanderait une gestion tactile complète pour le même résultat.
  const poignee = h(`<button class="red-grip" type="button" aria-label="Déplacer ${esc(nom)}">
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg></button>`);
  poignee.addEventListener("click", () => menuExoRoutine(s, e, i, nom));
  row.append(poignee);

  row.append(h(`<span class="red-vig">${vignetteHTML(exo, "sm")}</span>`));

  const mid = h(`<div class="red-mid"></div>`);
  mid.append(h(`<span class="lx-niv" role="img" aria-label="Niveau ${niv} sur 4 : ${DIFF_LABEL[niv]}">${
    [1, 2, 3, 4].map((k) => `<i${k <= niv ? ' class="on"' : ""}></i>`).join("")}</span>`));
  mid.append(h(`<b class="red-nom">${esc(nom)}</b>`));
  mid.append(h(`<span class="red-meta">${esc(resume)}</span>`));
  const actions = h(`<div class="red-act"></div>`);
  const bSwap = h(`<button class="red-ic" type="button" aria-label="Remplacer ${esc(nom)}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h13l-3.5-3.5M21 16H8l3.5 3.5"/></svg></button>`);
  bSwap.addEventListener("click", () => choisirExercice((exId) => {
    e.exerciceId = exId;
    s.dureeEstimeeMin = estimerDureeSeance(s);
    Etat.sauver(); render();
  }));
  const bEdit = h(`<button class="red-ic" type="button" aria-expanded="false" aria-label="Régler ${esc(nom)}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>`);
  actions.append(bSwap, bEdit);
  mid.append(actions);
  row.append(mid);

  if (muscle) {
    row.append(h(`<span class="red-mus">
      <em>${esc(MUSCLE_LABELS[muscle] || muscle)}</em>
      <span class="red-mfig">${miniSilhouette([muscle], "auto", { zoom: true, ratio: 0.86 })}</span></span>`));
  }

  const bMenu = h(`<button class="red-menu" type="button" aria-label="Options de ${esc(nom)}">
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg></button>`);
  bMenu.addEventListener("click", () => menuExoRoutine(s, e, i, nom));
  row.append(bMenu);

  // ---- Réglages dépliables, sous la ligne, sur toute la largeur.
  const ctr = h(`<div class="red-reglages" hidden></div>`);
  const inNb = h(`<label class="small">Séries <input type="number" min="1" max="10" value="${e.series.length}" /></label>`);
  const inRepos = h(`<label class="small">Repos (s) <input type="number" min="0" max="600" step="15" value="${t.reposSec || 90}" /></label>`);
  const inCible = enTemps
    ? h(`<label class="small">Durée (s) <input type="number" min="5" max="600" value="${t.dureeSec || 40}" /></label>`)
    : h(`<label class="small">Reps <input type="text" value="${(t.repsCible || [8, 12]).join("-")}" placeholder="8-12" /></label>`);
  ctr.append(inNb, inCible, inRepos);
  row.append(ctr);
  bEdit.addEventListener("click", () => {
    const ouvert = ctr.hidden;
    ctr.hidden = !ouvert;
    bEdit.setAttribute("aria-expanded", String(ouvert));
    bEdit.classList.toggle("on", ouvert);
  });

  const apply = () => {
    const params = { nbSeries: parseInt(inNb.querySelector("input").value, 10) || e.series.length };
    const repos = parseInt(inRepos.querySelector("input").value, 10);
    if (Number.isFinite(repos)) params.reposSec = repos;
    if (enTemps) { params.dureeSec = parseInt(inCible.querySelector("input").value, 10) || 40; }
    else {
      const m = (inCible.querySelector("input").value || "").split(/[^0-9]+/).map(Number).filter(Boolean);
      if (m.length >= 2) params.repsCible = [m[0], m[1]]; else if (m.length === 1) params.repsCible = [m[0], m[0]];
    }
    definirSeries(e, params);
    s.dureeEstimeeMin = estimerDureeSeance(s);
    Etat.sauver();
    render();
  };
  ctr.querySelectorAll("input").forEach((inp) => inp.addEventListener("change", apply));
  return row;
}

/**
 * Menu « ⋮ » d'un exercice de routine : monter, descendre, remplacer, retirer.
 * Les flèches ↑ ↓ qui occupaient une ligne entière sous chaque exercice vivent
 * désormais ici — même fonction, sans encombrer la liste.
 */
function menuExoRoutine(s, e, i, nom) {
  const sheet = h(`<div class="sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0">${esc(nom)}</h2><button class="chip" id="exX">✕ Fermer</button></div>`));
  const item = (icone, label, fn, danger = false) => {
    const b = h(`<button class="plusitem${danger ? " danger" : ""}" type="button"><span class="cic">${icone}</span><span class="g"><b>${label}</b></span></button>`);
    b.addEventListener("click", () => { sheet.remove(); fn(); });
    inner.append(b);
  };
  if (i > 0) item(IC.back, "Monter", () => { deplacerExercice(s, i, -1); Etat.sauver(); render(); });
  if (i < s.exercices.length - 1) item(IC.forward, "Descendre", () => { deplacerExercice(s, i, 1); Etat.sauver(); render(); });
  item(IC.swap, "Remplacer par un autre exercice", () => choisirExercice((exId) => {
    e.exerciceId = exId; s.dureeEstimeeMin = estimerDureeSeance(s); Etat.sauver(); render();
  }));
  item(IC.trash, "Retirer de la routine", () => { supprimerExerciceIndex(s, i); Etat.sauver(); render(); }, true);
  sheet.querySelector("#exX").addEventListener("click", () => sheet.remove());
  document.body.append(sheet);
}

/** Crée une routine à partir d'une séance déjà réalisée (historique). */
function dupliquerSeancePassee() {
  const logs = (Etat.data.logs || []).slice(-20).reverse();
  if (!logs.length) { info("Aucune séance enregistrée à dupliquer pour l'instant.", { titre: "Dupliquer" }); return; }
  const sheet = h(`<div class="sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  inner.append(h(`<div class="spread"><h2 style="margin:0">Dupliquer une séance passée</h2><button class="chip" id="fx" aria-label="Fermer">✕</button></div>`));
  const liste = h(`<div class="stack"></div>`); inner.append(liste);
  logs.forEach((l) => {
    const d = new Date(l.date).toLocaleDateString("fr-FR");
    const b = h(`<button class="big" style="justify-content:space-between;text-align:left;margin:4px 0"><span><b>${esc(l.seanceNom || "Séance")}</b><br><span class="muted small">${d} · ${(l.exercices || []).length} exercice(s)</span></span></button>`);
    b.addEventListener("click", async () => {
      sheet.remove();
      const nom = await demanderTexte("Nom de la nouvelle routine", `${l.seanceNom || "Séance"} (copie)`, { ok: "Créer" });
      if (nom === null) return;
      const r = creerRoutine(nom);
      r.seances.push(seanceDepuisLog(l, l.seanceNom));
      (Etat.data.programmesPerso ||= []).push(r);
      Etat.sauver(); EDIT_ROUTINE = r.id; render();
    });
    liste.append(b);
  });
  sheet.querySelector("#fx").addEventListener("click", () => sheet.remove());
  document.body.append(sheet);
}
function splitLabel(s) { return ({ full_body: "Corps entier", haut_bas: "Haut / Bas", push_pull_legs: "Push · Pull · Legs", mobilite: "Mobilité" }[s] || s); }
const DIFF_LABEL = ["", "Grand débutant", "Débutant", "Intermédiaire", "Avancé"];
/** Patron biomécanique lisible (au lieu de l'identifiant interne « poussee_horizontale »). */
const LIB_PATRON = {
  squat: "Squat", charniere_hanche: "Charnière de hanche", fente: "Fente", poussee_horizontale: "Poussée horizontale",
  poussee_verticale: "Poussée verticale", tirage_horizontal: "Tirage horizontal", tirage_vertical: "Tirage vertical",
  extension_bras: "Extension du coude", flexion_bras: "Flexion du coude", gainage: "Gainage", isolation_jambe: "Isolation jambe", cardio: "Cardio",
};
function estRealisable(exo) {
  const p = Etat.data.profil || {};
  const eq = new Set(p.equipements || []);
  const okEquip = (exo.equipement || []).every((e) => eq.has(e));
  const contre = (exo.contreIndications || []).some((c) => (p.limitations || []).includes(c));
  return okEquip && !contre;
}

/** Planche anatomique wger avec repli propre (liste de muscles) si hors ligne. */
function diagrammeMuscles(exo) {
  const wrap = h(`<div>${muscleDiagram(exo.musclesPrincipaux || [], exo.musclesSecondaires || [])}</div>`);
  let repli = false;
  wrap.querySelectorAll("img.base").forEach((img) => img.addEventListener("error", () => {
    if (repli) return; repli = true;
    wrap.innerHTML = `<div class="hint" style="text-align:center;padding:8px 0">Planche anatomique en cours de chargement (ou indisponible hors ligne).</div>`;
  }));
  return wrap;
}

/** Historique réel d'un exercice (à partir des séances enregistrées). */
function historiqueExercice(exId) {
  const seances = [];
  let maxCharge = 0, totalSeries = 0, best1rm = 0;
  for (const l of Etat.data.logs) {
    const ex = (l.exercices || []).find((e) => e.exerciceId === exId);
    if (!ex) continue;
    const series = ex.series || [];
    seances.push({ date: l.date, series, note: ex.note || null });
    for (const s of series) {
      totalSeries++;
      const c = Number(s.chargeKg) || 0, r = Number(s.reps) || 0;
      if (c > maxCharge) maxCharge = c;
      const e1 = e1rmFiable(c, r); if (e1 > best1rm) best1rm = e1;
    }
  }
  return { seances: seances.reverse(), maxCharge, totalSeries, nbSeances: seances.length, best1rm: Math.round(best1rm) };
}

/** Fiche démonstration PREMIUM (feuille plein écran). */
function ouvrirDetail(exo) {
  // Trace automatique, plafonnée : retrouver l'exercice qu'on vient de
  // consulter ne doit pas demander de retaper son nom.
  if (exo && exo.id) { Etat.data.recentsExo = ajouterRecent(Etat.data.recentsExo, exo.id); Etat.sauver(); }
  const P = new Set(exo.musclesPrincipaux || []), Sec = new Set(exo.musclesSecondaires || []);
  const alts = alternatives(exo.id, Etat.data.profil);
  const diff = exo.difficulte || 2;
  const sheet = h(`<div class="sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  const fermer = () => { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); sheet.remove(); };

  inner.append(h(`<div class="sheet-top"><h2 style="margin:0">${esc(exo.nom)}</h2><button class="chip" id="x">✕ Fermer</button></div>`));
  const nEn = nomAnglais(exo);
  const val = validerExercice(exo);
  // Identité et fiabilité de la fiche : nom d'origine, statut de validation, ce
  // qui reste à compléter. Dire ce qu'on ne sait pas plutôt que l'inventer.
  const idt = h(`<div class="fiche-idt"></div>`);
  if (nEn && nEn.toLowerCase() !== String(exo.nom).toLowerCase()) idt.append(h(`<div class="muted small fiche-en">${esc(nEn)}</div>`));
  const badges = h(`<div class="row fiche-badges"></div>`);
  if (exo.perso) badges.append(h(`<span class="badge fb-perso">Mon exercice</span>`));
  else badges.append(h(`<span class="badge fb-${val.statut}">${LIB_STATUT[val.statut]}</span>`));
  if (exo.corrige) badges.append(h(`<span class="badge">Classement corrigé</span>`));
  idt.append(badges);
  if (!exo.perso && (val.manques.length || val.alertes.length)) {
    idt.append(h(`<div class="small muted fiche-manques">${val.manques.length ? `À compléter : ${esc(val.manques.join(", "))}.` : ""}${val.alertes.length ? ` À vérifier : ${esc(val.alertes.join(" ; "))}.` : ""}</div>`));
  }
  inner.append(idt);
  const actions = h(`<div class="row fiche-actions"></div>`);
  const bAjout = h(`<button class="primary"><span class="btn-ico">${IC.plus}</span>Ajouter à ma séance</button>`);
  bAjout.addEventListener("click", () => ouvrirAjoutSeance(exo));
  actions.append(bAjout);
  if (exo.perso) {
    const bMod = h(`<button class="secondary">Modifier</button>`);
    bMod.addEventListener("click", () => ouvrirEditeurExercice(exo));
    const bSup = h(`<button class="secondary danger-txt">Supprimer</button>`);
    bSup.addEventListener("click", () => supprimerExercicePerso(exo));
    actions.append(bMod, bSup);
  }

  const media = h(`<div class="media"><div class="spin"></div></div>`);
  inner.append(media);

  const equipTxt = (exo.equipement || []).map((e) => EQUIPMENT_LABELS[e] || e).join(" · ");
  inner.append(h(`<div class="det-sub muted">${esc(equipTxt || "Poids du corps")}</div>`));
  inner.append(h(`<div class="row" style="margin-top:10px">
    <span class="difbar" title="Difficulté">${[1, 2, 3, 4].map((i) => `<i class="${i <= diff ? "on" : ""}"></i>`).join("")}</span>
    <span class="pill">${DIFF_LABEL[diff] || "—"}${exo.niveauEstime ? " · estimé" : ""}</span></div>`));
  if (!estRealisable(exo)) inner.append(h(`<div class="warn small" style="margin-top:10px">${mi(IC.alert, "mi-amber")}Pas réalisable avec ton matériel / tes limitations actuels.</div>`));
  inner.append(actions);

  // Sections dépliables plutôt que des onglets : tout le contenu d'un exercice
  // est balayable d'un seul défilement, et l'état d'ouverture est mémorisé d'une
  // fiche à l'autre (on rouvre toujours celle qu'on consulte réellement).
  const rendus = {
    Muscles: () => {
      const f = h(`<div class="stack"></div>`);
      const anat = h(`<div class="sec" style="margin-top:0"></div>`);
      anat.append(diagrammeMuscles(exo));
      const legende = [
        ...(exo.musclesPrincipaux || []).map((m) => `<span class="pill" style="background:#EF4444;color:#fff">${esc(MUSCLE_LABELS[m] || m)}</span>`),
        ...(exo.musclesSecondaires || []).map((m) => `<span class="pill" style="background:#F59E0B;color:#fff">${esc(MUSCLE_LABELS[m] || m)}</span>`),
      ].join("");
      anat.append(h(`<div class="leg">${legende}</div>`));
      f.append(anat);
      if ((exo.equipement || []).length) f.append(h(`<div class="needrow">${exo.equipement.map((e) => `<div class="need"><span class="ic" aria-hidden="true">${iconeMateriel(e)}</span><span>${esc(EQUIPMENT_LABELS[e] || e)}</span></div>`).join("")}</div>`));
      const dl = h(`<div class="deflist"></div>`);
      const ligne = (k, val) => { if (val) dl.append(h(`<div class="spread small"><span class="muted">${k}</span><b>${esc(val)}</b></div>`)); };
      ligne("Équipement", equipTxt);
      ligne("Niveau", DIFF_LABEL[diff]);
      ligne("Catégorie", TYPE_EXO_LABELS[exo.typeExercice] || exo.typeExercice);
      ligne("Mouvement", LIB_PATRON[exo.patron] || exo.patron);
      ligne("Familles", mouvementsDe(exo).map((k) => LIB_MOUVEMENT[k]).join(", "));
      ligne("Type de charge", typeCharge(exo));
      ligne("Latéralité", exo.unilateral ? "Unilatéral (un côté à la fois)" : "Bilatéral");
      ligne("Nom anglais", nomAnglais(exo));
      // Attribution : obligatoire pour wger (CC-BY-SA), utile pour tout import.
      if (exo.source === "wger") ligne("Source", "wger.de — licence CC-BY-SA 4.0");
      else if (exo.source === "free-exercise-db") ligne("Source", "free-exercise-db — domaine public");
      else if (exo.source === "exercises-dataset") ligne("Source", "exercises-dataset (hasaneyldrm) — données MIT");
      else if (exo.perso) ligne("Source", "Créé par toi, enregistré sur cet appareil");
      if (exo.sourceInstructions) ligne("Consignes", exo.sourceInstructions);
      f.append(dl);
      return f;
    },
    Technique: () => {
      const f = h(`<div class="stack"></div>`);
      if ((exo.instructions || []).length) {
        f.append(h(`<ol class="small det-steps">${exo.instructions.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>`));
      }
      if (exo.respiration) f.append(h(`<div class="sec"><h3>Respiration</h3><div class="breath"><span class="in">↧ Inspirer</span><span class="out">↥ Expirer</span></div><div class="small muted" style="margin-top:6px">${esc(exo.respiration)}</div></div>`));
      if ((exo.erreurs || []).length) f.append(h(`<div class="sec"><h3>Erreurs fréquentes</h3><div class="small muted">✖ ${exo.erreurs.map(esc).join(" · ")}</div></div>`));
      if (exo.securite) f.append(h(`<div class="sec"><h3>Sécurité</h3><div class="warn small">${mi(IC.alert, "mi-amber")} ${esc(exo.securite)}</div></div>`));
      if (exo.conseils) f.append(h(`<div class="sec"><h3>Conseils</h3><div class="small">${esc(exo.conseils)}</div></div>`));
      // Repères GÉNÉRAUX de la famille de mouvement, quand la fiche n'a pas les
      // siens : présentés comme tels, jamais comme propres à l'exercice.
      const rep = !exo.respiration && !(exo.erreurs || []).length && !exo.securite ? reperesDe(exo) : null;
      if (rep) {
        f.append(h(`<div class="sec reperes"><h3>Repères généraux du mouvement</h3><div class="muted small" style="margin-bottom:6px">Valables pour toute la famille « ${esc(LIB_MOUVEMENT[rep.famille] || LIB_PATRON[rep.famille] || rep.famille)} », pas propres à cet exercice.</div>
          <div class="small"><b>Respiration</b> — ${esc(rep.respiration)}</div>
          <div class="small" style="margin-top:4px"><b>Erreurs fréquentes</b> — ${rep.erreurs.map(esc).join(" · ")}</div>
          <div class="small" style="margin-top:4px"><b>Sécurité</b> — ${esc(rep.securite)}</div></div>`));
      }
      if (!f.children.length) {
        // Fiches importées sans texte : on dit pourquoi, au lieu de renvoyer
        // vers une démonstration qui n'existe pas.
        const importe = exo.source === "free-exercise-db";
        return h(`<div class="empty-state"><div class="es-ic">${IC.info}</div><b>Consignes à compléter</b><div class="muted small">${importe
          ? "Fiche importée de free-exercise-db (domaine public) : muscles, matériel et niveau sont fournis, pas les consignes, dont la provenance n'est pas documentée. Le schéma ci-dessus montre les muscles travaillés."
          : "Regarde la démonstration en haut de la fiche : elle montre l'amplitude et le rythme."}</div></div>`);
      }
      return f;
    },
    Machines: () => {
      const ms = machinesDe(exo);
      const f = h(`<div class="stack"></div>`);
      const row = h(`<div class="row" style="gap:6px;flex-wrap:wrap"></div>`);
      ms.forEach((m) => { const b = h(`<button class="chip">${esc(m.nom)}</button>`); b.addEventListener("click", () => ouvrirMachine(m.id)); row.append(b); });
      f.append(row);
      const reg = ms.find((m) => estMachineReglable(m) && m.reglages && m.type !== "banc" && m.type !== "cardio") || ms.find((m) => estMachineReglable(m));
      if (reg && reg.reglages) {
        const dl = h(`<div class="card flat stack mach-regl"><div class="eyebrow">Réglages — ${esc(reg.nom)}</div></div>`);
        Object.entries(LIB_REGLAGES).forEach(([k, lab]) => { if (reg.reglages[k]) dl.append(h(`<div class="mr-l"><span class="muted small">${lab}</span><span class="small">${esc(reg.reglages[k])}</span></div>`)); });
        dl.append(h(`<div class="hint">Consignes générales du type de machine : la notice de la machine prime.</div>`));
        f.append(dl);
      }
      return f;
    },
    Alternatives: () => {
      // Variantes du même mouvement (répertoire, sans filtre de matériel) :
      // plus facile, plus difficile, à un bras / une jambe, à deux.
      const v = variantes(exo.id);
      const blocVariantes = () => {
        const groupes = [["plusFacile", "Plus facile"], ["plusDifficile", "Plus difficile"], ["unilaterale", "À un bras / une jambe"], ["bilaterale", "À deux bras / deux jambes"]]
          .filter(([k]) => v[k].length);
        if (!groupes.length) return null;
        const box = h(`<div class="stack var-bloc"><div class="eyebrow">Variantes du mouvement</div></div>`);
        groupes.forEach(([k, lab]) => {
          const ligne = h(`<div class="var-ligne"><span class="small muted">${lab}</span><div class="row"></div></div>`);
          v[k].forEach((e) => {
            const b = h(`<button class="chip var-chip">${esc(e.nom)}</button>`);
            b.addEventListener("click", () => { fermer(); ouvrirDetail(getExercise(e.id)); });
            ligne.querySelector(".row").append(b);
          });
          box.append(ligne);
        });
        return box;
      };
      if (!alts.length) {
        const vide = h(`<div class="stack"><div class="empty-state"><div class="es-ic">${IC.swap}</div><b>Aucune alternative compatible</b><div class="muted small">Avec le matériel et les limitations déclarés dans ton profil, cet exercice n'a pas d'équivalent proche.</div></div></div>`);
        const bv = blocVariantes(); if (bv) vide.append(bv);
        return vide;
      }
      const s = h(`<div class="stack"></div>`);
      alts.forEach((a) => {
        const card = h(`<div class="altcard"><div class="spread"><b class="small">${esc(a.etiquette)}</b><button class="chip" data-alt="${esc(a.exercice.id)}">Ouvrir</button></div>
          <div class="row" style="gap:10px;align-items:center;margin-top:6px">${vignetteHTML(a.exercice, "sm")}
          <span class="small" style="flex:1;min-width:0">${esc(a.exercice.nom)} — <span class="muted">${esc(a.explication)}</span></span></div></div>`);
        card.querySelector("[data-alt]").addEventListener("click", () => { fermer(); ouvrirDetail(getExercise(a.exercice.id)); });
        s.append(card);
      });
      const bv = blocVariantes(); if (bv) s.append(bv);
      return s;
    },
    Progression: () => {
      const hh = historiqueExercice(exo.id);
      if (!hh.nbSeances) {
        return h(`<div class="empty-state"><div class="es-ic">${IC.activity}</div><b>Pas encore de données</b><div class="muted small">Réalise cet exercice en séance : tes meilleures performances et ton historique apparaîtront ici.</div></div>`);
      }
      const f = h(`<div class="stack"></div>`);
      const g = h(`<div class="statgrid"></div>`);
      // Les tuiles suivent ce que l'exercice MESURE : une course n'a ni charge
      // maximale ni 1RM, une planche se juge à sa durée de maintien.
      const mes = mesuresExercice(exo);
      const bp = /** @type {any} */ (meilleuresPerfs(Etat.data.logs)[exo.id] || {});
      if (mes.distance) {
        g.append(statCard(IC.activity, bp.distanceMax ? texteDistance(bp.distanceMax) : "—", "Distance max"));
        // L'unité passe dans le libellé : « 13,3 km/h » ne tient pas dans une
        // demi-tuile à 320 px, « 13,3 » si.
        g.append(statCard(IC.wind, bp.vitesseMax ? (Math.round(bp.vitesseMax * 10) / 10).toLocaleString("fr-FR", { minimumFractionDigits: 1 }) : "—", "Vitesse max km/h"));
        g.append(statCard(IC.clock, bp.dureeMax ? texteDuree(bp.dureeMax) : "—", "Plus longue"));
      } else if (mes.isometrique && bp.dureeMax) {
        g.append(statCard(IC.clock, texteDuree(bp.dureeMax), "Maintien max"));
        g.append(statCard(IC.dumbbell, bp.chargeMax ? uCharge(bp.chargeMax) : "—", "Lest max"));
        g.append(statCard(IC.repeat, `${hh.totalSeries}`, "Séries totales"));
      } else {
        g.append(statCard(IC.dumbbell, uCharge(hh.maxCharge), "Charge max"));
        g.append(statCard(IC.activity, uCharge(hh.best1rm), "1RM estimé"));
        g.append(statCard(IC.repeat, `${hh.totalSeries}`, "Séries totales"));
      }
      g.append(statCard(IC.calendar, `${hh.nbSeances}`, "Séances"));
      f.append(g);
      f.append(h(`<div class="eyebrow" style="margin-top:10px">Dernières séances</div>`));
      hh.seances.slice(0, 8).forEach((s) => {
        const d = new Date(s.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
        const eff = effortMoyen(s.series);
        const detail = s.series.map((x) => texteSerieLog(x, (kg) => uCharge(kg))).join(" · ")
          + (eff.n ? ` · RPE moy. ${String(eff.rpe).replace(".", ",")}` : "");
        f.append(h(`<div style="padding:8px 0;border-bottom:1px solid var(--line)"><div class="eyebrow" style="color:var(--ink-soft)">${d}</div><div class="num small" style="margin-top:2px">${esc(detail)}</div>${s.note ? `<div class="small muted" style="margin-top:2px">« ${esc(s.note)} »</div>` : ""}</div>`));
      });
      return f;
    },
  };
  const corpsFiche = h(`<div class="fiche-sect"></div>`);
  const nbSeances = historiqueExercice(exo.id).nbSeances;
  const SECTIONS = [
    ["Technique", "Technique", (exo.instructions || []).length ? `${exo.instructions.length} étapes` : "", true],
    ["Muscles", "Muscles sollicités", (exo.musclesPrincipaux || []).map((m) => MUSCLE_LABELS[m] || m).join(", "), true],
    ["Machines", "Machine et réglages", machinesDe(exo).slice(0, 2).map((m) => m.nom).join(", "), false],
    ["Progression", "Progression", nbSeances ? `${nbSeances} séance${nbSeances > 1 ? "s" : ""}` : "aucune donnée", false],
    ["Alternatives", "Alternatives", alts.length ? `${alts.length} proposée${alts.length > 1 ? "s" : ""}` : "aucune", false],
  ];
  SECTIONS.forEach(([cle, titre, resume, ouvert]) => {
    section(corpsFiche, `fx-${cle}`, titre, (b) => b.append(rendus[cle]()), { ouvert, resume });
  });
  inner.append(corpsFiche);

  sheet.querySelector("#x").addEventListener("click", fermer);
  document.body.append(sheet);
  chargerMedia(exo, media);
}

/** Charge le média (GIF/vidéo) avec cache local, repli anatomie. */
async function chargerMedia(exo, media) {
  const heroAnatomie = (raison = "") => {
    media.style.aspectRatio = "auto"; media.innerHTML = "";
    const box = h(`<div style="padding:14px;width:100%"></div>`);
    // Toujours dire POURQUOI on est retombé sur le schéma anatomique : un
    // visuel de repli sans explication passe pour un bug.
    if (raison) box.append(h(`<div class="muted small" style="text-align:center;margin-bottom:8px">${esc(raison)}</div>`));
    if (exo.patron) box.append(h(animDemo(exo, { grand: true })));
    box.append(diagrammeMuscles(exo));
    const btn = h(`<button class="chip" style="margin:10px auto 0;display:block">${mi(IC.repeat, "mi-on")}Recharger la démonstration</button>`);
    btn.addEventListener("click", () => {
      delete Etat.data.mediaCache[exo.id]; Etat.sauver();
      media.style.aspectRatio = ""; media.innerHTML = `<div class="spin"></div>`;
      chargerMedia(exo, media);
    });
    box.append(btn);
    media.append(box);
  };
  // Source PRINCIPALE : dataset GitHub (hasaneyldrm/exercises-dataset), puis
  // photo wger. Repli en ligne : ExerciseDB open-source gratuit (best-effort).
  if (exo.media && exo.media.video && /^https:\/\//.test(exo.media.video)) {
    const lien = h(`<a class="chip media-lien" href="${esc(exo.media.video)}" target="_blank" rel="noopener noreferrer">${IC.play}Voir ma vidéo</a>`);
    media.after(lien);
  }
  let url = (exo.media && exo.media.image) || Etat.data.mediaCache[exo.id] || GIFS[exo.id] || (exo.media && exo.media.miniature) || null;
  // Les fiches exercises-dataset reprennent les DONNÉES (MIT) mais pas les
  // médias, propriété de Gym visual : pas de recherche d'animation pour elles.
  if (!url && exo.source !== "exercises-dataset" && !exo.perso) {
    const res = await chercherDemonstration(exo.id, {});
    if (res && res.gifUrl) { url = res.gifUrl; Etat.data.mediaCache[exo.id] = url; Etat.sauver(); }
  }
  if (!media.isConnected) return;           // feuille fermée entre-temps
  if (!url) {
    heroAnatomie(navigator.onLine === false
      ? "Hors ligne : démonstration vidéo indisponible."
      : "Aucune démonstration trouvée pour cet exercice.");
    return;
  }

  const estVideo = /\.(mp4|webm|mov)$/i.test(url);
  const el = estVideo ? h(`<video autoplay loop muted playsinline></video>`) : h(`<img decoding="async" alt="Démonstration : ${esc(exo.nom)}">`);
  // Une requête qui n'aboutit jamais ne déclenche NI `load` NI `error` : sans
  // ce garde-fou, la fiche restait sur son indicateur de chargement à l'infini.
  let regle = false;
  const finir = (fn) => { if (regle) return; regle = true; clearTimeout(tmo); fn(); };
  const tmo = setTimeout(() => finir(() => {
    if (media.isConnected) heroAnatomie("La démonstration n'a pas pu être chargée (connexion lente ou indisponible).");
  }), 9000);
  el.addEventListener(estVideo ? "loadeddata" : "load", () => finir(() => media.querySelector(".spin")?.remove()));
  el.addEventListener("error", () => finir(() => heroAnatomie(
    navigator.onLine === false ? "Hors ligne : démonstration non téléchargée." : "Démonstration indisponible."
  )));
  el.src = url;
  media.insertBefore(el, media.firstChild);
  media.append(controlesMedia(media, el, estVideo));
}

function controlesMedia(media, el, estVideo) {
  const bar = h(`<div class="ctrls"></div>`);
  let paused = false, canvas = null;
  const bPause = h(`<button title="Lecture / pause">⏸</button>`);
  bPause.addEventListener("click", () => {
    if (estVideo) { if (el.paused) { el.play(); bPause.textContent = "⏸"; } else { el.pause(); bPause.textContent = "▶"; } return; }
    if (!paused) { // figer le GIF sur la frame courante
      canvas = document.createElement("canvas");
      canvas.width = el.naturalWidth || 320; canvas.height = el.naturalHeight || 320;
      canvas.style.cssText = "width:100%;height:100%;object-fit:contain";
      try { canvas.getContext("2d").drawImage(el, 0, 0, canvas.width, canvas.height); } catch (e) {}
      el.style.display = "none"; media.insertBefore(canvas, media.firstChild); paused = true; bPause.textContent = "▶";
    } else { canvas?.remove(); el.style.display = ""; paused = false; bPause.textContent = "⏸"; }
  });
  const bFs = h(`<button title="Plein écran">⛶</button>`);
  bFs.addEventListener("click", () => { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); else media.requestFullscreen?.().catch(() => {}); });
  bar.append(bPause, bFs);
  const spd = h(`<span class="spd"></span>`);
  [0.5, 1, 2].forEach((r) => {
    const b = h(`<button class="${r === 1 ? "on" : ""} ${estVideo ? "" : "dim"}">x${r}</button>`);
    b.title = estVideo ? `Vitesse ${r}×` : "Réglage de vitesse disponible pour les vidéos";
    b.addEventListener("click", () => { if (!estVideo) return; el.playbackRate = r; spd.querySelectorAll("button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); });
    spd.append(b);
  });
  bar.append(spd);
  return bar;
}

/* ======================================================================
   CATALOGUE / RECHERCHE D'EXERCICES
   ====================================================================== */
let CAT_SIL = false; // silhouette de recherche dépliée dans le catalogue
/** Filtres vides (on garde éventuellement la recherche). @param {string} [q] */
function filtresCatVides(q = "") {
  return { q, muscle: "", equip: "", niveau: "", type: "", machine: "", groupe: "", muscle2: "", mouvement: "", poly: "", statut: "", sansMateriel: false, perso: false };
}
let CAT_FILTRE = filtresCatVides();
/** Clés de filtre comptées comme « filtres actifs » (hors recherche). */
const CLES_FILTRE = ["muscle", "equip", "niveau", "type", "machine", "groupe", "muscle2", "mouvement", "poly", "statut", "sansMateriel", "perso"];
/** Types d'exercice tels que l'utilisateur les nomme. */
const TYPE_EXO_LABELS = { force: "Force", hypertrophie: "Hypertrophie", isolation: "Isolation", gainage: "Gainage", cardio: "Cardio", mobilite: "Mobilité" };
/** Grille ou liste. La grille met les démonstrations en avant, la liste tient
 *  plus d'exercices à l'écran : les deux ont leur usage, aucun n'est « le bon ». */
// Liste par défaut, comme l'onglet Exercices de FitAI : une ligne montre le
// nom complet, le muscle et le niveau, là où la grille ne montre qu'une image
// et un nom tronqué. La grille reste à un tap, le choix n'est pas retiré.
let CAT_VUE = "liste";
let CAT_TRI = "pertinence";
let CAT_FAVORIS_SEUL = false;
function vCatalogue(v) {
  if (!catalogueEtenduCharge()) chargerCatalogueEtendu().then(() => render());
  const tete = h(`<div class="spread"><h1>Bibliothèque d'exercices</h1><span class="pill">${CATALOGUE.length.toLocaleString("fr-FR")} exercices</span></div>`);
  v.append(tete);
  const inp = h(`<input id="catQ" type="search" placeholder="Rechercher (ex : rowing, squat, presse…)" value="${esc(CAT_FILTRE.q)}" aria-label="Rechercher un exercice">`);
  v.append(inp);
  // Trois portes d'entrée visuelles, comme dans les bibliothèques de coaching :
  // on choisit un muscle, un équipement ou une machine, la liste suit.
  const explo = h(`<div class="cat-explore"></div>`);
  [["muscle", "Par muscle", IC.map, "Choisir sur le corps"], ["equip", "Par équipement", IC.dumbbell, `${GROUPES_EQUIPEMENT.length} familles`], ["machine", "Par machine", IC.layers, `${MACHINES.length} machines et équipements`]]
    .forEach(([k, t, ic, sous]) => {
      const b = h(`<button class="cat-explo-btn"><span class="cx-ic" aria-hidden="true">${ic}</span><span class="cx-t">${t}</span><span class="cx-s muted">${sous}</span></button>`);
      b.addEventListener("click", () => (k === "muscle" ? ouvrirExplorerMuscles() : k === "equip" ? ouvrirExplorerEquipement() : ouvrirListeMachines()));
      explo.append(b);
    });
  v.append(explo);

  const muscles = [...new Set(CATALOGUE.flatMap((e) => e.musclesPrincipaux))].sort();
  const equips = [...new Set(CATALOGUE.flatMap((e) => e.equipement))].sort();
  // Seules les valeurs réellement présentes dans le catalogue deviennent des
  // pastilles : un filtre qui mène toujours à « aucun résultat » est un piège.
  const niveaux = [...new Set(CATALOGUE.map((e) => String(e.difficulte || "")).filter(Boolean))].sort();
  const NIV_LABELS = { 1: DIFF_LABEL[1], 2: DIFF_LABEL[2], 3: DIFF_LABEL[3], 4: DIFF_LABEL[4] };
  const types = Object.keys(TYPE_EXO_LABELS).filter((t) => CATALOGUE.some((e) => e.typeExercice === t));
  const filtreLigne = (items, cle, labels) => {
    const box = h(`<div class="row cat-fline"></div>`);
    const tout = h(`<button class="chip ${!CAT_FILTRE[cle] ? "on" : ""}">Tous</button>`);
    tout.addEventListener("click", () => { CAT_FILTRE[cle] = ""; render(); });
    box.append(tout);
    for (const it of items) {
      const b = h(`<button class="chip ${CAT_FILTRE[cle] === it ? "on" : ""}">${esc(labels[it] || it)}</button>`);
      b.addEventListener("click", () => { CAT_FILTRE[cle] = CAT_FILTRE[cle] === it ? "" : it; render(); });
      box.append(b);
    }
    return box;
  };
  // LES FILTRES SONT DANS UNE FEUILLE, PLUS DANS LA PAGE.
  //
  // Avant : titre, recherche, silhouette dépliable, une ligne de 13 pastilles de
  // muscle, une ligne de 9 pastilles de matériel, une barre d'outils. Soit ~520 px
  // — un écran entier de téléphone — traversés AVANT de voir un seul exercice.
  // Sur un catalogue de 343 mouvements avec 281 démonstrations animées, c'est
  // exactement l'inverse de ce qu'il faut : les images doivent arriver en
  // premier. Rien n'est retiré : tout est à un tap, et les filtres actifs
  // restent visibles et retirables dans la page.
  const construireFiltres = (hote) => {
    hote.append(silBox);
    hote.append(h(`<div class="eyebrow" style="margin-top:14px">Muscle</div>`));
    hote.append(filtreLigne(muscles, "muscle", MUSCLE_LABELS));
    hote.append(h(`<div class="eyebrow" style="margin-top:12px">Matériel</div>`));
    hote.append(filtreLigne(equips, "equip", EQUIPMENT_LABELS));
    hote.append(h(`<div class="eyebrow" style="margin-top:12px">Niveau</div>`));
    hote.append(filtreLigne(niveaux, "niveau", NIV_LABELS));
    hote.append(h(`<div class="eyebrow" style="margin-top:12px">Type d'exercice</div>`));
    hote.append(filtreLigne(types, "type", TYPE_EXO_LABELS));
    hote.append(h(`<div class="eyebrow" style="margin-top:12px">Famille d'équipement</div>`));
    hote.append(filtreLigne(GROUPES_EQUIPEMENT.map((g) => g.cle), "groupe", Object.fromEntries(GROUPES_EQUIPEMENT.map((g) => [g.cle, g.nom]))));
    hote.append(h(`<div class="eyebrow" style="margin-top:12px">Machine</div>`));
    const selM = h(`<select class="selchip cat-selm" aria-label="Filtrer par machine"><option value="">Toutes les machines</option>${MACHINES.map((m) => `<option value="${m.id}"${CAT_FILTRE.machine === m.id ? " selected" : ""}>${esc(m.nom)}</option>`).join("")}</select>`);
    selM.addEventListener("change", () => { CAT_FILTRE.machine = selM.value; render(); });
    hote.append(selM);
    hote.append(h(`<div class="eyebrow" style="margin-top:12px">Mouvement</div>`));
    hote.append(filtreLigne(MOUVEMENTS.filter((k) => k !== "isolation" && k !== "polyarticulaire"), "mouvement", LIB_MOUVEMENT));
    hote.append(h(`<div class="eyebrow" style="margin-top:12px">Polyarticulaire ou isolation</div>`));
    hote.append(filtreLigne(["poly", "iso"], "poly", { poly: "Polyarticulaires", iso: "Isolation" }));
    hote.append(h(`<div class="eyebrow" style="margin-top:12px">Muscle secondaire</div>`));
    hote.append(filtreLigne(muscles, "muscle2", MUSCLE_LABELS));
    hote.append(h(`<div class="eyebrow" style="margin-top:12px">Fiabilité de la fiche</div>`));
    hote.append(filtreLigne(["valide", "a_verifier", "incomplet"], "statut", LIB_STATUT));
    const bascules = h(`<div class="row cat-fline" style="margin-top:12px"></div>`);
    [["sansMateriel", "Sans matériel"], ["perso", "Mes exercices"]].forEach(([k, lab]) => {
      const b = h(`<button class="chip ${CAT_FILTRE[k] ? "on" : ""}" aria-pressed="${!!CAT_FILTRE[k]}">${lab}</button>`);
      b.addEventListener("click", () => { CAT_FILTRE[k] = !CAT_FILTRE[k]; render(); });
      bascules.append(b);
    });
    hote.append(bascules);
  };

  // Recherche par silhouette : toucher un muscle sur le corps filtre la liste.
  // Plus direct qu'un bandeau de 12 pastilles quand on cherche « le muscle
  // là », sans savoir comment il s'appelle.
  const silBox = h(`<div class="card cat-sil"></div>`);
  const silHead = h(`<button class="spread cat-sil-head" aria-expanded="${CAT_SIL ? "true" : "false"}"><span class="sect-t">Chercher sur le corps${CAT_FILTRE.muscle ? `<span class="sect-r muted">${esc(MUSCLE_LABELS[CAT_FILTRE.muscle] || CAT_FILTRE.muscle)}</span>` : ""}</span><span class="sect-chev">${IC.chevron}</span></button>`);
  const silCorps = h(`<div class="cat-sil-body"></div>`);
  if (!CAT_SIL) silCorps.hidden = true; else silBox.classList.add("on");
  // Le muscle filtré est mis en avant, les autres restent neutres.
  /** @type {Record<string, number>} */
  const inten = {};
  if (CAT_FILTRE.muscle) inten[CAT_FILTRE.muscle] = 1;
  silCorps.innerHTML = muscleHeatmap(inten);
  silCorps.append(h(`<div class="muted small" style="text-align:center;margin-top:4px">Touche un muscle pour filtrer</div>`));
  silCorps.addEventListener("click", (ev) => {
    const g = ev.target.closest("g[data-m]");
    if (!g) return;
    const m = g.getAttribute("data-m");
    CAT_FILTRE.muscle = CAT_FILTRE.muscle === m ? "" : m;
    render();
  });
  // Repli LOCAL, sans `render()`. Redessiner tout l'écran pour ouvrir un panneau
  // était déjà du gaspillage ; depuis que la silhouette vit dans une feuille,
  // c'était devenu un bug : `render()` reconstruisait un silBox neuf dans la
  // page pendant que la feuille gardait l'ancien, définitivement figé.
  silHead.addEventListener("click", () => {
    CAT_SIL = !CAT_SIL;
    silCorps.hidden = !CAT_SIL;
    silBox.classList.toggle("on", CAT_SIL);
    silHead.setAttribute("aria-expanded", String(CAT_SIL));
  });
  silBox.append(silHead, silCorps);

  // Rangée « Récemment consultés » : avec 343 exercices, retrouver celui qu'on
  // vient d'ouvrir demandait de retaper son nom. Masquée pendant une recherche,
  // où elle ne ferait que du bruit.
  const recents = resoudreIds(Etat.data.recentsExo || [], getExercise);
  if (recents.length && !CAT_FILTRE.q && !CAT_FAVORIS_SEUL) {
    v.append(h(`<div class="eyebrow" style="margin-top:12px">Récemment consultés</div>`));
    const rr = h(`<div class="row scrollx cat-recents"></div>`);
    recents.forEach((e, i) => {
      const b = h(`<button class="cat-recent">${vignetteHTML(e, "sm")}<span>${esc(e.nom)}</span></button>`);
      b.addEventListener("click", () => ouvrirDetail(e));
      rr.append(b);
    });
    v.append(rr);
  }

  // Barre d'outils : affichage, tri, favoris. Trois décisions qui changent la
  // lecture de la liste, réunies au même endroit plutôt que dispersées.
  const outils = h(`<div class="cat-outils"></div>`);
  const nbFiltres = CLES_FILTRE.filter((k) => CAT_FILTRE[k]).length;
  const bFiltre = h(`<button class="chip cat-filtrer${nbFiltres ? " on" : ""}" aria-haspopup="dialog">${IC.sliders || IC.layers}<span>Filtrer${nbFiltres ? ` · ${nbFiltres}` : ""}</span></button>`);
  bFiltre.addEventListener("click", () => ouvrirFiltresCatalogue(construireFiltres));
  outils.append(bFiltre);
  const bVue = h(`<button class="chip cat-vue" aria-pressed="${CAT_VUE === "grille"}" aria-label="Affichage : ${CAT_VUE === "grille" ? "grille" : "liste"} (toucher pour changer)" title="Grille ou liste">${CAT_VUE === "grille" ? IC.layers : IC.bars}</button>`);
  bVue.addEventListener("click", () => { CAT_VUE = CAT_VUE === "grille" ? "liste" : "grille"; render(); });
  const nbFav = (Etat.data.favoris || []).length;
  const bFav = h(`<button class="chip${CAT_FAVORIS_SEUL ? " on" : ""}" aria-pressed="${CAT_FAVORIS_SEUL}">${IC.star}<span>Favoris${nbFav ? " · " + nbFav : ""}</span></button>`);
  bFav.addEventListener("click", () => { CAT_FAVORIS_SEUL = !CAT_FAVORIS_SEUL; montres = PAS; render(); });
  const selTri = h(`<select class="selchip" aria-label="Trier les exercices">${TRIS.map((t) => `<option value="${t.cle}"${t.cle === CAT_TRI ? " selected" : ""}>${esc(t.nom)}</option>`).join("")}</select>`);
  selTri.addEventListener("change", () => { CAT_TRI = selTri.value; render(); });
  // Le tri ne vit PAS dans cette barre : à 390 px, quatre commandes passaient à
  // la ligne et le sélecteur se retrouvait seul, au milieu de nulle part. Il
  // rejoint le compteur de résultats, avec qui il forme une paire naturelle —
  // « 343 résultats, triés par pertinence ».
  const bCree = h(`<button class="chip cat-creer" aria-label="Créer un exercice" title="Créer un exercice">${IC.plus}</button>`);
  bCree.addEventListener("click", () => ouvrirEditeurExercice(null));
  outils.append(bVue, bFav, bCree);
  v.append(outils);

  // Les filtres actifs restent DANS la page, retirables d'un tap. Un filtre
  // caché dans une feuille qu'on a refermée est un filtre qu'on oublie, et on
  // finit par croire que le catalogue ne contient que 40 exercices.
  if (nbFiltres) {
    const actifs = h(`<div class="cat-actifs"></div>`);
    const puce = (cle, label) => {
      const b = h(`<button class="chip on cat-actif" aria-label="Retirer le filtre ${esc(label)}">${esc(label)}<span aria-hidden="true">✕</span></button>`);
      b.addEventListener("click", () => { CAT_FILTRE[cle] = typeof CAT_FILTRE[cle] === "boolean" ? false : ""; render(); });
      return b;
    };
    if (CAT_FILTRE.muscle) actifs.append(puce("muscle", MUSCLE_LABELS[CAT_FILTRE.muscle] || CAT_FILTRE.muscle));
    if (CAT_FILTRE.equip) actifs.append(puce("equip", EQUIPMENT_LABELS[CAT_FILTRE.equip] || CAT_FILTRE.equip));
    if (CAT_FILTRE.niveau) actifs.append(puce("niveau", NIV_LABELS[CAT_FILTRE.niveau] || CAT_FILTRE.niveau));
    if (CAT_FILTRE.type) actifs.append(puce("type", TYPE_EXO_LABELS[CAT_FILTRE.type] || CAT_FILTRE.type));
    if (CAT_FILTRE.groupe) actifs.append(puce("groupe", (GROUPES_EQUIPEMENT.find((g) => g.cle === CAT_FILTRE.groupe) || {}).nom || CAT_FILTRE.groupe));
    if (CAT_FILTRE.machine) actifs.append(puce("machine", (MACHINES_PAR_ID[CAT_FILTRE.machine] || {}).nom || CAT_FILTRE.machine));
    if (CAT_FILTRE.mouvement) actifs.append(puce("mouvement", LIB_MOUVEMENT[CAT_FILTRE.mouvement] || CAT_FILTRE.mouvement));
    if (CAT_FILTRE.poly) actifs.append(puce("poly", CAT_FILTRE.poly === "poly" ? "Polyarticulaires" : "Isolation"));
    if (CAT_FILTRE.muscle2) actifs.append(puce("muscle2", `Secondaire : ${MUSCLE_LABELS[CAT_FILTRE.muscle2] || CAT_FILTRE.muscle2}`));
    if (CAT_FILTRE.statut) actifs.append(puce("statut", LIB_STATUT[CAT_FILTRE.statut]));
    if (CAT_FILTRE.sansMateriel) actifs.append(puce("sansMateriel", "Sans matériel"));
    if (CAT_FILTRE.perso) actifs.append(puce("perso", "Mes exercices"));
    const bRaz = h(`<button class="chip cat-raz">Réinitialiser</button>`);
    bRaz.addEventListener("click", () => { CAT_FILTRE = filtresCatVides(CAT_FILTRE.q); render(); });
    actifs.append(bRaz);
    v.append(actifs);
  }

  const res = h(`<div id="catRes" style="margin-top:10px"></div>`);
  v.append(res);
  // Affichage progressif : rendre les 343 exercices d'un coup produisait une
  // page de 8 écrans et un DOM inutilement lourd.
  const PAS = 20;
  let montres = PAS;
  const dessine = () => {
    let tous = chercherCatalogue(CAT_FILTRE);
    const favs = Etat.data.favoris || [];
    if (CAT_FAVORIS_SEUL) tous = tous.filter((e) => favs.includes(e.id));
    tous = ordonner(tous, { favoris: favs, tri: CAT_TRI, usage: CAT_TRI === "populaire" ? usageExercices() : undefined });
    const list = tous.slice(0, montres);
    res.innerHTML = "";
    if (!tous.length) {
      res.append(etatVide(illustration("recherche"),
        CAT_FAVORIS_SEUL ? "Aucun favori pour l'instant" : "Aucun exercice ne correspond",
        CAT_FAVORIS_SEUL ? "Touche l'étoile sur un exercice pour le retrouver ici." : "Les filtres se cumulent : retire le matériel, le muscle, le niveau ou le type pour élargir.",
        { action: { label: CAT_FAVORIS_SEUL ? "Voir tous les exercices" : "Réinitialiser les filtres",
          onClick: () => { CAT_FAVORIS_SEUL = false; CAT_FILTRE = filtresCatVides(); render(); } } }));
      return;
    }
    const barreRes = h(`<div class="cat-resbar"><span class="muted small">${tous.length} résultat${tous.length > 1 ? "s" : ""}</span></div>`);
    barreRes.append(selTri);
    res.append(barreRes);

    const favoris = Etat.data.favoris || [];
    /** Étoile de favori, posée sur la vignette en grille, en bout de ligne en liste. */
    const etoile = (e) => {
      const on = favoris.includes(e.id);
      const b = h(`<button class="cat-fav${on ? " on" : ""}" aria-pressed="${on}" aria-label="${on ? "Retirer" : "Ajouter"} ${esc(e.nom)} des favoris">${IC.star}</button>`);
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();          // sans quoi la fiche s'ouvre aussi
        Etat.data.favoris = basculerFavori(Etat.data.favoris, e.id);
        Etat.sauver(); render();
      });
      return b;
    };

    if (CAT_VUE === "grille") {
      const g = h(`<div class="cat-grille"></div>`);
      list.forEach((e, i) => {
        const carte = h(`<button class="cat-carte">
          <span class="cat-media">${vignetteHTML(e, "lg")}</span>
          <span class="cat-nom">${esc(e.nom)}</span>
          <span class="cat-meta muted">${esc((e.musclesPrincipaux || []).map((m) => MUSCLE_LABELS[m] || m)[0] || "")}</span>
        </button>`);
        // Chargement progressif : 343 vignettes chargées d'un coup, c'est des
        // dizaines de Mo sur un forfait mobile et un écran figé.
        const img = carte.querySelector("img.exo-gif");
        if (img) { const c = chargementMedia(i); img.loading = c.loading; img.setAttribute("fetchpriority", c.fetchpriority); }
        carte.addEventListener("click", () => ouvrirDetail(e));
        const w = h(`<div class="cat-case"></div>`);
        w.append(carte, etoile(e));
        g.append(w);
      });
      res.append(g);
    } else {
      list.forEach((e, i) => {
        // Toute la ligne est cliquable : cible tactile bien plus large qu'un
        // petit bouton en bout de ligne.
        // Mise en page reprise des listes de FitAI : vignette blanche, nom,
        // muscle, puis la barre de niveau à cinq segments. Le chevron disparaît
        // — toute la ligne est déjà cliquable, il ne faisait que prendre la
        // place où l'étoile de favori doit se trouver.
        // Échelle 1 à 4, la même que la fiche d'exercice (DIFF_LABEL) : cinq
        // points laissaient croire qu'aucun exercice n'était « avancé ».
        const niv = Math.max(1, Math.min(4, e.difficulte || 1));
        const row = h(`<button class="exline">
          <span class="lx-vig">${vignetteHTML(e, "sm")}</span>
          <span class="meta"><span class="nm">${esc(e.nom)}</span>
            <span class="muted small">${e.musclesPrincipaux.map((m) => MUSCLE_LABELS[m] || m).join(", ")} · ${e.equipement.map((q) => EQUIPMENT_LABELS[q] || q).join(", ")}${e.perso ? ` · <span class="tag tag-perso">perso</span>` : e.source === "wger" ? ` · <span class="tag">wger</span>` : ""}${!e.perso && validerExercice(e).statut === "incomplet" ? ` · <span class="tag tag-inc">consignes à venir</span>` : ""}</span>
            <span class="lx-niv" role="img" aria-label="Niveau ${niv} sur 4 : ${DIFF_LABEL[niv]}">${
              [1, 2, 3, 4].map((i) => `<i${i <= niv ? ' class="on"' : ""}></i>`).join("")}</span></span>
          </button>`);
        const img = row.querySelector("img.exo-gif");
        if (img) { const c = chargementMedia(i); img.loading = c.loading; img.setAttribute("fetchpriority", c.fetchpriority); }
        row.addEventListener("click", () => ouvrirDetail(e));
        const ligne = h(`<div class="cat-ligne"></div>`);
        ligne.append(row, etoile(e));
        res.append(ligne);
      });
    }
    if (tous.length > montres) {
      const plus = h(`<button class="secondary" style="width:100%;margin-top:10px">Voir ${Math.min(PAS, tous.length - montres)} exercices de plus</button>`);
      plus.addEventListener("click", () => { montres += PAS; dessine(); });
      res.append(plus);
    }
  };
  dessine();
  inp.addEventListener("input", () => { CAT_FILTRE.q = inp.value; montres = PAS; dessine(); });
}

/**
 * Feuille de filtres du catalogue. Elle héberge exactement ce qui était dans la
 * page : la silhouette cliquable, les muscles et le matériel. Un tap sur une
 * pastille appelle `render()`, ce qui referme la feuille et redessine la liste —
 * on voit immédiatement le résultat au lieu de rester devant ses filtres.
 *
 * @param {(hote:HTMLElement)=>void} remplir
 */
function ouvrirFiltresCatalogue(remplir) {
  const sheet = h(`<div class="sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0">Filtrer</h2><button class="chip" id="cfX">✕ Fermer</button></div>`));
  remplir(inner);
  // Choisir un filtre referme la feuille. Rester devant ses réglages après avoir
  // choisi oblige à un second geste pour voir ce qu'on a obtenu — et on finit
  // par empiler des critères à l'aveugle. Le gestionnaire de la pastille a déjà
  // appelé `render()` quand l'événement remonte ici : la liste est prête.
  inner.addEventListener("click", (ev) => {
    if (ev.target.closest(".cat-fline .chip") || ev.target.closest("g[data-m]")) sheet.remove();
  });
  const raz = h(`<button class="secondary" style="width:100%;margin-top:18px">Tout réinitialiser</button>`);
  raz.addEventListener("click", () => { CAT_FILTRE = filtresCatVides(CAT_FILTRE.q); render(); sheet.remove(); });
  inner.append(raz);
  sheet.querySelector("#cfX").addEventListener("click", () => sheet.remove());
  sheet.addEventListener("click", (ev) => { if (ev.target === sheet) sheet.remove(); });
  document.body.append(sheet);
}

/* ---------------- Bibliothèque : popularité, exploration, machines ---------------- */
let _usage = null, _usageN = -1;
/** Nombre de séances par exercice, recalculé seulement quand l'historique change. */
function usageExercices() {
  const n = (Etat.data.logs || []).length;
  if (n !== _usageN) { _usage = compterUsage(Etat.data.logs); _usageN = n; }
  return _usage;
}

/** Feuille générique de la bibliothèque. Renvoie { inner, fermer }. */
function feuilleBiblio(titre, sousTitre = "") {
  const sheet = h(`<div class="sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  const fermer = () => sheet.remove();
  const top = h(`<div class="sheet-top"><div style="min-width:0"><h2 style="margin:0">${esc(titre)}</h2>${sousTitre ? `<div class="muted small">${esc(sousTitre)}</div>` : ""}</div><button class="chip">✕ Fermer</button></div>`);
  top.querySelector("button").addEventListener("click", fermer);
  inner.append(top);
  sheet.addEventListener("click", (ev) => { if (ev.target === sheet) fermer(); });
  document.body.append(sheet);
  return { inner, fermer };
}

/** Applique un filtre à la bibliothèque et l'affiche. */
function filtrerBibliotheque(patch) {
  CAT_FILTRE = { ...filtresCatVides(), ...patch };
  CAT_FAVORIS_SEUL = false;
  document.querySelectorAll(".sheet").forEach((x) => x.remove());
  if (TAB !== "cat") nav("cat"); else render();
}

function ouvrirExplorerMuscles() {
  const { inner } = feuilleBiblio("Par muscle", "Touche un muscle sur le corps ou dans la liste");
  const corps = h(`<div class="cat-sil-body expl-corps"></div>`);
  corps.innerHTML = muscleHeatmap({});
  corps.addEventListener("click", (ev) => { const g = ev.target.closest("g[data-m]"); if (g) filtrerBibliotheque({ muscle: g.getAttribute("data-m") }); });
  inner.append(corps);
  const liste = h(`<div class="expl-liste"></div>`);
  const muscles = [...new Set(CATALOGUE.flatMap((e) => e.musclesPrincipaux))]
    .map((m) => [m, chercherCatalogue({ muscle: m }).length]).sort((a, b) => b[1] - a[1]);
  muscles.forEach(([m, n]) => {
    const b = h(`<button class="expl-ligne"><span>${esc(MUSCLE_LABELS[m] || m)}</span><span class="muted small num">${n.toLocaleString("fr-FR")}</span></button>`);
    b.addEventListener("click", () => filtrerBibliotheque({ muscle: m }));
    liste.append(b);
  });
  inner.append(liste);
}

const ICONE_GROUPE = { banc: "banc", halteres: "halteres", barre: "barre", machine: "machine_guidee", poulie: "poulie", smith: "smith", poids_du_corps: "poids_du_corps", cardio: "tapis_course", accessoire: "elastiques" };

function ouvrirExplorerEquipement() {
  const { inner } = feuilleBiblio("Par équipement", "Choisis une famille, puis une machine ou tous ses exercices");
  const grille = h(`<div class="expl-grille"></div>`);
  const detail = h(`<div class="expl-detail"></div>`);
  GROUPES_EQUIPEMENT.forEach((g) => {
    const n = chercherCatalogue({ groupe: g.cle }).length;
    const b = h(`<button class="expl-tuile"><span class="ic" aria-hidden="true">${iconeMateriel(ICONE_GROUPE[g.cle])}</span><b>${esc(g.nom)}</b><span class="muted small num">${n.toLocaleString("fr-FR")} exercices</span></button>`);
    b.addEventListener("click", () => {
      grille.querySelectorAll(".expl-tuile").forEach((x) => x.classList.toggle("on", x === b));
      detail.innerHTML = "";
      const tout = h(`<button class="primary expl-tout">Voir les ${n.toLocaleString("fr-FR")} exercices « ${esc(g.nom)} »</button>`);
      tout.addEventListener("click", () => filtrerBibliotheque({ groupe: g.cle }));
      detail.append(tout);
      MACHINES.filter((m) => m.groupe === g.cle).forEach((m) => detail.append(carteMachine(m)));
      detail.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    grille.append(b);
  });
  inner.append(grille, detail);
}

/** Carte d'une machine (nom, type, nombre d'exercices). */
function carteMachine(m) {
  const n = exercicesDeMachine(m.id, CATALOGUE).length;
  const b = h(`<button class="mach-carte"><span class="ic" aria-hidden="true">${iconeMateriel(ICONE_GROUPE[m.groupe])}</span><span class="mc-txt"><b>${esc(m.nom)}</b><span class="muted small">${esc(m.nomEn)} · ${n.toLocaleString("fr-FR")} exercice${n > 1 ? "s" : ""}</span></span><span class="mc-chev" aria-hidden="true">${IC.chevron}</span></button>`);
  b.addEventListener("click", () => ouvrirMachine(m.id));
  return b;
}

function ouvrirListeMachines() {
  const { inner } = feuilleBiblio("Machines et équipements", `${MACHINES.length} entrées · recherche par nom français ou anglais`);
  const q = h(`<input type="search" placeholder="Rechercher une machine (presse, pec deck, poulie…)" aria-label="Rechercher une machine">`);
  const liste = h(`<div class="stack" style="margin-top:10px"></div>`);
  const sansAcc = (x) => String(x).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const dessine = () => {
    liste.innerHTML = "";
    const t = sansAcc(q.value.trim());
    GROUPES_EQUIPEMENT.forEach((g) => {
      const ms = MACHINES.filter((m) => m.groupe === g.cle && (!t || sansAcc(`${m.nom} ${m.nomEn} ${m.description}`).includes(t)));
      if (!ms.length) return;
      liste.append(h(`<div class="eyebrow" style="margin-top:8px">${esc(g.nom)}</div>`));
      ms.forEach((m) => liste.append(carteMachine(m)));
    });
    if (!liste.children.length) liste.append(h(`<div class="notice small">Aucune machine ne correspond à « ${esc(q.value)} ».</div>`));
  };
  q.addEventListener("input", dessine);
  inner.append(q, liste);
  dessine();
}

const LIB_REGLAGES = { siege: "Siège", dossier: "Dossier", pieds: "Pieds", mains: "Mains", amplitude: "Amplitude", depart: "Position de départ", trajectoire: "Trajectoire", fin: "Position finale", securite: "Sécurité" };

function ouvrirMachine(id) {
  const m = MACHINES_PAR_ID[id];
  if (!m) return;
  const exos = exercicesDeMachine(id, CATALOGUE);
  const { inner } = feuilleBiblio(m.nom, m.nomEn);
  inner.append(h(`<p class="small" style="margin:6px 0 10px">${esc(m.description)}</p>`));
  if (m.muscles.length) inner.append(h(`<div class="row" style="gap:6px;flex-wrap:wrap">${m.muscles.map((x) => `<span class="pill">${esc(MUSCLE_LABELS[x] || x)}</span>`).join("")}</div>`));
  if (m.reglages) {
    const dl = h(`<div class="card flat stack mach-regl"><div class="eyebrow">Réglages et consignes</div></div>`);
    Object.entries(LIB_REGLAGES).forEach(([k, lab]) => { if (m.reglages[k]) dl.append(h(`<div class="mr-l"><span class="muted small">${lab}</span><span class="small">${esc(m.reglages[k])}</span></div>`)); });
    dl.append(h(`<div class="hint">Consignes générales du type de machine : la notice affichée sur la machine prime.</div>`));
    inner.append(dl);
  }
  if ((m.variantes || []).length) inner.append(h(`<div class="small" style="margin-top:8px"><span class="muted">Variantes : </span>${m.variantes.map(esc).join(" · ")}</div>`));
  // Filtre par muscle À L'INTÉRIEUR de la machine : « presse à jambes » → « fessiers ».
  const muscles = [...new Set(exos.flatMap((e) => e.musclesPrincipaux))];
  let mFiltre = "";
  const chips = h(`<div class="row scrollx" style="gap:6px;margin-top:12px"></div>`);
  const liste = h(`<div class="stack" style="margin-top:8px"></div>`);
  const dessine = () => {
    chips.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", (c.dataset.m || "") === mFiltre));
    liste.innerHTML = "";
    const l = mFiltre ? exos.filter((e) => e.musclesPrincipaux.includes(mFiltre)) : exos;
    liste.append(h(`<div class="eyebrow">${l.length.toLocaleString("fr-FR")} exercice${l.length > 1 ? "s" : ""} réalisable${l.length > 1 ? "s" : ""}</div>`));
    l.slice(0, 60).forEach((e) => {
      const b = h(`<button class="exline">${`<span class="lx-vig">${vignetteHTML(e, "sm")}</span>`}<span class="meta"><span class="nm">${esc(e.nom)}</span><span class="muted small">${e.musclesPrincipaux.map((x) => MUSCLE_LABELS[x] || x).join(", ")}</span></span></button>`);
      b.addEventListener("click", () => ouvrirDetail(e));
      liste.append(b);
    });
    if (l.length > 60) {
      const plus = h(`<button class="secondary" style="width:100%">Voir les ${l.length} dans la bibliothèque</button>`);
      plus.addEventListener("click", () => filtrerBibliotheque({ machine: id, muscle: mFiltre }));
      liste.append(plus);
    }
  };
  if (muscles.length > 1) {
    const tous = h(`<button class="chip on" data-m="">Tous</button>`);
    tous.addEventListener("click", () => { mFiltre = ""; dessine(); });
    chips.append(tous);
    muscles.forEach((x) => { const c = h(`<button class="chip" data-m="${x}">${esc(MUSCLE_LABELS[x] || x)}</button>`); c.addEventListener("click", () => { mFiltre = mFiltre === x ? "" : x; dessine(); }); chips.append(c); });
    inner.append(chips);
  }
  inner.append(liste);
  const bLib = h(`<button class="secondary" style="width:100%;margin-top:10px">Filtrer la bibliothèque sur cette machine</button>`);
  bLib.addEventListener("click", () => filtrerBibliotheque({ machine: id, muscle: mFiltre }));
  inner.append(bLib);
  dessine();
}

/* ---------------- Ajouter un exercice à une séance ---------------- */
function ouvrirAjoutSeance(exo) {
  const { inner, fermer } = feuilleBiblio("Ajouter à ma séance", exo.nom);
  const routines = (Etat.data.programmesPerso || []).filter((r) => !r.archive);
  const mes = mesuresExercice(exo);
  const best1rm = historiqueExercice(exo.id).best1rm || 0;
  const opts = [];
  if (LIVE) opts.push(`<option value="live">Séance en cours</option>`);
  routines.forEach((r) => (r.seances || []).forEach((sc) => opts.push(`<option value="${esc(r.id)}|${esc(sc.id)}">${esc(r.nom)} — ${esc(sc.nom)}</option>`)));
  routines.forEach((r) => opts.push(`<option value="${esc(r.id)}|+">${esc(r.nom)} — nouvelle séance</option>`));
  opts.push(`<option value="+|+">Nouvelle routine</option>`);
  const f = h(`<form class="ajout-form stack">
    <label class="out-field"><span>Destination</span><select name="dest">${opts.join("")}</select></label>
    <div class="ajout-grille">
      <label class="out-field"><span>Séries</span><input name="series" type="number" inputmode="numeric" min="1" max="10" value="3"></label>
      ${mes.distance ? `<label class="out-field"><span>Distance (km)</span><input name="dist" inputmode="decimal" placeholder="5"></label>`
        : `<label class="out-field"><span>Répétitions</span><input name="reps" inputmode="numeric" placeholder="8-12" value="${mes.isometrique ? "" : "8-12"}"></label>`}
      <label class="out-field"><span>Charge (${uUnite()})</span><input name="charge" inputmode="decimal" placeholder="—"></label>
      <label class="out-field"><span>Temps (s)</span><input name="duree" type="number" inputmode="numeric" placeholder="${mes.isometrique || mes.distance ? "60" : "—"}"></label>
      <label class="out-field"><span>Repos (s)</span><input name="repos" type="number" inputmode="numeric" value="${exo.typeExercice === "isolation" ? 60 : 90}"></label>
      <label class="out-field"><span>Tempo</span><input name="tempo" placeholder="3-1-1"></label>
      <label class="out-field"><span>RPE cible</span><input name="rpe" inputmode="decimal" placeholder="8"></label>
      <label class="out-field"><span>RIR cible</span><input name="rir" type="number" inputmode="numeric" min="0" max="5" value="2"></label>
      <label class="out-field"><span>% du 1RM</span><input name="pct" type="number" inputmode="numeric" min="30" max="100" placeholder="${best1rm ? "75" : "—"}"></label>
    </div>
    <div class="hint">${best1rm ? `1RM estimé : ${uCharge(best1rm)}. Un % du 1RM calcule la charge s'il n'y en a pas.` : "Le % du 1RM sera converti en charge dès que tu auras un historique sur cet exercice."}</div>
    <button class="primary" type="submit"><span class="btn-ico">${IC.plus}</span>Ajouter</button>
  </form>`);
  f.addEventListener("submit", (ev) => {
    ev.preventDefault();
    /** @type {Record<string, any>} */
    const d = {};
    new FormData(/** @type {HTMLFormElement} */ (f)).forEach((v, k) => { d[k] = v; });
    const num = (x) => { const v = parseFloat(String(x || "").replace(",", ".")); return Number.isFinite(v) ? v : null; };
    const reps = String(d.reps || "").match(/(\d+)\s*(?:[-à]\s*(\d+))?/);
    const pct = num(d.pct);
    let chargeKg = d.charge ? depuisSaisie(String(d.charge), uImp()) : null;
    if (!chargeKg && pct && best1rm) chargeKg = Math.round((best1rm * pct) / 100 / 0.5) * 0.5;
    const params = {
      nbSeries: num(d.series) || 3,
      repsCible: reps ? [Number(reps[1]), Number(reps[2] || reps[1])] : undefined,
      chargeKg, dureeSec: num(d.duree), distanceM: d.dist ? (num(d.dist) || 0) * 1000 : null,
      reposSec: num(d.repos) ?? 90, tempo: String(d.tempo || "").trim() || null,
      rpeCible: num(d.rpe), rirCible: num(d.rir) ?? 2, pct1RM: pct,
    };
    if (d.dest === "live") {
      if (!LIVE) return;
      const seance = trouverSeance(LIVE.seanceId);
      ajouterExercice(seance, exo.id, params);
      Etat.sauver(); fermer(); toast("Ajouté à la séance en cours"); return;
    }
    const [rid, sid] = String(d.dest).split("|");
    let r = routines.find((x) => x.id === rid);
    if (!r) { r = creerRoutine(`Mes exercices`); (Etat.data.programmesPerso ||= []).push(r); }
    let sc = (r.seances || []).find((x) => x.id === sid);
    if (!sc) sc = ajouterSeance(r, `Séance ${(r.seances || []).length + 1}`);
    ajouterExercice(sc, exo.id, params);
    Etat.sauver();
    fermer();
    toast(`Ajouté à « ${sc.nom} » (${r.nom})`);
    dialogue({ titre: "Exercice ajouté", message: `${exo.nom} est dans « ${sc.nom} ». Tu peux y régler l'ordre, les séries ou créer un superset.`, cancelVal: false,
      actions: [{ label: "Continuer", valeur: false }, { label: "Ouvrir la routine", valeur: true, primary: true }] })
      .then((ok) => { if (ok) { document.querySelectorAll(".sheet").forEach((x) => x.remove()); EDIT_ROUTINE = r.id; nav("prog"); } });
  });
  inner.append(f);
}

/* ---------------- Exercices personnels : créer, modifier, supprimer ---------------- */
/** Réduit une image à 320 px (JPEG) pour la garder dans les données locales. */
function reduireImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const r = Math.min(1, 320 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image illisible")); };
    img.src = url;
  });
}

function ouvrirEditeurExercice(exo) {
  const edition = Boolean(exo && exo.perso);
  const base = edition ? (Etat.data.exercicesPerso || []).find((x) => x.id === exo.id) || exo : null;
  const { inner, fermer } = feuilleBiblio(edition ? "Modifier mon exercice" : "Créer un exercice", "Enregistré sur cet appareil, privé");
  const lignes = (a) => (a || []).join("\n");
  const sel = (vals, cur, labels, vide = "") => `${vide ? `<option value="">${vide}</option>` : ""}${vals.map((v) => `<option value="${v}"${v === cur ? " selected" : ""}>${esc(labels[v] || v)}</option>`).join("")}`;
  const MUSC = MUSCLES.filter((m) => m !== "corps_entier");
  const f = h(`<form class="perso-form stack">
    <label class="out-field"><span>Nom de l'exercice *</span><input name="nom" required maxlength="80" value="${esc(base?.nom || "")}"></label>
    <label class="out-field"><span>Nom anglais (facultatif)</span><input name="nomEn" maxlength="80" value="${esc(base?.nomEn || "")}"></label>
    <label class="out-field"><span>Muscle principal *</span><select name="prim" required>${sel(MUSC, base?.musclesPrincipaux?.[0], MUSCLE_LABELS, "Choisir…")}</select></label>
    <div><div class="eyebrow">Muscles secondaires</div><div class="row pf-chips" data-k="sec">${MUSC.map((m) => `<button type="button" class="chip${base?.musclesSecondaires?.includes(m) ? " on" : ""}" data-v="${m}">${esc(MUSCLE_LABELS[m] || m)}</button>`).join("")}</div></div>
    <div><div class="eyebrow">Équipement *</div><div class="row pf-chips" data-k="eq">${EQUIPMENTS.map((q) => `<button type="button" class="chip${(base?.equipement || []).includes(q) ? " on" : ""}" data-v="${q}">${esc(EQUIPMENT_LABELS[q] || q)}</button>`).join("")}</div></div>
    <label class="out-field"><span>Machine</span><select name="machine">${sel(MACHINES.map((m) => m.id), base?.machine, Object.fromEntries(MACHINES.map((m) => [m.id, m.nom])), "Aucune")}</select></label>
    <div class="ajout-grille">
      <label class="out-field"><span>Difficulté</span><select name="diff">${sel(["1", "2", "3", "4"], String(base?.difficulte || 2), { 1: DIFF_LABEL[1], 2: DIFF_LABEL[2], 3: DIFF_LABEL[3], 4: DIFF_LABEL[4] })}</select></label>
      <label class="out-field"><span>Type</span><select name="type">${sel(Object.keys(TYPE_EXO_LABELS), base?.typeExercice || "hypertrophie", TYPE_EXO_LABELS)}</select></label>
      <label class="out-field"><span>Mouvement</span><select name="patron">${sel(MOVEMENT_PATTERNS, base?.patron || "", LIB_PATRON, "—")}</select></label>
      <label class="out-field"><span>Côté</span><select name="uni"><option value="0">Bilatéral</option><option value="1"${base?.unilateral ? " selected" : ""}>Unilatéral</option></select></label>
    </div>
    <label class="out-field"><span>Description</span><textarea name="desc" rows="2" maxlength="400">${esc(base?.description || "")}</textarea></label>
    <label class="out-field"><span>Instructions (une étape par ligne)</span><textarea name="instr" rows="4" maxlength="1500">${esc(lignes(base?.instructions))}</textarea></label>
    <label class="out-field"><span>Conseils</span><textarea name="conseils" rows="2" maxlength="600">${esc(base?.conseils || "")}</textarea></label>
    <label class="out-field"><span>Erreurs à éviter (une par ligne)</span><textarea name="err" rows="2" maxlength="600">${esc(lignes(base?.erreurs))}</textarea></label>
    <label class="out-field"><span>Lien vidéo (YouTube, ta propre vidéo en ligne…)</span><input name="video" type="url" inputmode="url" placeholder="https://…" value="${esc(base?.media?.video || "")}"></label>
    <label class="out-field"><span>Image</span><input name="image" type="file" accept="image/*"></label>
    <div class="pf-img">${base?.media?.image ? `<img src="${base.media.image}" alt="Image de l'exercice">` : ""}</div>
    <div><div class="eyebrow">Variantes et remplacements</div><div class="pf-liens"></div>
      <div class="row"><button type="button" class="chip" data-add="variantes">${IC.plus}Variante</button><button type="button" class="chip" data-add="remplacements">${IC.plus}Remplacement</button></div></div>
    <div class="pf-err warn small" hidden></div>
    <button class="primary" type="submit">${edition ? "Enregistrer" : "Créer l'exercice"}</button>
  </form>`);
  let image = base?.media?.image || null;
  const liens = { variantes: [...(base?.variantes || [])], remplacements: [...(base?.remplacements || [])] };
  const dessineLiens = () => {
    const box = f.querySelector(".pf-liens"); box.innerHTML = "";
    [["variantes", "Variante"], ["remplacements", "Remplacement"]].forEach(([k, lab]) => liens[k].forEach((id, i) => {
      const e = getExercise(id); if (!e) return;
      const b = h(`<button type="button" class="chip on">${lab} : ${esc(e.nom)} ✕</button>`);
      b.addEventListener("click", () => { liens[k].splice(i, 1); dessineLiens(); });
      box.append(b);
    }));
  };
  f.querySelectorAll(".pf-chips .chip").forEach((c) => c.addEventListener("click", () => { c.classList.toggle("on"); c.setAttribute("aria-pressed", String(c.classList.contains("on"))); }));
  f.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => choisirExercice((id) => { const k = b.dataset.add; if (!liens[k].includes(id)) liens[k].push(id); dessineLiens(); })));
  f.querySelector("[name=image]").addEventListener("change", async (ev) => {
    const file = ev.target.files && ev.target.files[0]; if (!file) return;
    try { image = await reduireImage(file); f.querySelector(".pf-img").innerHTML = `<img src="${image}" alt="Image de l'exercice">`; }
    catch { toast("Image illisible"); }
  });
  f.addEventListener("submit", (ev) => {
    ev.preventDefault();
    /** @type {Record<string, any>} */
    const d = {};
    new FormData(/** @type {HTMLFormElement} */ (f)).forEach((v, k) => { d[k] = v; });
    const choisis = (k) => [...f.querySelectorAll(`.pf-chips[data-k=${k}] .chip.on`)].map((c) => c.dataset.v);
    const err = f.querySelector(".pf-err");
    const eq = choisis("eq");
    const video = String(d.video || "").trim();
    const pb = !String(d.nom).trim() ? "Donne un nom à l'exercice." : !d.prim ? "Choisis le muscle principal." : !eq.length ? "Choisis au moins un équipement."
      : video && !/^https:\/\//i.test(video) ? "Le lien vidéo doit commencer par https://" : "";
    if (pb) { err.hidden = false; err.textContent = pb; return; }
    const fiche = {
      id: base?.id || `perso-${Etat.uid()}`, nom: String(d.nom).trim(), nomEn: String(d.nomEn || "").trim(),
      musclesPrincipaux: [d.prim], musclesSecondaires: choisis("sec").filter((m) => m !== d.prim), equipement: eq,
      machine: d.machine || "", difficulte: Number(d.diff) || 2, typeExercice: d.type, patron: d.patron || null, unilateral: d.uni === "1",
      description: String(d.desc || "").trim(), instructions: String(d.instr || "").split("\n").map((x) => x.trim()).filter(Boolean),
      conseils: String(d.conseils || "").trim(), erreurs: String(d.err || "").split("\n").map((x) => x.trim()).filter(Boolean),
      media: { miniature: null, video: video || null, image }, variantes: liens.variantes, remplacements: liens.remplacements,
      creeLe: base?.creeLe || new Date().toISOString(), modifieLe: new Date().toISOString(),
    };
    const l = (Etat.data.exercicesPerso ||= []);
    const i = l.findIndex((x) => x.id === fiche.id);
    if (i >= 0) l[i] = fiche; else l.push(fiche);
    enregistrerExercicesPerso(l);
    Etat.sauver();
    fermer();
    document.querySelectorAll(".sheet").forEach((x) => x.remove());
    toast(edition ? "Exercice modifié" : "Exercice créé");
    render();
    ouvrirDetail(getExercise(fiche.id));
  });
  inner.append(f);
  dessineLiens();
}

async function supprimerExercicePerso(exo) {
  const utilise = (Etat.data.logs || []).some((l) => (l.exercices || []).some((e) => e.exerciceId === exo.id))
    || (Etat.data.programmesPerso || []).some((r) => (r.seances || []).some((sc) => (sc.exercices || []).some((e) => e.exerciceId === exo.id)));
  const ok = await confirmer(utilise
    ? `« ${exo.nom} » figure dans tes routines ou ton historique. Il disparaîtra de la bibliothèque, mais ton historique gardera son nom.`
    : `Supprimer définitivement « ${exo.nom} » ?`, { titre: "Supprimer l'exercice", ok: "Supprimer", danger: true });
  if (!ok) return;
  const l = Etat.data.exercicesPerso || [];
  const i = l.findIndex((x) => x.id === exo.id);
  if (i < 0) return;
  // Utilisé : on garde une trace masquée pour que l'historique reste lisible.
  if (utilise) l[i] = { ...l[i], supprime: true }; else l.splice(i, 1);
  enregistrerExercicesPerso(l);
  Etat.sauver();
  document.querySelectorAll(".sheet").forEach((x) => x.remove());
  toast("Exercice supprimé");
  render();
}

/* ======================================================================
   PROGRAMME ANATOLY (Powerbuilding 8 semaines — depuis le PDF fourni)
   ====================================================================== */
let ANATOLY_SEM = 1; // semaine sélectionnée
let ANATOLY_JOUR = 0; // jour affiché dans la semaine
/** Temps de repos indicatif selon la règle du programme (base = squat/DC/SDT). */
function reposAnat(nom) {
  return /squat|développé couché|soulevé de terre/i.test(nom) ? "4 min" : "2 min";
}
/* Résolution de média par nom de mouvement (réutilise la bibliothèque existante,
   incluant les 250 exercices wger) pour couvrir les mouvements du programme
   Anatoly qui n'ont pas de réf directe. Ordre = priorité. */
/** @type {[RegExp, string][]} */
const ANAT_MEDIA = [
  [/prise invers|reverse/i, "wger-dd6e8753-reverse-grip-barbell-curls"],
  [/curl barre/i, "wger-42227131-biceps-curls-with-sz-bar"],
  [/barre au front|skull|french press|extension.*triceps.*(halt|inclin)/i, "wger-893c07ea-skullcrusher-dumbbells"],
  [/ciseaux|scissor|flutter/i, "wger-fdc550b6-flutter-kicks"],
  [/t-barre|t-bar/i, "wger-1eeccede-t-bar-row"],
  [/hyperext/i, "wger-50a8f1f6-lower-back-extensions"],
  [/pull-?over/i, "wger-6e00afb6-cross-bench-dumbbell-pullovers"],
  [/frontales|front raise/i, "wger-68e0dbba-front-raises-with-plates"],
  [/militaire|overhead press/i, "wger-f4467e9a-overhead-press"],
  [/rowing.*(poulie|horizontal)|rowing assis|cable row/i, "wger-4b7cb037-row"],
  [/shrug|haussement/i, "wger-270e108d-shrugs-barbells"],
  [/fentes? march/i, "wger-2f1a2707-dumbbell-lunges-standing"],
  [/saut/i, "wger-002c6a4f-box-jumps"],
];
/** Meilleure réf média pour un exercice Anatoly : réf directe animée, sinon repli par nom. */
function refAnat(ex) {
  if (ex.ref && GIFS[ex.ref]) return ex.ref;
  for (const [re, id] of ANAT_MEDIA) if (re.test(ex.nom)) return id;
  return ex.ref || null;
}
/** Carte d'un exercice du programme Anatoly (média réutilisé si disponible). */
function carteAnatoly(ex, num) {
  const ref = refAnat(ex);
  const exo = ref ? getExercise(ref) : null;
  const gif = ref ? GIFS[ref] : null;
  const c = h(`<div class="card anat-ex${exo ? " tap" : ""}"></div>`);
  const top = h(`<div class="anat-ex-top"></div>`);
  if (exo) top.append(h(vignetteHTML(exo)));
  else if (gif) top.append(h(`<img class="anat-thumb" src="${esc(gif)}" alt="" loading="lazy" decoding="async">`));
  const body = h(`<div style="flex:1;min-width:0"></div>`);
  body.append(h(`<div class="anat-nom"><span class="anat-num">${num}</span>${esc(ex.nom)}</div>`));
  body.append(h(`<div class="anat-meta"><span class="badge accent">${ex.series} × ${esc(ex.reps)}</span><span class="anat-rest">⏱ ${reposAnat(ex.nom)}</span></div>`));
  if (ex.note) body.append(h(`<div class="hint" style="margin-top:6px">${esc(ex.note)}</div>`));
  top.append(body);
  if (exo) top.append(h(`<span class="chev" aria-hidden="true">›</span>`));
  c.append(top);
  if (exo) c.addEventListener("click", () => ouvrirDetail(exo));
  return c;
}
function vAnatoly(v) {
  const info = ANATOLY_INFO;
  v.append(h(`<div class="eyebrow">Programme Anatoly</div>`));
  v.append(h(`<h1 style="margin:2px 0 2px">Powerbuilding</h1>`));
  v.append(h(`<div class="muted small" style="margin-bottom:13px">${info.nbSemaines} semaines · force &amp; esthétique</div>`));

  // Sélecteur de semaine S1..S8
  const sel = h(`<div class="anat-weeks"></div>`);
  for (let i = 1; i <= info.nbSemaines; i++) {
    const b = h(`<button class="anat-wk${ANATOLY_SEM === i ? " on" : ""}">S${i}</button>`);
    b.addEventListener("click", () => { ANATOLY_SEM = i; render(); window.scrollTo(0, 0); });
    sel.append(b);
  }
  v.append(sel);

  // La rangée « ← Semaine N → » faisait doublon avec le bandeau S1..S8 : retirée.
  const semaine = ANATOLY_SEMAINES.find((s) => s.n === ANATOLY_SEM) || ANATOLY_SEMAINES[0];

  // Un jour à la fois (les 4 jours empilés donnaient 24 cartes d'affilée).
  if (ANATOLY_JOUR >= semaine.jours.length) ANATOLY_JOUR = 0;
  const jours = h(`<div class="daytabs" role="tablist" aria-label="Jour de la semaine"></div>`);
  semaine.jours.forEach((j, i) => {
    const b = h(`<button class="daytab${i === ANATOLY_JOUR ? " on" : ""}" role="tab" aria-selected="${i === ANATOLY_JOUR}"><b>${esc(j.jour)}</b><span>${esc(j.groupe)}</span></button>`);
    b.addEventListener("click", () => { ANATOLY_JOUR = i; render(); });
    jours.append(b);
  });
  v.append(jours);
  const jour = semaine.jours[ANATOLY_JOUR];
  if (jour) jour.exercices.forEach((ex, idx) => v.append(carteAnatoly(ex, idx + 1)));

  // Infos programme (repliable) : intro, échauffement, repos, abdos, consignes
  const extra = h(`<details class="card" style="margin-top:16px"><summary><b>Infos, échauffement &amp; abdos</b></summary></details>`);
  extra.append(h(`<div class="sec"><h3>Avant de commencer</h3><div class="small muted">${esc(info.intro)}</div></div>`));
  extra.append(h(`<div class="sec"><h3>Échauffement</h3><div class="small muted">${esc(info.echauffement)}</div></div>`));
  extra.append(h(`<div class="sec"><h3>Temps de repos</h3><div class="deflist">${info.repos.map(([k, val]) => `<div class="spread small"><span class="muted">${esc(k)}</span><b>${esc(val)}</b></div>`).join("")}</div></div>`));
  extra.append(h(`<div class="sec"><h3>${esc(info.abdos.titre)}</h3></div>`));
  info.abdos.exercices.forEach((ex, idx) => extra.append(carteAnatoly(ex, idx + 1)));
  const cons = h(`<div class="sec"><h3>Consignes importantes</h3></div>`);
  info.consignes.forEach((c) => cons.append(h(`<div class="small muted" style="margin:6px 0">• ${esc(c)}</div>`)));
  extra.append(cons);
  v.append(extra);

  v.append(h(`<div class="warn small" style="margin-top:12px">${mi(IC.cross, "mi-amber")}Programme intense. Adapte les charges à ton niveau, respecte la technique et arrête en cas de douleur. Ceci n'est pas un avis médical.</div>`));
}

/* ======================================================================
   SÉANCE GUIDÉE (mode entraînement)
   ====================================================================== */
let LIVE = null; // état live (voir engine/liveSession.js)
let APERCU = null; // id de la séance dont on affiche l'aperçu (avant de démarrer)
let SESSION_TMR = null; // chronomètre de séance (temps écoulé)
/** Muscles ciblés par une séance (groupesCibles, sinon déduits des exercices). */
function musclesSeance(s) {
  if (s.groupesCibles && s.groupesCibles.length) return s.groupesCibles;
  const set = new Set();
  for (const e of s.exercices) (getExercise(e.exerciceId)?.musclesPrincipaux || []).forEach((m) => set.add(m));
  return [...set];
}
/** Carte d'exercice (style Anatoly) pour l'aperçu d'une séance : vignette + séries/reps + repos. */
/** Repos lisible : « 45 s », « 1 min », « 1 min 45 » (jamais « 1.8 min »). */
function formatRepos(sec) {
  if (sec < 60) return `${sec} s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  return s ? `${m} min ${String(s).padStart(2, "0")}` : `${m} min`;
}
function carteExoApercu(e, num) {
  const exo = getExercise(e.exerciceId);
  const gif = urlDemo(exo);
  const t = e.series.find((s) => s.type === "travail") || e.series[0];
  const nb = e.series.filter((s) => s.type !== "echauffement").length || e.series.length;
  const reps = t?.dureeSec ? `${t.dureeSec} s` : t?.repsCible ? `${t.repsCible[0]}–${t.repsCible[1]}` : "—";
  const repos = t?.reposSec ? formatRepos(t.reposSec) : "—";
  const nom = exo ? exo.nom : e.exerciceId;
  const c = h(`<div class="card anat-ex${exo ? " tap" : ""}"></div>`);
  const top = h(`<div class="anat-ex-top"></div>`);
  if (exo) top.append(h(vignetteHTML(exo)));
  else if (gif) top.append(h(`<img class="anat-thumb" src="${esc(gif)}" alt="" loading="lazy" decoding="async">`));
  const body = h(`<div style="flex:1;min-width:0"></div>`);
  body.append(h(`<div class="anat-nom"><span class="anat-num">${num}</span>${esc(nom)}</div>`));
  if (exo) body.append(h(`<div class="exo-tags">${tagsExercice(exo)}</div>`));
  body.append(h(`<div class="anat-meta"><span class="badge accent">${nb} × ${esc(reps)}</span><span class="anat-rest">⏱ repos ${esc(repos)}</span></div>`));
  top.append(body);
  if (exo) top.append(h(`<span class="chev" aria-hidden="true">›</span>`));
  c.append(top);
  if (exo) c.addEventListener("click", () => ouvrirDetail(exo));
  return c;
}
/** Aperçu d'une séance : liste des exercices (façon programme) + bouton Commencer. */
function vApercuSeance(v, seanceId) {
  const s = trouverSeance(seanceId);
  if (!s) { APERCU = null; render(); return; }
  const back = h(`<button class="chip" style="margin-bottom:12px">← Séances</button>`);
  back.addEventListener("click", () => { APERCU = null; render(); });
  v.append(back);
  v.append(h(`<h1 style="margin:0 0 3px">${esc(s.nom)}</h1>`));
  v.append(h(`<div class="muted small">${s.exercices.length} exercices · ~${s.dureeEstimeeMin || 0} min</div>`));
  const muscles = musclesSeance(s);
  // Muscles ciblés en illustrations (une silhouette surlignée par groupe)
  const rangee = bandeRecuperation(muscles, s);
  if (rangee) {
    v.append(h(`<div class="eyebrow" style="margin:14px 0 2px">Muscles sollicités · avant et après</div>`));
    v.append(rangee);
  }
  else if (muscles.length) {
    const mc = h(`<div class="row" style="margin:10px 0"></div>`);
    muscles.slice(0, 6).forEach((m) => mc.append(h(`<span class="pill">${esc(MUSCLE_LABELS[m] || m)}</span>`)));
    v.append(mc);
  }
  const start = h(`<button class="primary big" style="margin:6px 0 8px"><span class="btn-ico">${IC.play}</span>Commencer la séance</button>`);
  start.addEventListener("click", () => { APERCU = null; demarrer(s); });
  v.append(start);
  const guide = h(`<button class="secondary big" style="margin:0 0 14px"><span class="btn-ico">${IC.forward}</span>Mode guidé (pas à pas)</button>`);
  // `demarrer` est asynchrone (elle peut demander confirmation) : sans `await`,
  // le lecteur pas-à-pas s'ouvrait avant que la séance existe.
  guide.addEventListener("click", async () => { APERCU = null; if (await demarrer(s)) ouvrirGuide(); });
  v.append(guide);
  // Échauffement guidé, adapté aux muscles de la séance.
  const echauf = echauffementPour(muscles);
  const bEch = h(`<button class="card wcard sil warm-cta" style="width:100%;margin-top:8px;text-align:left"><span class="mi mi-orange" style="width:34px;height:34px">${IC.wind}</span><span class="g"><b>Échauffement guidé</b><br><span class="muted small">${echauf.length} mouvements · ~${Math.round(dureeSequence(echauf) / 60)} min · adapté à cette séance</span></span><span class="chev" aria-hidden="true">›</span></button>`);
  bEch.addEventListener("click", () => ouvrirSequence("Échauffement", echauf));
  v.append(bEch);
  s.exercices.forEach((e, i) => v.append(carteExoApercu(e, i + 1)));
}
/** Met à jour le chrono de séance (mm:ss) à partir de l'heure de début. */
function majChrono() {
  const el = document.getElementById("seanceTimer");
  if (!el || !LIVE) return;
  const sec = Math.max(0, Math.floor((Date.now() - Date.parse(LIVE.debut)) / 1000));
  el.textContent = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}
function arreterChrono() { if (SESSION_TMR) { clearInterval(SESSION_TMR); SESSION_TMR = null; } }

/**
 * Persiste la séance en cours dans l'état (donc IndexedDB) pour pouvoir la
 * reprendre après une actualisation ou une fermeture accidentelle. Débattu
 * pour ne pas écrire à chaque frappe ; `immediat` force l'écriture tout de suite.
 */
let _timerLive = null;
function persistLive(immediat = false) {
  Etat.data.sessionEnCours = LIVE ? serialiser(LIVE) : null;
  if (immediat) { if (_timerLive) { clearTimeout(_timerLive); _timerLive = null; } Etat.sauver(); return; }
  if (_timerLive) clearTimeout(_timerLive);
  _timerLive = setTimeout(() => { _timerLive = null; Etat.sauver(); }, 300);
}
// Sauvegarde immédiate si l'onglet passe en arrière-plan ou se ferme.
window.addEventListener("pagehide", () => { if (LIVE) persistLive(true); });
document.addEventListener("visibilitychange", () => { if (LIVE && document.visibilityState === "hidden") persistLive(true); });

function vTrain(v) {
  const prog = Etat.data.programme;
  // Reprise d'une séance interrompue (après actualisation / fermeture).
  if (!LIVE && estReprenable(Etat.data.sessionEnCours, trouverSeance)) LIVE = restaurer(Etat.data.sessionEnCours);
  if (!LIVE && APERCU) { arreterChrono(); vApercuSeance(v, APERCU); return; }
  if (!LIVE) {
    arreterChrono();
    const sj = seanceDuJour(prog);
    v.append(h(`<h1 style="margin-bottom:6px">Choisir une séance</h1>`));
    v.append(h(`<div class="notice small">Échauffe-toi 5–10 min (cardio léger + mobilité + séries d'approche sur les gros mouvements) avant de commencer.</div>`));
    // Même garde que sur l'onglet Programme : sans programme, `prog.seances`
    // levait une TypeError et l'écran de choix n'affichait plus rien — alors
    // même que les routines personnelles, elles, étaient disponibles.
    (prog && Array.isArray(prog.seances) ? prog.seances : [])
      .forEach((s) => v.append(carteSeanceChoix(s, "", sj && sj.id === s.id)));
    // Séances des routines perso.
    const persos = (Etat.data.programmesPerso || []).filter((r) => !r.archive);
    if (persos.some((r) => r.seances.length)) {
      v.append(h(`<div class="eyebrow" style="margin:18px 0 8px">Mes routines</div>`));
      persos.forEach((r) => r.seances.forEach((s) => v.append(carteSeanceChoix(s, r.nom, false))));
    }
    // Aucune séance nulle part : une liste vide sous un titre « Choisir une
    // séance » ne dit pas quoi faire.
    if (!(prog && (prog.seances || []).length) && !persos.some((r) => (r.seances || []).length)) {
      v.append(h(`<div class="card"><div class="empty-state">${illustration("plan")}
        <b>Aucune séance à choisir</b>
        <span class="muted small">Génère un programme depuis l'onglet Programme, ou laisse l'accueil te proposer la séance du jour.</span>
      </div></div>`));
      const b = h(`<button class="primary big" style="width:100%;margin-top:10px">Aller au programme</button>`);
      b.addEventListener("click", () => nav("prog"));
      v.append(b);
    }
    return;
  }
  const seance = trouverSeance(LIVE.seanceId);
  if (!seance) { LIVE = null; persistLive(true); render(); return; }
  // Le gabarit a pu changer pendant la séance : on complète l'état live pour
  // les exercices ajoutés depuis, sinon leur carte n'a aucun état à afficher.
  reconcilier(LIVE, seance);
  // En-tête de séance : nom + chrono + progression (séries validées / total)
  const pr = progressionSeance(seance);
  const nbExos = seance.exercices.length;
  // POSTE DE COMMANDE. Ce bandeau est ce qu'on regarde entre deux séries, à bout
  // de souffle : le chrono y est traité comme un titre, et l'avancement se lit
  // d'un coup d'œil sous forme de barres — une par exercice — plutôt qu'en
  // pourcentage. Les identifiants (#seanceTimer, #seanceProgBar, #seanceProgTxt)
  // sont conservés : la mise à jour en direct continue de les viser.
  // Le poste vit dans une SCÈNE pleine largeur, comme l'accueil. Sur l'écran
  // qu'on regarde à bout de souffle entre deux séries, une carte flottant dans
  // une gouttière de 16 px n'a pas le poids de ce qu'elle porte : le chrono est
  // l'information la plus consultée de toute l'application.
  const banniere = h(`<div class="scene scene-train bleed"></div>`);
  v.append(banniere);
  const head = h(`<div class="card trainhead poste"></div>`);
  head.append(h(`<div class="spread poste-top">
    <div style="min-width:0"><span class="eyebrow accent">En cours</span>
      <h1 class="poste-nom" data-flip="titre-seance">${esc(seance.nom)}</h1></div>
    <button class="chip danger" id="abandon">Abandonner</button></div>`));
  head.append(h(`<div class="poste-chrono">
    <span class="livedot" aria-hidden="true"></span>
    <span class="chiffre-hero num" id="seanceTimer">00:00</span></div>`));
  head.append(pisteExercices(seance));
  head.append(h(`<div class="spread small poste-bas">
    <span class="exo-progres" id="seanceProgTxt">Exercice ${exoCourant(seance)} / ${nbExos} · ${pr.faits}/${pr.tot} séries</span>
    <button class="linklike" id="goGuide">Mode guidé ›</button></div>`));
  // Barre continue conservée pour la mise à jour en direct, réduite à un filet
  // sous la piste : deux lectures de la même progression, l'une fine, l'autre
  // par exercice.
  head.append(h(`<div class="bar filet"><div id="seanceProgBar" style="width:${Math.round(pr.pct * 100)}%"></div></div>`));
  banniere.append(head);
  banniere.append(h(`<span class="scene-edge" aria-hidden="true"></span>`));
  $("#goGuide", head).addEventListener("click", ouvrirGuide);
  arreterChrono(); majChrono(); SESSION_TMR = setInterval(majChrono, 1000);
  // L'EXERCICE COURANT EST MARQUÉ. Quatre cartes rigoureusement identiques
  // obligent, à chaque retour sur l'écran, à relire les séries validées pour
  // retrouver où l'on en est — en pleine séance, essoufflé, c'est le geste de
  // trop. Une arête d'accent et un relief suffisent : on sait avant de lire.
  const courant = exoCourant(seance);
  seance.exercices.forEach((e, i) => {
    const carte = carteExoLive(e, seance);
    if (i === courant - 1) {
      carte.classList.add("exo-encours");
      carte.setAttribute("aria-current", "step");
      // PANNEAU DE DÉMONSTRATION. FitAI consacre le haut de son écran de séance
      // à un grand panneau clair montrant le mouvement. En pleine série, la
      // bonne exécution doit être visible sans ouvrir la moindre fiche — et
      // seulement pour l'exercice en cours : la répéter pour les quatre cartes
      // n'apporterait rien et ferait défiler l'écran deux fois plus.
      const exoC = getExercise(e.exerciceId);
      const url = exoC && urlDemo(exoC);
      if (url && !REDUIRE_MOTION) {
        const panneau = h(`<button class="demo-panneau" type="button" aria-label="Voir la fiche de ${esc(exoC.nom)}"><img src="${esc(url)}" alt="" decoding="async"></button>`);
        panneau.addEventListener("click", () => ouvrirDetail(exoC));
        carte.prepend(panneau);
      }
    } else if (i < courant - 1) {
      carte.classList.add("exo-fait");
    }
    v.append(carte);
  });
  const bAdd = h(`<button class="chip" style="margin-top:8px"><span class="cic">${IC.plus}</span>Ajouter un exercice</button>`);
  bAdd.addEventListener("click", () => ajouterExerciceLive(seance));
  v.append(bAdd);
  const fin = h(`<button class="primary big" style="margin-top:12px">Terminer et enregistrer</button>`);
  fin.addEventListener("click", terminer);
  v.append(fin);
  $("#abandon", v).addEventListener("click", async () => { if (await confirmer("Abandonner la séance sans enregistrer ?", { danger: true, ok: "Abandonner" })) { LIVE = null; persistLive(true); stopTimer(); render(); } });
}
/**
 * Y a-t-il un travail en cours qu'un nouveau départ effacerait ?
 * Une séance ouverte mais vide ne compte pas : rien ne serait perdu.
 */
function travailEnCours() {
  if (!LIVE || !LIVE.data) return 0;
  let n = 0;
  for (const st of Object.values(LIVE.data)) {
    for (const s of (st && st.series) || []) {
      if (s.done || (s.charge !== "" && s.charge != null) || (s.reps !== "" && s.reps != null)) n++;
    }
  }
  return n;
}

/**
 * Demande confirmation avant d'écraser une séance déjà commencée.
 *
 * Le cas réel : le téléphone se verrouille en pleine séance, l'app est
 * relancée, elle rouvre sur l'Accueil — qui proposait « Commencer la séance ».
 * Un tap détruisait alors les séries déjà validées et les charges saisies,
 * sans un mot. C'est le seul endroit de l'app où un geste ordinaire pouvait
 * effacer du travail.
 *
 * @returns {Promise<boolean>} vrai si l'on peut démarrer
 */
async function peutDemarrer() {
  const n = travailEnCours();
  if (!n) return true;
  return confirmer(
    `Une séance est déjà en cours (${n} série${n > 1 ? "s" : ""} renseignée${n > 1 ? "s" : ""}). `
    + "Démarrer une nouvelle séance effacera ce qui n'est pas enregistré.",
    { danger: true, ok: "Démarrer quand même", annuler: "Reprendre la séance" });
}

/**
 * Démarre une séance. Rend `false` si l'utilisateur a préféré reprendre celle
 * qui était en cours — les appelants qui enchaînent (mode guidé) doivent le
 * savoir, sinon ils ouvrent le lecteur sur une séance qui n'a pas démarré.
 * @returns {Promise<boolean>}
 */
async function demarrer(seance) {
  if (!await peutDemarrer()) { nav("train"); return false; }
  APERCU = null;
  LIVE = nouvelleSession(seance);
  LIVE.unite = uUnite();
  persistLive(true);
  render();
  return true;
}
/** Carte cliquable de choix de séance : silhouette des muscles + ouverture de l'aperçu. */
function carteSeanceChoix(s, sousTitre, aujourdhui) {
  const meta = `${s.exercices.length} exos · ~${s.dureeEstimeeMin || 0} min`
    + (sousTitre ? ` · ${esc(sousTitre)}` : "") + (aujourdhui ? " · aujourd'hui" : "");
  const b = h(`<button class="card wcard sil ${aujourdhui ? "today" : ""}">
    ${miniSilhouette(musclesSeance(s))}
    <span class="g"><b>${esc(s.nom)}</b><br><span class="muted small">${meta}</span></span>
    <span class="chev" aria-hidden="true">›</span></button>`);
  b.addEventListener("click", () => { APERCU = s.id; render(); window.scrollTo(0, 0); });
  return b;
}
/**
 * Redescend le rail « série en cours » d'une ligne après une validation.
 *
 * Sans cet appel, le rail était posé au rendu et n'en bougeait plus : il restait
 * collé à la série 1 pendant toute la séance — exactement l'inverse de ce à quoi
 * il sert. Quelques classes basculées, aucun re-rendu.
 *
 * @param {{row:HTMLElement,i:number}[]} lignes
 * @param {{series:any[]}} st
 */
function majRail(lignes, st) {
  for (const { row, i } of lignes) {
    row.classList.toggle("encours", estEnCours(st.series, i));
  }
}

/**
 * Rang de l'exercice en cours : le premier dont toutes les séries ne sont pas
 * validées. Donne le « 2 / 6 » de la maquette sans rien changer à la logique.
 */
function exoCourant(seance) {
  const ex = seance.exercices || [];
  for (let i = 0; i < ex.length; i++) {
    const st = LIVE && LIVE.data[ex[i].exerciceId];
    if (!st || st.series.some((s) => !s.done)) return i + 1;
  }
  return ex.length || 1;
}

/**
 * Piste d'avancement : une barre par exercice, remplie à hauteur de ses séries
 * validées.
 *
 * Un pourcentage global répond à « où en suis-je ? » par un chiffre qu'il faut
 * interpréter. La piste répond par une forme : on voit d'un coup combien
 * d'exercices sont finis, lequel est en cours, et combien il en reste — sans
 * lire un seul mot. Chaque segment porte son intitulé pour les lecteurs d'écran.
 */
function pisteExercices(seance) {
  const piste = h(`<div class="piste" id="seancePiste" role="img" aria-label="${esc(libellePiste(seance))}"></div>`);
  (seance.exercices || []).forEach((e) => {
    const st = LIVE && LIVE.data[e.exerciceId];
    const tot = st ? st.series.length : 0;
    const faits = st ? st.series.filter((x) => x.done).length : 0;
    const pct = tot ? Math.round((faits / tot) * 100) : 0;
    const encours = faits > 0 && faits < tot;
    piste.append(h(`<span class="piste-seg${pct === 100 ? " plein" : ""}${encours ? " actif" : ""}">
      <i style="width:${pct}%"></i></span>`));
  });
  return piste;
}

/** Résumé textuel de la piste, pour les lecteurs d'écran. */
function libellePiste(seance) {
  const pr = progressionSeance(seance);
  return `Avancement : ${pr.faits} séries sur ${pr.tot}, exercice ${exoCourant(seance)} sur ${(seance.exercices || []).length}`;
}

/** Met à jour en direct le bandeau de progression sans re-rendre toute la vue. */
function majProgressionSeance() {
  const seance = LIVE && trouverSeance(LIVE.seanceId);
  if (!seance) return;
  const pr = progressionSeance(seance);
  const bar = $("#seanceProgBar"), txt = $("#seanceProgTxt");
  if (bar) bar.style.width = `${Math.round(pr.pct * 100)}%`;
  if (txt) txt.textContent = `Exercice ${exoCourant(seance)} / ${seance.exercices.length} · ${pr.faits}/${pr.tot} séries`;
  // La piste se remplace en bloc : quelques segments, aucun état à réconcilier.
  const ancienne = $("#seancePiste");
  if (ancienne) ancienne.replaceWith(pisteExercices(seance));
}
/** Progression d'une séance en cours : séries validées / total. */
function progressionSeance(seance) {
  let tot = 0, faits = 0;
  for (const e of seance.exercices) {
    const st = LIVE.data[e.exerciceId];
    if (!st) continue;
    for (const s of st.series) { tot++; if (s.done) faits++; }
  }
  return { tot, faits, pct: tot ? faits / tot : 0 };
}
/** L'interface avancée est-elle active ? (options supplémentaires en séance) */
function modeAvance() { return Etat.data.reglages.modeAvance === true; }
/** Libellé de la métrique d'effort choisie : RIR (défaut) ou RPE. */
function metriqueEffort() { return modeAvance() && Etat.data.reglages.metrique === "rpe" ? "RPE" : "RIR"; }

/**
 * Exercice à enchaîner sans repos après la série `i` de `exId`, s'il fait
 * partie d'un superset et qu'un partenaire a encore cette série à faire.
 * Renvoie null en dehors d'un superset ou quand le tour est bouclé.
 */
function prochainSuperset(seance, exId, i) {
  const st = LIVE.data[exId];
  if (!st || !st.supersetGroupe) return null;
  const ordre = seance.exercices.map((x) => x.exerciceId);
  const membres = exercicesDuSuperset(LIVE, ordre, st.supersetGroupe);
  if (membres.length < 2) return null;
  const depart = membres.indexOf(exId);
  for (let k = 1; k < membres.length; k++) {
    const id = membres[(depart + k) % membres.length];
    const s = LIVE.data[id] && LIVE.data[id].series[i];
    if (s && !s.done) return id;
  }
  return null;
}

function carteExoLive(e, seance) {
  const st = LIVE.data[e.exerciceId];
  if (!st) return h(`<div class="card"><div class="muted small">${esc(nomExo(e.exerciceId))} — état indisponible pour cette séance.</div></div>`);
  const exo = getExercise(st.exId);
  if (!exo) {
    const c = h(`<div class="card"><div class="spread"><b>${esc(st.exId)}</b><button class="chip danger" aria-label="Retirer"><span class="cic">${IC.trash}</span></button></div><div class="muted small">Exercice indisponible.</div></div>`);
    c.querySelector("button").addEventListener("click", () => retirerExerciceLive(e.exerciceId));
    return c;
  }
  const t = e.series.find((s) => s.type === "travail") || e.series[0];
  const plage = t?.repsCible || exo.repsPertinent;
  const [derniere, avant] = Etat.perfs(st.exId);
  const sug = recommander(st.exId, plage, derniere || null, avant || null);
  // Ce qui se MESURE sur cet exercice décide des colonnes : charge × reps,
  // maintien chronométré (planche) ou distance + durée (course, rameur…).
  const mode = modeSaisie(exo, st.series[0]);
  const enTemps = mode === "temps";
  const enDistance = mode === "distance";
  const dureePrevue = Number(t?.dureeSec) || 0;
  const c = h(`<div class="card stack exocard${enDistance ? " exo-distance" : ""}"></div>`);

  // En-tête : vignette 52 px + nom + badges musculaires. La vignette ouvre la
  // fiche (démonstration, technique) sans occuper la moitié de l'écran.
  const tete = h(`<div class="exo-tete"></div>`);
  const vign = h(`<button class="exo-vign" aria-label="Voir la démonstration de ${esc(exo.nom)}">${vignetteExo(exo)}</button>`);
  vign.addEventListener("click", () => ouvrirDetail(exo));
  const titre = h(`<div class="exo-titre"><h3>${esc(exo.nom)}</h3></div>`);
  if (st.supersetGroupe) titre.append(h(`<span class="ss-tag">Superset ${esc(st.supersetGroupe)}</span>`));
  titre.append(badgesMuscles(exo));
  const volTxt = enDistance ? (dureePrevue >= 60 ? `${Math.round(dureePrevue / 60)} min` : "km · min")
    : enTemps ? `${st.series[0].dureeSec} s` : `${plage[0]}–${plage[1]}`;
  tete.append(vign, titre, h(`<span class="pill exo-vol">${st.series.length} × ${volTxt}</span>`));
  c.append(tete);

  // Ligne de contexte unique, dépliable : repos, charge conseillée, objectif.
  const objectif = mode === "reps" && sug.chargeKg
    ? `${texteCharge(sug.chargeKg, uLive())} × ${plage[0]}–${plage[1]}` : null;
  const tempo = modeAvance() && (t?.tempo || exo.tempoDefaut) ? (t?.tempo || exo.tempoDefaut) : null;
  const metaTxt = `<span class="cic">${IC.clock}</span>repos ${formatRepos(t?.reposSec || 60)}`
    + (objectif ? ` · <span class="cic">${IC.dumbbell}</span>objectif <b class="sug">${objectif}</b>` : "")
    + (tempo ? ` · tempo <b class="sug">${esc(tempo)}</b>` : "");
  // Le texte dans UNE boîte qui coule en ligne : posés directement dans le
  // bouton flex, chaque morceau devenait une colonne (« 2- / 0- / 1 ») à 360 px.
  const meta = h(`<button class="exometa muted small" aria-expanded="false"><span class="exometa-t">${metaTxt}</span><span class="cic exometa-i">${IC.info}</span></button>`);
  const conseil = h(`<div class="notice small" hidden>${esc(sug.message)}</div>`);
  meta.addEventListener("click", () => {
    const ouvert = conseil.hidden;
    conseil.hidden = !ouvert;
    meta.setAttribute("aria-expanded", String(ouvert));
  });
  c.append(meta, conseil);
  if (st.note) c.append(h(`<div class="exo-note small"><span class="cic">${IC.message}</span>${esc(st.note)}</div>`));
  else if (derniere && derniere.note) c.append(h(`<div class="exo-note small muted"><span class="cic">${IC.message}</span>La dernière fois : ${esc(derniere.note)}</div>`));
  // Tableau des séries : Série · Précédent (ou RIR/RPE) · Kg · Reps · Validé.
  // En mode avancé la colonne d'effort est affichée d'emblée ; en débutant, la
  // colonne « Précédent » suffit et l'écran reste à quatre informations.
  const avance = modeAvance();
  if (avance) c.classList.add("adv");
  const showEffort = st.showRir != null ? st.showRir : avance;
  const col2 = showEffort ? metriqueEffort() : "Préc.";
  // En maintien, la colonne de charge est un LEST facultatif (planche lestée) ;
  // elle était titrée « Sec » alors qu'elle recevait des kilos.
  const col3 = enDistance ? "Km" : enTemps ? `Lest ${uLive() ? "lb" : "kg"}` : (uLive() ? "Lb" : "Kg");
  const col4 = enDistance ? "Min" : enTemps ? "Sec" : "Reps";
  c.append(h(`<div class="setrow"><span class="head">Série</span><span class="head">${col2}</span><span class="head">${col3}</span><span class="head">${col4}</span><span class="head">✓</span></div>`));
  // Les suggestions des séries suivantes dépendent de ce qui vient d'être
  // saisi : elles doivent être recalculées à chaque frappe, sinon l'écran
  // promet une valeur et la validation en enregistre une autre.
  const lignes = [];
  // Mode distance : la valeur proposée est celle de la série précédente de la
  // séance, sinon la dernière séance, sinon la durée prévue au programme.
  const proposeDistance = (i, champ) => {
    for (let k = i - 1; k >= 0; k--) { const v = st.series[k][champ]; if (v !== "" && v != null) return String(v); }
    const dpi = derniere && derniere.series[i];
    if (champ === "distanceKm") return dpi ? kmSaisie(dpi.distanceM) : "";
    return (dpi && minutesSaisie(dpi.dureeSec)) || (dureePrevue >= 60 ? minutesSaisie(dureePrevue) : "");
  };
  const majSuggestions = () => {
    for (const { row, i } of lignes) {
      if (enDistance) {
        for (const champ of ["distanceKm", "dureeMin"]) {
          const inp = row.querySelector(`input[data-f="${champ}"]`);
          if (inp) inp.placeholder = proposeDistance(i, champ) || "—";
        }
        continue;
      }
      const dpi = seriePrecedente(st.series, i, derniere && derniere.series);
      const app = st.series[i] && st.series[i].type === "echauffement";
      const cc = valeurSerie(st.series, i, "charge", uAffLive(dpi && dpi.chargeKg), app ? null : uAffLive(sug.chargeKg));
      const rr = valeurSerie(st.series, i, "reps", dpi && dpi.reps, app ? null : plage && plage[0]);
      const ic = row.querySelector('input[data-f="charge"]');
      if (ic) ic.placeholder = cc == null ? "—" : String(cc);
      const ir = row.querySelector('input[data-f="reps"]');
      if (ir) ir.placeholder = rr == null ? "—" : String(rr);
    }
  };
  // Synthèse du cardio sous le tableau : total, vitesse moyenne et allure,
  // recalculés à chaque frappe. Rien n'est demandé deux fois à l'utilisateur.
  const synth = h(`<div class="cardio-synth small" aria-live="polite"></div>`);
  const majSynthese = () => {
    if (!enDistance) return;
    const tot = totauxDistance(st.series.map((x) => ({ distanceM: lireDistanceKm(x.distanceKm), dureeSec: lireDureeMinutes(x.dureeMin) })));
    if (!tot.distanceM && !tot.dureeSec) {
      synth.innerHTML = `<span class="muted">Distance en km, durée en minutes (« 25,5 » ou « 25:30 ») : vitesse et allure se calculent seules.</span>`;
      return;
    }
    const parts = [];
    if (tot.distanceM) parts.push(`<b class="num">${texteDistance(tot.distanceM)}</b>`);
    if (tot.dureeSec) parts.push(`<b class="num">${texteDuree(tot.dureeSec)}</b>`);
    if (tot.vitesseKmh) parts.push(`<span class="num">${texteVitesse(tot.vitesseKmh)}</span>`, `<span class="num">${texteAllure(tot.allureSecParKm)}</span>`);
    synth.innerHTML = parts.join(`<span class="cs-sep" aria-hidden="true">·</span>`);
  };
  st.series.forEach((s, i) => {
    const dp = seriePrecedente(st.series, i, derniere && derniere.series);
    const prev = !dp ? "—"
      : enDistance ? (dp.distanceM ? texteDistance(dp.distanceM) : dp.dureeSec ? texteDuree(dp.dureeSec) : "—")
      : enTemps ? `${dp.dureeSec || 0}s` : `${uAffLive(dp.chargeKg) || 0}×${dp.reps || 0}`;
    const col2El = showEffort
      ? `<input inputmode="decimal" placeholder="${metriqueEffort() === "RPE" ? "8" : "2"}" value="${s.rir}" data-f="rir" aria-label="${metriqueEffort()} série ${i + 1}">`
      : `<span class="prev muted">${prev}</span>`;
    // En mode avancé le numéro de série devient un bouton : un tap fait défiler
    // normale → drop set → rest-pause. Aucun sous-menu, aucune colonne en plus.
    const tSerie = TYPES_SERIE[s.type] || TYPES_SERIE.normale;
    // Suggestion affichée = valeur qui sera enregistrée si l'on valide sans
    // rien taper. Les deux doivent être calculées au même endroit, sans quoi
    // l'écran promet une chose et l'historique en garde une autre.
    const approche = s.type === "echauffement";
    const chargeAff = valeurSerie(st.series, i, "charge", uAffLive(dp && dp.chargeKg), approche ? null : uAffLive(sug.chargeKg));
    const repsAff = valeurSerie(st.series, i, "reps", dp && dp.reps, approche ? null : plage && plage[0]);
    // Le repère de type (É, D, MAX…) se voit même hors mode avancé : une
    // série d'approche ajoutée par « Échauffement calculé » ressemblait sinon
    // à une série de travail.
    const numEl = avance
      ? `<button class="serie sertype ${s.type !== "normale" ? "on" : ""}" aria-label="Type de la série ${i + 1} : ${tSerie.label}. Toucher pour changer">${i + 1}${tSerie.court ? `<span class="sertag">${tSerie.court}</span>` : ""}</button>`
      : `<span class="serie${tSerie.court ? " sertype on" : ""}"${tSerie.court ? ` aria-label="Série ${i + 1} : ${tSerie.label}"` : ""}>${i + 1}${tSerie.court ? `<span class="sertag">${tSerie.court}</span>` : ""}</span>`;
    // La série EN COURS est la première non validée : c'est la seule qu'on
    // cherche du regard entre deux séries. Elle porte un rail d'accent et des
    // champs éclaircis ; les autres restent en retrait. Sans ce repère, les
    // quatre lignes se ressemblent et il faut compter.
    // `alt` une ligne sur deux : le tableau de FitAI alterne deux fonds très
    // proches (#050217 et #1E1F34). À bout de souffle, l'œil suit la ligne sans
    // avoir besoin d'un filet séparateur.
    const row = h(`<div class="setrow donnee${i % 2 ? " alt" : ""}${s.done ? " vdone" : ""}${estEnCours(st.series, i) ? " encours" : ""}${s.type !== "normale" ? " serie-" + s.type : ""}">
      ${numEl}
      ${col2El}
      ${enDistance
        ? `<input inputmode="decimal" placeholder="—" value="${esc(s.distanceKm ?? "")}" data-f="distanceKm" aria-label="Distance en kilomètres, série ${i + 1}">
      <input inputmode="decimal" placeholder="—" value="${esc(s.dureeMin ?? "")}" data-f="dureeMin" aria-label="Durée en minutes, série ${i + 1}">`
        : `<input inputmode="decimal" placeholder="${chargeAff == null ? "—" : chargeAff}" value="${esc(s.charge)}" data-f="charge" aria-label="${enTemps ? "Lest" : "Charge"} série ${i + 1}">
      <input inputmode="numeric" placeholder="${enTemps ? s.dureeSec : (repsAff == null ? "—" : repsAff)}" value="${esc(enTemps ? s.dureeSec : s.reps)}" data-f="${enTemps ? "dureeSec" : "reps"}" aria-label="${enTemps ? "Durée en secondes" : "Répétitions"} série ${i + 1}">`}
      <button class="done ${s.done ? "on" : ""}" aria-label="Valider la série ${i + 1}">✓</button></div>`);
    on(row, "input", "input", (ev) => {
      const f = ev.target.dataset.f;
      // La durée d'un maintien reste un NOMBRE : effacer le champ ne doit ni
      // enregistrer « » ni faire basculer l'exercice en mode répétitions.
      if (f === "dureeSec") { const n = parseInt(ev.target.value, 10); if (n > 0) s.dureeSec = n; }
      else s[f] = ev.target.value;
      persistLive(); majSuggestions(); majSynthese();
    });
    const bType = row.querySelector(".sertype");
    if (bType) bType.addEventListener("click", () => {
      s.type = cyclerType(s.type);
      persistLive(true);
      toast(`Série ${i + 1} · ${TYPES_SERIE[s.type].label}`);
      render();
    });
    row.querySelector(".done").addEventListener("click", (ev) => {
      s.done = !s.done;
      // Valider sans avoir saisi enregistre ce que la ligne affichait. C'est le
      // geste le plus courant en salle : on répète la série précédente.
      if (s.done) {
        completerSerie(st.series, i, enDistance ? {
          mode: "distance",
          distancePrecedente: dp ? kmSaisie(dp.distanceM) : null,
          dureePrecedente: dp ? minutesSaisie(dp.dureeSec) : null,
          dureeConseil: dureePrevue >= 60 ? minutesSaisie(dureePrevue) : null,
        } : {
          chargePrecedente: uAffLive(dp && dp.chargeKg), chargeConseil: uAffLive(sug.chargeKg),
          repsPrecedentes: dp && dp.reps, repsConseil: plage && plage[0],
        });
        row.querySelectorAll("input[data-f]").forEach((inp) => {
          const f = inp.dataset.f;
          if (f === "charge" || f === "reps" || f === "distanceKm" || f === "dureeMin") inp.value = s[f] ?? "";
        });
        majSynthese();
      }
      const btn = ev.currentTarget;
      btn.classList.toggle("on", s.done);
      row.classList.toggle("vdone", s.done);
      if (s.done) { btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop"); jouer("valider", Etat.data.reglages); try { if (Etat.data.reglages.vibrations !== false) navigator.vibrate?.(20); } catch (e) {} }
      else jouer("annuler", Etat.data.reglages);
      majRail(lignes, st);
      persistLive(); majProgressionSeance(); majSuggestions();
      if (!s.done) return;
      // Record battu : on le dit tout de suite, pas seulement au bilan de fin.
      if (!enDistance) {
        const kgDe = (x) => depuisSaisie(x.charge, uLive());
        const autres = st.series.filter((x, k) => k !== i && x.done).map((x) => ({ chargeKg: kgDe(x), reps: Number(x.reps), type: x.type }));
        const rec = recordEnDirect(Etat.data.logs || [], e.exerciceId, { chargeKg: kgDe(s), reps: Number(s.reps), type: s.type }, autres);
        if (rec) {
          row.classList.add("record");
          jouer("record", Etat.data.reglages);
          toast(`Record sur ${exo.nom} · 1RM estimé ${uCharge(rec.e1rm)} (avant ${uCharge(rec.ancien)})`);
        }
      }
      // Repos : court et fixe pour un drop set / rest-pause, nul dans un
      // superset tant qu'il reste un partenaire à enchaîner.
      const suivant = seance ? prochainSuperset(seance, e.exerciceId, i) : null;
      // Le réglage global l'emporte sur le repos prévu par la série (0 = programme).
      const r = reposApresSerie({ type: s.type, reposSec: reposEffectif(t?.reposSec, Etat.data.reglages.reposDefautSec), suivantSuperset: suivant });
      if (r.enchainer) { toast(`Superset ${st.supersetGroupe} → enchaîne avec ${nomExo(suivant)}`); return; }
      const suffixe = r.raison === "normal" ? "" : ` · ${r.raison}`;
      startTimer(r.sec, `${exo.nom} · série ${i + 1}${suffixe}`);
    });
    lignes.push({ row, i });
    c.append(row);
  });
  majSuggestions();
  if (enDistance) { majSynthese(); c.append(synth); }
  // Ajouter / retirer une série pendant la séance.
  const serieActs = h(`<div class="row"></div>`);
  const bPlus = h(`<button class="chip">+ série</button>`);
  bPlus.addEventListener("click", () => { ajouterSerie(st); persistLive(true); render(); });
  serieActs.append(bPlus);
  if (st.series.length > 1) {
    const bMoins = h(`<button class="chip">− série</button>`);
    bMoins.addEventListener("click", () => { retirerDerniereSerie(st); persistLive(true); render(); });
    serieActs.append(bMoins);
  }
  // Remplissage rapide : un tap pré-remplit les séries vides avec la dernière
  // fois (ou la charge conseillée) → beaucoup moins de saisie à la salle.
  const peutRemplir = enDistance
    ? !!derniere && derniere.series.some((x) => x.distanceM) && st.series.some((s) => !s.distanceKm || !s.dureeMin)
    : !enTemps && (derniere || sug.chargeKg) && st.series.some((s) => !s.charge || !s.reps);
  if (peutRemplir) {
    const bFill = h(`<button class="chip"><span class="cic">${IC.cornerDown}</span>Reprendre</button>`);
    bFill.title = "Pré-remplir avec la dernière fois / le conseil";
    bFill.addEventListener("click", () => {
      st.series.forEach((s, i) => {
        const dp = seriePrecedente(st.series, i, derniere && derniere.series);
        if (enDistance) {
          if (!s.distanceKm && dp?.distanceM) s.distanceKm = kmSaisie(dp.distanceM);
          if (!s.dureeMin && dp?.dureeSec) s.dureeMin = minutesSaisie(dp.dureeSec);
          return;
        }
        if (!s.charge && (dp?.chargeKg != null || sug.chargeKg != null)) s.charge = String(uAffLive(dp?.chargeKg ?? sug.chargeKg));
        if (!s.reps && (dp?.reps != null || plage?.[0] != null)) s.reps = String(dp?.reps ?? plage[0]);
      });
      persistLive(true); toast("Séries pré-remplies — ajuste puis valide ✓"); render();
    });
    serieActs.append(bFill);
  }
  // Actions secondaires (démo, RIR, douleur, remplacer, retirer) : regroupées
  // derrière un menu. Pendant une séance, on ne veut qu'une rangée d'actions.
  // « Machine occupée » : le cas le plus fréquent en salle. Un tap propose
  // immédiatement les alternatives compatibles, sans passer par un menu.
  const bOcc = h(`<button class="chip"><span class="cic">${IC.swap}</span>Machine occupée</button>`);
  bOcc.addEventListener("click", () => machineOccupee(e.exerciceId, exo));
  serieActs.append(bOcc);

  const bMenu = h(`<button class="chip exomenu" aria-label="Autres actions pour ${esc(exo.nom)}">⋯</button>`);
  if (st.douleur) bMenu.classList.add("danger");
  // Charge repère pour les calculs du menu (échauffement, disques) : la série
  // déjà saisie, sinon la dernière séance, sinon la charge conseillée.
  const repere = () => {
    const saisie = (st.series || []).find((x) => x.type !== "echauffement" && x.charge !== "" && x.charge != null);
    if (saisie) return saisie.charge;
    const d0 = derniere && derniere.series && derniere.series[0];
    const kg = (d0 && d0.chargeKg) || sug.chargeKg;
    return kg ? uAffLive(kg) : "";
  };
  bMenu.addEventListener("click", () => menuExoLive(e, exo, st, seance, repere()));
  serieActs.append(bMenu);
  c.append(serieActs);
  // Exercice terminé (toutes les séries validées) → état visuel discret.
  if (st.series.length && st.series.every((s) => s.done)) c.classList.add("exo-done");
  return c;
}
/**
 * Menu des actions secondaires d'un exercice en séance. Sorti de la carte pour
 * garder l'écran d'entraînement dense et manipulable d'une main.
 */
/** Nombre saisi (« 62,5 » ou « 62.5 ») → nombre, ou 0. */
const nbSaisi = (x) => { const n = parseFloat(String(x == null ? "" : x).replace(",", ".")); return Number.isFinite(n) && n > 0 ? n : 0; };
const frNb = (n) => String(Math.round(n * 100) / 100).replace(".", ",");
/** L'exercice se charge-t-il sur une barre ? (échauffement à vide, disques) */
const surBarre = (exo) => (exo.equipement || []).some((q) => q === "barre" || q === "smith" || q === "barre_ez" || q === "trap_bar");

/**
 * Échauffement calculé : séries d'approche déduites de la charge de travail,
 * insérées en tête de l'exercice (type « échauffement » : hors records, hors
 * tonnage). Les séries d'approche pas encore faites sont remplacées, jamais
 * celles déjà validées.
 */
async function ajouterEchauffementLive(st, exo, repere) {
  const lb = uLive(), unite = lb ? "lb" : "kg";
  const barre = surBarre(exo) ? (lb ? 45 : 20) : 0, pas = lb ? 5 : 2.5;
  let champ, apercu;
  const v = await dialogue({
    titre: "Échauffement calculé",
    message: `Charge de travail prévue pour « ${exo.nom} » :`,
    cancelVal: null,
    actions: [{ label: "Annuler", valeur: null }, { label: "Ajouter", primary: true, valeur: () => champ.value }],
    onMount: (inner) => {
      champ = h(`<input inputmode="decimal" aria-label="Charge de travail (${unite})" placeholder="${unite}" style="width:100%">`);
      champ.value = repere ? String(repere).replace(".", ",") : "";
      apercu = h(`<div class="ech-apercu" aria-live="polite"></div>`);
      const maj = () => {
        const r = rampeEchauffement(nbSaisi(champ.value), { barre, pas });
        apercu.innerHTML = r.length
          ? r.map((x) => `<span class="pill"><b class="num">${frNb(x.charge)}</b> ${unite} × ${x.reps}${x.pct ? ` <i>${x.pct} %</i>` : " <i>à vide</i>"}</span>`).join("")
          : `<span class="muted small">${nbSaisi(champ.value) ? "Charge trop légère pour des séries d'approche." : "Saisis ta charge de travail."}</span>`;
      };
      champ.addEventListener("input", maj);
      const ancre = inner.querySelector(".row");
      inner.insertBefore(champ, ancre); inner.insertBefore(apercu, ancre);
      maj(); setTimeout(() => champ.select(), 0);
    },
  });
  if (v == null) return;
  const rampe = rampeEchauffement(nbSaisi(v), { barre, pas });
  if (!rampe.length) { toast("Aucune série d'approche à ajouter pour cette charge"); return; }
  const gardees = st.series.filter((x) => !(x.type === "echauffement" && !x.done));
  const nouvelles = rampe.map((x) => ({ ...nouvelleSerie(null), charge: frNb(x.charge), reps: String(x.reps), type: "echauffement" }));
  const faites = gardees.filter((x) => x.type === "echauffement");
  st.series = [...faites, ...nouvelles, ...gardees.filter((x) => x.type !== "echauffement")];
  persistLive(true); render();
  toast(`${nouvelles.length} série${nouvelles.length > 1 ? "s" : ""} d'échauffement ajoutée${nouvelles.length > 1 ? "s" : ""}`);
}

/** Disques à mettre de chaque côté de la barre, sans quitter la séance. */
function calculerDisquesLive(exo, repere) {
  const lb = uLive(), unite = lb ? "lb" : "kg";
  const barres = lb ? [45, 35, 25, 15] : [20, 15, 10, 7.5];
  const disques = lb ? [45, 35, 25, 10, 5, 2.5] : [25, 20, 15, 10, 5, 2.5, 1.25];
  let barre = barres[0];
  dialogue({
    titre: "Disques à charger",
    message: exo.nom,
    cancelVal: null,
    actions: [{ label: "Fermer", valeur: null, primary: true }],
    onMount: (inner) => {
      const champ = h(`<input inputmode="decimal" aria-label="Charge totale (${unite})" placeholder="Charge totale (${unite})" style="width:100%">`);
      champ.value = repere ? String(repere).replace(".", ",") : "";
      const choix = h(`<div class="row disq-barres" role="group" aria-label="Poids de la barre"></div>`);
      const res = h(`<div class="disq-res" aria-live="polite"></div>`);
      const maj = () => {
        choix.querySelectorAll("button").forEach((b) => b.classList.toggle("on", Number(b.dataset.b) === barre));
        const cible = nbSaisi(champ.value);
        if (!cible) { res.innerHTML = `<span class="muted small">Saisis la charge totale, barre comprise.</span>`; return; }
        const d = disquesParCote(cible, barre, disques);
        if (!d.possible) { res.innerHTML = `<span class="muted small">La charge doit dépasser le poids de la barre (${frNb(barre)} ${unite}).</span>`; return; }
        res.innerHTML = `<div class="eyebrow">De chaque côté</div>
          <div class="disq-liste">${d.parCote.length ? d.parCote.map((x) => `<span class="disq num">${frNb(x)}</span>`).join("") : `<span class="muted">aucun disque</span>`}</div>
          ${d.exact ? "" : `<div class="muted small">Au plus proche : <b class="num">${frNb(d.totalReel)} ${unite}</b> (il manque ${frNb(d.resteKg * 2)} ${unite}).</div>`}`;
      };
      barres.forEach((b) => {
        const bt = h(`<button type="button" class="chip" data-b="${b}">Barre ${frNb(b)} ${unite}</button>`);
        bt.addEventListener("click", () => { barre = b; maj(); });
        choix.append(bt);
      });
      champ.addEventListener("input", maj);
      const ancre = inner.querySelector(".row");
      inner.insertBefore(champ, ancre); inner.insertBefore(choix, ancre); inner.insertBefore(res, ancre);
      maj(); setTimeout(() => champ.select(), 0);
    },
  });
}

function menuExoLive(e, exo, st, seance, repere = "") {
  const sheet = h(`<div class="sheet menu-sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  const fermer = () => sheet.remove();
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0;font-size:1.1rem">${esc(exo.nom)}</h2><button class="chip" id="mX">✕</button></div>`));
  const item = (icone, label, onClick, cls = "") => {
    const b = h(`<button class="plusitem ${cls}"><span class="pm-ic mi-blue">${icone}</span><span class="pm-main"><b>${esc(label)}</b></span><span class="chev">›</span></button>`);
    b.addEventListener("click", () => { fermer(); onClick(); });
    inner.append(b);
    return b;
  };
  item(IC.play, "Voir la démonstration", () => ouvrirDetail(exo));
  const effortVisible = st.showRir != null ? st.showRir : modeAvance();
  item(IC.repeat, `${effortVisible ? "Masquer" : "Afficher"} la colonne ${metriqueEffort()}`, () => {
    st.showRir = !effortVisible; persistLive(true); render();
  });
  // Superset : réservé au mode avancé, où l'utilisateur sait ce qu'il enchaîne.
  if (modeAvance() && seance) {
    if (st.supersetGroupe) {
      item(IC.repeat, `Sortir du superset ${st.supersetGroupe}`, () => {
        const groupe = st.supersetGroupe;
        st.supersetGroupe = null;
        // Un superset à un seul membre n'a plus de sens : on le dissout.
        const ordre = seance.exercices.map((x) => x.exerciceId);
        const restants = exercicesDuSuperset(LIVE, ordre, groupe);
        if (restants.length < 2) restants.forEach((id) => { LIVE.data[id].supersetGroupe = null; });
        persistLive(true); toast("Superset dissous"); render();
      });
    } else {
      item(IC.swap, "Grouper en superset", () => choisirPartenaireSuperset(e.exerciceId, seance));
    }
  }
  // Charge, donc échauffement calculable ; barre, donc disques à compter.
  const aCharge = !(st.series || []).some((x) => x.dureeSec || x.distanceKm != null) && !(exo.equipement || []).every((q) => q === "poids_du_corps");
  if (aCharge) item(IC.flame, "Échauffement calculé", () => ajouterEchauffementLive(st, exo, repere));
  if (aCharge && surBarre(exo)) item(IC.barreLourde || IC.dumbbell, "Disques à charger", () => calculerDisquesLive(exo, repere));
  item(IC.message, st.note ? "Modifier la note" : "Ajouter une note", () => noterExerciceLive(st, exo));
  item(IC.clock, "Minuteur EMOM / Tabata", () => ouvrirOutils("intervalles"));
  item(IC.swap, "Remplacer l'exercice", () => remplacer(e.exerciceId));
  item(IC.alert, st.douleur ? "Retirer la douleur signalée" : "Signaler une douleur", () => {
    st.douleur = !st.douleur; persistLive(true);
    if (st.douleur) info("Douleur vive, articulaire ou inhabituelle : arrête cet exercice aujourd'hui. Si elle persiste, consulte un professionnel de santé.", { titre: "⚠️ Douleur signalée" });
    render();
  }, st.douleur ? "on" : "");
  item(IC.trash, "Retirer de la séance", async () => {
    // Retirer efface la saisie déjà faite : on le dit, avec le compte exact.
    const saisies = (st.series || []).filter((x) => x.done || x.charge !== "" || x.reps !== "").length;
    const msg = saisies
      ? `Retirer « ${exo.nom} » ? ${saisies} série${saisies > 1 ? "s" : ""} déjà saisie${saisies > 1 ? "s" : ""} ${saisies > 1 ? "seront perdues" : "sera perdue"}.`
      : `Retirer « ${exo.nom} » de la séance ?`;
    if (await confirmer(msg, { danger: true, ok: "Retirer" })) retirerExerciceLive(e.exerciceId);
  }, "danger");
  sheet.querySelector("#mX").addEventListener("click", fermer);
  sheet.addEventListener("click", (ev) => { if (ev.target === sheet) fermer(); });
  document.body.append(sheet);
}

/**
 * Choix du partenaire de superset : la liste des autres exercices de la séance.
 * Rejoindre un exercice déjà groupé agrandit son groupe (tri-set) plutôt que
 * d'en créer un second, ce qui serait incompréhensible à l'usage.
 */
function choisirPartenaireSuperset(exId, seance) {
  const autres = seance.exercices.map((x) => x.exerciceId).filter((id) => id !== exId && LIVE.data[id]);
  if (!autres.length) { info("Ajoute au moins un deuxième exercice à la séance pour créer un superset.", { titre: "Superset" }); return; }
  const sheet = h(`<div class="sheet menu-sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  const fermer = () => sheet.remove();
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0;font-size:1.1rem">Enchaîner avec…</h2><button class="chip" id="ssX">✕</button></div>`));
  inner.append(h(`<div class="muted small" style="margin-bottom:8px">Les exercices groupés s'enchaînent sans repos ; le minuteur ne se déclenche qu'après le dernier du groupe.</div>`));
  autres.forEach((id) => {
    const g = LIVE.data[id].supersetGroupe;
    const b = h(`<button class="plusitem"><span class="pm-ic mi-blue">${IC.swap}</span><span class="pm-main"><b>${esc(nomExo(id))}</b>${g ? `<br><span class="muted small">déjà dans le superset ${esc(g)}</span>` : ""}</span><span class="chev">›</span></button>`);
    b.addEventListener("click", () => {
      fermer();
      const groupe = g || groupeSupersetLibre(LIVE);
      if (!groupe) { toast("Quatre supersets au maximum dans une séance."); return; }
      LIVE.data[exId].supersetGroupe = groupe;
      LIVE.data[id].supersetGroupe = groupe;
      persistLive(true); toast(`Superset ${groupe} créé`); render();
    });
    inner.append(b);
  });
  sheet.querySelector("#ssX").addEventListener("click", fermer);
  sheet.addEventListener("click", (ev) => { if (ev.target === sheet) fermer(); });
  document.body.append(sheet);
}

/**
 * Note libre sur un exercice de la séance : réglage de la machine, prise,
 * sensation. Enregistrée avec la séance, et rappelée la fois suivante.
 */
async function noterExerciceLive(st, exo) {
  let zone;
  const v = await dialogue({
    titre: `Note — ${exo.nom}`,
    message: "Réglage machine, prise, sensation… Elle te sera rappelée à la prochaine séance.",
    cancelVal: null,
    actions: [{ label: "Annuler", valeur: null }, { label: "Enregistrer", primary: true, valeur: () => zone.value }],
    onMount: (inner) => {
      zone = h(`<textarea rows="3" maxlength="500" style="width:100%" aria-label="Note sur l'exercice" placeholder="Ex. : siège cran 4, prise serrée"></textarea>`);
      zone.value = st.note || "";
      inner.insertBefore(zone, inner.querySelector(".row"));
      setTimeout(() => zone.focus(), 0);
    },
  });
  if (v == null) return;
  st.note = String(v).trim().slice(0, 500);
  persistLive(true); render();
}

/** Ajoute un exercice au vol pendant la séance (choix dans le catalogue). */
function ajouterExerciceLive(seance) {
  choisirExercice((exId) => {
    if (LIVE.data[exId]) { toast("Cet exercice est déjà dans la séance."); return; }
    const e = ajouterExercice(seance, exId, { nbSeries: 3 });
    if (!e) return;
    const enTemps = e.series.some((s) => s.dureeSec);
    const nb = e.series.filter((s) => s.type !== "echauffement").length || 3;
    LIVE.data[exId] = {
      exId,
      series: Array.from({ length: nb }, () => ({ charge: "", reps: "", rir: "", dureeSec: enTemps ? (e.series.find((s) => s.dureeSec)?.dureeSec || 40) : null, done: false, type: "normale" })),
      douleur: false, showRir: null, supersetGroupe: null,
    };
    persistLive(true); render();
  });
}
/** Retire un exercice de la séance en cours (et de son gabarit). */
function retirerExerciceLive(exId) {
  const seance = trouverSeance(LIVE.seanceId);
  const idx = seance.exercices.findIndex((x) => x.exerciceId === exId);
  if (idx >= 0) supprimerExerciceIndex(seance, idx);
  delete LIVE.data[exId];
  persistLive(true); render();
}
/**
 * Feuille de sélection d'un exercice du catalogue. Appelle `onPick(exerciceId)`.
 * Réutilisée par la séance active et par le builder de routines.
 */
function choisirExercice(onPick) {
  const sheet = h(`<div class="sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  inner.append(h(`<div class="spread"><h2 style="margin:0">Choisir un exercice</h2><button class="chip" id="fermerPick">✕</button></div>`));
  const search = h(`<input type="search" placeholder="Rechercher (développé, squat, dos…)" style="width:100%;margin:8px 0" />`);
  inner.append(search);
  const liste = h(`<div class="stack"></div>`);
  inner.append(liste);
  const fermer = () => sheet.remove();
  const refresh = () => {
    liste.innerHTML = "";
    const res = chercherCatalogue({ q: search.value }).slice(0, 40);
    if (!res.length) { liste.append(etatVide(illustration("recherche"), "Aucun exercice trouvé", "Essaie un mot du mouvement (« développé », « tirage ») ou du muscle (« dos »).")); return; }
    res.forEach((exo) => {
      const b = h(`<button class="big exo-pick" style="justify-content:flex-start;gap:10px;text-align:left;margin:4px 0">
        ${vignetteHTML(exo, "sm")}
        <span><b>${esc(exo.nom)}</b><br><span class="muted small">${(exo.musclesPrincipaux || []).map((m) => MUSCLE_LABELS[m] || m).join(", ")}</span></span></button>`);
      b.addEventListener("click", () => { fermer(); onPick(exo.id); });
      liste.append(b);
    });
  };
  search.addEventListener("input", refresh);
  sheet.querySelector("#fermerPick").addEventListener("click", fermer);
  refresh();
  document.body.append(sheet);
  search.focus();
}
async function remplacer(exId) {
  const seance = trouverSeance(LIVE.seanceId);
  const presents = seance.exercices.map((x) => x.exerciceId);
  const alts = alternatives(exId, Etat.data.profil, presents);
  if (!alts.length) { info("Aucune alternative compatible trouvée avec ton matériel et tes contraintes.", { titre: "Remplacer" }); return; }
  const choix = await dialogue({
    titre: "Remplacer par",
    cancelVal: null,
    actions: [{ label: "Annuler", valeur: null }],
    onMount: (inner, close) => {
      const liste = h(`<div class="stack" style="margin-bottom:8px"></div>`);
      alts.forEach((a, i) => {
        const b = h(`<button class="big exo-pick" style="justify-content:flex-start;gap:10px;text-align:left;margin:3px 0">${vignetteHTML(a.exercice, "sm")}<span><b>${esc(a.exercice.nom)}</b><br><span class="muted small">${esc(a.etiquette)}</span></span></button>`);
        b.addEventListener("click", () => close(i));
        liste.append(b);
      });
      inner.insertBefore(liste, inner.querySelector(".row"));
    },
  });
  if (choix == null || choix < 0 || choix >= alts.length) return;
  const nouvel = alts[choix].exercice;
  // remplace dans le programme ET dans la séance en cours
  const ex = seance.exercices.find((x) => x.exerciceId === exId);
  ex.exerciceId = nouvel.id; ex.justification = `Remplacement choisi : ${alts[choix].explication}`;
  const anc = LIVE.data[exId]; delete LIVE.data[exId];
  LIVE.data[nouvel.id] = { ...anc, exId: nouvel.id };
  persistLive(true); render();
}
async function terminer() {
  const seance = trouverSeance(LIVE.seanceId);
  const exercices = [];
  for (const exId in LIVE.data) {
    const st = LIVE.data[exId];
    // La colonne d'effort saisit soit un RIR, soit un RPE : l'historique, lui,
    // ne stocke que du RIR (RIR = 10 − RPE) pour que le moteur de fatigue et
    // les statistiques restent comparables d'une séance à l'autre.
    const enRpe = metriqueEffort() === "RPE";
    // Conversion pure et testée (liveSession.js) : kg depuis l'unité de saisie,
    // virgule française acceptée, km/min → m/s en mode distance, RPE conservé.
    const mode = modeSaisie(getExercise(st.exId), st.series[0]);
    const series = st.series.filter((s) => serieAEnregistrer(s, mode))
      .map((s) => serieLogDepuisLive(s, { lb: LIVE.unite === "lb", enRpe, mode }));
    if (series.length || st.douleur) {
      exercices.push({
        exerciceId: exId, series, douleur: st.douleur,
        supersetGroupe: st.supersetGroupe || undefined,
        note: st.note ? String(st.note).slice(0, 500) : undefined,
      });
    }
  }
  // Une séance sans la moindre série n'est pas une séance. L'enregistrer
  // polluerait l'historique : elle compterait comme un jour d'entraînement pour
  // le moteur (qui plafonne les jours par semaine) et comme une croix dans le
  // calendrier d'assiduité, pour un entraînement qui n'a pas eu lieu.
  if (!exercices.length) {
    const ok = await confirmer(
      "Aucune série n'a été validée. Fermer la séance sans rien enregistrer ?",
      { danger: true, ok: "Fermer sans enregistrer", titre: "Séance vide" });
    if (!ok) return;
    LIVE = null; Etat.data.sessionEnCours = null; Etat.sauver();
    arreterChrono(); stopTimer(); nav("dash");
    toast("Séance fermée — rien n'a été enregistré");
    return;
  }
  const fin = new Date().toISOString();
  const debut = LIVE.debut || fin;
  const nouveauLog = {
    id: Etat.uid(), date: fin, debut, fin,
    dureeSec: dureeSecondes(debut, fin),
    seanceId: seance.id, seanceNom: seance.nom, exercices,
  };
  // Détecte les nouveaux records AVANT d'ajouter la séance à l'historique.
  const prs = recordsDeSeance(Etat.data.logs, nouveauLog);
  Etat.data.logs.push(nouveauLog);
  LIVE = null;
  Etat.data.sessionEnCours = null; // séance terminée : plus rien à reprendre
  Etat.sauver();
  arreterChrono();
  // Le minuteur de repos aussi : sans ça, il reste PAR-DESSUS l'écran de fin.
  // On termine sa séance et un décompte tourne en plein écran pour une série
  // qu'on ne fera pas — le chemin « séance vide » l'arrêtait déjà, pas celui-ci.
  stopTimer();
  // Un record mérite mieux qu'un « séance enregistrée » : c'est la seule chose
  // qui distingue cette séance des cinquante précédentes.
  jouer(prs && prs.length ? "record" : "termine", Etat.data.reglages);
  nav("dash");
  ecranFinSeance(nouveauLog, prs);
}
/** Écran récapitulatif de fin de séance (façon maquette). */
function ecranFinSeance(log, prs) {
  const min = Math.round((log.dureeSec || 0) / 60);
  const dureeTxt = min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}` : `${min} min`;
  const nbSeries = (log.exercices || []).reduce((a, e) => a + (e.series || []).length, 0);
  const volume = Math.round(volumeLog(log));
  // Même estimation que l'accueil et Progrès : MET × poids × durée (et non
  // plus 8 kcal/min pour tout le monde, quel que soit le poids).
  const cal = caloriesLog(log, (Etat.data.profil || {}).poidsKg, getExercise);
  const kcal = cal.total;
  const sheet = h(`<div class="sheet finseance"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  // « Excellent travail, continue comme ça ! » ne disait rien, et on cesse de le
  // lire dès la deuxième séance. La sous-ligne porte maintenant le fait le plus
  // marquant : un record, un mouvement plus lourd qu'il y a huit jours, ou —
  // honnêtement — une séance plus légère. L'emoji est parti : le design system
  // proscrit l'emoji comme iconographie.
  const cmp = comparerSeance(log, (Etat.data.logs || []).filter((l) => l && l.id !== log.id));
  const titre = phraseBilan(cmp, prs.length, nomExo);
  inner.append(h(`<div class="fin-head"><div class="fin-check">${IC.check}</div>
    <h1 style="margin:16px 0 4px">Séance terminée</h1>
    <div class="fin-sous">${esc(titre)}</div></div>`));
  const g = h(`<div class="statgrid" style="margin-top:20px"></div>`);
  g.append(statCard(IC.clock, dureeTxt, "Durée"));
  g.append(statCard(IC.dumbbell, `${(log.exercices || []).length}`, "Exercices"));
  g.append(statCard(IC.repeat, `${nbSeries}`, "Séries"));
  g.append(statCard(IC.bars, uVolume(volume).replace(/ (kg|lb)$/, ""), `Volume ${uUnite()}`));
  g.append(statCard(IC.flame, kcal ? `≈ ${kcal}` : "—", "kcal estimées"));
  g.append(statCard(IC.trophy, `${prs.length}`, prs.length > 1 ? "Records" : "Record"));
  inner.append(g);
  // Effort perçu moyen : RPE saisi, ou déduit du RIR (et dit comme tel).
  const eff = effortMoyen(seriesDe(log));
  if (eff.n) inner.append(h(`<div class="small muted" style="margin-top:var(--space-2)">Effort moyen : <b>RPE ${String(eff.rpe).replace(".", ",")}</b> sur ${eff.n} série${eff.n > 1 ? "s" : ""} notée${eff.n > 1 ? "s" : ""}${eff.deduites ? ` (dont ${eff.deduites} déduite${eff.deduites > 1 ? "s" : ""} du RIR)` : ""}.</div>`));
  // Le détail de l'estimation, quand la séance contient du cardio ou des
  // maintiens : on montre d'où vient le chiffre plutôt que de le donner à croire.
  if (cal.exercices.length) {
    const parts = cal.exercices.map((x) => `${nomExo(x.exerciceId)} ${String(x.met).replace(".", ",")} MET${x.base && x.base !== "maintien" ? ` (${x.base})` : ""} ≈ ${x.kcal} kcal`);
    if (cal.musculation.kcal) parts.push(`musculation et repos ${cal.musculation.met} MET ≈ ${cal.musculation.kcal} kcal`);
    inner.append(h(`<div class="hint">${esc(parts.join(" · "))}. MET du Compendium 2024 des activités physiques ; estimation, pas une mesure.</div>`));
  }
  if (prs.length) {
    const rc = h(`<div class="card stack" style="margin-top:14px"><b class="fin-pr">${medaille({ rang: Math.min(5, prs.length + 2), taille: 26 })}${prs.length > 1 ? "Nouveaux records" : "Nouveau record"}</b></div>`);
    prs.forEach((r) => rc.append(h(`<div class="small">• ${esc(r.nom)} : ${esc(etiquettePR(r))}</div>`)));
    inner.append(rc);
  }
  // Comparaison avec la précédente séance comparable. « 12 400 kg » ne dit rien
  // tout seul : le seul repère utile, c'est soi-même la fois d'avant.
  if (cmp.comparable) {
    const cc = h(`<div class="card stack" style="margin-top:14px"></div>`);
    const d = new Date(cmp.reference.date);
    cc.append(h(`<div class="spread"><span class="eyebrow" style="margin:0">Par rapport à la dernière fois</span>
      <span class="muted small">il y a ${cmp.jours} j</span></div>`));
    const ecart = (v, unite) => `<b class="num ${v > 0 ? "fin-plus" : v < 0 ? "fin-moins" : ""}">${v > 0 ? "+" : ""}${v.toLocaleString("fr-FR")}${unite}</b>`;
    cc.append(h(`<div class="fin-deltas">
      <span>${ecart(Math.round(uImp() ? cmp.delta.volume * 2.20462 : cmp.delta.volume), " " + uUnite())}<span class="muted">Volume</span></span>
      <span>${ecart(cmp.delta.series, "")}<span class="muted">Séries</span></span>
      <span>${ecart(Math.round(cmp.delta.duree / 60), " min")}<span class="muted">Durée</span></span>
    </div>`));
    // Les mouvements nommés, pas seulement un total : un volume en baisse parce
    // qu'on a fait moins de séries n'est pas une régression.
    cmp.progres.slice(0, 3).forEach((p) => cc.append(h(`<div class="spread small fin-mvt">
      <span>${esc(nomExo(p.exerciceId))}</span>
      <span><b class="num fin-plus">+${fr(uAff(p.delta))} ${uUnite()}</b> <span class="muted">${fr(uAff(p.avant))} → ${fr(uAff(p.apres))}</span></span></div>`)));
    cmp.recul.slice(0, 2).forEach((p) => cc.append(h(`<div class="spread small fin-mvt">
      <span class="muted">${esc(nomExo(p.exerciceId))}</span>
      <span><b class="num fin-moins">${fr(uAff(p.delta))} ${uUnite()}</b> <span class="muted">${fr(uAff(p.avant))} → ${fr(uAff(p.apres))}</span></span></div>`)));
    inner.append(cc);
  } else if (cmp.raison) {
    inner.append(h(`<div class="hint" style="margin-top:14px">${esc(cmp.raison)}</div>`));
  }

  // Ressenti (correctif subjectif borné) puis impact musculaire de la séance.
  inner.append(blocRessenti());
  inner.append(blocImpactSeance(log));

  const bEtir = h(`<button class="card wcard sil warm-cta" style="width:100%;margin-top:16px;text-align:left"><span class="mi mi-indigo" style="width:34px;height:34px">${IC.wind}</span><span class="g"><b>Étirements guidés</b><br><span class="muted small">${ETIREMENTS.length} mouvements · ~${Math.round(dureeSequence(ETIREMENTS) / 60)} min · retour au calme</span></span><span class="chev" aria-hidden="true">›</span></button>`);
  bEtir.addEventListener("click", () => ouvrirSequence("Étirements", ETIREMENTS, { onFin: () => {} }));
  inner.append(bEtir);
  const acts = h(`<div class="row" style="margin-top:16px"></div>`);
  const bVoir = h(`<button class="secondary big" style="flex:1">Voir la séance</button>`);
  bVoir.addEventListener("click", () => { sheet.remove(); nav("stats"); });
  const bFin = h(`<button class="primary big" style="flex:1">Terminer</button>`);
  bFin.addEventListener("click", () => { sheet.remove(); nav("dash"); });
  acts.append(bVoir, bFin);
  // Note de séance : contexte qu'aucun chiffre ne porte (sommeil, énergie,
  // douleur). Enregistrée au fil de la frappe avec la séance.
  const noteS = h(`<label class="fin-note small muted">Note de séance (facultatif)<textarea rows="2" maxlength="500" placeholder="Énergie, sommeil, contexte…" aria-label="Note de séance"></textarea></label>`);
  const zoneNote = noteS.querySelector("textarea");
  zoneNote.value = log.note || "";
  let tNote = null;
  zoneNote.addEventListener("input", () => {
    clearTimeout(tNote);
    tNote = setTimeout(() => { const t = zoneNote.value.trim().slice(0, 500); if (t) log.note = t; else delete log.note; Etat.sauver(); }, 400);
  });
  zoneNote.addEventListener("blur", () => { clearTimeout(tNote); const t = zoneNote.value.trim().slice(0, 500); if (t) log.note = t; else delete log.note; Etat.sauver(); });
  inner.append(noteS);
  inner.append(acts);
  document.body.append(sheet);
}
/**
 * Records d'une séance, tous types confondus mais jamais mélangés : charge,
 * 1RM estimé et répétitions (records.js) ; distance, vitesse, durée de maintien
 * et volume (mesures.js). Le volume n'est signalé que si l'exercice n'a pas
 * déjà un autre record dans la séance : sinon la liste devient du bruit.
 */
function recordsDeSeance(logsAnterieurs, log) {
  const base = detecterRecords(logsAnterieurs, log, nomExo);
  const autres = detecterRecordsMesures(logsAnterieurs, log, nomExo)
    .filter((r) => r.type !== "volume" || !base.some((b) => b.exerciceId === r.exerciceId));
  return [...base, ...autres];
}
/** Libellé court d'un record, dans l'unité qui lui est propre. */
function etiquettePR(r) {
  if (r.type === "poids") {
    // Sur un maintien (planche), la charge est un lest : on le dit.
    const lest = mesuresExercice(getExercise(r.exerciceId)).isometrique;
    const avant = r.ancien ? uCharge(r.ancien) : (lest ? "sans lest" : uCharge(0));
    return `${lest ? "lest " : ""}${uCharge(r.valeur)} (avant ${avant})`;
  }
  if (r.type === "reps") return `${r.valeur} reps (avant ${r.ancien})`;
  if (r.type === "distance") return `${texteDistance(r.valeur)} (avant ${texteDistance(r.ancien)})`;
  if (r.type === "vitesse") return `${texteVitesse(r.valeur)} de moyenne (avant ${texteVitesse(r.ancien)})`;
  if (r.type === "duree") return `${texteDuree(r.valeur)} de maintien (avant ${texteDuree(r.ancien)})`;
  if (r.type === "volume") return `volume ${uVolume(r.valeur)} (avant ${uVolume(r.ancien)})`;
  return `1RM estimé ${uCharge(r.valeur)} (avant ${uCharge(r.ancien)})`;
}

/* ---------- minuteur de repos ----------
   Un SEUL état de repos (`REPOS`), fondé sur l'instant de fin et persisté :
   il survit au verrouillage de l'écran, au changement d'application et au
   rechargement. L'affichage — plein écran ou capsule — n'est qu'une vue de cet
   état, jamais la source de vérité. */
let TMR = null;
let REPOS = null;           // { finAt, totalSec, label } | null
let VEILLE = null;          // verrou d'écran (Wake Lock), best-effort
let CAL_VIEW = null; // {annee, mois} du calendrier d'assiduité affiché (Progrès)

/** Empêche l'écran de s'éteindre pendant le repos, quand le navigateur le permet. */
async function tenirEcran() {
  try {
    if (VEILLE || !navigator.wakeLock) return;
    VEILLE = await navigator.wakeLock.request("screen");
    VEILLE.addEventListener?.("release", () => { VEILLE = null; });
  } catch (e) { VEILLE = null; }   // refusé (batterie faible, onglet caché) : sans conséquence
}
function relacherEcran() {
  try { VEILLE?.release?.(); } catch (e) {}
  VEILLE = null;
}

/** Écrit l'état de repos dans le stockage pour qu'il survive à un rechargement. */
function persistRepos() {
  Etat.data.reposEnCours = REPOS ? { ...REPOS } : null;
  Etat.sauver();
}

/** Le repos est terminé : signal, nettoyage, message. */
function finDuRepos(annonce) {
  // Combien de temps s'est réellement écoulé depuis la fin. Écran verrouillé,
  // le navigateur gèle la page : le signal n'arrive qu'au déverrouillage, et
  // annoncer « repos terminé » à ce moment-là laisse croire qu'il vient de
  // s'écouler. Entre une série reprise à l'heure et une série reprise trois
  // minutes trop tard, ce n'est plus le même entraînement.
  const retard = retardSec(REPOS);
  const enRetard = retard >= RETARD_SIGNIFICATIF_SEC;
  const message = enRetard
    ? `Repos terminé il y a ${formatRetard(retard)}`
    : "Repos terminé — série suivante";

  const ann = $("#ovAnnonce"); if (ann) ann.textContent = enRetard ? message : "Repos terminé, série suivante";
  const visible = $("#overlay").classList.contains("show") || !!document.getElementById("restCap")?.classList.contains("show");
  stopTimer();
  jouer("reprise", Etat.data.reglages);
  try { if (Etat.data.reglages.vibrations !== false) navigator.vibrate?.([120, 60, 120]); } catch (e) {}

  // La notification est le SEUL canal qui traverse l'écran verrouillé : le son
  // et la vibration exigent que la page tourne. Inutile de la poster si l'écran
  // est déjà sous les yeux — ce serait du bruit.
  if (document.visibilityState !== "visible" && Etat.data.reglages.notifsRepos !== false) {
    notifier("Repos terminé", {
      corps: (REPOS_LABEL ? REPOS_LABEL + " · " : "") + "Série suivante",
      vibrer: Etat.data.reglages.vibrations !== false,
    });
  }
  if (annonce !== false && !visible) toast(message);
}

/** Libellé du repos qui vient de s'achever, pour le corps de la notification. */
let REPOS_LABEL = "";

/**
 * Dernière seconde déjà sonnée, pour ne biper qu'UNE fois par seconde.
 * La boucle tourne à 4 Hz : sans ce garde-fou, chaque seconde sonnerait quatre
 * fois — ce qui transformerait le décompte en alarme.
 * @type {number|null}
 */
let DERNIER_BIP = null;

/**
 * Trois bips dans les trois dernières secondes du repos.
 *
 * C'est le seul moment où l'app a vraiment quelque chose à dire à quelqu'un qui
 * ne regarde pas l'écran : « prépare-toi ». Le son est identique à chaque
 * seconde — c'est la répétition qui informe, pas la hauteur.
 */
function bipDecompte() {
  if (!REPOS) { DERNIER_BIP = null; return; }
  const reste = restantSec(REPOS);
  if (reste > 3 || reste <= 0) return;
  if (DERNIER_BIP === reste) return;
  DERNIER_BIP = reste;
  jouer("compte", Etat.data.reglages);
}

/** Redessine les deux vues possibles du repos à partir de l'horloge. */
function dessinerRepos() {
  if (!REPOS) return;
  const reste = restantSec(REPOS);
  const ov = $("#overlay");
  if (ov && ov.classList.contains("show")) {
    $("#ovTxt").textContent = formatRestant(REPOS);
    $("#ringFg").style.strokeDashoffset = String(653 * progression(REPOS));
    $("#overlay .ring")?.classList.toggle("urgent", reste <= 10);
  }
  const cap = document.getElementById("restCap");
  if (cap && cap.classList.contains("show")) {
    cap.querySelector("b").textContent = formatRestant(REPOS);
    cap.classList.toggle("urgent", reste <= 10);
  }
}

/** Boucle d'affichage. Elle ne calcule rien : elle relit l'horloge. */
function boucleRepos() {
  clearInterval(TMR);
  TMR = setInterval(() => {
    if (!REPOS) { clearInterval(TMR); TMR = null; return; }
    if (estEcoule(REPOS)) { finDuRepos(); return; }
    bipDecompte();
    dessinerRepos();
  }, 250);   // 4 fois par seconde : l'affichage reste juste même si un tic saute
}

function startTimer(sec, label = "") {
  DERNIER_BIP = null;   // nouveau repos : le décompte repart de zéro
  REPOS = creerRepos(sec, label);
  REPOS_LABEL = String(label || "");
  // On ne demande la permission qu'ICI, au premier repos : réclamer les
  // notifications au chargement se fait refuser, et un refus est DÉFINITIF —
  // Chrome ne redemande jamais. Au premier repos, la demande a un sens évident.
  amorcerNotifsRepos();
  persistRepos();
  ouvrirEcranRepos();
}

/** Affiche le repos en plein écran (à partir de l'état courant). */
function ouvrirEcranRepos() {
  if (!REPOS) return;
  const ov = $("#overlay"); ov.classList.add("show");
  masquerCapsule(false);
  const sub = $("#ovSub"); if (sub) sub.textContent = REPOS.label;
  const ann = $("#ovAnnonce");
  if (ann) ann.textContent = `Temps de repos ${restantSec(REPOS)} secondes${REPOS.label ? ", " + REPOS.label : ""}`;
  dessinerRepos(); boucleRepos(); tenirEcran();
  $("#ovPlus").onclick = () => { REPOS = ajusterRepos(REPOS, 15); persistRepos(); dessinerRepos(); };
  $("#ovMinus").onclick = () => { REPOS = ajusterRepos(REPOS, -15); persistRepos(); dessinerRepos(); };
  $("#ovSkip").onclick = stopTimer; // « Passer le repos » arrête vraiment
  // Un tap sur le fond RÉDUIT le minuteur : il continue dans une capsule, ce
  // qui permet de saisir la série suivante sans perdre le décompte.
  ov.onclick = (e) => {
    if (e.target !== ov) return;
    ov.classList.remove("show");
    $("#overlay .ring")?.classList.remove("urgent");
    if (!estEcoule(REPOS)) afficherCapsule();
    else stopTimer();
  };
}

function stopTimer() {
  clearInterval(TMR); TMR = null;
  REPOS = null; persistRepos();
  relacherEcran();
  $("#overlay").classList.remove("show");
  $("#overlay .ring")?.classList.remove("urgent");
  masquerCapsule(false);
}

/* ---------- capsule de repos persistante ----------
   Réduire le minuteur ne doit pas l'arrêter : on continue à voir le temps
   restant tout en saisissant la série suivante ou en changeant d'écran. */
function afficherCapsule() {
  if (!REPOS) return;
  let cap = document.getElementById("restCap");
  if (!cap) {
    cap = h(`<button id="restCap" class="restcap" aria-label="Reprendre le minuteur de repos"><span class="cic">${IC.clock}</span><b class="num"></b></button>`);
    cap.addEventListener("click", () => { if (REPOS && !estEcoule(REPOS)) ouvrirEcranRepos(); else stopTimer(); });
    document.body.append(cap);
  }
  cap.classList.add("show");
  dessinerRepos(); boucleRepos();
}
function masquerCapsule(arreter = true) {
  document.getElementById("restCap")?.classList.remove("show");
  if (arreter) stopTimer();
}

/**
 * Reprend un repos en cours après un rechargement, un réveil ou un retour dans
 * l'application. Si le repos s'est achevé pendant l'absence, on le signale une
 * fois puis on nettoie — plutôt que d'afficher un décompte figé et faux.
 */
function reprendreRepos() {
  // Un minuteur de repos n'a de sens QUE pendant une séance. Un repos resté en
  // stockage — séance abandonnée, onglet fermé pendant la pause — faisait
  // apparaître une capsule de décompte sur une application au repos : on ouvre
  // l'app un mardi matin, un minuteur tourne, et on ne peut qu'en conclure que
  // quelque chose est cassé.
  const decision = decisionReprise(Etat.data.reposEnCours, !!LIVE);
  if (decision === "rien") return;
  if (decision === "purger" && !LIVE) {
    Etat.data.reposEnCours = null; Etat.sauver();   // en silence : rien à annoncer
    return;
  }
  const restaure = restaurerRepos(Etat.data.reposEnCours);
  if (restaure) { REPOS = restaure; afficherCapsule(); return; }
  if (Etat.data.reposEnCours) {          // il existait mais il est échu
    // DEPUIS QUAND, pas seulement « c'est fini ». C'est le chemin réellement
    // emprunté au déverrouillage : « terminé » tout court laisse croire qu'il
    // vient de s'écouler, alors qu'il peut dater de trois minutes.
    const retard = retardSec(Etat.data.reposEnCours);
    Etat.data.reposEnCours = null; Etat.sauver();
    toast(retard >= RETARD_SIGNIFICATIF_SEC
      ? `Repos terminé il y a ${formatRetard(retard)}`
      : "Repos terminé pendant ton absence");
  }
}

// Revenir dans l'app doit montrer le temps JUSTE immédiatement : la limitation
// des minuteurs en arrière-plan a pu faire sauter des tics d'affichage.
/**
 * APK : quand l'app passe en arrière-plan pendant un repos, la fin du repos est
 * programmée comme notification Android (elle sonnera même écran verrouillé,
 * même si la WebView est suspendue). Au retour, on l'annule : l'écran prend le
 * relais. Sans effet sur le web.
 */
function synchroReposNatif(arrierePlan) {
  if (!estNatif()) return;
  if (arrierePlan && REPOS && REPOS.finAt && !estEcoule(REPOS) && Etat.data.reglages.notifsRepos !== false) {
    programmerFinRepos(REPOS.finAt, "Repos terminé", (REPOS_LABEL ? REPOS_LABEL + " · " : "") + "Série suivante");
  } else {
    annulerFinRepos();
  }
}
// Capacitor émet « pause » / « resume » sur le document ; la visibilité couvre le reste.
document.addEventListener("pause", () => synchroReposNatif(true));
document.addEventListener("resume", () => synchroReposNatif(false));

document.addEventListener("visibilitychange", () => {
  synchroReposNatif(document.visibilityState !== "visible");
  if (document.visibilityState !== "visible") return;
  // Une notification « repos terminé » encore affichée alors qu'on pousse déjà
  // la série suivante est du bruit — et elle rend les suivantes moins crédibles.
  fermerNotifs();
  if (!REPOS) return;
  if (estEcoule(REPOS)) finDuRepos(); else { dessinerRepos(); boucleRepos(); tenirEcran(); }
});

/**
 * Demande la permission de notifier, une seule fois, au premier repos.
 * Silencieuse en cas de refus : insister transformerait l'app en application
 * qui harcèle, et le navigateur ne redemande de toute façon jamais.
 */
let NOTIFS_DEMANDEES = false;
async function amorcerNotifsRepos() {
  if (NOTIFS_DEMANDEES) return;
  NOTIFS_DEMANDEES = true;
  if (Etat.data.reglages.notifsRepos === false) return;
  if (notifsNativesDispo()) { await autoriserNotifs(); return; }
  const e = etatNotifs();
  if (!e.supporte || e.permission !== "default") return;
  await demanderNotifs();
}

/* ======================================================================
   LECTEUR DE SÉANCE GUIDÉ (plein écran, pas à pas)
   S'appuie sur l'état LIVE existant : chaque écran = une série d'un exercice ;
   après validation → écran de repos (décompte) → série/exercice suivant. Aucun
   nouveau stockage : on écrit dans LIVE.data comme la vue classique, donc la
   sauvegarde et la reprise fonctionnent à l'identique.
   ====================================================================== */
let GUIDE = null; // { ei, si, phase:'work'|'rest', tmr, left, total }

/** Exercices de la séance présents dans l'état live, dans l'ordre. */
function guideExos() {
  const seance = LIVE && trouverSeance(LIVE.seanceId);
  if (!seance) return [];
  return seance.exercices.filter((e) => LIVE.data[e.exerciceId]).map((e) => ({ e, st: LIVE.data[e.exerciceId], exo: getExercise(e.exerciceId) }));
}
/** Total de séries et séries validées, tout l'entraînement confondu. */
function guideProg() {
  let tot = 0, done = 0;
  for (const { st } of guideExos()) for (const s of st.series) { tot++; if (s.done) done++; }
  return { tot, done, pct: tot ? done / tot : 0 };
}
/** Première étape non validée (pour reprendre au bon endroit). */
function guidePremiereEtape() {
  const exos = guideExos();
  for (let ei = 0; ei < exos.length; ei++) {
    const s = exos[ei].st.series;
    for (let si = 0; si < s.length; si++) if (!s[si].done) return { ei, si };
  }
  return exos.length ? { ei: 0, si: 0 } : null;
}
/** La voix est-elle active ? Éteinte par défaut, mémorisée dans les réglages. */
function voixActive() {
  return (Etat.data.reglages.voix ?? VOIX_DEFAUT) === true && voixDisponible();
}
/** Dit un texte UNIQUEMENT si la voix est allumée. Toujours passer par là. */
function annoncer(texte, interrompre = false) {
  if (voixActive()) dire(texte, { interrompre });
}

function ouvrirGuide() {
  if (!LIVE) return;
  const dep = guidePremiereEtape();
  if (!dep) { toast("Aucune série à guider."); return; }
  // `repos` porte l'échéance absolue du repos (src/engine/repos.js) ; sans repos
  // en cours il vaut null. `gel` porte le repos figé pendant une pause
  // (cf. gelerRepos) — c'est le seul moment où l'app ne suit plus l'horloge.
  GUIDE = { ...dep, phase: "work", tmr: null, repos: null, gel: null };
  let g = $("#guide");
  if (!g) { g = h(`<div id="guide" class="guide" role="dialog" aria-label="Séance guidée"><div class="guide-in"></div></div>`); document.body.append(g); }
  document.body.classList.add("guide-open");
  g.classList.add("show");
  guideRender();
}
function guideFermer() {
  // La voix doit se taire AVANT tout le reste : une annonce de repos lancée
  // juste avant la fermeture continuerait de parler sur l'écran de bilan.
  couperVoix();
  if (GUIDE?.tmr) clearInterval(GUIDE.tmr);
  GUIDE = null;
  $("#guide")?.classList.remove("show");
  document.body.classList.remove("guide-open");
  persistLive(true);
  render();
}
/** Passe à l'étape suivante ; renvoie false s'il n'y en a plus (séance finie). */
function guideAvancer() {
  const exos = guideExos();
  const cur = exos[GUIDE.ei];
  if (!cur) return false;
  if (GUIDE.si + 1 < cur.st.series.length) { GUIDE.si++; return true; }
  if (GUIDE.ei + 1 < exos.length) { GUIDE.ei++; GUIDE.si = 0; return true; }
  return false;
}
/** Enregistre la série courante, puis enchaîne repos → suivant (ou fin). */
function guideValider(charge, valeur, mode) {
  const exos = guideExos();
  const cur = exos[GUIDE.ei];
  if (!cur) return;
  const s = cur.st.series[GUIDE.si];
  if (mode === "distance") {
    // Premier champ = kilomètres, second = minutes (texte gardé tel quel).
    if (charge !== "") s.distanceKm = String(charge);
    if (valeur !== "") s.dureeMin = String(valeur);
  } else {
    if (charge !== "") s.charge = String(charge);
    if (valeur !== "") { if (mode === "temps") { const n = parseInt(valeur, 10); if (n > 0) s.dureeSec = n; } else s.reps = String(valeur); }
  }
  s.done = true;
  persistLive(); majProgressionSeance();
  try { if (Etat.data.reglages.vibrations !== false) navigator.vibrate?.(20); } catch (e) {}
  const t = cur.e.series.find((x) => x.type === "travail") || cur.e.series[0];
  const repos = reposEffectif(t && t.reposSec, Etat.data.reglages.reposDefautSec);
  const encore = guideAvancer();
  if (!encore) { guideFin(); return; }
  guideRepos(repos);
}
/** Écran de repos avec décompte ; à 0 (ou « passer ») → série suivante. */
function guideRepos(sec) {
  GUIDE.phase = "rest";
  // HORLOGE MURALE, PAS COMPTAGE DE TICS. L'ancien minuteur faisait `left--`
  // dans un setInterval : le navigateur BRIDE les intervalles d'un onglet en
  // arrière-plan (jusqu'à un tic par minute), si bien que verrouiller son
  // téléphone pendant le repos ARRÊTAIT le décompte. On repose donc sur une
  // échéance absolue, exactement comme le minuteur principal (src/engine/repos.js).
  GUIDE.repos = creerRepos(sec);
  GUIDE.gel = null;
  guideRender();
}

/** Met le repos en pause : on retient ce qu'il restait, et on lâche l'échéance. */
function guidePause() {
  if (!GUIDE || GUIDE.phase !== "rest" || GUIDE.gel) return;
  GUIDE.gel = gelerRepos(GUIDE.repos);
  guideRender();
}
/** Reprend : une nouvelle échéance est posée à partir du temps retenu. */
function guideReprendre() {
  if (!GUIDE || !GUIDE.gel) return;
  GUIDE.repos = degelerRepos(GUIDE.gel);
  GUIDE.gel = null;
  guideRender();
}
function guideFin() {
  // Le volume est calculé AVANT la fermeture : `guideFermer()` remet `LIVE` à
  // plat et il n'y aurait plus rien à annoncer.
  const vol = voixActive() ? volumeLive() : 0;
  guideFermer();
  if (voixActive()) dire(phraseFin(vol));
  terminer();
}

/** Volume soulevé dans la séance en cours, pour l'annonce de fin. */
function volumeLive() {
  let v = 0;
  for (const st of Object.values((LIVE && LIVE.data) || {})) {
    for (const s of (st && st.series) || []) {
      if (!s.done) continue;
      const c = parseFloat(String(s.charge || "0").replace(",", "."));
      const r = parseInt(String(s.reps || "0"), 10);
      if (Number.isFinite(c) && Number.isFinite(r)) v += c * r;
    }
  }
  return v;
}
function guideRender() {
  const g = $("#guide .guide-in");
  if (!g || !GUIDE) return;
  if (GUIDE.tmr) { clearInterval(GUIDE.tmr); GUIDE.tmr = null; }
  const exos = guideExos();
  const cur = exos[GUIDE.ei];
  if (!cur) { guideFin(); return; }
  const { pct, done, tot } = guideProg();
  // Le haut-parleur vit ICI et pas dans les réglages : c'est le seul écran où
  // la voix sert, et une option enterrée trois niveaux plus bas n'est jamais
  // trouvée. Elle reste accessible depuis le Profil pour qui la cherche là.
  const vx = voixActive();
  const dispo = voixDisponible();
  const barre = `<div class="guide-top">
      <button class="guide-x" aria-label="Quitter le mode guidé">${IC.x}</button>
      <div class="guide-count">Exercice ${GUIDE.ei + 1}/${exos.length} · série ${GUIDE.si + 1}/${cur.st.series.length}</div>
      ${dispo ? `<button class="guide-voix${vx ? " on" : ""}" aria-pressed="${vx}" aria-label="${vx ? "Couper" : "Activer"} la voix du coach">${vx ? IC.volume : IC.volumeOff}</button>` : ""}
      <div class="guide-progn num">${done}/${tot}</div>
    </div>
    <div class="bar guide-bar"><div style="width:${Math.round(pct * 100)}%"></div></div>`;
  g.innerHTML = "";
  g.append(h(barre));
  // `if (confirm)` testait l'EXISTENCE de la fonction window.confirm — toujours
  // vraie. La croix fermait donc le mode guidé sans jamais rien demander, et le
  // travail en cours disparaissait de l'écran d'un seul geste.
  $("#guide .guide-x").addEventListener("click", async () => {
    const enCours = travailEnCours();
    if (!enCours || await confirmer(
      `Quitter le mode guidé ? ${enCours} série${enCours > 1 ? "s" : ""} déjà renseignée${enCours > 1 ? "s" : ""} ${enCours > 1 ? "sont" : "est"} conservée${enCours > 1 ? "s" : ""} : la séance reste ouverte.`,
      { titre: "Quitter le mode guidé", ok: "Quitter" })) guideFermer();
  });
  const bVoix = $("#guide .guide-voix");
  if (bVoix) {
    bVoix.addEventListener("click", () => {
      const on = !voixActive();
      Etat.data.reglages.voix = on;
      Etat.sauver();
      // On parle tout de suite : sans retour immédiat, on ne sait pas si le
      // volume du téléphone est coupé, et on croit que la fonction est cassée.
      if (on) dire("Voix activée."); else couperVoix();
      guideRender();
    });
  }

  if (GUIDE.phase === "rest") { guideRenderRepos(g, cur); return; }
  guideRenderWork(g, cur);
}
function guideRenderWork(g, cur) {
  const { e, st, exo } = cur;
  const nom = exo ? exo.nom : e.exerciceId;
  const muscles = (exo && exo.musclesPrincipaux) || [];
  const mode = modeSaisie(exo, st.series[GUIDE.si]?.dureeSec ? st.series[GUIDE.si] : st.series[0]);
  const enTemps = mode === "temps";
  const enDistance = mode === "distance";
  const t = e.series.find((x) => x.type === "travail") || e.series[0];
  const plage = (t && t.repsCible) || (exo && exo.repsPertinent) || [8, 12];
  const [derniere, avant] = exo ? Etat.perfs(st.exId) : [null, null];
  const sug = exo ? recommander(st.exId, plage, derniere || null, avant || null) : { message: "", chargeKg: null };
  const s = st.series[GUIDE.si];
  const dureePrevue = Number(t?.dureeSec) || 0;
  const cibleTxt = enDistance ? (dureePrevue >= 60 ? `${Math.round(dureePrevue / 60)} min` : "Distance · durée")
    : enTemps ? `${s.dureeSec || t?.dureeSec || 40} s` : `${plage[0]}–${plage[1]} reps`;

  const body = h(`<div class="guide-body"></div>`);
  if (exo && exo.patron) body.append(h(`<div class="guide-demo">${animDemo(exo)}</div>`));
  else body.append(h(`<div class="guide-sil">${muscles.length ? miniSilhouette(muscles) : ""}</div>`));
  body.append(h(`<h1 class="guide-nom">${esc(nom)}</h1>`));
  if (muscles.length) body.append(h(`<div class="guide-mus">${muscles.map((m) => esc(MUSCLE_LABELS[m] || m)).join(" · ")}</div>`));
  body.append(h(`<div class="guide-cible"><span class="num">${esc(cibleTxt)}</span>${sug.chargeKg && !enDistance ? ` · conseil ~${texteCharge(sug.chargeKg, uLive())}` : ""}</div>`));
  if (sug.message) body.append(h(`<div class="notice small guide-conseil">${esc(sug.message)}</div>`));

  const inp = h(`<div class="guide-inputs"></div>`);
  const dpG = derniere && derniere.series[GUIDE.si];
  const champCharge = enDistance
    ? h(`<label class="guide-field"><span>Distance (km)</span><input inputmode="decimal" value="${esc(s.distanceKm || "")}" placeholder="${esc((dpG && kmSaisie(dpG.distanceM)) || "—")}" aria-label="Distance en kilomètres"></label>`)
    : h(`<label class="guide-field"><span>${enTemps ? "Lest" : "Charge"} (${uLive() ? "lb" : "kg"})</span><input inputmode="decimal" value="${esc(s.charge || "")}" placeholder="${uAffLive(sug.chargeKg) ?? "—"}" aria-label="${enTemps ? "Lest" : "Charge"}"></label>`);
  const champVal = enDistance
    ? h(`<label class="guide-field"><span>Durée (min)</span><input inputmode="decimal" value="${esc(s.dureeMin || "")}" placeholder="${esc((dpG && minutesSaisie(dpG.dureeSec)) || (dureePrevue >= 60 ? minutesSaisie(dureePrevue) : "—"))}" aria-label="Durée en minutes"></label>`)
    : h(`<label class="guide-field"><span>${enTemps ? "Durée (s)" : "Répétitions"}</span><input inputmode="numeric" value="${esc(enTemps ? (s.dureeSec || "") : (s.reps || ""))}" placeholder="${enTemps ? (t?.dureeSec || 40) : plage[0]}" aria-label="${enTemps ? "Durée" : "Répétitions"}"></label>`);
  inp.append(champCharge, champVal);
  body.append(inp);
  g.append(body);

  // ANNONCE DE LA SÉRIE. Mémorisée dans `GUIDE.dit` pour ne jamais être répétée :
  // `guideRender()` est rappelé à chaque frappe dans un champ, et sans ce garde
  // la voix relancerait « série 2 sur 4 » à chaque chiffre tapé.
  const cle = `${GUIDE.ei}:${GUIDE.si}`;
  if (GUIDE.dit !== cle) {
    const nouvelExo = GUIDE.ditExo !== GUIDE.ei;
    GUIDE.dit = cle; GUIDE.ditExo = GUIDE.ei;
    annoncer(phraseSerie(nom, GUIDE.si, st.series.length, nouvelExo));
  }

  const acts = h(`<div class="guide-actions"></div>`);
  const bPrev = h(`<button class="chip guide-nav"${GUIDE.ei === 0 && GUIDE.si === 0 ? " disabled" : ""}><span class="cic">${IC.back}</span></button>`);
  bPrev.addEventListener("click", () => { if (guideReculer()) guideRender(); });
  const bOk = h(`<button class="primary big guide-valider"><span class="btn-ico">${IC.check}</span>${s.done ? "Série suivante" : "Valider la série"}</button>`);
  bOk.addEventListener("click", () => {
    const c = champCharge.querySelector("input").value.trim();
    const val = champVal.querySelector("input").value.trim();
    guideValider(c, val, mode);
  });
  const bSkip = h(`<button class="chip guide-nav" aria-label="Passer"><span class="cic">${IC.forward}</span></button>`);
  bSkip.addEventListener("click", () => { if (!guideAvancer()) { guideFin(); return; } GUIDE.phase = "work"; guideRender(); });
  acts.append(bPrev, bOk, bSkip);
  g.append(acts);
}
/** Recule d'une étape (série précédente / exercice précédent). */
function guideReculer() {
  const exos = guideExos();
  if (GUIDE.si > 0) { GUIDE.si--; return true; }
  if (GUIDE.ei > 0) { GUIDE.ei--; GUIDE.si = Math.max(0, exos[GUIDE.ei].st.series.length - 1); return true; }
  return false;
}
function guideRenderRepos(g, cur) {
  const exos = guideExos();
  const suiv = exos[GUIDE.ei];
  const nomSuiv = suiv && (suiv.exo ? suiv.exo.nom : suiv.e.exerciceId);
  const enPause = !!GUIDE.gel;
  const rest = h(`<div class="guide-rest">
    <div class="eyebrow">${enPause ? "En pause" : "Récupération"}</div>
    <h1 class="guide-repos-t">Repos</h1>
    <div class="ring guide-ring${enPause ? " pause" : ""}">
      <svg viewBox="0 0 230 230"><circle cx="115" cy="115" r="104" fill="none" stroke="var(--surface-2)" stroke-width="12"/>
      <circle class="gfg" cx="115" cy="115" r="104" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round" stroke-dasharray="653" stroke-dashoffset="0"/></svg>
      <div class="t num guide-count-t">0:00</div>
    </div>
    <div class="guide-next">À suivre : <b>${esc(nomSuiv || "")}</b> · série ${GUIDE.si + 1}</div>
    <div class="row" style="justify-content:center">
      <button class="chip" id="gMinus">−15 s</button>
      <button class="chip" id="gPause">${enPause ? "Reprendre" : "Pause"}</button>
      <button class="chip" id="gPlus">+15 s</button>
    </div>
    <button class="primary big" id="gSkip" style="max-width:300px"><span class="btn-ico">${IC.forward}</span>Passer le repos</button>
  </div>`);
  g.append(rest);
  const txt = rest.querySelector(".guide-count-t");
  const fg = rest.querySelector(".gfg");
  const ring = rest.querySelector(".guide-ring");

  // L'AFFICHAGE NE CALCULE RIEN : il relit l'horloge. Un tic qui saute, un
  // onglet bridé ou un téléphone verrouillé ne décalent donc jamais le repos.
  const reste = () => (GUIDE.gel ? GUIDE.gel.restantSec : restantSec(GUIDE.repos));
  const draw = () => {
    const r = reste();
    txt.textContent = `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}`;
    const part = GUIDE.gel
      ? 1 - GUIDE.gel.restantSec / Math.max(1, GUIDE.gel.totalSec)
      : progression(GUIDE.repos);
    fg.style.strokeDashoffset = String(653 * part);
    ring.classList.toggle("urgent", r <= 10 && !GUIDE.gel);
  };
  const fini = () => {
    if (GUIDE.tmr) clearInterval(GUIDE.tmr);
    GUIDE.tmr = null; GUIDE.phase = "work"; GUIDE.gel = null;
    try { if (Etat.data.reglages.vibrations !== false) navigator.vibrate?.([120, 60, 120]); } catch (e) {}
    // « C'est parti » interrompt le « 1 » du décompte : sinon les deux
    // s'empilent et la reprise s'annonce une seconde trop tard.
    annoncer(phraseReprise(), true);
    guideRender();
  };

  const totalInitial = (GUIDE.repos && GUIDE.repos.totalSec) || 0;
  if (GUIDE.ditRepos !== totalInitial + ":" + GUIDE.ei + ":" + GUIDE.si) {
    GUIDE.ditRepos = totalInitial + ":" + GUIDE.ei + ":" + GUIDE.si;
    annoncer(`${phraseRepos(totalInitial)} À suivre, ${nomSuiv ? String(nomSuiv).replace(/\([^)]*\)/g, "").trim() : ""}.`);
  }
  draw();
  if (!enPause) {
    // Quatre fois par seconde, comme le minuteur principal : l'affichage reste
    // juste même si un tic saute, et le jalon vocal n'est jamais manqué.
    let ditJalon = null;
    GUIDE.tmr = setInterval(() => {
      if (!GUIDE || GUIDE.phase !== "rest") { clearInterval(GUIDE.tmr); GUIDE.tmr = null; return; }
      if (estEcoule(GUIDE.repos)) { fini(); return; }
      const r = restantSec(GUIDE.repos);
      if (r !== ditJalon) {
        ditJalon = r;
        const d = phraseDecompte(r);
        if (d) annoncer(d, true);   // « 2 » doit effacer « 3 », pas s'empiler
      }
      draw();
    }, 250);
  }
  rest.querySelector("#gPlus").addEventListener("click", () => {
    if (GUIDE.gel) GUIDE.gel = { ...GUIDE.gel, restantSec: GUIDE.gel.restantSec + 15, totalSec: Math.max(GUIDE.gel.totalSec, GUIDE.gel.restantSec + 15) };
    else GUIDE.repos = ajusterRepos(GUIDE.repos, 15);
    draw();
  });
  rest.querySelector("#gMinus").addEventListener("click", () => {
    if (GUIDE.gel) GUIDE.gel = { ...GUIDE.gel, restantSec: Math.max(1, GUIDE.gel.restantSec - 15) };
    else GUIDE.repos = ajusterRepos(GUIDE.repos, -15);
    draw();
  });
  rest.querySelector("#gPause").addEventListener("click", () => {
    if (GUIDE.gel) guideReprendre(); else guidePause();
  });
  rest.querySelector("#gSkip").addEventListener("click", fini);
}

/* ======================================================================
   SÉQUENCE GUIDÉE (échauffement / étirement) — minuteur auto par mouvement
   Données déterministes (src/data/mobilite.js), aucune saisie, aucun stockage.
   ====================================================================== */
let SEQ = null; // { titre, items, idx, left, paused, tmr, fin }

function ouvrirSequence(titre, items, opts = {}) {
  if (!items || !items.length) return;
  // Même correctif que le repos guidé : ÉCHÉANCE ABSOLUE, pas comptage de tics.
  // Un échauffement se fait souvent en posant le téléphone ; l'onglet passe en
  // arrière-plan et le navigateur bride les intervalles jusqu'à un tic par
  // minute. Le mouvement de 40 s en durait alors plusieurs.
  SEQ = { titre, items, idx: 0, repos: creerRepos(items[0].dureeSec), gel: null,
    tmr: null, teinte: opts.teinte || "accent", onFin: opts.onFin };
  let g = $("#seq");
  if (!g) { g = h(`<div id="seq" class="guide seq" role="dialog" aria-label="Séquence guidée"><div class="guide-in"></div></div>`); document.body.append(g); }
  document.body.classList.add("guide-open");
  g.classList.add("show");
  seqRender();
}
function seqFermer(fini = false) {
  if (SEQ?.tmr) clearInterval(SEQ.tmr);
  const cb = SEQ?.onFin;
  SEQ = null;
  $("#seq")?.classList.remove("show");
  document.body.classList.remove("guide-open");
  if (fini && cb) cb();
}
function seqAvancer(delta) {
  if (SEQ.tmr) { clearInterval(SEQ.tmr); SEQ.tmr = null; }
  const i = SEQ.idx + delta;
  if (i >= SEQ.items.length) { seqFini(); return; }
  SEQ.idx = Math.max(0, i);
  SEQ.repos = creerRepos(SEQ.items[SEQ.idx].dureeSec);
  SEQ.gel = null;
  seqRender();
}
function seqFini() {
  const cb = SEQ?.onFin;
  seqFermer(false);
  try { if (Etat.data.reglages.vibrations !== false) navigator.vibrate?.([120, 60, 120]); } catch (e) {}
  toast(cb ? "Étirements terminés" : "Échauffement terminé — bonne séance");
  if (cb) cb();
}
function seqRender() {
  const g = $("#seq .guide-in");
  if (!g || !SEQ) return;
  if (SEQ.tmr) { clearInterval(SEQ.tmr); SEQ.tmr = null; }
  const it = SEQ.items[SEQ.idx];
  const pct = SEQ.items.slice(0, SEQ.idx).reduce((a, x) => a + x.dureeSec, 0);
  const tot = dureeSequence(SEQ.items);
  const seqRestant = () => (SEQ.gel ? SEQ.gel.restantSec : restantSec(SEQ.repos));
  const pctGlobal = tot ? (pct + (it.dureeSec - seqRestant())) / tot : 0;
  g.innerHTML = "";
  g.append(h(`<div class="guide-top">
      <button class="guide-x" aria-label="Quitter">${IC.x}</button>
      <div class="guide-count">${esc(SEQ.titre)} · ${SEQ.idx + 1}/${SEQ.items.length}</div>
      <div class="guide-progn num">${Math.round(pctGlobal * 100)}%</div>
    </div>
    <div class="bar guide-bar"><div style="width:${Math.round(pctGlobal * 100)}%"></div></div>`));
  $("#seq .guide-x").addEventListener("click", () => seqFermer(false));

  const body = h(`<div class="guide-rest"></div>`);
  body.append(h(`<div class="guide-sil seq-sil">${it.muscles?.length ? miniSilhouette(it.muscles, it.view || "front") : ""}</div>`));
  body.append(h(`<h1 class="guide-nom" style="margin:2px 0 0">${esc(it.nom)}</h1>`));
  const ring = h(`<div class="ring guide-ring seq-ring">
      <svg viewBox="0 0 230 230"><circle cx="115" cy="115" r="104" fill="none" stroke="var(--surface-2)" stroke-width="12"/>
      <circle class="sfg" cx="115" cy="115" r="104" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round" stroke-dasharray="653" stroke-dashoffset="0"/></svg>
      <div class="t num seq-t">0:00</div></div>`);
  body.append(ring);
  if (it.consigne) body.append(h(`<div class="guide-next seq-consigne">${esc(it.consigne)}</div>`));
  g.append(body);

  const acts = h(`<div class="guide-actions"></div>`);
  const bPrev = h(`<button class="chip guide-nav"${SEQ.idx === 0 ? " disabled" : ""} aria-label="Précédent"><span class="cic">${IC.back}</span></button>`);
  bPrev.addEventListener("click", () => seqAvancer(-1));
  const bPause = h(`<button class="primary big seq-pause">${SEQ.gel ? "Reprendre" : "Pause"}</button>`);
  bPause.addEventListener("click", () => {
    if (SEQ.gel) { SEQ.repos = degelerRepos(SEQ.gel); SEQ.gel = null; }
    else SEQ.gel = gelerRepos(SEQ.repos);
    seqRender();
  });
  const bNext = h(`<button class="chip guide-nav" aria-label="Suivant"><span class="cic">${IC.forward}</span></button>`);
  bNext.addEventListener("click", () => seqAvancer(1));
  acts.append(bPrev, bPause, bNext);
  g.append(acts);

  const txt = ring.querySelector(".seq-t");
  const fg = ring.querySelector(".sfg");
  const draw = () => {
    const r = seqRestant();
    txt.textContent = `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}`;
    fg.style.strokeDashoffset = String(653 * (1 - r / Math.max(1, it.dureeSec)));
    ring.classList.toggle("urgent", r <= 5 && !SEQ.gel);
  };
  draw();
  ring.classList.toggle("pause", !!SEQ.gel);
  if (!SEQ.gel) {
    // 4 fois par seconde, comme partout : l'affichage relit l'horloge et ne
    // dépend jamais du nombre de tics reçus.
    SEQ.tmr = setInterval(() => {
      if (!SEQ) return;   // la séquence a été fermée entre deux tics
      if (estEcoule(SEQ.repos)) { seqAvancer(1); return; }
      draw();
    }, 250);
  }
}




/* ======================================================================
   ÉTATS DE L'APPLICATION — hors ligne, mise à jour disponible
   ====================================================================== */

/** Bandeau discret quand la connexion est perdue. L'app fonctionne hors ligne :
 *  le message rassure au lieu d'alarmer. */
function majEtatReseau() {
  let el = document.getElementById("netBar");
  if (navigator.onLine) { el?.remove(); return; }
  if (el) return;
  el = h(`<div id="netBar" class="netbar" role="status">Hors ligne — tes séances continuent d'être enregistrées sur cet appareil.</div>`);
  document.body.append(el);
}
window.addEventListener("online", majEtatReseau);
window.addEventListener("offline", majEtatReseau);

/** Invite à recharger quand une nouvelle version est prête (service worker). */
function proposerMiseAJour() {
  if (document.getElementById("updBar")) return;
  const el = h(`<div id="updBar" class="updbar" role="status"><span>Nouvelle version disponible</span><button class="chip">Mettre à jour</button></div>`);
  el.querySelector("button").addEventListener("click", () => location.reload());
  document.body.append(el);
}
window.addEventListener("coachperso:maj", proposerMiseAJour);

/* ======================================================================
   RESSENTI DE FIN DE SÉANCE
   Petit correctif subjectif sur l'état musculaire. Volontairement borné :
   il module de ±12 points au maximum et ne peut jamais écraser les données
   d'entraînement réelles.
   ====================================================================== */

const RESSENTIS = [
  { v: -1, nom: "Très frais", ic: "◕" },
  { v: -0.4, nom: "Bien", ic: "◑" },
  { v: 0.4, nom: "Fatigué", ic: "◔" },
  { v: 1, nom: "Très fatigué", ic: "○" },
];

/**
 * Impact musculaire de la séance qui vient d'être réalisée, et prochaine étape.
 * Ferme la boucle : on voit ce qu'on a travaillé et ce que le moteur prévoit.
 */
function blocImpactSeance(log) {
  const c = h(`<div class="card stack" style="margin-top:12px"></div>`);
  c.append(h(`<div class="eyebrow">Impact de cette séance</div>`));
  const { parMuscle } = analyserSeance(log, getExercise);
  const lignes = Object.entries(parMuscle)
    .map(([m, e]) => ({ m, s: e.stress }))
    .sort((a, b) => b.s - a.s).slice(0, 5);
  if (!lignes.length) {
    c.append(h(`<div class="muted small">Aucune série enregistrée.</div>`));
    return c;
  }
  const max = lignes[0].s || 1;
  lignes.forEach((l) => {
    c.append(h(`<div class="impact-row"><div class="spread small"><span>${esc(LABELS_MOTEUR[l.m] || l.m)}</span><span class="muted">${l.s.toFixed(1)} séries éq.</span></div>
      <div class="bar" style="height:6px;margin-top:4px"><div style="width:${Math.round((l.s / max) * 100)}%"></div></div></div>`));
  });
  // Prochaine étape : le moteur a déjà recalculé.
  const gen = calculerAuto();
  const suite = gen.repos
    ? "Repos conseillé — l'ensemble du corps est encore en récupération."
    : `${gen.nom} · ${gen.exercices.length} exercices · ~${gen.dureeEstimee} min`;
  c.append(h(`<div class="notice small" style="margin-top:8px"><b>Prochaine séance :</b> ${esc(suite)}</div>`));
  return c;
}

/** Rangée de choix du ressenti, ajoutée à l'écran de fin de séance. */
function blocRessenti() {
  const c = h(`<div class="card stack" style="margin-top:14px"></div>`);
  c.append(h(`<div class="spread"><b>Comment te sens-tu ?</b><span class="muted small">optionnel</span></div>`));
  c.append(h(`<div class="muted small">Ajuste légèrement l'estimation de récupération. Tes séries enregistrées restent la référence.</div>`));
  const row = h(`<div class="ressenti-row"></div>`);
  const actuel = Etat.data.reglages.ressenti ?? 0;
  RESSENTIS.forEach((r) => {
    const b = h(`<button class="ressenti ${actuel === r.v ? "on" : ""}"><span>${r.ic}</span><b>${esc(r.nom)}</b></button>`);
    b.addEventListener("click", () => {
      Etat.data.reglages.ressenti = Etat.data.reglages.ressenti === r.v ? 0 : r.v;
      Etat.sauver();
      row.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
      if (Etat.data.reglages.ressenti === r.v) b.classList.add("on");
      AUTO = null; // forcer le recalcul de la prochaine séance
      try { navigator.vibrate?.(12); } catch (e) {}
    });
    row.append(b);
  });
  c.append(row);
  return c;
}

/* ======================================================================
   COMPOSANTS DE SÉANCE — vignette, badges musculaires, alternatives rapides
   ====================================================================== */





/**
 * Badges des muscles travaillés : principal en accent, secondaires en discret.
 * Un appui explique le rôle de chacun — plus lisible qu'une phrase.
 */
function badgesMuscles(exo) {
  const box = h(`<div class="mbadges"></div>`);
  const princ = (exo.musclesPrincipaux || []).slice(0, 2);
  const sec = (exo.musclesSecondaires || []).slice(0, 2);
  princ.forEach((m) => {
    const b = h(`<button class="mbadge on">${esc(MUSCLE_LABELS[m] || m)}</button>`);
    b.addEventListener("click", (ev) => { ev.stopPropagation(); toast(`${MUSCLE_LABELS[m] || m} — muscle principal`); });
    box.append(b);
  });
  sec.forEach((m) => {
    const b = h(`<button class="mbadge">${esc(MUSCLE_LABELS[m] || m)}</button>`);
    b.addEventListener("click", (ev) => { ev.stopPropagation(); toast(`${MUSCLE_LABELS[m] || m} — muscle secondaire`); });
    box.append(b);
  });
  return box;
}

/**
 * « Machine occupée » : propose immédiatement les meilleures alternatives,
 * classées par compatibilité avec l'état musculaire courant et étiquetées
 * (même muscle, moins de charge lombaire, sur machine…).
 */
function machineOccupee(exerciceId, exo) {
  const seance = trouverSeance(LIVE.seanceId);
  const presents = (seance?.exercices || []).map((x) => x.exerciceId);
  const alts = alternatives(exerciceId, Etat.data.profil, presents);
  const etat = (AUTO && AUTO.etat) || etatMusculaire(Etat.data.logs || [], getExercise, Date.now());

  const sheet = h(`<div class="sheet menu-sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  const fermer = () => sheet.remove();
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0;font-size:1.1rem">Machine occupée</h2><button class="chip" id="oX">✕</button></div>`));
  inner.append(h(`<div class="muted small">Alternatives à « ${esc(exo.nom)} » réalisables avec ton matériel, classées par compatibilité avec ton état actuel.</div>`));

  if (!alts.length) {
    inner.append(h(`<div class="notice small" style="margin-top:12px">Aucune alternative compatible avec ton matériel. Tu peux passer cet exercice ou attendre.</div>`));
  } else {
    const notes = alts.map((a) => ({ a, c: compatibiliteExercice(a.exercice, etat) }))
      .sort((x, y) => y.c.score - x.c.score);
    notes.forEach(({ a, c }) => {
      const row = h(`<button class="card tap alt-row" style="width:100%;text-align:left;margin-top:9px">
        <span class="alt-v">${vignetteExo(a.exercice)}</span>
        <span class="alt-g"><b>${esc(a.exercice.nom)}</b><br><span class="muted small">${esc(a.etiquette)}</span></span>
        <span class="badge ${c.score >= 80 ? "ok" : c.score >= 60 ? "accent" : "amber"}">${c.score} %</span></button>`);
      row.addEventListener("click", () => {
        fermer();
        // Remplacement dans la séance ET dans l'état live, saisies conservées.
        const ex = seance.exercices.find((x) => x.exerciceId === exerciceId);
        if (ex) { ex.exerciceId = a.exercice.id; ex.justification = `Machine occupée — remplacé par ${a.exercice.nom}`; }
        const anc = LIVE.data[exerciceId];
        delete LIVE.data[exerciceId];
        LIVE.data[a.exercice.id] = { ...anc, exId: a.exercice.id };
        persistLive(true);
        toast(`Remplacé par ${a.exercice.nom}`);
        render();
      });
      inner.append(row);
    });
  }
  sheet.querySelector("#oX").addEventListener("click", fermer);
  sheet.addEventListener("click", (ev) => { if (ev.target === sheet) fermer(); });
  document.body.append(sheet);
}

/* ======================================================================
   MOTEUR AUTOMATIQUE — état musculaire et prochaine séance
   Toute la logique vit dans engine/fatigue.js et engine/planner.js (pur,
   testé). Ici on ne fait que brancher : lire l'historique, afficher, et
   convertir la proposition en séance réellement démarrable.
   ====================================================================== */

/** Cache de la proposition, recalculé à chaque rendu de l'accueil. */
let AUTO = null;

/** Exercices réalisables avec le matériel et les limitations de l'utilisateur. */
function catalogueDispo() {
  return CATALOGUE.filter(estRealisable);
}

/** Calcule (ou recalcule) la prochaine séance automatique. */
function calculerAuto(maintenant = Date.now()) {
  const p = Etat.data.profil || {};
  AUTO = genererProchaineSeance(
    Etat.data.logs || [], getExercise, catalogueDispo(),
    { niveau: p.niveau, dureeMin: p.dureeSeanceMin || 60, ressenti: Etat.data.reglages.ressenti || 0, seuilPret: seuilPret() },
    maintenant,
  );
  return AUTO;
}

/**
 * Convertit la proposition du moteur en séance au format de l'application,
 * pour qu'elle soit démarrable, reprenable et enregistrable comme une autre.
 */
function seanceDepuisAuto(gen) {
  const seance = {
    id: "auto-" + Date.now(),
    nom: gen.nom,
    indexJour: 0,
    groupesCibles: [...new Set(gen.muscles.map((m) => FIN_VERS_CATALOGUE[m]).filter(Boolean))],
    exercices: [],
    dureeEstimeeMin: gen.dureeEstimee,
    auto: true,
  };
  for (const x of gen.exercices) {
    const exo = x.exo;
    const enTemps = exo.typeExercice === "gainage" || exo.typeExercice === "cardio";
    const plage = exo.repsPertinent || [8, 12];
    seance.exercices.push({
      exerciceId: exo.id,
      role: x.accessoire ? "isolation" : "principal",
      justification: `Sélectionné automatiquement · compatibilité ${x.score} %`,
      supersetGroupe: null,
      series: Array.from({ length: x.series }, () => ({
        type: "travail",
        repsCible: enTemps ? null : plage,
        dureeSec: enTemps ? (exo.dureeSec || 40) : null,
        distanceM: null, rirCible: 2, rpeCible: null, tempo: null,
        reposSec: x.iso ? 60 : 105, chargeKg: null,
      })),
    });
  }
  return seance;
}

/** Démarre la séance proposée (elle devient la séance en cours). */
async function demarrerAuto() {
  if (!AUTO || AUTO.repos || !AUTO.exercices.length) return;
  if (!await peutDemarrer()) { nav("train"); return; }
  // Le nom de la séance est le MÊME objet des deux côtés : il vole de la carte
  // d'accueil jusqu'au poste de commande au lieu de disparaître puis de
  // réapparaître ailleurs. La photographie se prend avant tout changement de DOM.
  if (motionOk()) memoriserFlip(); else oublierFlip();
  const seance = seanceDepuisAuto(AUTO);
  // Conservée dans l'état pour que `trouverSeance` la retrouve après un
  // rechargement (reprise de séance) et pour l'enregistrement final.
  Etat.data.seanceAuto = seance;
  Etat.sauver();
  APERCU = null;
  LIVE = nouvelleSession(seance);
  LIVE.unite = uUnite();
  persistLive(true);
  // On bascule explicitement sur l'onglet Séance : `demarrer()` se contente de
  // re-rendre la vue courante, ce qui laissait l'utilisateur sur l'Accueil.
  nav("train");
}

/**
 * Couleur d'une disponibilité.
 *
 * Trois paliers, comme la légende de l'onglet Récupération de FitAI — « Frais »,
 * « En récupération », « Fatigué » — au lieu des cinq teintes précédentes. Une
 * échelle à trois crans se lit d'un coup d'œil entre deux séries ; cinq
 * demandaient de réfléchir.
 */
function couleurDispo(r) {
  if (r >= 85) return "var(--recup-frais)";
  if (r >= 50) return "var(--recup-encours)";
  return "var(--recup-fatigue)";
}

/**
 * Carte « Ton corps » + prochaine séance, sur l'Accueil.
 * C'est le point d'entrée du mode automatique : la séance est DÉJÀ construite.
 */
/**
 * Pastilles de contexte d'un exercice : muscle principal, matériel, famille de
 * mouvement. Uniquement ce qui est réellement connu — pas de pastille vide.
 */
function tagsExercice(exo) {
  const t = [];
  const m = (exo.musclesPrincipaux || [])[0];
  if (m) t.push(`<span class="exo-tag m">${esc(MUSCLE_LABELS[m] || m)}</span>`);
  const eq = (exo.equipement || []).filter((q) => q !== "poids_du_corps")[0] || (exo.equipement || [])[0];
  if (eq) t.push(`<span class="exo-tag">${esc(EQUIPMENT_LABELS[eq] || eq)}</span>`);
  if (exo.typeExercice) t.push(`<span class="exo-tag">${esc(exo.typeExercice)}</span>`);
  return t.join("");
}

/**
 * Carte « Programme actuel » : nom du programme, avancement de la semaine et
 * rythme visé. L'anneau montre les séances faites sur l'objectif hebdomadaire —
 * une vraie mesure, pas un pourcentage décoratif.
 */
/**
 * Accueil : évolution du poids et derniers records battus, côte à côte.
 * Chaque moitié n'apparaît que si elle a de vraies données ; rien du tout si
 * aucune des deux n'en a (pas de carte vide décorative).
 */
function carteCorpsEtRecords(logs) {
  const poids = serieCorps(Etat.data.metrics, "poidsKg");
  const recs = recordsRecents(logs, (id) => (getExercise(id) || {}).nom || id, 3);
  if (poids.length < 2 && !recs.length) return null;
  const box = h(`<div class="duo-acc"></div>`);
  if (poids.length >= 2) {
    const dernier = poids[poids.length - 1], borne = Date.parse(dernier.iso) - 30 * 86400000;
    const ref = poids.find((x) => Date.parse(x.iso) >= borne) || poids[0];
    const ecart = Math.round((uAff(dernier.v) - uAff(ref.v)) * 10) / 10;
    const c = h(`<button class="card duo-c" type="button" aria-label="Voir l'évolution du poids">
      <span class="eyebrow">Poids</span>
      <b class="num duo-v">${esc(uCharge(dernier.v))}</b>
      <span class="duo-sub">${ecart === 0 ? "stable" : `${ecart > 0 ? "+" : "−"}${String(Math.abs(ecart)).replace(".", ",")} ${uUnite()}`} sur 30 j</span>
      <span class="duo-spark" aria-hidden="true">${sparkAire(poids.slice(-12).map((x) => x.v))}</span></button>`);
    c.addEventListener("click", () => nav("stats"));
    box.append(c);
  }
  if (recs.length) {
    const c = h(`<button class="card duo-c" type="button" aria-label="Voir mes records">
      <span class="eyebrow">Derniers records</span>
      ${recs.map((r) => `<span class="duo-rec"><span class="duo-rn">${esc(r.nom)}</span><b class="num">${esc(uCharge(r.valeur))}</b></span>`).join("")}</button>`);
    c.addEventListener("click", () => nav("stats"));
    box.append(c);
  }
  return box;
}

function carteProgrammeActuel(prog, logs, profil) {
  const cible = Math.max(1, profil?.joursParSemaine || 4);
  const sm = statsSemaine(logs);
  const pct = Math.min(1, sm.seances / cible);
  const suite = serieSemainesEnCours(logs);
  const c = h(`<button class="card prog-actuel" aria-label="Voir le programme"></button>`);
  c.append(h(`<span class="pa-txt">
    <span class="eyebrow">Programme actuel</span>
    <b class="pa-nom">${esc(prog?.nom || "Aucun programme")}</b>
    <span class="pa-meta">${cible} séance${cible > 1 ? "s" : ""} / semaine · ${sm.seances} faite${sm.seances > 1 ? "s" : ""}</span>
    ${suite >= 2 ? `<span class="pa-suite"><span class="cic">${IC.flame}</span><b class="num">${suite}</b> semaines d'affilée</span>` : ""}
  </span>`));
  c.append(h(`<span class="pa-ring">${anneauSignature(pct, `${sm.seances}`, "sur " + cible)}</span>`));
  c.addEventListener("click", () => nav("prog"));
  return c;
}


/**
 * Grille « mes chiffres » de l'accueil : séances, tonnage, régularité, records.
 * La régularité compare les séances des 4 dernières semaines à l'objectif
 * hebdomadaire du profil — pas une note arbitraire.
 */
function grilleChiffres(logs) {
  const g = h(`<div class="bento"></div>`);
  const nb = logs.length;
  const total = volumeTotal(logs);
  const tonnes = total / 1000;
  const volTxt = uImp() ? uVolume(total, { tonnes: true }) : tonnes >= 1 ? `${tonnes.toFixed(1).replace(".", ",")} T` : `${Math.round(total)} kg`;
  const cible = Math.max(1, (Etat.data.profil?.joursParSemaine || 4) * 4);
  const recentes = logs.filter((l) => Date.parse(l.date) > Date.now() - 28 * 864e5).length;
  const regularite = Math.min(100, Math.round((recentes / cible) * 100));
  const records = classementRecords(logs, nomExo, 99).length;

  // TUILE MAÎTRESSE. Quatre tuiles identiques ne hiérarchisent rien : l'œil ne
  // sait pas par où commencer et les lit toutes, ou aucune. Le tonnage cumulé
  // est le chiffre qui raconte le travail accompli — il prend toute la largeur,
  // et la courbe des huit dernières semaines s'affiche DERRIÈRE lui, comme une
  // texture. La forme de la progression se lit avant même le nombre.
  const feat = h(`<div class="bento-hero">
    ${sparkAire(volumeParSemaine(logs, 8).map((s) => s.v))}
    <div class="bh-txt">
      <span class="eyebrow">Volume total soulevé</span>
      <b class="num bh-val">${esc(volTxt)}</b>
      <span class="bh-sub">${nb} séance${nb > 1 ? "s" : ""} enregistrée${nb > 1 ? "s" : ""}</span>
    </div>
    <span class="bh-ic" aria-hidden="true">${IC.bars}</span>
  </div>`);
  g.append(feat);

  const petites = h(`<div class="bento-trio"></div>`);
  petites.append(statCard(IC.dumbbell, String(nb), "Séances"));
  petites.append(statCard(IC.activity, `${regularite}\u202F%`, "Régularité")); // espace fine insécable : « 100 % » ne se coupe plus
  petites.append(statCard(IC.trophy, String(records), "Records"));
  g.append(petites);
  return g;
}


/**
 * Peint le corps en lumière dans le canevas d'un conteneur, une fois qu'il a
 * une taille.
 *
 * Le canevas est dimensionné par le CSS ; tant qu'il n'est pas dans le document
 * il mesure zéro et il n'y a rien à peindre. On attend donc la trame suivante,
 * et on repeint si la largeur change (rotation, redimensionnement).
 *
 * @param {HTMLElement} racine conteneur portant `.corps-lumiere > canvas`
 * @param {Record<string, number>} intensites
 */
function peindreCorps(racine, intensites) {
  const cv = racine.querySelector(".corps-lumiere canvas");
  if (!(cv instanceof HTMLCanvasElement)) return;
  const peindre = () => { if (cv.isConnected) dessinerCorps(cv, intensites); };
  requestAnimationFrame(peindre);
  // Le thème peut changer sous les pieds du canevas : ses couleurs sont lues
  // au moment du rendu, il faut donc le refaire.
  if (typeof ResizeObserver === "function") {
    const ro = new ResizeObserver(() => { if (cv.isConnected) peindre(); else ro.disconnect(); });
    ro.observe(cv);
  }
}

/**
 * Sous-titre de la carte héro. Le moteur nomme souvent la séance par ses
 * muscles ; répéter la même liste juste en dessous n'apprend rien. On affiche
 * alors la durée et le nombre d'exercices, information réellement nouvelle.
 */
function sousTitreHero(nom, muscles) {
  const liste = muscles.slice(0, 3).join(" • ");
  const norm = (x) => x.toLowerCase().replace(/[^a-zà-ÿ]/g, "");
  if (!liste || norm(liste) === norm(nom || "")) return "Choisie d'après ta récupération";
  return liste;
}

/**
 * Disponibilité ramenée aux muscles du CATALOGUE (ceux que portent les
 * exercices), à partir de l'état fin du moteur. Le groupe le plus entamé
 * l'emporte : c'est lui qui limitera la séance.
 * @returns {Record<string, number>}
 */
function dispoParMuscle(etat) {
  /** @type {Record<string, number>} */
  const parCat = {};
  for (const cle of CLES_MOTEUR) {
    const cat = FIN_VERS_CATALOGUE[cle];
    if (!cat || !etat[cle]) continue;
    parCat[cat] = Math.min(parCat[cat] ?? 100, etat[cle].readiness);
  }
  return parCat;
}

/**
 * Ligne d'exercice, reprise des listes de FitAI (captures « Séance » et
 * « Détail de routine ») : vignette blanche à gauche, nom et volume au centre
 * avec la barre de niveau à cinq segments, muscle ciblé et sa fraîcheur à
 * droite. Une seule ligne sert partout — séance du jour, routine, catalogue.
 *
 * @param {{exo:any, meta?:string, dispo?:Record<string,number>,
 *          onClick?:Function, suffixe?:HTMLElement}} o
 */
function ligneExoFitai(o) {
  const exo = o.exo;
  const muscle = (exo.musclesPrincipaux || [])[0] || null;
  const row = h(`<div class="lx"></div>`);
  row.append(h(`<span class="lx-vig">${vignetteHTML(exo, "sm")}</span>`));

  const mid = h(`<div class="lx-mid"></div>`);
  mid.append(h(`<b class="lx-nom">${esc(exo.nom)}</b>`));
  if (o.meta) mid.append(h(`<span class="lx-meta">${esc(o.meta)}</span>`));
  // Cinq cases, comme FitAI. Le catalogue cote de 1 à 4 : la cinquième reste
  // vide plutôt que d'étirer artificiellement l'échelle.
  const niv = Math.max(1, Math.min(4, exo.difficulte || 1));
  mid.append(h(`<span class="lx-niv" role="img" aria-label="Niveau ${niv} sur 4 : ${DIFF_LABEL[niv]}">${
    [1, 2, 3, 4].map((i) => `<i${i <= niv ? ' class="on"' : ""}></i>`).join("")}</span>`));
  row.append(mid);

  if (muscle) {
    const pct = o.dispo ? o.dispo[muscle] : null;
    row.append(h(`<span class="lx-mus">
      <em>${esc(MUSCLE_LABELS[muscle] || muscle)}</em>
      <span class="lx-mfig">${miniSilhouette([muscle], "auto", { zoom: true, ratio: 0.88 })}</span>
      ${pct != null ? `<b class="num" style="color:${couleurDispo(pct)}">${Math.round(pct)} %</b>` : ""}
    </span>`));
  }
  if (o.suffixe) row.append(o.suffixe);
  if (o.onClick) {
    row.classList.add("tap");
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    row.addEventListener("click", () => o.onClick());
    row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); o.onClick(); } });
  }
  return row;
}

function carteMoteur(v) {
  const logs = Etat.data.logs || [];
  const gen = calculerAuto();
  const res = resumeCorps(gen.etat);

  const c = h(`<div class="card stack moteur hero"></div>`);
  // Le résumé du corps a sa PROPRE carte, placée sous la séance : la carte du
  // jour commence par la séance elle-même, comme la maquette. Rien n'est retiré,
  // l'état musculaire reste accessible d'un seul tap.
  const corps = h(`<button class="card corps-resume" aria-label="Voir l'état musculaire"></button>`);
  corps.append(h(`<span class="spread moteur-head"><span class="eyebrow">Ton corps</span><span class="chev">État musculaire ›</span></span>`));
  const tri = h(`<div class="moteur-tri"></div>`);
  // Les trois compteurs reprennent l'échelle de la légende « Récupération »
  // (frais · en récupération · fatigué) : une seule grammaire de couleur pour
  // un même état, qu'on le lise ici ou sur la carte corporelle.
  tri.append(h(`<span><b class="num" style="color:var(--recup-frais)">${res.prets}</b><span>prêts</span></span>`));
  tri.append(h(`<span><b class="num" style="color:var(--recup-encours)">${res.recup}</b><span>en récup.</span></span>`));
  tri.append(h(`<span><b class="num" style="color:var(--recup-fatigue)">${res.sollicites}</b><span>sollicités</span></span>`));
  corps.append(tri);
  corps.addEventListener("click", () => ouvrirEtatMusculaire());

  if (gen.repos) {
    c.append(h(`<div class="eyebrow">Aujourd'hui</div>`));
    c.append(h(`<h2 style="margin:2px 0 4px;font-size:1.25rem">Repos conseillé</h2>`));
    c.append(h(`<div class="muted small">${esc(gen.raison)}</div>`));
    const b = h(`<button class="secondary big" style="margin-top:10px"><span class="btn-ico">${IC.play}</span>S'entraîner quand même</button>`);
    b.addEventListener("click", () => { LIVE = null; APERCU = null; nav("train"); });
    c.append(b);
  } else {
    // PROCHAINE SÉANCE — la carte de l'onglet Séance de FitAI. L'écran
    // n'affichait que trois compteurs ; or avant de partir à la salle, ce qu'on
    // veut savoir c'est ce qu'on va FAIRE, exercice par exercice. La liste
    // remplace donc les compteurs, qui reviennent en une ligne sous le titre.
    const muscles = (gen.muscles || []).map((m) => LABELS_MOTEUR[m] || m);
    const nbSeries = gen.exercices.reduce((n, x) => n + (x.series || 0), 0);
    const dispo = dispoParMuscle(gen.etat);

    const head = h(`<div class="ps-head"><span class="eyebrow">Prochaine séance</span></div>`);
    const bPlans = h(`<button class="ps-plans" type="button"><span class="cic">${IC.layers}</span>Plans</button>`);
    bPlans.addEventListener("click", () => nav("prog"));
    head.append(bPlans);
    c.append(head);

    c.append(h(`<h2 class="ps-titre" data-flip="titre-seance">${esc(gen.nom)}</h2>`));
    c.append(h(`<div class="ps-sous">${esc(sousTitreHero(gen.nom, muscles))}
      · ${gen.exercices.length} exos · ${nbSeries} séries · ${gen.dureeEstimee} min
      · ${gen.compatibilite} % compatible</div>`));

    const liste = h(`<div class="ps-liste"></div>`);
    gen.exercices.forEach((x) => {
      const exo = x.exo;
      if (!exo) return;
      const plage = exo.repsPertinent || [8, 12];
      const nb = x.series || 0;
      const meta = `${nb} série${nb > 1 ? "s" : ""} × ${plage[0]}-${plage[1]} reps`;
      liste.append(ligneExoFitai({ exo, meta, dispo, onClick: () => ouvrirDetail(exo) }));
    });
    // Une séance déjà entamée prime sur la proposition du jour : on la reprend,
    // on ne la remplace pas.
    // Le bouton passe AVANT la liste : sur un téléphone de 6,7 pouces il
    // tombait sous la barre d'onglets, il fallait défiler pour démarrer.
    const enCours = travailEnCours();
    const b = enCours
      ? h(`<button class="primary big hero-cta"><span class="btn-ico">${IC.play}</span>Reprendre la séance</button>`)
      : h(`<button class="primary big hero-cta"><span class="btn-ico">${IC.play}</span>Commencer la séance</button>`);
    b.addEventListener("click", enCours ? () => nav("train") : demarrerAuto);
    c.append(b);
    c.append(liste);
    if (enCours) {
      c.append(h(`<div class="hint" style="margin-top:8px">Séance en cours · ${enCours} série${enCours > 1 ? "s" : ""} renseignée${enCours > 1 ? "s" : ""}.</div>`));
    }
    const bMod = h(`<button class="linklike" style="margin-top:9px">Pourquoi cette séance ? · Modifier</button>`);
    bMod.addEventListener("click", () => ouvrirDetailAuto(gen));
    c.append(bMod);
  }
  v.append(c);
  v.append(corps);
}

/** Feuille : justification de la décision + possibilité de modifier. */
function ouvrirDetailAuto(gen) {
  const sheet = h(`<div class="sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0">${esc(gen.nom)}</h2><button class="chip" id="aX">✕ Fermer</button></div>`));
  inner.append(h(`<div class="row" style="margin:6px 0 12px"><span class="badge accent">${gen.compatibilite} % compatible</span><span class="pill">~${gen.dureeEstimee} min</span><span class="pill">${gen.exercices.length} exercices</span></div>`));

  inner.append(h(`<div class="eyebrow">Pourquoi cette séance ?</div>`));
  const why = h(`<div class="card stack" style="margin:8px 0 14px"></div>`);
  gen.explications.forEach((e) => why.append(h(`<div class="small">• ${esc(e)}</div>`)));
  inner.append(why);

  if (gen.exercices.length) {
    inner.append(h(`<div class="eyebrow" style="margin-bottom:8px">Exercices retenus</div>`));
    gen.exercices.forEach((x, i) => {
      const cibles = Object.entries(x.coeffs).sort((a, b) => b[1] - a[1]).slice(0, 3)
        .map(([m, v2]) => `${LABELS_MOTEUR[m]} ${Math.round(v2 * 100)} %`).join(" · ");
      const row = h(`<div class="card tap" style="padding:11px;margin-bottom:8px">
        <div class="row" style="gap:10px;align-items:flex-start">${vignetteHTML(x.exo, "sm")}
        <div style="flex:1;min-width:0">
        <div class="spread"><b>${i + 1}. ${esc(x.exo.nom)}</b><span class="pill">${x.series} séries</span></div>
        <div class="muted small" style="margin-top:3px">${esc(cibles)}</div>
        <div class="muted small">Compatibilité ${x.score} %${x.accessoire ? " · accessoire" : ""}</div></div></div></div>`);
      row.addEventListener("click", () => ouvrirDetail(x.exo));
      inner.append(row);
    });
    const b = h(`<button class="primary big" style="margin-top:6px"><span class="btn-ico">${IC.play}</span>Commencer cette séance</button>`);
    b.addEventListener("click", () => { sheet.remove(); demarrerAuto(); });
    inner.append(b);
    const bm = h(`<button class="secondary big" style="margin-top:8px">Choisir une autre séance</button>`);
    bm.addEventListener("click", () => { sheet.remove(); LIVE = null; APERCU = null; nav("train"); });
    inner.append(bm);
  }
  sheet.querySelector("#aX").addEventListener("click", () => sheet.remove());
  document.body.append(sheet);
}

/** Seuil de disponibilité à partir duquel un muscle est dit « prêt » (réglable : 60, 75 ou 90 %). */
function seuilPret() {
  const v = Number(Etat.data.reglages.seuilPret);
  return [60, 75, 90].includes(v) ? v : 75;
}
/** « Prêt » ou « prêt dans 14 h » / « dans 2 j ». */
function textePret(m) {
  const hh = m && m.heuresAvantPret;
  if (!hh) return "Prêt";
  return hh < 48 ? `prêt dans ${hh} h` : `prêt dans ${Math.round(hh / 24)} j`;
}

/** Fiche d'un muscle : disponibilité, dernière sollicitation, volume. */
function detailMuscle(cle, etat, profil) {
  const m = etat[cle];
  if (!m) return;
  const z = zoneDisponibilite(m.readiness);
  const cible = cibleVolumeHebdo(cle, profil.niveau || "intermediaire", DEF_MOTEUR);
  const dernier = m.lastDirectTraining || m.lastIndirectTraining;
  const jours = dernier ? (Date.now() - dernier) / 864e5 : null;
  const quand = jours == null ? "jamais" : jours < 1 ? "aujourd'hui" : jours < 2 ? "hier" : `il y a ${Math.round(jours)} jours`;
  const sheet = h(`<div class="sheet menu-sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0;font-size:1.15rem">${esc(LABELS_MOTEUR[cle])}</h2><button class="chip" id="dmX">✕</button></div>`));
  inner.append(h(`<div class="out-big"><b class="num" style="color:${couleurDispo(m.readiness)}">${Math.round(m.readiness)} %</b><span>Disponibilité estimée · ${esc(z.nom)}</span></div>`));
  inner.append(h(`<div class="bar" style="margin-bottom:14px"><div style="width:${Math.round(m.readiness)}%;background:${couleurDispo(m.readiness)}"></div></div>`));
  const g = h(`<div class="statgrid"></div>`);
  g.append(statCard(IC.calendar, quand, "Dernière sollicitation"));
  g.append(statCard(IC.clock, m.heuresAvantPret ? (m.heuresAvantPret < 48 ? `${m.heuresAvantPret} h` : `${Math.round(m.heuresAvantPret / 24)} j`) : "Prêt", `Avant ${seuilPret()} %`));
  g.append(statCard(IC.bars, `${m.weeklyEquivalentSets}`, `Séries / ${cible}`));
  g.append(statCard(IC.dumbbell, `${m.weeklyDirectSets}`, "Dont directes"));
  g.append(statCard(IC.repeat, `${m.weeklyIndirectSets}`, "Indirectes"));
  inner.append(g);
  inner.append(h(`<div class="hint">Disponibilité et récupération sont des <b>estimations de programmation</b> calculées depuis tes séances (volume, proximité de l'échec, temps écoulé). Ce ne sont pas des mesures physiologiques.</div>`));
  sheet.querySelector("#dmX").addEventListener("click", () => sheet.remove());
  sheet.addEventListener("click", (ev) => { if (ev.target === sheet) sheet.remove(); });
  document.body.append(sheet);
}

/**
 * Onglet « Récupération ».
 *
 * Reprend la disposition de l'écran du même nom de FitAI, relevée sur capture :
 * un grand corps à gauche teinté par la disponibilité, la liste muscle par
 * muscle à droite (vignette · nom · pourcentage · chevron), la légende en trois
 * paliers sous le corps, et en bas l'action « Séance sur muscles reposés ».
 *
 * Aucune donnée nouvelle : tout vient du moteur de fatigue déjà en place
 * (`etatMusculaire`), exactement comme la feuille « État musculaire », qui reste
 * accessible depuis l'Accueil et n'est pas modifiée.
 */
function vRecup(v) {
  const gen = AUTO || calculerAuto();
  const etat = gen.etat;
  const p = Etat.data.profil || {};

  // Disponibilité par catégorie du catalogue : le groupe fin le PLUS entamé
  // l'emporte, sinon un muscle frais masquerait un muscle à plat sur la figure.
  /** @type {Record<string, number>} */
  const parCat = {};
  for (const cle of CLES_MOTEUR) {
    const cat = FIN_VERS_CATALOGUE[cle];
    if (!cat) continue;
    parCat[cat] = Math.min(parCat[cat] ?? 100, etat[cle].readiness);
  }
  /** @type {Record<string, number>} */
  const intensites = {};
  for (const [cat, r] of Object.entries(parCat)) intensites[cat] = (100 - r) / 100;

  const grille = h(`<div class="recup-grille"></div>`);

  // ---- Colonne gauche : le corps, cliquable muscle par muscle.
  const corps = h(`<div class="recup-corps">
    <div class="corps-lumiere"><canvas aria-hidden="true"></canvas>${muscleHeatmap(intensites)}</div>
    <div class="recup-legende">
      <span><i style="background:var(--recup-fatigue)"></i>Fatigué</span>
      <span><i style="background:var(--recup-encours)"></i>En récupération</span>
      <span><i style="background:var(--recup-frais)"></i>Frais</span>
    </div></div>`);
  peindreCorps(corps, intensites);
  corps.addEventListener("click", (ev) => {
    const g = ev.target.closest("g[data-m]");
    if (!g) return;
    const cat = g.getAttribute("data-m");
    const fins = CLES_MOTEUR.filter((c) => FIN_VERS_CATALOGUE[c] === cat);
    if (!fins.length) return;
    detailMuscle(fins.sort((a, b) => etat[a].readiness - etat[b].readiness)[0], etat, p);
  });
  grille.append(corps);

  // ---- Colonne droite : le plus entamé en premier, c'est ce qu'on cherche.
  const col = h(`<div class="recup-liste">
    <div class="recup-entete"><span>Muscle</span><span>Récupération</span></div></div>`);
  CLES_MOTEUR.map((cle) => ({ cle, r: etat[cle].readiness }))
    .sort((a, b) => a.r - b.r)
    .forEach(({ cle, r }) => {
      const cat = FIN_VERS_CATALOGUE[cle];
      const pret = textePret(etat[cle]);
      const row = h(`<button class="rcp-row" type="button">
        <span class="recup-vig">${cat ? miniSilhouette([cat], "auto", { zoom: true, ratio: 0.89 }) : ""}</span>
        <span class="recup-txt"><b>${esc(LABELS_MOTEUR[cle])}</b>
          <em class="num" style="color:${couleurDispo(r)}">${Math.round(r)} %</em>${pret !== "Prêt" ? `<small class="recup-pret">${esc(pret)}</small>` : ""}</span>
        <svg class="recup-fl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </button>`);
      row.addEventListener("click", () => detailMuscle(cle, etat, p));
      col.append(row);
    });
  grille.append(col);
  v.append(grille);

  // Seuil « prêt » réglable, comme chez FitAI : prudent (90 %), standard
  // (75 %) ou souple (60 %). Il règle les délais « prêt dans … » ; le choix
  // automatique des muscles garde ses propres garde-fous (planner.js).
  const reglSeuil = h(`<div class="card stack"><div class="spread small"><b>Seuil « prêt »</b><span class="muted">${seuilPret()} % de disponibilité</span></div><div class="row" role="group" aria-label="Seuil prêt"></div><div class="hint" style="margin:0">Règle le délai « prêt dans … » affiché pour chaque muscle : plus le seuil est haut, plus le repos indiqué est long. La séance automatique garde ses propres garde-fous.</div></div>`);
  const rowS = reglSeuil.querySelector(".row");
  [[60, "Souple · 60 %"], [75, "Standard · 75 %"], [90, "Prudent · 90 %"]].forEach(([val, lab]) => {
    const b = h(`<button class="chip ${seuilPret() === val ? "on" : ""}" aria-pressed="${seuilPret() === val}">${lab}</button>`);
    b.addEventListener("click", () => { Etat.data.reglages.seuilPret = val; Etat.sauver(); AUTO = null; render(); });
    rowS.append(b);
  });
  v.append(reglSeuil);

  // ---- Action du bas : la séance que le moteur bâtit sur les muscles frais.
  const cta = h(`<button class="btn primary recup-cta" type="button"><span class="cic">${IC.spark}</span>Séance sur muscles reposés</button>`);
  cta.addEventListener("click", () => { if (AUTO && !AUTO.repos && AUTO.exercices.length) demarrerAuto(); else nav("dash"); });
  v.append(cta);
  v.append(h(`<div class="hint">Disponibilités estimées à partir de tes séances : volume, proximité de l'échec et temps écoulé. Ce ne sont pas des mesures physiologiques.</div>`));
}

/** Écran « État musculaire » : les 18 groupes, barres + silhouettes. */
function ouvrirEtatMusculaire() {
  const gen = AUTO || calculerAuto();
  const etat = gen.etat;
  const p = Etat.data.profil || {};
  const sheet = h(`<div class="sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0">État musculaire</h2><button class="chip" id="eX">✕ Fermer</button></div>`));
  inner.append(h(`<div class="muted small">Indices de disponibilité estimés à partir de tes séances : volume, proximité de l'échec et temps écoulé. Ce ne sont pas des mesures physiologiques.</div>`));

  // Silhouettes colorées par disponibilité (la plus basse d'un groupe l'emporte)
  const parCat = {};
  for (const cle of CLES_MOTEUR) {
    const cat = FIN_VERS_CATALOGUE[cle];
    if (!cat) continue;
    parCat[cat] = Math.min(parCat[cat] ?? 100, etat[cle].readiness);
  }
  /** @type {Record<string, number>} */
  const intensites = {};
  for (const [cat, r] of Object.entries(parCat)) intensites[cat] = (100 - r) / 100;
  // Le SVG reste la référence : accessible, interactif, net. Le canevas se
  // glisse DERRIÈRE lui pour apporter ce qu'un SVG ne sait pas faire à coût
  // raisonnable — de la lumière. Les muscles fatigués rayonnent au lieu d'être
  // simplement plus opaques. Purement décoratif : si le canevas échoue, il
  // reste exactement l'écran d'avant.
  const carte = h(`<div class="card sil-inter" style="margin:12px 0">
    <div class="corps-lumiere"><canvas aria-hidden="true"></canvas>${muscleHeatmap(intensites)}</div>
    <div class="muted small" style="text-align:center;margin-top:6px">Touche un muscle pour voir son état</div></div>`);
  peindreCorps(carte, intensites);
  // Silhouette INTERACTIVE : chaque groupe du SVG porte son identifiant, on
  // remonte au groupe fin le plus sollicité pour ouvrir son détail.
  carte.addEventListener("click", (ev) => {
    const g = ev.target.closest("g[data-m]");
    if (!g) return;
    const cat = g.getAttribute("data-m");
    const fins = CLES_MOTEUR.filter((c) => FIN_VERS_CATALOGUE[c] === cat);
    if (!fins.length) return;
    const pire = fins.sort((a, b) => etat[a].readiness - etat[b].readiness)[0];
    detailMuscle(pire, etat, p);
  });
  inner.append(carte);

  // Liste triée par disponibilité croissante : ce qui récupère en premier
  const rows = CLES_MOTEUR.map((cle) => ({ cle, ...etat[cle] })).sort((a, b) => a.readiness - b.readiness);
  const liste = h(`<div class="card stack"></div>`);
  rows.forEach((m) => {
    const z = zoneDisponibilite(m.readiness);
    const cible = cibleVolumeHebdo(m.cle, p.niveau || "intermediaire", DEF_MOTEUR);
    const row = h(`<div class="msc-row">
      <div class="spread small"><b>${esc(LABELS_MOTEUR[m.cle])}</b><span class="num" style="color:${couleurDispo(m.readiness)};font-weight:800">${Math.round(m.readiness)} %</span></div>
      <div class="bar msc-bar"><div style="width:${Math.round(m.readiness)}%;background:${couleurDispo(m.readiness)}"></div></div>
      <div class="spread muted" style="font-size:.7rem;margin-top:3px"><span>${esc(z.nom)} · ${esc(textePret(m))}</span><span>${m.weeklyEquivalentSets}/${cible} séries cette semaine</span></div>
    </div>`);
    row.classList.add("tap");
    row.addEventListener("click", () => detailMuscle(m.cle, etat, p));
    liste.append(row);
  });
  inner.append(liste);


  // Classement des priorités : ce que le moteur entraînerait ensuite
  inner.append(h(`<div class="eyebrow" style="margin:16px 0 8px">Priorités du moteur</div>`));
  const prio = h(`<div class="card stack"></div>`);
  gen.classement.slice(0, 8).forEach((l, i) => {
    prio.append(h(`<div class="spread small"><span><span class="anat-num">${i + 1}</span>${esc(l.nom)}</span><span class="muted">${l.priority} pts · ${Math.round(l.readiness)} % dispo</span></div>`));
  });
  inner.append(prio);
  inner.append(h(`<div class="hint">La priorité combine disponibilité (45 %), déficit de volume hebdomadaire (30 %), ancienneté de la dernière sollicitation (15 %) et équilibre général (10 %).</div>`));

  // Ce que le moteur a APPRIS de l'historique. Affiché systématiquement, même
  // quand il n'a encore rien appris : une correction invisible sur un modèle
  // qu'on ne peut pas inspecter ne serait pas acceptable.
  inner.append(h(`<div class="eyebrow" style="margin:16px 0 8px">Calibration apprise</div>`));
  const appris = expliquerApprentissage(Etat.data.logs || [], getExercise, Date.now());
  const cApp = h(`<div class="card stack"></div>`);
  if (!appris.length) {
    cApp.append(h(`<div class="muted small">Le moteur utilise ses valeurs génériques. Il ajustera la vitesse de récupération muscle par muscle dès qu'il aura observé assez de retours rapprochés sur un même exercice (${PARAMS_APPRENTISSAGE.MIN_OBS} minimum).</div>`));
  } else {
    cApp.append(h(`<div class="muted small">Ajustements déduits de tes performances quand tu reviens sur un muscle en moins de ${PARAMS_APPRENTISSAGE.SEUIL_COURT_H} h.</div>`));
    appris.forEach((a) => {
      const pct = Math.round(Math.abs(a.facteur - 1) * 100);
      cApp.append(h(`<div class="spread small" style="margin-top:6px">
        <span><b>${esc(LABELS_MOTEUR[a.muscle] || a.muscle)}</b> · récupération ${esc(a.sens)}</span>
        <span class="muted">${a.facteur > 1 ? "+" : "−"}${pct} % · ${a.n} obs.</span></div>`));
    });
  }
  inner.append(cApp);

  sheet.querySelector("#eX").addEventListener("click", () => sheet.remove());
  document.body.append(sheet);
}

/* ======================================================================
   OUTILS DE CALCUL (FC cible, morphotype, durée de séance, max estimé,
   composition corporelle, test cardio vélo). Tout est déterministe et local.
   ====================================================================== */

/** Champ numérique compact réutilisé par les outils. */
function champNum(label, valeur, onChange, opts = {}) {
  const w = h(`<label class="out-field"><span>${esc(label)}</span><input inputmode="${opts.decimal ? "decimal" : "numeric"}" value="${valeur ?? ""}" placeholder="${opts.ph ?? ""}" aria-label="${esc(label)}"></label>`);
  w.querySelector("input").addEventListener("input", (e) => onChange(e.target.value));
  return w;
}

/** Feuille « Outils » : une liste d'outils, chacun dépliable. */
function ouvrirOutils(cleInitiale = null) {
  const sheet = h(`<div class="sheet" id="outils"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0">Outils</h2><button class="chip" id="outX">✕ Fermer</button></div>`));
  inner.append(h(`<div class="muted small">Calculatrices d'entraînement, à partir de tes données. Tout est calculé sur ton téléphone.</div>`));

  const OUTILS = [
    { cle: "fc", nom: "Fréquence cardiaque cible", sous: "Zones d'effort selon ton âge et ton pouls de repos", ic: IC.activity, cls: "mi-red", vue: outilFC },
    { cle: "morpho", nom: "Macros par morphotype", sous: "Protéines, glucides et lipides selon ta morphologie", ic: IC.apple, cls: "mi-green", vue: outilMorphotype },
    { cle: "duree", nom: "Durée d'une séance", sous: "Estime le temps réel d'une séance avant de la faire", ic: IC.clock, cls: "mi-blue", vue: outilDuree },
    { cle: "max", nom: "Estimation du maximum", sous: "Ton 1RM à partir d'une série réalisée", ic: IC.dumbbell, cls: "mi-indigo", vue: outilMax },
    { cle: "compo", nom: "Composition corporelle", sous: "Masse grasse et masse maigre, avec ou sans balance", ic: IC.user, cls: "mi-orange", vue: outilComposition },
    { cle: "velo", nom: "Test cardio vélo", sous: "Protocole à paliers, à refaire chaque mois", ic: IC.bars, cls: "mi-blue", vue: outilTestVelo },
    { cle: "intervalles", nom: "Minuteur EMOM / Tabata", sous: "Tours chronométrés, bips au changement de phase", ic: IC.clock, cls: "mi-red", vue: outilIntervalles },
  ];

  const liste = h(`<div class="stack" style="margin-top:12px"></div>`);
  inner.append(liste);
  const panneau = h(`<div id="outPanneau"></div>`);
  inner.append(panneau);

  const ouvrir = (o) => {
    panneau.innerHTML = "";
    liste.querySelectorAll(".out-item").forEach((b) => b.classList.toggle("on", b.dataset.k === o.cle));
    const c = h(`<div class="card stack" style="margin-top:12px"></div>`);
    c.append(h(`<h3 style="margin:0">${esc(o.nom)}</h3>`));
    c.append(o.vue());
    panneau.append(c);
    panneau.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  OUTILS.forEach((o) => {
    const b = h(`<button class="card wcard sil out-item" data-k="${o.cle}" style="width:100%;text-align:left"><span class="mi ${o.cls}" style="width:34px;height:34px">${o.ic}</span><span class="g"><b>${esc(o.nom)}</b><br><span class="muted small">${esc(o.sous)}</span></span><span class="chev">›</span></button>`);
    b.addEventListener("click", () => ouvrir(o));
    liste.append(b);
  });

  sheet.querySelector("#outX").addEventListener("click", () => sheet.remove());
  document.body.append(sheet);
  const dep = OUTILS.find((o) => o.cle === cleInitiale);
  if (dep) ouvrir(dep);
}

/* ---------- Minuteur d'intervalles (EMOM, Tabata, libre) ---------- */
let INTERVALLE = { ...PRESETS_INTERVALLES[0] };
function outilIntervalles() {
  const box = h(`<div class="stack itv"></div>`);
  let debut = null, tick = null, dernierePhase = null, dernierBip = null;
  const presets = h(`<div class="row" role="group" aria-label="Préréglages"></div>`);
  PRESETS_INTERVALLES.forEach((p) => {
    const b = h(`<button class="chip ${INTERVALLE.cle === p.cle ? "on" : ""}">${esc(p.nom)}</button>`);
    b.addEventListener("click", () => { if (debut) return; INTERVALLE = { ...p }; remplir(); presets.querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === b)); });
    presets.append(b);
  });
  const champs = h(`<div class="itv-champs">
    <label class="small">Tours<input inputmode="numeric" data-k="tours"></label>
    <label class="small">Travail (s)<input inputmode="numeric" data-k="travailSec"></label>
    <label class="small">Repos (s)<input inputmode="numeric" data-k="reposSec"></label></div>`);
  const remplir = () => champs.querySelectorAll("input").forEach((i) => { i.value = String(INTERVALLE[i.dataset.k]); });
  champs.addEventListener("input", (ev) => {
    const k = ev.target.dataset.k; if (!k) return;
    INTERVALLE = { cle: "libre", nom: "Libre", ...normaliserIntervalle({ ...INTERVALLE, [k]: ev.target.value }) };
    presets.querySelectorAll(".chip").forEach((x) => x.classList.remove("on"));
    majAffichage();
  });
  const ecran = h(`<div class="itv-ecran" aria-live="polite"><span class="itv-phase eyebrow"></span><b class="itv-temps num"></b><span class="itv-tour small muted"></span></div>`);
  const bGo = h(`<button class="primary big"></button>`);
  const fmt = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  function majAffichage() {
    const c = normaliserIntervalle(INTERVALLE);
    if (!debut) {
      ecran.dataset.phase = "attente";
      ecran.querySelector(".itv-phase").textContent = "Prêt";
      ecran.querySelector(".itv-temps").textContent = fmt(dureeTotaleIntervalle(c));
      ecran.querySelector(".itv-tour").textContent = `${c.tours} tour${c.tours > 1 ? "s" : ""} · ${c.travailSec} s${c.reposSec ? ` / ${c.reposSec} s` : ""}`;
      bGo.innerHTML = `<span class="btn-ico">${IC.play}</span>Démarrer`;
      return;
    }
    const e = etatIntervalle(c, debut, Date.now());
    ecran.dataset.phase = e.phase;
    ecran.querySelector(".itv-phase").textContent = e.phase === "travail" ? "Travail" : e.phase === "repos" ? "Repos" : "Terminé";
    ecran.querySelector(".itv-temps").textContent = fmt(e.restantSec);
    ecran.querySelector(".itv-tour").textContent = e.phase === "fini" ? `${e.tours} tours faits` : `Tour ${e.tour} / ${e.tours}`;
    // Bips : changement de phase, puis les 3 dernières secondes de chaque phase.
    const cle = `${e.phase}:${e.tour}`;
    if (cle !== dernierePhase) {
      if (dernierePhase) jouer(e.phase === "travail" ? "reprise" : e.phase === "repos" ? "valider" : "termine", Etat.data.reglages);
      try { if (Etat.data.reglages.vibrations !== false) navigator.vibrate?.(e.phase === "fini" ? [80, 60, 80] : 40); } catch (er) {}
      dernierePhase = cle;
    }
    if (e.phase !== "fini" && e.restantSec <= 3 && dernierBip !== `${cle}:${e.restantSec}`) { dernierBip = `${cle}:${e.restantSec}`; jouer("compte", Etat.data.reglages); }
    if (e.phase === "fini") arreter(false);
  }
  function arreter(reinit = true) {
    clearInterval(tick); tick = null;
    if (reinit) { debut = null; dernierePhase = null; majAffichage(); }
    else { debut = null; bGo.innerHTML = `<span class="btn-ico">${IC.repeat}</span>Recommencer`; }
    champs.querySelectorAll("input").forEach((i) => { i.disabled = false; });
  }
  bGo.addEventListener("click", () => {
    if (tick) { arreter(); return; }
    amorcerSon();
    debut = Date.now(); dernierePhase = null; dernierBip = null;
    champs.querySelectorAll("input").forEach((i) => { i.disabled = true; });
    bGo.innerHTML = `<span class="btn-ico">${IC.x}</span>Arrêter`;
    jouer("reprise", Etat.data.reglages);
    // Le minuteur s'arrête seul quand sa carte quitte l'écran (feuille fermée).
    tick = setInterval(() => { if (!box.isConnected) { clearInterval(tick); tick = null; return; } majAffichage(); }, 250);
    majAffichage();
  });
  box.append(presets, champs, ecran, bGo,
    h(`<div class="hint">EMOM : au top de chaque minute, fais tes répétitions ; le reste de la minute est ton repos. Garde l'écran allumé pendant le minuteur.</div>`));
  remplir(); majAffichage();
  return box;
}

/* ---------- 1. Fréquence cardiaque cible ---------- */
function outilFC() {
  const p = Etat.data.profil || {};
  const st = { age: p.age || 30, repos: Etat.data.reglages.fcRepos || 60 };
  const box = h(`<div class="stack"></div>`);
  const res = h(`<div class="stack"></div>`);
  const ligne = h(`<div class="out-row"></div>`);
  const maj = () => {
    const fcMax = fcMaxTheorique(st.age);
    res.innerHTML = "";
    res.append(h(`<div class="spread small"><span class="muted">FC maximale théorique</span><b class="num">${fcMax} bpm</b></div>`));
    const zones = tableZonesCardio(fcMax, st.repos > 0 ? st.repos : null);
    zones.forEach((z) => {
      res.append(h(`<div class="zone-row"><div class="spread small"><b>${esc(z.nom)}</b><span class="num" style="color:var(--accent-ink)">${z.bpmMin}–${z.bpmMax} bpm</span></div><div class="muted small">${z.min}–${z.max} % · ${esc(z.effet)}</div></div>`));
    });
    res.append(h(`<div class="muted small" style="margin-top:6px">${st.repos > 0 ? "Calcul par la formule de Karvonen (tient compte de ton pouls de repos)." : "Renseigne ton pouls de repos pour un calcul plus précis (Karvonen)."}</div>`));
  };
  ligne.append(champNum("Âge", st.age, (v) => { st.age = +v || 0; maj(); }));
  ligne.append(champNum("Pouls au repos", st.repos, (v) => {
    st.repos = +v || 0; Etat.data.reglages.fcRepos = st.repos; Etat.sauver(); maj();
  }, { ph: "60" }));
  box.append(ligne);
  box.append(h(`<div class="muted small">Mesure ton pouls de repos le matin au réveil, avant de te lever.</div>`));
  box.append(res);
  maj();
  return box;
}

/* ---------- 2. Macros par morphotype ---------- */
function outilMorphotype() {
  const p = Etat.data.profil || {};
  /** @type {{poids:number, morpho:string, objectif:"prise_masse"|"seche"}} */
  const st = { poids: p.poidsKg || 75, morpho: Etat.data.reglages.morphotype || "mesomorphe", objectif: "prise_masse" };
  const box = h(`<div class="stack"></div>`);
  const res = h(`<div class="stack"></div>`);
  const maj = () => {
    res.innerHTML = "";
    const table = tableMorphotypes(st.poids, st.objectif);
    table.forEach((m) => {
      const actif = m.cle === st.morpho;
      const c = h(`<div class="card ${actif ? "morpho-on" : ""}" style="padding:11px"></div>`);
      c.append(h(`<div class="spread"><b>${esc(m.nom)}</b><span class="badge ${actif ? "accent" : ""}">${m.kcal} kcal</span></div>`));
      c.append(h(`<div class="muted small" style="margin:2px 0 6px">${esc(m.desc)}</div>`));
      c.append(h(`<div class="out-macros"><span><b>${m.prot} g</b><span>Protéines</span></span><span><b>${m.gluc} g</b><span>Glucides</span></span><span><b>${m.lip} g</b><span>Lipides</span></span></div>`));
      c.addEventListener("click", () => { st.morpho = m.cle; Etat.data.reglages.morphotype = m.cle; Etat.sauver(); maj(); });
      res.append(c);
    });
  };
  const ligne = h(`<div class="out-row"></div>`);
  ligne.append(champNum("Poids (kg)", st.poids, (v) => { st.poids = +v || 0; maj(); }, { decimal: true }));
  box.append(ligne);
  const objs = h(`<div class="row"></div>`);
  /** @type {["prise_masse"|"seche", string][]} */
  const OBJECTIFS_MACROS = [["prise_masse", "Prise de masse"], ["seche", "Sèche"]];
  OBJECTIFS_MACROS.forEach(([k, lab]) => {
    const b = h(`<button class="chip ${st.objectif === k ? "on" : ""}">${lab}</button>`);
    b.addEventListener("click", () => {
      st.objectif = k;
      objs.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on"); maj();
    });
    objs.append(b);
  });
  box.append(objs);
  box.append(h(`<div class="muted small">Touche un morphotype pour le retenir. Repères en grammes par kilo de poids de corps — à ajuster selon tes résultats réels.</div>`));
  box.append(res);
  maj();
  return box;
}

/* ---------- 3. Durée d'une séance ---------- */
function outilDuree() {
  const lignes = [{ series: 4, reps: 10, reposSec: 90 }];
  const box = h(`<div class="stack"></div>`);
  const liste = h(`<div class="stack"></div>`);
  const res = h(`<div class="statgrid"></div>`);
  const maj = () => {
    liste.innerHTML = "";
    lignes.forEach((l, i) => {
      const r = h(`<div class="out-row out-line"></div>`);
      r.append(champNum("Séries", l.series, (v) => { l.series = +v || 0; maj(); }));
      r.append(champNum("Reps", l.reps, (v) => { l.reps = +v || 0; maj(); }));
      r.append(champNum("Repos (s)", l.reposSec, (v) => { l.reposSec = +v || 0; maj(); }));
      if (lignes.length > 1) {
        const d = h(`<button class="chip danger out-del" aria-label="Retirer l'exercice ${i + 1}">✕</button>`);
        d.addEventListener("click", () => { lignes.splice(i, 1); maj(); });
        r.append(d);
      }
      liste.append(r);
    });
    const t = dureeSeance(lignes);
    res.innerHTML = "";
    res.append(statCard(IC.clock, `${t.totalMin} min`, "Durée totale"));
    res.append(statCard(IC.dumbbell, `${t.series}`, "Séries"));
    res.append(statCard(IC.repeat, `${t.reps}`, "Répétitions"));
    res.append(statCard(IC.moon, `${Math.round(t.reposSec / 60)} min`, "Dont repos"));
  };
  box.append(h(`<div class="muted small">Une ligne par exercice. L'effort est estimé à 3 secondes par répétition.</div>`));
  box.append(liste);
  const bAdd = h(`<button class="chip"><span class="cic">${IC.plus}</span>Ajouter un exercice</button>`);
  bAdd.addEventListener("click", () => { lignes.push({ series: 3, reps: 10, reposSec: 90 }); maj(); });
  box.append(bAdd);
  box.append(res);
  maj();
  return box;
}

/* ---------- 4. Estimation du maximum ---------- */
function outilMax() {
  const st = { charge: 60, reps: 8 };
  const box = h(`<div class="stack"></div>`);
  const res = h(`<div class="stack"></div>`);
  const maj = () => {
    const m = maxDepuisSerie(st.charge, st.reps);
    res.innerHTML = "";
    res.append(h(`<div class="out-big"><b class="num">${m.max} kg</b><span>Maximum estimé (1RM)</span></div>`));
    res.append(h(`<div class="muted small">${st.reps} répétition${st.reps > 1 ? "s" : ""} à ${st.charge} kg ≈ ${m.pct} % de ton maximum.</div>`));
    const tbl = h(`<div class="stack" style="margin-top:6px"></div>`);
    tbl.append(h(`<div class="eyebrow">Charges de travail</div>`));
    [95, 90, 85, 80, 75, 70, 60].forEach((pct) => {
      tbl.append(h(`<div class="spread small"><span class="muted">${pct} %</span><b class="num">${Math.round(m.max * pct / 100 * 2) / 2} kg</b></div>`));
    });
    res.append(tbl);
    const g = h(`<div class="stack" style="margin-top:6px"></div>`);
    g.append(h(`<div class="eyebrow">Si tu fais ${st.reps} reps avec…</div>`));
    grilleMax([20, 30, 40, 50, 60, 80, 100], st.reps).forEach((x) => {
      g.append(h(`<div class="spread small"><span class="muted">${x.charge} kg</span><b class="num">max ≈ ${x.max} kg</b></div>`));
    });
    res.append(g);
  };
  const ligne = h(`<div class="out-row"></div>`);
  ligne.append(champNum("Charge (kg)", st.charge, (v) => { st.charge = +v || 0; maj(); }, { decimal: true }));
  ligne.append(champNum("Répétitions", st.reps, (v) => { st.reps = +v || 0; maj(); }));
  box.append(ligne);
  box.append(h(`<div class="warn small">Estimation à partir d'une série menée près de l'échec. Ne teste jamais un maximum réel sans échauffement complet ni parade.</div>`));
  box.append(res);
  maj();
  return box;
}

/* ---------- 5. Composition corporelle ---------- */
function outilComposition() {
  const p = Etat.data.profil || {};
  const r = Etat.data.reglages;
  const st = {
    poids: p.poidsKg || 75, sexe: p.sexe || "H",
    adipo: p.masseGrassePct || null,
    tailleCm: p.tailleCm || 175,
    tourTaille: r.tourTailleCm || null, tourCou: r.tourCouCm || null, tourHanches: r.tourHanchesCm || null,
  };
  const box = h(`<div class="stack"></div>`);
  const res = h(`<div class="stack"></div>`);
  const maj = () => {
    res.innerHTML = "";
    const estime = adipositeNavy(st.sexe, {
      tailleCm: st.tailleCm, tourTailleCm: st.tourTaille, tourCouCm: st.tourCou, tourHanchesCm: st.tourHanches,
    });
    const pct = st.adipo || estime;
    if (pct == null) {
      res.append(h(`<div class="muted small">Renseigne soit ton taux d'adiposité (balance à impédance), soit tes tours de taille et de cou pour l'estimer.</div>`));
      return;
    }
    const c = composition(st.poids, pct);
    const cat = categorieAdiposite(pct, st.sexe);
    res.append(h(`<div class="out-big"><b class="num" style="color:${cat.col}">${pct} %</b><span>Taux d'adiposité · ${esc(cat.txt)}</span></div>`));
    const g = h(`<div class="statgrid"></div>`);
    g.append(statCard(IC.flame, `${c.masseGrasseKg} kg`, "Masse grasse"));
    g.append(statCard(IC.dumbbell, `${c.masseMaigreKg} kg`, "Masse maigre"));
    res.append(g);
    if (!st.adipo && estime != null) res.append(h(`<div class="muted small">Estimé par la méthode des circonférences (US Navy). Une balance à impédance donne une valeur plus stable dans le temps.</div>`));
    res.append(h(`<div class="muted small">Repères indicatifs, sans valeur médicale. Ce qui compte est l'évolution, pas la valeur absolue.</div>`));
  };
  box.append(h(`<div class="eyebrow">Si tu connais ton taux</div>`));
  const l1 = h(`<div class="out-row"></div>`);
  l1.append(champNum("Poids (kg)", st.poids, (v) => { st.poids = +v || 0; maj(); }, { decimal: true }));
  l1.append(champNum("Adiposité (%)", st.adipo, (v) => { st.adipo = v === "" ? null : +v; maj(); }, { decimal: true, ph: "—" }));
  box.append(l1);
  box.append(h(`<div class="eyebrow" style="margin-top:6px">Sinon, estime-le par tes mesures</div>`));
  const l2 = h(`<div class="out-row"></div>`);
  l2.append(champNum("Taille (cm)", st.tailleCm, (v) => { st.tailleCm = +v || 0; maj(); }));
  l2.append(champNum("Tour de taille", st.tourTaille, (v) => {
    st.tourTaille = v === "" ? null : +v; r.tourTailleCm = st.tourTaille; Etat.sauver(); maj();
  }, { ph: "cm" }));
  box.append(l2);
  const l3 = h(`<div class="out-row"></div>`);
  l3.append(champNum("Tour de cou", st.tourCou, (v) => {
    st.tourCou = v === "" ? null : +v; r.tourCouCm = st.tourCou; Etat.sauver(); maj();
  }, { ph: "cm" }));
  if (st.sexe === "F") {
    l3.append(champNum("Tour de hanches", st.tourHanches, (v) => {
      st.tourHanches = v === "" ? null : +v; r.tourHanchesCm = st.tourHanches; Etat.sauver(); maj();
    }, { ph: "cm" }));
  }
  box.append(l3);
  box.append(res);
  maj();
  return box;
}

/* ---------- 6. Test cardio vélo ---------- */
function outilTestVelo() {
  const st = { cle: Etat.data.reglages.testVeloNiveau || "debutant" };
  const box = h(`<div class="stack"></div>`);
  const corps = h(`<div class="stack"></div>`);
  const maj = () => {
    const proto = testVeloParCle(st.cle);
    const historique = (Etat.data.testsVelo || []).filter((t) => t.cle === st.cle);
    corps.innerHTML = "";
    corps.append(h(`<div class="muted small">Protocole de ${proto.dureeMin} minutes. Relève ton pouls à la fin de chaque palier marqué. Refais le test une fois par mois : <b>moins de pulsations au même effort = tu progresses</b>.</div>`));
    const saisie = [];
    proto.paliers.forEach((pa, i) => {
      const row = h(`<div class="velo-row"></div>`);
      row.append(h(`<span class="velo-t"><b>${esc(pa.nom)}</b><br><span class="muted small">${pa.min} min · niveau ${pa.niveau} · ${esc(pa.rpm)} RPM</span></span>`));
      if (pa.releve) {
        const inp = h(`<input class="velo-in" inputmode="numeric" placeholder="bpm" aria-label="Pouls ${pa.nom}">`);
        saisie.push({ i, inp });
        row.append(inp);
      } else row.append(h(`<span class="muted small">—</span>`));
      corps.append(row);
    });
    const bSave = h(`<button class="primary big" style="margin-top:8px">Enregistrer ce test</button>`);
    bSave.addEventListener("click", () => {
      const pouls = saisie.map((s) => +s.inp.value || 0);
      if (!pouls.some((x) => x > 0)) { toast("Saisis au moins une valeur de pouls."); return; }
      (Etat.data.testsVelo ||= []).push({ id: Etat.uid(), cle: st.cle, date: new Date().toISOString(), pouls });
      Etat.sauver(); toast("Test enregistré"); maj();
    });
    corps.append(bSave);
    if (historique.length) {
      corps.append(h(`<div class="eyebrow" style="margin-top:10px">Tes tests</div>`));
      historique.slice().reverse().forEach((t, idx, arr) => {
        const d = new Date(t.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
        const moy = Math.round(t.pouls.filter((x) => x > 0).reduce((a, x) => a + x, 0) / Math.max(1, t.pouls.filter((x) => x > 0).length));
        const prec = arr[idx + 1];
        const cmp = prec ? comparerTestsVelo(prec.pouls, t.pouls) : null;
        const tag = cmp ? `<span class="badge ${cmp.ameliore ? "ok" : "amber"}">${cmp.delta > 0 ? "+" : ""}${cmp.delta} bpm</span>` : "";
        const r = h(`<div class="spread small" style="padding:7px 0;border-bottom:1px solid var(--line)"><span>${d}<br><span class="muted">${t.pouls.filter((x) => x > 0).join(" · ")} bpm</span></span><span>${tag} <b class="num">${moy}</b></span></div>`);
        corps.append(r);
      });
      const bDel = h(`<button class="chip danger" style="margin-top:8px">Effacer l'historique de ce test</button>`);
      bDel.addEventListener("click", async () => {
        if (!await confirmer("Effacer tous les tests enregistrés pour ce niveau ?", { danger: true, ok: "Effacer" })) return;
        Etat.data.testsVelo = (Etat.data.testsVelo || []).filter((t) => t.cle !== st.cle);
        Etat.sauver(); maj();
      });
      corps.append(bDel);
    }
  };
  const niv = h(`<div class="row"></div>`);
  TESTS_VELO.forEach((t) => {
    const b = h(`<button class="chip ${st.cle === t.cle ? "on" : ""}">${esc(t.nom)}</button>`);
    b.addEventListener("click", () => {
      st.cle = t.cle; Etat.data.reglages.testVeloNiveau = t.cle; Etat.sauver();
      niv.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on"); maj();
    });
    niv.append(b);
  });
  box.append(niv, corps);
  maj();
  return box;
}

/* ======================================================================
   COACH — assistant DÉTERMINISTE (réponses issues du moteur de l'app)
   + mode « Coach IA » FACULTATIF (Transformers.js, désactivé par défaut).
   ====================================================================== */

/** Exemples de questions proposés à l'utilisateur (aussi utiles que l'aide). */
const COACH_EXEMPLES = [
  "Par quoi remplacer les tractions ?",
  "Quelle séance aujourd'hui ?",
  "Combien de protéines par jour ?",
  "Des exercices pour les épaules",
  "Combien de repos entre les séries ?",
  "Mes records",
];

/**
 * Résumé FACTUEL de l'utilisateur, injecté dans le prompt du mode IA. Ne
 * contient que des données déjà présentes dans l'app (jamais envoyées ailleurs :
 * l'inférence est locale).
 */
function contexteUtilisateur(opts = {}) {
  const p = Etat.data.profil || {};
  const b = calculerBesoins(p);
  const sj = seanceDuJour(Etat.data.programme);
  const logs = Etat.data.logs || [];
  const l = [];
  l.push(`Prénom : ${p.prenom || "—"}${p.age ? `, ${p.age} ans` : ""}${p.sexe ? `, ${p.sexe === "F" ? "femme" : "homme"}` : ""}${p.tailleCm ? `, ${p.tailleCm} cm` : ""}${p.poidsKg ? `, ${p.poidsKg} kg` : ""}.`);
  l.push(`Niveau : ${LEVEL_LABELS[p.niveau] || p.niveau || "—"}. Objectif : ${GOAL_LABELS[p.objectif] || p.objectif || "—"}.`);
  l.push(`Entraînement : ${p.joursParSemaine || "?"} jours/semaine, ${p.dureeSeanceMin || "?"} min par séance, lieu : ${({ maison: "maison", salle: "salle de sport", exterieur: "extérieur" })[p.lieu] || p.lieu || "—"}.`);
  l.push(`Matériel disponible : ${(p.equipements || []).map((e) => EQUIPMENT_LABELS[e] || e).join(", ") || "aucun"}.`);
  if ((p.limitations || []).length) l.push(`Zones sensibles déclarées : ${p.limitations.join(", ")}.`);
  if ((p.musclesPrioritaires || []).length) l.push(`Muscles prioritaires : ${p.musclesPrioritaires.map((m) => MUSCLE_LABELS[m] || m).join(", ")}.`);
  if (b) l.push(`Besoins quotidiens calculés : ${b.kcal} kcal, ${b.prot} g de protéines, ${b.lip} g de lipides, ${b.gluc} g de glucides, ${b.eau} L d'eau.`);
  const prog = Etat.data.programme;
  if (prog && Array.isArray(prog.seances) && prog.seances.length) {
    l.push(`Programme actif « ${prog.nom || "programme"} » :`);
    prog.seances.slice(0, 7).forEach((se) => {
      const ex = (se.exercices || []).map((e) => {
        const n = (e.series || []).filter((x) => x.type !== "echauffement");
        const r = n[0] && n[0].repsCible ? `${n[0].repsCible[0]}-${n[0].repsCible[1]}` : n[0] && n[0].dureeSec ? `${n[0].dureeSec}s` : "";
        return `${nomExo(e.exerciceId)} ${n.length}×${r}`;
      }).join(" ; ");
      l.push(`- ${se.nom} : ${ex}`);
    });
  }
  const perso = (Etat.data.programmesPerso || []).map((r) => r.nom).filter(Boolean);
  if (perso.length) l.push(`Routines personnelles : ${perso.slice(0, 8).join(", ")}.`);
  l.push(sj ? `Séance prévue aujourd'hui : ${sj.nom} (${sj.exercices.length} exercices).` : "Aujourd'hui : jour de repos dans le programme.");
  l.push(`Séances enregistrées au total : ${logs.length}. Série en cours : ${serieActuelle(logs)} jour(s). Données de charge exprimées en kg.`);
  if (uImp()) l.push("L'utilisateur affiche ses charges en LIVRES : donne toutes tes charges en lb (1 kg = 2,2046 lb), arrondies à 2,5 lb.");

  // Historique détaillé : SEULEMENT si l'utilisateur l'a autorisé (Compte → Coach).
  if (opts.historique) {
    const recents = logs.slice().sort((a, c) => (a.date < c.date ? 1 : -1)).slice(0, 8);
    if (recents.length) {
      l.push("Dernières séances (meilleure série par exercice) :");
      recents.forEach((lg) => {
        const ex = (lg.exercices || []).map((e) => {
          // Meilleure série selon ce qu'elle mesure : tonnage, sinon distance,
          // sinon durée, sinon répétitions (le texte s'adapte de même).
          const score = (x) => (x.chargeKg || 0) * (x.reps || 0) || (x.distanceM || 0) || (x.dureeSec || 0) || (x.reps || 0);
          const best = (e.series || []).reduce((m, x) => (!m || score(x) > score(m) ? x : m), null);
          const txt = best ? texteSerieLog(best, (kg) => `${kg} kg`) : "";
          const effort = best && best.rpe != null ? `, RPE ${best.rpe}` : best && best.rir != null ? `, RIR ${best.rir}` : "";
          return `${nomExo(e.exerciceId)} ${(e.series || []).length} séries${txt && txt !== "—" ? ` (max ${txt}${effort})` : ""}${e.douleur ? " [douleur signalée]" : ""}${e.note ? ` [note : ${String(e.note).slice(0, 120)}]` : ""}`;
        }).join(" ; ");
        l.push(`- ${String(lg.date).slice(0, 10)} ${lg.seanceNom || "séance"} (${Math.round((lg.dureeSec || 0) / 60)} min) : ${ex}${lg.note ? ` — note de séance : ${String(lg.note).slice(0, 160)}` : ""}`);
      });
    }
    const recs = classementRecords(logs, nomExo, 8);
    if (recs.length) l.push(`Records : ${recs.map((r) => `${r.nom} ${r.poidsMax} kg (1RM estimé ~${r.e1rm} kg)`).join(" ; ")}.`);
    try {
      const etat = (AUTO || calculerAuto()).etat || {};
      const fat = Object.entries(etat).filter(([, v]) => v && typeof v.readiness === "number")
        .sort((a, c) => a[1].readiness - c[1].readiness).slice(0, 6)
        .map(([k, v]) => `${LABELS_MOTEUR[k] || k} ${Math.round(v.readiness)} %`);
      if (fat.length) l.push(`Fraîcheur estimée des muscles les plus sollicités (estimation, pas une mesure) : ${fat.join(", ")}.`);
    } catch (e) { /* récupération indisponible : on n'invente rien */ }
    const pesees = (Etat.data.metrics || []).filter((m) => m.poidsKg).sort((a, c) => (a.date < c.date ? -1 : 1));
    if (pesees.length >= 2) {
      const a = pesees[Math.max(0, pesees.length - 6)], z = pesees[pesees.length - 1];
      l.push(`Poids : ${a.poidsKg} kg le ${a.date} → ${z.poidsKg} kg le ${z.date}.`);
    }
    // Stagnations (moteur déterministe, analyse.js) : le coach ne les devine pas.
    const pl = plateaux(logs).slice(0, 5);
    if (pl.length) l.push(`Stagnation détectée (1RM estimé non battu) : ${pl.map((x) => `${nomExo(x.exerciceId)} — meilleur ~${x.meilleur} kg il y a ${x.depuisJours} j, ${x.seancesDepuis} séances depuis`).join(" ; ")}.`);
    else if (logs.length >= 6) l.push("Aucune stagnation détectée : les 1RM estimés progressent ou sont récents.");
    // Effort perçu des 5 dernières séances (RPE saisi, ou déduit du RIR).
    const eff5 = effortMoyen(logs.slice().sort((a, c) => (a.date < c.date ? 1 : -1)).slice(0, 5).flatMap((lg) => seriesDe(lg)));
    if (eff5.n) l.push(`Effort moyen des 5 dernières séances : RPE ${eff5.rpe} (${eff5.n} séries notées${eff5.deduites ? `, dont ${eff5.deduites} déduites du RIR` : ""}).`);
    // Records cardio et gainage (jamais mélangés aux charges).
    const bpc = meilleuresPerfs(logs);
    const rc = Object.entries(bpc).filter(([, b]) => b.distanceMax || (b.dureeMax && !b.chargeMax)).slice(0, 5)
      .map(([id, b]) => `${nomExo(id)} ${b.distanceMax ? `${(b.distanceMax / 1000).toFixed(1)} km max${b.vitesseMax ? `, ${b.vitesseMax.toFixed(1)} km/h max` : ""}` : `maintien ${b.dureeMax} s max`}`);
    if (rc.length) l.push(`Cardio / gainage : ${rc.join(" ; ")}.`);
    // Mensurations : dernier état connu, en cm / kg / %.
    const jm = joursDeMesure(Etat.data.metrics || []);
    if (jm.length) {
      const e = etatAu(Etat.data.metrics || [], jm[0]);
      const champs = ["masseGrassePct", "taille", "poitrine", "hanches", "brasD", "brasG", "cuisseD", "cuisseG"].filter((k) => e[k]);
      if (champs.length) l.push(`Mensurations (au ${jm[0]}) : ${champs.map((k) => `${champMesure(k).label} ${e[k].v}${champMesure(k).type === "pct" ? " %" : " cm"}`).join(", ")}.`);
    }
  } else {
    l.push("(L'utilisateur n'a pas autorisé le partage de son historique détaillé : ne cite pas de charges passées.)");
  }

  // Catalogue : uniquement pour une demande de programme ou de modification.
  if (opts.catalogue) {
    // Routines actuelles, avec identifiants : nécessaires pour proposer une
    // version modifiée (« base »). Ce sont des plans, pas de l'historique.
    const persoD = (Etat.data.programmesPerso || []).slice(0, 4);
    if (persoD.length) {
      l.push("\nROUTINES ACTUELLES (nom → séances : id séries×reps) :");
      persoD.forEach((r) => {
        l.push(`« ${r.nom} » :`);
        (r.seances || []).slice(0, 7).forEach((se) => {
          l.push(`- ${se.nom} : ${(se.exercices || []).map((e) => {
            const t = (e.series || []).filter((x) => x.type !== "echauffement");
            const p0 = t[0] || {};
            return `${e.exerciceId} ${t.length}×${p0.repsCible ? `${p0.repsCible[0]}-${p0.repsCible[1]}` : p0.dureeSec ? `${p0.dureeSec}s` : "?"}`;
          }).join(" ; ")}`);
        });
      });
    }
    l.push("\nEXERCICES DISPONIBLES (id | nom | muscles | matériel) — réalisables avec son matériel :");
    l.push(catalogueCompact(CATALOGUE, { realisable: estRealisable, labelsMuscle: MUSCLE_LABELS, labelsEquip: EQUIPMENT_LABELS }));
  }
  return l.join("\n");
}

/**
 * Réponse DÉTERMINISTE : classe la question puis interroge le moteur existant.
 * Renvoie un élément DOM (texte + éventuels boutons d'action).
 */
function repondreAssistant(q) {
  const { intent, muscle } = detecterIntention(q);
  const box = h(`<div class="stack"></div>`);
  const txt = (s) => box.append(h(`<div class="small">${s}</div>`));
  const p = Etat.data.profil || {};

  /** Liste d'exercices cliquables (ouvre la fiche). */
  const listeExos = (exos, vide) => {
    if (!exos.length) { txt(vide); return; }
    exos.forEach((e) => {
      const b = h(`<button class="card wcard sil coach-exo" style="width:100%;text-align:left"><span class="g"><b>${esc(e.nom)}</b><br><span class="muted small">${esc((e.musclesPrincipaux || []).map((m) => MUSCLE_LABELS[m] || m).join(", "))}</span></span><span class="chev">›</span></button>`);
      b.addEventListener("click", () => ouvrirDetail(e));
      box.append(b);
    });
  };

  switch (intent) {
    case "remplacer": {
      const exo = trouverExoParNom(q, CATALOGUE);
      if (!exo) { txt("Précise l'exercice à remplacer, par exemple : « par quoi remplacer le squat ? »"); break; }
      const alts = alternatives(exo.id, p);
      if (!alts.length) { txt(`Aucune alternative à <b>${esc(exo.nom)}</b> compatible avec ton matériel et tes contraintes. Ajoute du matériel dans ton profil pour élargir les options.`); break; }
      txt(`Pour remplacer <b>${esc(exo.nom)}</b>, voici ce qui correspond à ton matériel :`);
      alts.forEach((a) => {
        const b = h(`<button class="card wcard sil coach-exo" style="width:100%;text-align:left"><span class="g"><b>${esc(a.exercice.nom)}</b><br><span class="muted small">${esc(a.explication)}</span></span><span class="chev">›</span></button>`);
        b.addEventListener("click", () => ouvrirDetail(a.exercice));
        box.append(b);
      });
      break;
    }
    case "exos_muscle": {
      if (!muscle) { txt("Précise le groupe musculaire, par exemple : « des exercices pour les pectoraux »."); break; }
      // Les exercices qui ciblent le muscle en PRINCIPAL passent devant ceux qui
      // ne le sollicitent qu'en secondaire (sinon « épaules » remonte des pompes).
      const res = chercherCatalogue({ muscle }).filter(estRealisable)
        .sort((a, b) => Number((b.musclesPrincipaux || []).includes(muscle)) - Number((a.musclesPrincipaux || []).includes(muscle)))
        .slice(0, 6);
      txt(`Exercices pour <b>${esc(MUSCLE_LABELS[muscle] || muscle)}</b> réalisables avec ton matériel :`);
      listeExos(res, "Aucun exercice réalisable avec ton matériel actuel pour ce groupe.");
      break;
    }
    case "nutrition": {
      const b = calculerBesoins(p);
      txt(`Pour ton objectif « ${esc(GOAL_LABELS[p.objectif] || p.objectif)} », tes besoins calculés sont :`);
      const g = h(`<div class="statgrid"></div>`);
      g.append(statCard(IC.flame, `${b.kcal}`, "kcal / jour"));
      g.append(statCard(IC.dumbbell, `${b.prot} g`, "Protéines"));
      g.append(statCard(IC.apple, `${b.gluc} g`, "Glucides"));
      g.append(statCard(IC.droplet, `${b.lip} g`, "Lipides"));
      box.append(g);
      const bn = h(`<button class="secondary big">Ouvrir la nutrition</button>`);
      bn.addEventListener("click", () => { fermerCoach(); nav("food"); });
      box.append(bn);
      break;
    }
    case "eau": {
      const b = calculerBesoins(p);
      txt(`Vise environ <b>${b.eau} L d'eau par jour</b> (calculé sur ton poids), un peu plus les jours d'entraînement intense ou de forte chaleur.`);
      const bn = h(`<button class="secondary big">Suivre mon hydratation</button>`);
      bn.addEventListener("click", () => { fermerCoach(); nav("food"); });
      box.append(bn);
      break;
    }
    case "seance_jour": {
      const sj = seanceDuJour(Etat.data.programme);
      if (!sj) { txt("Aujourd'hui c'est <b>repos</b> — marche, mobilité ou récupération active. Ta prochaine séance t'attend demain."); break; }
      txt(`Aujourd'hui : <b>${esc(sj.nom)}</b> — ${sj.exercices.length} exercices, environ ${sj.dureeEstimeeMin} min.`);
      sj.exercices.slice(0, 8).forEach((e, i) => box.append(h(`<div class="small">${i + 1}. ${esc(nomExo(e.exerciceId))}</div>`)));
      const bn = h(`<button class="primary big"><span class="btn-ico">${IC.play}</span>Commencer la séance</button>`);
      bn.addEventListener("click", () => { fermerCoach(); LIVE = null; APERCU = sj.id; nav("train"); });
      box.append(bn);
      break;
    }
    case "records": {
      const cls = classementRecords(Etat.data.logs, nomExo, 6);
      if (!cls.length) { txt("Pas encore de record : enregistre quelques séances et ils apparaîtront ici."); break; }
      txt("Tes meilleures performances :");
      cls.forEach((r) => box.append(h(`<div class="spread small"><span>${esc(r.nom)}</span><b>${uCharge(r.poidsMax)} · 1RM ~${uCharge(r.e1rm)}</b></div>`)));
      const bn = h(`<button class="secondary big">Voir tous mes records</button>`);
      bn.addEventListener("click", () => { fermerCoach(); nav("stats"); });
      box.append(bn);
      break;
    }
    case "repos": {
      const o = p.objectif;
      const reco = o === "force" ? "3 à 5 min" : o === "perte_graisse" ? "45 à 60 s" : "1 min 30 à 2 min";
      txt(`Pour ton objectif « ${esc(GOAL_LABELS[o] || o)} » : <b>${reco}</b> entre les séries lourdes, et 45 à 60 s sur l'isolation. Le minuteur se lance tout seul quand tu valides une série.`);
      break;
    }
    case "progression": {
      txt("La règle appliquée par l'app : quand tu atteins le <b>haut de la fourchette de répétitions sur toutes tes séries</b>, tu augmentes la charge à la séance suivante (environ +2,5 % ou le plus petit disque disponible), puis tu repars en bas de la fourchette.");
      txt("Le conseil affiché sur chaque exercice pendant la séance tient déjà compte de tes deux dernières performances.");
      break;
    }
    case "aide":
      txt("Je réponds à partir de <b>tes vraies données</b> : ton programme, ton matériel, tes séances et tes besoins. Essaie par exemple :");
      break;
    default:
      txt("Je n'ai pas compris la question. Je sais répondre sur : le remplacement d'un exercice, la séance du jour, la nutrition, l'hydratation, les temps de repos, la progression et tes records.");
  }

  // Suggestions cliquables (aide + question non comprise)
  if (intent === "aide" || intent === "inconnu") {
    const s = h(`<div class="coach-sugg"></div>`);
    COACH_EXEMPLES.forEach((ex) => {
      const b = h(`<button class="chip">${esc(ex)}</button>`);
      b.addEventListener("click", () => envoyerQuestionCoach(ex));
      s.append(b);
    });
    box.append(s);
  }
  return box;
}

/* ---------- interface de discussion ---------- */
let COACH_IA = null; // module coachIA.js chargé à la demande (null tant qu'inactif)
let COACH_CLOUD = null; // module coachCloud.js chargé à la demande (clé utilisateur)

function fermerCoach() { document.getElementById("coach")?.remove(); }

/** Ajoute une bulle dans le fil et fait défiler vers le bas. */
function bulleCoach(role, contenu) {
  const fil = document.querySelector("#coach .coach-fil");
  if (!fil) return null;
  const b = h(`<div class="coach-bulle ${role}"></div>`);
  if (typeof contenu === "string") b.innerHTML = `<div class="small">${contenu}</div>`;
  else b.append(contenu);
  fil.append(b);
  defilerCoach(true);
  return b;
}
/**
 * Fait défiler la conversation vers le bas. C'est la FEUILLE qui défile (le fil
 * grandit avec son contenu), pas le fil lui-même : régler `fil.scrollTop` ne
 * faisait rien et les nouvelles réponses restaient sous le clavier.
 * @param {boolean} [force]  sinon, seulement si l'on était déjà près du bas
 *   (ne pas arracher la lecture de quelqu'un qui est remonté)
 */
function defilerCoach(force = false) {
  const sh = document.getElementById("coach");
  if (!sh) return;
  if (force || sh.scrollHeight - sh.scrollTop - sh.clientHeight < 160) sh.scrollTop = sh.scrollHeight;
}

/* ---------- conversation avec l'IA cloud ---------- */
// Historique de la conversation en cours ({role, content}). En mémoire
// seulement : une conversation n'a pas à survivre à la fermeture de l'app, et
// rien de ce qui a été dit n'est écrit sur le disque.
let COACH_HISTO = [];
let COACH_ABORT = null; // AbortController de la réponse en cours
// Intentions où le moteur déterministe apporte une ACTION que l'IA ne peut pas
// donner seule (boutons calculés sur le vrai matériel, démarrage de séance) :
// on les garde en tête de réponse même quand l'IA est branchée.
const INTENTS_ACTIONNABLES = new Set(["remplacer", "seance_jour", "records"]);

/** L'IA cloud est-elle branchée (clé saisie, ou relais configuré) ? */
function coachCloudPret() {
  const c = Etat.data.reglages.coachCloud;
  if (!c) return false;
  if (c.fournisseur === "relais") return /^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1)/.test(c.url || "");
  return !!(c.cle && String(c.cle).trim());
}
/** Nom affiché du moteur cloud. */
function nomMoteurCloud() {
  const f = (Etat.data.reglages.coachCloud || {}).fournisseur;
  return ({ anthropic: "Claude", openai: "OpenAI", gemini: "Gemini", relais: "Relais sécurisé" })[f] || "IA";
}

/** Bascule le bouton d'envoi en bouton « stop » pendant une réponse. */
function etatEnvoiCoach(enCours) {
  const btn = document.querySelector("#coach .coach-barre button[type=submit]");
  if (!btn) return;
  btn.innerHTML = enCours ? `<span class="coach-stop" aria-hidden="true"></span>` : IC.send;
  btn.setAttribute("aria-label", enCours ? "Arrêter la réponse" : "Envoyer");
  btn.classList.toggle("en-cours", enCours);
}

/** Carte « routine proposée » : rien n'est ajouté sans un geste explicite. */
function carteRoutineProposee(res) {
  const r = res.routine;
  const c = h(`<div class="coach-prop"></div>`);
  const nbExos = r.seances.reduce((n, se) => n + se.exercices.length, 0);
  const base = r.baseNom ? (Etat.data.programmesPerso || []).find((x) => x.nom === r.baseNom) : null;
  c.append(h(`<div class="coach-prop-top"><span class="eyebrow accent">${base ? "Modification proposée" : "Routine proposée"}</span><b>${esc(r.nom)}</b>
    <span class="muted small">${r.seances.length} séance${r.seances.length > 1 ? "s" : ""} · ${nbExos} exercices</span></div>`));
  // Modification : on montre CE QUI CHANGE par rapport à la routine d'origine,
  // qui reste intacte (la version est ajoutée à côté).
  if (base) {
    const d = differenceRoutines(base, r, nomExo);
    const lignesD = [
      ...d.ajoutes.map((n) => `<li class="diff-plus">+ ${esc(n)}</li>`),
      ...d.retires.map((n) => `<li class="diff-moins">− ${esc(n)}</li>`),
      ...d.modifies.map((m) => `<li class="diff-mod">${esc(m.nom)} : ${esc(m.avant)} → ${esc(m.apres)}</li>`),
    ];
    c.append(h(`<div class="coach-diff"><div class="small"><b>Par rapport à « ${esc(base.nom)} »</b> (conservée telle quelle)</div>${lignesD.length ? `<ul>${lignesD.join("")}</ul>` : `<div class="muted small">Aucun changement d'exercice ni de volume.</div>`}</div>`));
  } else if (r.baseNom) {
    c.append(h(`<div class="hint">Routine d'origine « ${esc(r.baseNom)} » introuvable : la proposition sera ajoutée comme nouvelle routine.</div>`));
  }
  const liste = h(`<div class="coach-prop-liste"></div>`);
  r.seances.forEach((se) => {
    const lignes = se.exercices.map((e) => {
      const t = e.series[0] || {};
      const vol = t.repsCible ? `${e.series.length} × ${t.repsCible[0]}-${t.repsCible[1]}` : `${e.series.length} × ${t.dureeSec || "?"} s`;
      return `<li><span>${esc(nomExo(e.exerciceId))}</span><span class="muted">${vol} · ${Math.round((t.reposSec || 90) / 15) * 15} s</span></li>`;
    }).join("");
    liste.append(h(`<details class="coach-prop-seance"><summary><b>${esc(se.nom)}</b><span class="muted small">${se.exercices.length} exos · ~${se.dureeEstimeeMin} min</span></summary><ul>${lignes}</ul></details>`));
  });
  c.append(liste);
  if (res.ignores.length) {
    c.append(h(`<div class="hint">${res.ignores.length} exercice${res.ignores.length > 1 ? "s" : ""} inconnu${res.ignores.length > 1 ? "s" : ""} du catalogue ${res.ignores.length > 1 ? "ont été écartés" : "a été écarté"} — rien n'a été inventé.</div>`));
  }
  const barre = h(`<div class="row coach-prop-actions"></div>`);
  const bAdd = h(`<button class="primary" type="button"><span class="btn-ico">${IC.plus}</span>${base ? "Ajouter cette version" : "Ajouter à mes routines"}</button>`);
  const bNon = h(`<button class="secondary" type="button">Ignorer</button>`);
  bAdd.addEventListener("click", () => {
    (Etat.data.programmesPerso ||= []).push(r);
    Etat.sauver();
    barre.replaceWith(h(`<div class="coach-prop-ok small"><span class="cic">${IC.check}</span>Ajoutée à tes routines — modifiable à tout moment.</div>`));
    const voir = h(`<button class="linklike" type="button">Ouvrir mes routines ›</button>`);
    voir.addEventListener("click", () => { fermerCoach(); nav("prog"); });
    c.append(voir);
    toast("Routine ajoutée");
  });
  bNon.addEventListener("click", () => { c.classList.add("ignoree"); barre.remove(); c.append(h(`<div class="muted small">Proposition ignorée.</div>`)); });
  barre.append(bAdd, bNon);
  c.append(barre);
  return c;
}

/** Interroge l'IA cloud avec l'historique de la conversation. */
async function repondreCloud(q) {
  const cfg = Etat.data.reglages.coachCloud;
  const bulle = bulleCoach("coach ia", `<span class="coach-ia-tag">${esc(nomMoteurCloud())}</span><div class="coach-ia-txt coach-md"><span class="coach-attente" aria-label="Le coach écrit"><i></i><i></i><i></i></span></div>`);
  if (!bulle) return;
  const cible = bulle.querySelector(".coach-ia-txt");
  const plan = demandeDePlan(q);
  const contexte = contexteUtilisateur({ historique: !!Etat.data.reglages.coachPartageHisto, catalogue: plan });
  COACH_ABORT = new AbortController();
  etatEnvoiCoach(true);
  let acc = "";
  try {
    if (!COACH_CLOUD) COACH_CLOUD = await import("../integrations/coachCloud.js");
    // Pendant le flux, le bloc JSON éventuel est masqué dès son ouverture.
    await COACH_CLOUD.demander(q, contexte, cfg, (t) => {
      acc += t;
      const visible = acc.split("```")[0];
      cible.innerHTML = htmlLeger(visible) || `<span class="coach-attente"><i></i><i></i><i></i></span>`;
      if (acc.includes("```")) cible.insertAdjacentHTML("beforeend", `<p class="muted small coach-prepa">Préparation de la routine…</p>`);
      defilerCoach();
    }, { historique: COACH_HISTO, signal: COACH_ABORT.signal });
  } catch (e) {
    if (e && e.name === "AbortError") {
      cible.insertAdjacentHTML("beforeend", `<p class="muted small">Réponse interrompue.</p>`);
    } else {
      cible.innerHTML = `<p>Le coach ${esc(nomMoteurCloud())} n'a pas pu répondre : ${esc(e.message || "erreur inconnue")}</p>`;
      const repli = h(`<div class="coach-repli"></div>`);
      repli.append(h(`<div class="muted small">Réponse du moteur hors ligne :</div>`));
      repli.append(repondreAssistant(q));
      bulle.append(repli);
      COACH_ABORT = null; etatEnvoiCoach(false);
      return;
    }
  }
  COACH_ABORT = null;
  etatEnvoiCoach(false);
  const ext = extraireProposition(acc);
  cible.innerHTML = htmlLeger(ext.texte) || (ext.proposition ? "" : "<p>(pas de réponse)</p>");
  let resume = ext.texte;
  if (ext.proposition) {
    const res = routineDepuisProposition(ext.proposition, getExercise);
    if (res.routine) {
      bulle.append(carteRoutineProposee(res));
      resume += `\n\n[Routine proposée dans l'app : « ${res.routine.nom} », ${res.routine.seances.map((se) => `${se.nom} (${se.exercices.map((e) => nomExo(e.exerciceId)).join(", ")})`).join(" ; ")}]`;
    } else {
      bulle.append(h(`<div class="warn small">${esc(res.raison || "Proposition inutilisable.")}</div>`));
    }
  } else if (ext.erreur) {
    bulle.append(h(`<div class="warn small">${esc(ext.erreur)}</div>`));
  }
  if (acc.trim()) COACH_HISTO.push({ role: "user", content: q }, { role: "assistant", content: resume.trim() || acc.trim() });
  defilerCoach();
}

/** Traite une question : IA cloud si branchée (conversation), sinon moteur déterministe + IA locale. */
async function envoyerQuestionCoach(question) {
  const q = (question || "").trim();
  if (!q) return;
  if (COACH_ABORT) return; // une réponse est déjà en cours
  const champ = $("#coachInput");
  if (champ) champ.value = "";
  bulleCoach("moi", esc(q));
  const { intent } = detecterIntention(q);

  // IA CLOUD : une vraie conversation, avec mémoire des échanges précédents.
  // Le moteur déterministe ne s'affiche en tête que lorsqu'il apporte une action
  // calculée (remplacements compatibles, démarrage de séance, records exacts).
  if (coachCloudPret()) {
    if (INTENTS_ACTIONNABLES.has(intent)) bulleCoach("coach", repondreAssistant(q));
    await repondreCloud(q);
    return;
  }

  // 1) Réponse déterministe — instantanée, exacte, toujours affichée.
  bulleCoach("coach", repondreAssistant(q));
  const questionLibre = intent === "inconnu" || intent === "aide";

  // 2) Étage LOCAL (Transformers.js), si activé et prêt.
  if (!Etat.data.reglages.coachIA || !COACH_IA || !COACH_IA.estPret()) return;
  if (!questionLibre) return; // pas de doublon inutile

  const bulle = bulleCoach("coach ia", `<span class="coach-ia-tag">Coach IA</span><span class="coach-ia-txt">…</span>`);
  const cible = bulle.querySelector(".coach-ia-txt");
  try {
    let acc = "";
    await COACH_IA.demander(q, contexteUtilisateur(), (t) => { acc += t; cible.textContent = acc; });
    if (!acc.trim()) cible.textContent = "(pas de réponse)";
  } catch (e) {
    cible.textContent = "Le coach IA n'a pas pu répondre. La réponse ci-dessus reste valable.";
  }
}

/**
 * Carte de réglage du mode « Coach IA » (Profil). DÉSACTIVÉ par défaut :
 * tant qu'il ne l'est pas, aucune bibliothèque ni modèle n'est téléchargé et
 * l'app reste strictement déterministe et hors ligne.
 */
function carteCoachIA() {
  const actif = !!Etat.data.reglages.coachIA;
  const c = h(`<div class="card stack" style="margin-top:12px"></div>`);
  c.append(h(`<div class="spread"><h2 style="margin:0;font-size:1.05rem"><span class="cic">${IC.spark}</span>Coach IA (expérimental)</h2></div>`));
  c.append(h(`<div class="muted small">Ajoute un petit modèle de langage qui tourne <b>dans ton téléphone</b> pour les questions ouvertes. Le coach normal, lui, répond déjà instantanément et sans rien télécharger.</div>`));
  c.append(h(`<div class="warn small">Premier lancement : <b>téléchargement d'environ 300 Mo</b> (à faire en Wi-Fi), et réponses plus lentes sur mobile. Les réponses d'une IA peuvent être inexactes : le coach déterministe reste la référence.</div>`));

  const sw = h(`<button class="big ${actif ? "primary" : "secondary"}">${actif ? "Désactiver le coach IA" : "Activer le coach IA"}</button>`);
  sw.addEventListener("click", async () => {
    if (actif) {
      Etat.data.reglages.coachIA = false; Etat.sauver();
      try { const m = await import("../integrations/coachIA.js"); await m.decharger(); } catch (e) { /* rien à décharger */ }
      toast("Coach IA désactivé — l'app est de nouveau 100 % déterministe.");
      render();
      return;
    }
    const ok = await confirmer(
      "Activer le coach IA ? Un modèle d'environ 300 Mo sera téléchargé au premier usage (Wi-Fi conseillé). Les réponses sont générées localement, mais peuvent être inexactes.",
      { ok: "Activer" });
    if (!ok) return;
    Etat.data.reglages.coachIA = true; Etat.sauver();
    toast("Coach IA activé — ouvre le Coach pour lancer le téléchargement.");
    render();
  });
  c.append(sw);

  if (actif) {
    // Choix du modèle (le plus léger d'abord).
    const sel = h(`<div class="row"></div>`);
    [["onnx-community/Qwen2.5-0.5B-Instruct", "Qwen2.5 0.5B · ~350 Mo"],
     ["HuggingFaceTB/SmolLM2-360M-Instruct", "SmolLM2 360M · ~280 Mo"]].forEach(([id, lab]) => {
      const cur = (Etat.data.reglages.coachIAModele || "onnx-community/Qwen2.5-0.5B-Instruct") === id;
      const b = h(`<button class="chip ${cur ? "on" : ""}">${esc(lab)}</button>`);
      b.addEventListener("click", () => { Etat.data.reglages.coachIAModele = id; Etat.sauver(); render(); });
      sel.append(b);
    });
    c.append(sel);
  }
  return c;
}

/**
 * Carte de réglage du « Coach IA » branché (Compte).
 *
 * Deux façons de brancher une vraie IA, sans jamais mettre de clé dans le code :
 *  - « ta clé » (Claude, OpenAI, Gemini) : rangée sur CET appareil, envoyée
 *    uniquement au fournisseur choisi, jamais incluse dans une sauvegarde ;
 *  - « relais sécurisé » : ton serveur (server/coach-relais/) garde la clé.
 * Le partage de l'historique détaillé est un consentement séparé, éteint par défaut.
 */
let COACH_FOURN_EDIT = null; // fournisseur affiché dans le formulaire (avant enregistrement)
function carteCoachCloud() {
  const cfg = Etat.data.reglages.coachCloud || {};
  const actif = coachCloudPret();
  const FOURN = {
    anthropic: { nom: "Claude", aide: "console.anthropic.com → API Keys (clé « sk-ant-… »).", modele: "claude-haiku-5-5" },
    openai: { nom: "OpenAI", aide: "platform.openai.com → API keys (clé « sk-… »).", modele: "gpt-4o-mini" },
    gemini: { nom: "Gemini", aide: "aistudio.google.com → Get API key.", modele: "gemini-2.0-flash" },
    relais: { nom: "Relais sécurisé", aide: "Ton serveur garde la clé : déploie server/coach-relais/ (Cloudflare, gratuit), puis colle son adresse et ton jeton d'accès.", modele: "" },
  };
  const fournisseur = COACH_FOURN_EDIT || (FOURN[cfg.fournisseur] ? cfg.fournisseur : "anthropic");
  const memeFourn = cfg.fournisseur === fournisseur;
  const F = FOURN[fournisseur];

  const c = h(`<div class="card stack coach-cfg" style="margin-top:12px"></div>`);
  c.append(h(`<div class="spread"><h2 style="margin:0;font-size:1.05rem"><span class="cic">${IC.spark}</span>Coach IA connecté</h2>${actif ? `<span class="pill on">${esc(nomMoteurCloud())} · actif</span>` : `<span class="pill">Désactivé</span>`}</div>`));
  c.append(h(`<div class="muted small">Branche un vrai modèle d'IA pour <b>converser</b>, analyser tes séances et te <b>proposer des routines complètes</b> que tu valides avant qu'elles soient ajoutées. Sans IA branchée, le coach répond quand même, hors ligne, à partir de tes données.</div>`));

  const selF = h(`<div class="row coach-cfg-fourn" role="radiogroup" aria-label="Fournisseur"></div>`);
  Object.entries(FOURN).forEach(([id, f]) => {
    const on = fournisseur === id;
    const b = h(`<button class="chip ${on ? "on" : ""}" type="button" role="radio" aria-checked="${on}">${esc(f.nom)}</button>`);
    b.addEventListener("click", () => { COACH_FOURN_EDIT = id; render(); });
    selF.append(b);
  });
  c.append(selF);
  c.append(h(`<div class="hint">${esc(F.aide)}</div>`));

  const form = h(`<form class="stack coach-cfg-form" autocomplete="off"></form>`);
  if (fournisseur === "relais") {
    form.append(h(`<label class="out-field"><span>Adresse du relais</span><input name="url" type="url" inputmode="url" placeholder="https://coach-perso-relais.….workers.dev" value="${esc(memeFourn ? cfg.url || "" : "")}"></label>`));
    form.append(h(`<label class="out-field"><span>Jeton d'accès</span><input name="jeton" type="password" placeholder="${memeFourn && cfg.jeton ? "•••••••• (enregistré)" : "le JETON_ACCES de ton relais"}"></label>`));
  } else {
    form.append(h(`<label class="out-field"><span>Clé d'API ${esc(F.nom)}</span><input name="cle" type="password" placeholder="${memeFourn && cfg.cle ? "•••••••• (enregistrée)" : "colle ta clé ici"}"></label>`));
    form.append(h(`<label class="out-field"><span>Modèle (facultatif)</span><input name="modele" type="text" spellcheck="false" placeholder="${esc(F.modele)}" value="${esc(memeFourn ? cfg.modele || "" : "")}"></label>`));
  }
  const barre = h(`<div class="row"></div>`);
  barre.append(h(`<button class="primary" type="submit">${actif && memeFourn ? "Mettre à jour" : "Enregistrer"}</button>`));
  if (actif) {
    const bTest = h(`<button class="secondary" type="button">Tester</button>`);
    bTest.addEventListener("click", async () => {
      bTest.disabled = true; bTest.textContent = "Test…";
      try {
        if (!COACH_CLOUD) COACH_CLOUD = await import("../integrations/coachCloud.js");
        const rep = await COACH_CLOUD.demander("Réponds seulement : « Connexion réussie ».", "(test de connexion)", Etat.data.reglages.coachCloud);
        toast(rep ? `${nomMoteurCloud()} répond : ${rep.slice(0, 60)}` : "Connexion établie, réponse vide.");
      } catch (e) { toast(`Échec : ${e.message}`); }
      bTest.disabled = false; bTest.textContent = "Tester";
    });
    barre.append(bTest);
    const bDel = h(`<button class="danger" type="button">Débrancher</button>`);
    bDel.addEventListener("click", () => {
      delete Etat.data.reglages.coachCloud; COACH_FOURN_EDIT = null; COACH_HISTO = [];
      Etat.sauver(); toast("Coach IA débranché — la clé a été effacée de cet appareil."); render();
    });
    barre.append(bDel);
  }
  form.append(barre);
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    const val = (k) => String(fd.get(k) || "").trim();
    const prec = memeFourn ? cfg : {};
    let nouv;
    if (fournisseur === "relais") {
      const url = val("url");
      if (!/^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1)/.test(url)) { toast("Adresse invalide : elle doit commencer par https://"); return; }
      nouv = { fournisseur, url, jeton: val("jeton") || prec.jeton || "" };
    } else {
      const cle = val("cle") || prec.cle || "";
      if (!cle) { toast("Colle d'abord ta clé."); return; }
      nouv = { fournisseur, cle, modele: val("modele") };
    }
    Etat.data.reglages.coachCloud = nouv;
    COACH_FOURN_EDIT = null; COACH_HISTO = [];
    Etat.sauver();
    toast(`${FOURN[fournisseur].nom} branché — ouvre le coach pour converser.`);
    render();
  });
  c.append(form);

  // Consentement au partage de l'historique détaillé.
  const partage = !!Etat.data.reglages.coachPartageHisto;
  const sw = h(`<label class="coach-cfg-consent"><input type="checkbox" ${partage ? "checked" : ""}>
    <span><b>Partager mon historique d'entraînement</b><br><span class="muted small">Dernières séances, records, fraîcheur musculaire et poids, pour des analyses précises. Sinon, le coach ne reçoit que ton profil et ton programme.</span></span></label>`);
  sw.querySelector("input").addEventListener("change", (ev) => {
    Etat.data.reglages.coachPartageHisto = ev.target.checked; Etat.sauver();
    toast(ev.target.checked ? "Historique partagé avec le coach IA" : "Historique non partagé");
  });
  c.append(sw);
  c.append(h(`<div class="hint">Confidentialité : tes questions et ce résumé partent chez ${fournisseur === "relais" ? "ton relais puis chez Anthropic" : esc(F.nom)} au moment où tu écris, jamais ailleurs. La clé reste sur cet appareil et n'est jamais incluse dans une sauvegarde. Les réponses d'une IA peuvent contenir des erreurs : vérifie avant d'appliquer.</div>`));
  return c;
}

/** Ouvre la feuille « Coach ». */
function ouvrirCoach() {
  fermerCoach();
  // Le catalogue complet sert aux propositions de routine : on le charge en
  // tâche de fond dès l'ouverture (sans effet s'il l'est déjà).
  if (!catalogueEtenduCharge()) chargerCatalogueEtendu().catch(() => {});
  const sheet = h(`<div class="sheet coach" id="coach" role="dialog" aria-modal="true" aria-label="Coach"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  const cloud = coachCloudPret();

  // En-tête de marque, façon FitAI : pastille à étincelles en dégradé bleu→violet
  // et une étiquette qui dit quel moteur répond (hors ligne, local ou connecté).
  const moteur = cloud ? nomMoteurCloud() : Etat.data.reglages.coachIA ? "IA locale" : "Hors ligne · tes données";
  const top = h(`<div class="coach-top">
    <span class="coach-spark">${IC.spark}</span>
    <span class="coach-id"><b>Coach</b><em>${esc(moteur)}</em></span>
    ${cloud ? `<button class="chip" id="coachNew" type="button" aria-label="Nouvelle conversation">${IC.plus}</button>` : ""}
    <button class="chip" id="coachX" type="button" aria-label="Fermer le coach">✕</button></div>`);
  inner.append(top);

  const fil = h(`<div class="coach-fil" aria-live="polite"></div>`);
  inner.append(fil);

  const barre = h(`<form class="coach-barre"><input id="coachInput" type="text" autocomplete="off" enterkeyhint="send" placeholder="${cloud ? "Écris au coach… (ex : crée-moi une routine)" : "Pose ta question…"}" aria-label="Ta question"><button class="primary" type="submit" aria-label="Envoyer">${IC.send}</button></form>`);
  barre.addEventListener("submit", (e) => {
    e.preventDefault();
    if (COACH_ABORT) { COACH_ABORT.abort(); return; }   // le bouton sert de « stop »
    envoyerQuestionCoach($("#coachInput").value);
  });
  inner.append(barre);

  sheet.querySelector("#coachX").addEventListener("click", fermerCoach);
  sheet.querySelector("#coachNew")?.addEventListener("click", () => {
    COACH_ABORT?.abort(); COACH_HISTO = []; ouvrirCoach(); toast("Nouvelle conversation");
  });
  document.body.append(sheet);

  if (cloud) {
    // Conversation en cours : on la réaffiche, le coach s'en souvient.
    if (COACH_HISTO.length) {
      COACH_HISTO.forEach((m) => {
        if (m.role === "user") bulleCoach("moi", esc(m.content));
        else bulleCoach("coach ia", `<span class="coach-ia-tag">${esc(nomMoteurCloud())}</span><div class="coach-ia-txt coach-md">${htmlLeger(m.content.replace(/\n\n\[Routine proposée[\s\S]*$/, ""))}</div>`);
      });
    } else {
      const accueil = h(`<div class="stack"><div class="small">Je connais ton profil, ton programme${Etat.data.reglages.coachPartageHisto ? " et ton historique" : ""}. Demande-moi une explication, une analyse ou une routine complète — tu valides avant que quoi que ce soit change.</div><div class="coach-sugg"></div></div>`);
      const sugg = accueil.querySelector(".coach-sugg");
      [
        `Crée-moi une routine de ${(Etat.data.profil || {}).joursParSemaine || 3} jours adaptée à mon matériel`,
        "Analyse mes dernières séances",
        "Explique-moi la surcharge progressive",
        "Je stagne au développé couché, que faire ?",
      ].forEach((ex) => {
        const b = h(`<button class="chip" type="button">${esc(ex)}</button>`);
        b.addEventListener("click", () => envoyerQuestionCoach(ex));
        sugg.append(b);
      });
      bulleCoach("coach", accueil);
    }
  } else {
    // Message d'accueil + puces de réponse rapide, construites depuis le contexte
    // réel : si une séance est en cours, on propose d'agir dessus.
    bulleCoach("coach", repondreAssistant("aide"));
    const pub = h(`<div class="coach-brancher"><span class="small">Pour une vraie conversation et des routines sur mesure, branche une IA (Claude, OpenAI, Gemini ou ton relais).</span></div>`);
    const go = h(`<button class="linklike" type="button">Brancher une IA ›</button>`);
    go.addEventListener("click", () => { fermerCoach(); nav("set"); setTimeout(() => document.querySelector(".coach-cfg")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120); });
    pub.append(go);
    bulleCoach("coach", pub);
  }
  ajouterSuggestionsCoach();
  // Si le mode IA local est activé, on le prépare en tâche de fond.
  if (!cloud && Etat.data.reglages.coachIA) activerCoachIA(true);
  $("#coachInput")?.focus();
}

/**
 * Puces de réponse rapide, UNIQUEMENT pendant une séance active.
 *
 * Hors séance, le message d'accueil du coach (`repondreAssistant("aide")`)
 * affiche déjà ses propres suggestions : en rajouter ferait doublon. Pendant une
 * séance, en revanche, l'action la plus utile — remplacer l'exercice en cours,
 * alléger la séance — n'est pas dans ces suggestions génériques ; c'est elle
 * qu'on propose ici, construite depuis le contexte réel.
 */
function ajouterSuggestionsCoach() {
  if (!LIVE) return;
  const sugg = [];
  const ex = exoLiveCourantNom();
  if (ex) sugg.push([`Gêne — remplace ${ex}`, `Par quoi remplacer ${ex} ?`]);
  sugg.push(["Allège ma séance", "Comment rendre ma séance plus facile aujourd'hui ?"]);
  sugg.push(["Surcharge progressive", "Comment appliquer la surcharge progressive ?"]);
  const box = h(`<div class="coach-sugg"></div>`);
  sugg.forEach(([lab, q]) => {
    const b = h(`<button class="chip" type="button">${esc(lab)}</button>`);
    b.addEventListener("click", () => envoyerQuestionCoach(q));
    box.append(b);
  });
  const bulle = bulleCoach("coach", "");
  if (bulle) { bulle.innerHTML = ""; bulle.append(box); }
}

/** Nom de l'exercice courant d'une séance active, ou null hors séance. */
function exoLiveCourantNom() {
  if (!LIVE) return null;
  const seance = trouverSeance(LIVE.seanceId);
  if (!seance) return null;
  const e = seance.exercices[exoCourant(seance) - 1];
  const exo = e && getExercise(e.exerciceId);
  return exo ? exo.nom : null;
}

/**
 * Charge le mode IA (import dynamique + téléchargement du modèle).
 * @param {boolean} silencieux  n'affiche pas de bulle de progression
 */
async function activerCoachIA(silencieux = false) {
  let bulle = null, cible = null;
  if (!silencieux) {
    bulle = bulleCoach("coach ia", `<span class="coach-ia-tag">Coach IA</span><span class="coach-ia-txt">Préparation…</span>`);
    cible = bulle?.querySelector(".coach-ia-txt");
  }
  try {
    if (!COACH_IA) COACH_IA = await import("../integrations/coachIA.js");
    const modele = Etat.data.reglages.coachIAModele || COACH_IA.MODELE_DEFAUT;
    await COACH_IA.chargerModele(modele, (info) => {
      if (cible) cible.textContent = info.pct ? `${info.etape} ${info.pct}%` : info.etape;
    });
    if (cible) cible.textContent = "Coach IA prêt — pose ta question.";
  } catch (e) {
    if (cible) cible.textContent = "Impossible de charger le coach IA (connexion ou navigateur incompatible). Le coach déterministe fonctionne normalement.";
    else toast("Coach IA indisponible — le coach normal fonctionne.");
  }
}

/* ======================================================================
   NUTRITION (Open Food Facts + base locale)
   ====================================================================== */
const VERRE_ML = 250; // un verre standard
const REPAS = [
  ["petit_dej", "Petit déjeuner", mi(IC.coffee, "mi-orange")],
  ["dejeuner", "Déjeuner", mi(IC.utensils, "mi-blue")],
  ["collation", "Collation", mi(IC.apple, "mi-green")],
  ["diner", "Dîner", mi(IC.plate, "mi-indigo")],
];
let CUR_REPAS = null; // repas cible pour les ajouts (défaut : selon l'heure)
/** Carte d'hydratation interactive : verres bus vs objectif du jour. */
function carteEau(v, b, jour) {
  const cibleMl = Math.round((b.eau || 2) * 1000);
  const nbVerres = Math.max(1, Math.round(cibleMl / VERRE_ML));
  const bus = Etat.data.waterlog[jour] || 0;
  const busVerres = Math.round(bus / VERRE_ML);
  const pct = Math.min(100, Math.round((bus / cibleMl) * 100));
  const majEau = (delta) => {
    const n = Math.max(0, (Etat.data.waterlog[jour] || 0) + delta);
    if (n === 0) delete Etat.data.waterlog[jour]; else Etat.data.waterlog[jour] = n;
    Etat.sauver(); render();
  };
  const c = h(`<div class="card stack"></div>`);
  c.append(h(`<div class="spread"><h2 style="margin:0"><span class="mi mi-blue" style="width:20px;height:20px;vertical-align:-4px">${IC.droplet}</span> Hydratation</h2><span class="num muted">${(bus / 1000).toFixed(2)} / ${b.eau} L</span></div>`));
  c.append(h(`<div class="bar mw"><div style="width:${pct}%"></div></div>`));
  // Rangée de verres (remplis / vides)
  const verres = h(`<div class="glasses"></div>`);
  for (let i = 0; i < nbVerres; i++) verres.append(h(`<span class="glass${i < busVerres ? " on" : ""}" aria-hidden="true"></span>`));
  c.append(verres);
  const row = h(`<div class="row"></div>`);
  const bMoins = h(`<button aria-label="Retirer un verre" ${bus <= 0 ? "disabled" : ""}>−</button>`);
  const bVerre = h(`<button class="primary" style="flex:1" aria-label="Ajouter un verre de 25 cl">+ 25 cl</button>`);
  const bBout = h(`<button aria-label="Ajouter une bouteille de 50 cl">+ 50 cl</button>`);
  bMoins.addEventListener("click", () => majEau(-VERRE_ML));
  bVerre.addEventListener("click", () => majEau(VERRE_ML));
  bBout.addEventListener("click", () => majEau(2 * VERRE_ML));
  row.append(bMoins, bVerre, bBout);
  c.append(row);
  c.append(h(`<div class="hint">Objectif estimé ~${b.eau} L/jour (≈ ${nbVerres} verres). Bois régulièrement, davantage à l'entraînement et par forte chaleur.</div>`));
  v.append(c);
}
function vNutrition(v) {
  const p = Etat.data.profil;
  const b = calculerBesoins(p);
  const jour = todayStr();
  const log = Etat.data.foodlog[jour] || [];
  const tot = log.reduce((a, f) => ({ kcal: a.kcal + f.kcal, p: a.p + f.p, c: a.c + f.c, l: a.l + f.l }), { kcal: 0, p: 0, c: 0, l: 0 });

  v.append(h(`<h1 style="margin-bottom:12px">Nutrition</h1>`));
  // Objectifs du jour : anneau calories + barres de macros
  const restant = b.kcal - Math.round(tot.kcal);
  const cible = h(`<div class="card stack"></div>`);
  const top = h(`<div class="ringstat"></div>`);
  top.append(h(anneauSVG(Math.min(1, tot.kcal / (b.kcal || 1)), 96, `${Math.round(tot.kcal)}`)));
  const kinfo = h(`<div style="flex:1;min-width:0"></div>`);
  kinfo.append(h(`<div class="eyebrow" style="color:var(--accent-ink)">Calories</div>`));
  kinfo.append(h(`<div style="margin:2px 0"><b style="font-size:1.5rem">${Math.round(tot.kcal)}</b> <span class="muted">/ ${b.kcal} kcal</span></div>`));
  kinfo.append(h(`<span class="badge ${restant >= 0 ? "ok" : "amber"}">${restant >= 0 ? `${restant} kcal restantes` : `${-restant} kcal au-dessus`}</span>`));
  top.append(kinfo);
  cible.append(top);
  cible.append(macroBar("Protéines", tot.p, b.prot, "g", "mp"));
  cible.append(macroBar("Glucides", tot.c, b.gluc, "g", "mg"));
  cible.append(macroBar("Lipides", tot.l, b.lip, "g", "ml"));
  cible.append(h(`<div class="hint">Estimation Mifflin-St Jeor : BMR ${b.bmr} × activité ${b.facteur} = ~${b.tdee} kcal, ajusté selon ton objectif. On affine selon la tendance de poids sur 1–2 semaines, jamais sur une seule pesée. Ceci n'est pas un avis diététique médical.</div>`));
  v.append(cible);

  // Hydratation : suivi interactif (façon carte « Water Intake »)
  carteEau(v, b, jour);

  // Journal par repas + recherche
  if (!CUR_REPAS) { const hr = new Date().getHours(); CUR_REPAS = hr < 11 ? "petit_dej" : hr < 15 ? "dejeuner" : hr < 19 ? "collation" : "diner"; }
  const cj = h(`<div class="card stack"><h2 style="margin:0">Journal du jour</h2></div>`);
  const selRepas = h(`<div><div class="eyebrow" style="margin-bottom:6px">Ajouter à</div></div>`);
  const chipsRepas = h(`<div class="row" style="overflow-x:auto;flex-wrap:nowrap;scrollbar-width:none"></div>`);
  REPAS.forEach(([k, lab, ic]) => { const b = h(`<button class="chip ${CUR_REPAS === k ? "on" : ""}">${ic} ${lab}</button>`); b.addEventListener("click", () => { CUR_REPAS = k; render(); }); chipsRepas.append(b); });
  selRepas.append(chipsRepas);
  const rowSearch = h(`<div class="row"><input id="foodQ" aria-label="Rechercher un aliment" placeholder="Rechercher un aliment (riz, poulet…)" style="flex:1"><button class="primary" id="foodGo">OK</button></div>`);
  // Scanner d'abord, saisie manuelle ensuite : taper treize chiffres debout
  // dans une cuisine, personne ne le fait deux fois. Le repli reste visible —
  // sans caméra, sans permission ou sur un navigateur qui ne sait pas lire les
  // codes-barres, il n'y a jamais d'impasse.
  const rowScan = h(`<button id="codeScan" class="primary scan-cta">${mi(IC.camera, "mi-on")}Scanner un code-barres</button>`);
  const rowCode = h(`<div class="row"><input id="foodCode" aria-label="Code-barres produit" inputmode="numeric" placeholder="…ou saisis le code" style="flex:1"><button id="codeGo">Chercher</button></div>`);
  const scanBox = h(`<div id="scanBox"></div>`);
  const res = h(`<div id="foodRes"></div>`);
  const logBox = h(`<div id="foodLog" style="margin-top:6px"></div>`);
  cj.append(selRepas, rowSearch, rowScan, scanBox, rowCode, res, h(`<hr style="border:none;border-top:1px solid var(--line);margin:6px 0">`), logBox);
  v.append(cj);

  const ajouter = (f, g) => {
    const m = portion(f, g);
    (Etat.data.foodlog[jour] ||= []).push({ name: f.n, g, ...m, src: f.src, repas: CUR_REPAS });
    Etat.sauver(); render();
  };
  const afficherResultats = (list, quandVide) => {
    res.innerHTML = "";
    if (!list.length) { res.append(quandVide || etatVide(illustration("assiette"), "Aucun aliment trouvé", "Essaie un mot plus simple (« riz », « poulet ») ou saisis le code-barres du produit.")); return; }
    for (const f of list.slice(0, 12)) {
      const line = h(`<div class="exline"><div class="meta"><div class="nm small">${esc(f.n)} <span class="tag">${esc(f.src)}${f.note ? " · " + esc(f.note) : ""}</span></div>
        <div class="muted small">${f.kcal} kcal · P${f.p} · G${f.c} · L${f.l} /100 g</div></div>
        <button class="chip">+ Ajouter</button></div>`);
      line.querySelector("button").addEventListener("click", async () => {
        const g = await demanderTexte(`Quantité pour « ${f.n} »`, "100", { ok: "Ajouter", inputmode: "decimal", placeholder: "grammes" });
        if (g && +g > 0) ajouter(f, +g);
      });
      res.append(line);
    }
  };
  const dessinerLog = () => {
    const lg = Etat.data.foodlog[jour] || [];
    logBox.innerHTML = "";
    if (!lg.length) { logBox.append(h(`<div class="muted small">Rien d'enregistré aujourd'hui.</div>`)); return; }
    const groupes = [...REPAS, ["autre", "Autres", mi(IC.fork, "mi-muted")]];
    const cle = (f) => (REPAS.some((r) => r[0] === f.repas) ? f.repas : "autre");
    groupes.forEach(([k, lab, ic]) => {
      const items = lg.map((f, i) => ({ f, i })).filter(({ f }) => cle(f) === k);
      if (!items.length) return;
      const tot = items.reduce((a, { f }) => a + (f.kcal || 0), 0);
      logBox.append(h(`<div class="spread" style="margin:10px 0 4px"><span class="repas-h">${ic} ${lab}</span><span class="num muted small">${Math.round(tot)} kcal</span></div>`));
      items.forEach(({ f, i }) => {
        const line = h(`<div class="exline"><div class="meta"><div class="nm small">${esc(f.name)} <span class="muted">· ${f.g} g</span></div>
          <div class="muted small">${f.kcal} kcal · P${f.p}</div></div><button class="chip" aria-label="Retirer l'aliment">✕</button></div>`);
        line.querySelector("button").addEventListener("click", () => { Etat.data.foodlog[jour].splice(i, 1); Etat.sauver(); render(); });
        logBox.append(line);
      });
    });
  };
  dessinerLog();

  // Recherche : résultats locaux immédiats, puis complément en ligne. Pendant
  // l'attente réseau on montre des squelettes plutôt qu'un faux résultat.
  $("#foodGo", v).addEventListener("click", async () => {
    const q = $("#foodQ", v).value.trim(); if (!q) return;
    const liste = chercherFoods(q);
    if (liste.length) afficherResultats(liste);
    else { res.innerHTML = ""; res.append(squelettes(3)); }
    const attente = liste.length ? h(`<div class="muted small" style="margin-top:6px">Recherche en ligne…</div>`) : null;
    if (attente) res.append(attente);
    const enligne = await offRechercher(q);
    attente?.remove();
    afficherResultats([...liste, ...enligne], etatVide(
      navigator.onLine === false ? IC.cross : IC.search,
      navigator.onLine === false ? "Hors ligne" : "Aucun aliment trouvé",
      navigator.onLine === false
        ? "Seule la base locale est consultable sans connexion. Essaie un aliment courant (« riz », « poulet »)."
        : "Essaie un mot plus simple, ou saisis le code-barres du produit.",
      { erreur: navigator.onLine === false }));
  });
  /** Cherche le produit correspondant à un code (saisi ou scanné). */
  const chercherCode = async (brut) => {
    // Le code scanné est déjà normalisé ; le code TAPÉ ne l'est pas — un UPC-A
    // à 12 chiffres doit recevoir son zéro de tête, sinon Open Food Facts ne
    // trouve rien alors que le produit y est.
    const code = normaliserCode(brut) || String(brut || "").trim();
    if (!code) return;
    $("#foodCode", v).value = code;
    res.innerHTML = ""; res.append(squelettes(1));
    const prod = await parCodeBarres(code);
    afficherResultats(prod ? [prod] : [], etatVide(IC.cross, "Produit introuvable",
      navigator.onLine === false
        ? "La recherche par code-barres a besoin d'une connexion. Utilise la recherche par nom (base locale)."
        : "Ce code n'est pas dans Open Food Facts. Cherche le produit par son nom.",
      { erreur: true, action: { label: "Chercher par nom", onClick: () => $("#foodQ", v).focus() } }));
  };

  $("#codeGo", v).addEventListener("click", () => chercherCode($("#foodCode", v).value));
  $("#foodCode", v).addEventListener("keydown", (e) => {
    if (e.key === "Enter") chercherCode($("#foodCode", v).value);
  });
  $("#codeScan", v).addEventListener("click", () => ouvrirScanner(scanBox, chercherCode));

  v.append(h(`<div class="warn small">${mi(IC.cross, "mi-amber")}Repères nutritionnels généraux, pas un régime médical. En cas de pathologie, trouble alimentaire ou doute, consulte un professionnel de santé ou un diététicien.</div>`));
}

/* ---------- équilibre du corps ---------- */

/**
 * ÉQUILIBRE DU CORPS — ce qu'un total de volume ne montre jamais.
 *
 * L'écran savait dire combien on avait soulevé. Pas si l'on POUSSE deux fois
 * plus qu'on ne TIRE — la cause la plus banale d'épaules douloureuses chez
 * quelqu'un qui s'entraîne sérieusement depuis un an.
 *
 * Chaque axe est une barre à deux côtés : la position du curseur EST
 * l'information, on n'a pas besoin de lire un ratio pour voir un déséquilibre.
 */
function carteEquilibre(v, eq) {
  const c = h(`<div class="card stack"></div>`);
  c.append(h(`<div class="muted small">Compté en SÉRIES et non en kilos : un soulevé de terre lourd écraserait vingt séries de tirage, et l'app conclurait « bas du corps dominant » pour tout le monde.</div>`));

  if (!eq.mesurable) {
    c.append(h(`<div class="hint">${esc(eq.raison || "")}</div>`));
    v.append(c);
    return;
  }

  eq.axes.forEach((a) => {
    const bloc = h(`<div class="eq-axe"></div>`);
    const etat = a.mesurable
      ? (a.desequilibre === "equilibre" ? "on" : "off")
      : "na";
    bloc.append(h(`<div class="spread small"><b>${esc(a.nomG)}</b><b>${esc(a.nomD)}</b></div>`));
    // La barre : la position du curseur EST l'information.
    const pct = Math.round(a.part * 100);
    bloc.append(h(`<div class="eq-bar${a.mesurable ? "" : " na"}" role="img"
      aria-label="${esc(a.nomG)} ${a.gauche} séries, ${esc(a.nomD)} ${a.droite} séries">
      <i style="width:${pct}%"></i><span class="eq-mid" aria-hidden="true"></span></div>`));
    bloc.append(h(`<div class="spread" style="font-size:var(--fs-caption);margin-top:4px">
      <span class="muted"><b class="num">${a.gauche}</b> séries</span>
      <span class="${etat === "off" ? "eq-alerte" : "muted"}">${a.mesurable
        ? (a.desequilibre === "equilibre" ? "Équilibré" : "À corriger")
        : "Pas encore assez"}</span>
      <span class="muted"><b class="num">${a.droite}</b> séries</span></div>`));
    // Le message n'apparaît que s'il y a quelque chose à faire : répéter
    // « équilibré, rien à signaler » quatre fois de suite est du bruit.
    if (etat === "off" || !a.mesurable) {
      bloc.append(h(`<div class="hint eq-msg">${esc(a.message)}</div>`));
    }
    c.append(bloc);
  });
  v.append(c);
}

/* ---------- fiche muscle ---------- */

/**
 * FICHE MUSCLE — ce qu'on cherchait en touchant la planche anatomique.
 *
 * La carte colorait les zones travaillées et s'arrêtait là : on voyait que le
 * dos était vif sans pouvoir savoir POURQUOI. Volume, séries, exercices,
 * dernière sollicitation, tendance sur huit semaines — tout vient de
 * l'historique réel, rien n'est inventé.
 *
 * @param {string} muscle
 */
function ouvrirFicheMuscle(muscle) {
  const logs = Etat.data.logs || [];
  const f = ficheMuscle(muscle, logs, getExercise);
  const nom = MUSCLE_LABELS[muscle] || muscle;

  const sheet = h(`<div class="sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  const fermer = () => sheet.remove();
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0">${esc(nom)}</h2><button class="chip" id="mX">✕ Fermer</button></div>`));

  if (!f.mesurable) {
    inner.append(h(`<div class="notice small">${esc(f.raison || "")}</div>`));
    // Même sans historique, on peut proposer par quoi commencer.
    const propose = CATALOGUE.filter((e) => (e.musclesPrincipaux || []).includes(muscle)).slice(0, 5);
    if (propose.length) {
      inner.append(h(`<div class="eyebrow" style="margin-top:12px">Exercices pour ce muscle</div>`));
      propose.forEach((e) => {
        const b = h(`<button class="exline">${vignetteHTML(e, "sm")}
          <span class="meta"><span class="nm">${esc(e.nom)}</span></span>
          <span class="chev" aria-hidden="true">›</span></button>`);
        b.addEventListener("click", () => { fermer(); ouvrirDetail(e); });
        inner.append(b);
      });
    }
    sheet.querySelector("#mX").addEventListener("click", fermer);
    sheet.addEventListener("click", (e) => { if (e.target === sheet) fermer(); });
    document.body.append(sheet);
    return;
  }

  /* --- chiffres clés --- */
  const g = h(`<div class="statgrid" style="margin-top:4px"></div>`);
  g.append(statCard(IC.bars, uVolume(f.volume).replace(/ (kg|lb)$/, ""), `Volume ${uUnite()}`));
  g.append(statCard(IC.repeat, `${f.principaux}`, f.principaux > 1 ? "Séries directes" : "Série directe"));
  g.append(statCard(IC.layers, `${f.secondaires}`, "En secondaire"));
  g.append(statCard(IC.clock, f.dernierJours === 0 ? "Auj." : `${f.dernierJours} j`, "Dernière fois"));
  inner.append(g);

  /* --- huit semaines --- */
  const moy = moyenneHebdo(f.semaines);
  const t = tendance(f.semaines);
  const maxi = Math.max(1, ...f.semaines.map((x) => x.volume));
  const barres = f.semaines.map((x) => {
    const haut = Math.round((x.volume / maxi) * 100);
    const d = new Date(x.semaine + "T12:00:00");
    const lab = Number.isFinite(d.getTime()) ? `${d.getDate()}/${d.getMonth() + 1}` : "";
    return `<span class="mus-bar" title="Semaine du ${esc(lab)} : ${uVolume(x.volume)}">
      <i style="height:${Math.max(2, haut)}%"${x.volume ? "" : ' class="vide"'}></i></span>`;
  }).join("");
  const c2 = h(`<div class="card stack" style="margin-top:12px"></div>`);
  const mots = { hausse: "en hausse", baisse: "en baisse", stable: "stable", inconnu: "" };
  c2.append(h(`<div class="spread"><span class="eyebrow" style="margin:0">8 dernières semaines</span>
    ${t.sens !== "inconnu" ? `<span class="badge${t.sens === "hausse" ? " accent" : ""}">${esc(mots[t.sens])}${t.sens !== "stable" ? ` ${t.pct > 0 ? "+" : ""}${t.pct} %` : ""}</span>` : ""}</div>`));
  c2.append(h(`<div class="mus-graph" role="img" aria-label="Volume hebdomadaire des 8 dernières semaines">${barres}</div>`));
  // Moyenne sur les semaines ENTRAÎNÉES : diviser par le total écraserait le
  // chiffre de quelqu'un qui revient après une pause.
  c2.append(h(`<div class="muted small" style="margin-top:6px">Moyenne ${uVolume(moy)} par semaine entraînée · ${f.seances} séance${f.seances > 1 ? "s" : ""}</div>`));
  inner.append(c2);

  /* --- exercices qui l'ont travaillé --- */
  inner.append(h(`<div class="eyebrow" style="margin-top:14px">Ce qui l'a travaillé</div>`));
  f.exercices.slice(0, 8).forEach((x) => {
    const exo = getExercise(x.exerciceId);
    if (!exo) return;
    const b = h(`<button class="exline">${vignetteHTML(exo, "sm")}
      <span class="meta"><span class="nm">${esc(exo.nom)}</span>
        <span class="muted small">${x.series} série${x.series > 1 ? "s" : ""}${x.role === "principal" ? ` · ${uVolume(x.volume)}` : " · en secondaire"}</span></span>
      <span class="chev" aria-hidden="true">›</span></button>`);
    b.addEventListener("click", () => { fermer(); ouvrirDetail(exo); });
    inner.append(b);
  });

  const bCat = h(`<button class="secondary" style="width:100%;margin-top:12px">Voir tous les exercices de ce muscle</button>`);
  bCat.addEventListener("click", () => { fermer(); CAT_FILTRE = { ...filtresCatVides(), muscle }; CAT_FAVORIS_SEUL = false; nav("cat"); });
  inner.append(bCat);

  sheet.querySelector("#mX").addEventListener("click", fermer);
  sheet.addEventListener("click", (e) => { if (e.target === sheet) fermer(); });
  document.body.append(sheet);
}

/* ---------- photos de progression ---------- */

/** URL objets vivantes de l'écran courant. Chaque URL non révoquée retient le
 *  blob entier en mémoire : sur trente photos, c'est plusieurs dizaines de Mo. */
let PHOTO_URLS = /** @type {{liberer:()=>void}[]} */ ([]);
function libererPhotos() { PHOTO_URLS.forEach((u) => { try { u.liberer(); } catch (e) {} }); PHOTO_URLS = []; }

/** Vignette chargée depuis IndexedDB, avec repli si l'image a disparu. */
function vignette(fiche, { taille = 0, alt = "" } = {}) {
  const cadre = h(`<div class="ph-vig"${taille ? ` style="--ph-t:${taille}px"` : ""}></div>`);
  photoGet(fiche.id).then((blob) => {
    if (!cadre.isConnected) return;
    if (!blob) {
      // Le navigateur peut vider IndexedDB sous pression de stockage. Le dire
      // vaut mieux qu'une vignette cassée que personne ne s'explique.
      cadre.append(h(`<span class="ph-perdu hint">Image absente du stockage</span>`));
      return;
    }
    const u = urlObjet(blob); PHOTO_URLS.push(u);
    cadre.append(h(`<img src="${u.url}" alt="${esc(alt || `Photo du ${fiche.date}`)}" loading="lazy" decoding="async">`));
  });
  return cadre;
}

/** Date lisible : « 14 mars 2026 ». */
function dateLisible(iso) {
  const d = new Date(String(iso) + "T12:00:00");
  return Number.isFinite(d.getTime())
    ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : String(iso);
}

/**
 * PHOTOS DE PROGRESSION — la mesure que la balance ne donne pas.
 *
 * Le poids stagne pendant des semaines alors que le corps change. C'est le
 * moment exact où on arrête. Deux photos à trois mois d'écart règlent la
 * question mieux qu'une courbe.
 *
 * Trois règles tenues par cet écran :
 *  · les images ne quittent JAMAIS l'appareil, et c'est écrit ;
 *  · elles ne sont PAS dans la sauvegarde JSON, et c'est écrit aussi — les
 *    croire à l'abri et les perdre est pire que de ne pas en prendre ;
 *  · la comparaison propose la plus ancienne contre la plus récente, jamais
 *    deux photos de la même semaine où il n'y a rien à voir.
 */
function cartephotos(v) {
  libererPhotos();
  const photos = trierPhotos(Etat.data.photos || []);

  /* --- prise de vue --- */
  const c = h(`<div class="card stack"></div>`);
  const poseChoisie = { cle: PHOTO_POSE };
  const chips = h(`<div class="row" style="gap:6px;flex-wrap:wrap"></div>`);
  POSES.forEach((p) => {
    const b = h(`<button class="chip${p.cle === poseChoisie.cle ? " on" : ""}">${esc(p.nom)}</button>`);
    b.addEventListener("click", () => { PHOTO_POSE = p.cle; render(); });
    chips.append(b);
  });
  c.append(h(`<div class="eyebrow">Angle</div>`), chips);
  const aide = POSES.find((p) => p.cle === poseChoisie.cle);
  c.append(h(`<div class="hint">${esc(aide ? aide.aide : "")} · même lumière et même distance à chaque fois, sinon la comparaison ne veut rien dire.</div>`));

  const etat = h(`<div class="ph-etat muted small" role="status"></div>`);
  const ajouter = async (camera) => {
    const fichier = await choisirImage({ camera });
    if (!fichier) return;
    etat.textContent = "Traitement de l'image…";
    try {
      const r = await reduire(fichier);
      const fiche = nouvellePhoto({
        pose: PHOTO_POSE,
        poidsKg: poidsProche(Etat.data.metrics || [], new Date().toISOString().slice(0, 10)) ?? undefined,
        largeur: r.largeur, hauteur: r.hauteur, octets: r.octets,
      });
      const ok = await photoSet(fiche.id, r.blob);
      if (!ok) { etat.textContent = "Enregistrement impossible — le stockage du navigateur est peut-être plein."; return; }
      if (!Array.isArray(Etat.data.photos)) Etat.data.photos = [];
      Etat.data.photos.push(fiche);
      Etat.sauver();
      etat.textContent = "";
      render();
    } catch (e) {
      console.error("photo", e);
      etat.textContent = "Image illisible. Essaie une autre photo (JPEG ou PNG).";
    }
  };

  const barre = h(`<div class="row" style="gap:8px;margin-top:10px"></div>`);
  const bCam = h(`<button class="primary" style="flex:1">${mi(IC.camera, "mi-on")}Prendre une photo</button>`);
  const bGal = h(`<button class="btn ghost">Galerie</button>`);
  bCam.addEventListener("click", () => ajouter(true));
  bGal.addEventListener("click", () => ajouter(false));
  barre.append(bCam, bGal);
  c.append(barre, etat);
  c.append(h(`<div class="hint">Les photos restent sur cet appareil : elles ne sont envoyées nulle part.
    Elles ne sont pas incluses dans la sauvegarde JSON — enregistre-les à part si elles comptent.</div>`));
  v.append(c);

  if (!photos.length) {
    v.append(h(`<div class="card"><div class="empty-state">${illustration("courbe")}
      <b>Aucune photo pour l'instant</b>
      <span class="muted small">La balance stagne pendant que le corps change. Deux photos à trois mois d'écart le montrent — une courbe, non.</span>
    </div></div>`));
    return;
  }

  /* --- comparaison --- */
  const paire = paireComparaison(photos, PHOTO_POSE);
  if (paire) {
    const cc = h(`<div class="card stack"></div>`);
    cc.append(h(`<div class="eyebrow">Avant / après</div>`));
    const duo = h(`<div class="ph-duo"></div>`);
    [["Avant", paire.avant], ["Après", paire.apres]].forEach(([titre, f]) => {
      const col = h(`<div class="ph-col"></div>`);
      col.append(vignette(f, { alt: `${titre} — ${dateLisible(f.date)}` }));
      col.append(h(`<div class="ph-leg"><b>${esc(String(titre))}</b>
        <span class="muted">${esc(dateLisible(f.date))}${f.poidsKg != null ? ` · ${fr(uAff(f.poidsKg))} ${uUnite()}` : ""}</span></div>`));
      duo.append(col);
    });
    cc.append(duo);
    const mois = Math.round(paire.jours / 30.44);
    cc.append(h(`<div class="spread small" style="margin-top:8px">
      <span class="muted">${paire.jours} jours${mois >= 2 ? ` (~${mois} mois)` : ""}</span>
      ${paire.deltaPoids != null
        ? `<span class="badge${paire.deltaPoids === 0 ? "" : " accent"}">${paire.deltaPoids > 0 ? "+" : ""}${fr(uAff(paire.deltaPoids))} ${uUnite()}</span>`
        : `<span class="muted">poids non renseigné</span>`}</div>`));
    v.append(cc);
  } else {
    v.append(h(`<div class="hint">Encore une photo « ${esc((POSES.find((p) => p.cle === PHOTO_POSE) || POSES[0]).nom.toLowerCase())} » et la comparaison avant/après apparaît.</div>`));
  }

  /* --- toutes les photos --- */
  const cg = h(`<div class="card stack"></div>`);
  const st = resumeStockage(photos);
  cg.append(h(`<div class="spread"><div class="eyebrow" style="margin:0">Toutes les photos</div>
    <span class="muted small">${st.nombre} · ${esc(st.taille)}</span></div>`));
  if (st.alerte) cg.append(h(`<div class="warn small">${mi(IC.alert, "mi-amber")}Beaucoup de photos enregistrées (${esc(st.taille)}). Supprime les plus anciennes si l'app devient lente à ouvrir.</div>`));

  const grille = h(`<div class="ph-grille"></div>`);
  photos.slice().reverse().forEach((f) => {
    const item = h(`<figure class="ph-item"></figure>`);
    item.append(vignette(f, { taille: 96 }));
    const pose = POSES.find((p) => p.cle === f.pose);
    item.append(h(`<figcaption class="ph-cap">
      <b>${esc(dateLisible(f.date).replace(/ \d{4}$/, ""))}</b>
      <span class="muted">${esc(pose ? pose.nom : "")}${f.poidsKg != null ? ` · ${fr(uAff(f.poidsKg))} ${uUnite()}` : ""}</span></figcaption>`));
    const bSup = h(`<button class="chip ph-sup" aria-label="Supprimer la photo du ${esc(dateLisible(f.date))}">${IC.trash}</button>`);
    bSup.addEventListener("click", async () => {
      if (!confirm(`Supprimer la photo du ${dateLisible(f.date)} ? C'est définitif.`)) return;
      await photoDel(f.id);
      Etat.data.photos = (Etat.data.photos || []).filter((x) => x.id !== f.id);
      Etat.sauver(); render();
    });
    item.append(bSup);
    grille.append(item);
  });
  cg.append(grille);
  v.append(cg);

  // Contrôle de cohérence : une fiche sans image donnerait une vignette cassée
  // sans explication, et une image sans fiche occuperait le quota pour rien.
  photoCles().then((cles) => {
    const inc = incoherences(photos, cles.map(String));
    if (!inc.imagesSansFiche.length) return;
    if (!cg.isConnected) return;
    const b = h(`<button class="btn ghost" style="margin-top:8px">Nettoyer ${inc.imagesSansFiche.length} image(s) orpheline(s) · ${esc(formaterOctets(0))}</button>`);
    b.textContent = `Nettoyer ${inc.imagesSansFiche.length} image(s) sans fiche`;
    b.addEventListener("click", async () => {
      for (const k of inc.imagesSansFiche) await photoDel(k);
      render();
    });
    cg.append(b);
  });
}

/* ---------- scanner de code-barres ---------- */

/** Scan en cours, s'il y en a un. Un seul à la fois : deux flux caméra
 *  simultanés sont refusés par le navigateur et vident la batterie. */
/** Angle sélectionné pour la prise de vue et la comparaison. */
let PHOTO_POSE = "face";

let SCAN = /** @type {{arreter:()=>void, torche:(on:boolean)=>Promise<boolean>}|null} */ (null);

/** Coupe le scan en cours. Appelée à chaque rendu et à la fermeture de l'onglet :
 *  supprimer l'élément vidéo du DOM n'arrête PAS la caméra. */
function arreterScan() {
  if (SCAN) { try { SCAN.arreter(); } catch (e) { /* déjà arrêté */ } SCAN = null; }
}
addEventListener("pagehide", arreterScan);
addEventListener("visibilitychange", () => { if (document.hidden) arreterScan(); });

/**
 * Ouvre (ou referme) le panneau de scan dans `boite`.
 *
 * Le viseur n'est pas décoratif : un cadre trop large fait cadrer l'étiquette
 * entière, alors qu'un code-barres se lit de près. Le bandeau serré force la
 * bonne distance — c'est ce qui fait la différence entre « ça scanne » et « ça
 * ne marche pas ».
 *
 * @param {HTMLElement} boite
 * @param {(code:string)=>void} onCode
 */
function ouvrirScanner(boite, onCode) {
  if (boite.childElementCount) { arreterScan(); boite.textContent = ""; return; }

  const dispo = scannerDisponible();
  if (!dispo.ok) {
    boite.append(h(`<div class="hint">${esc(dispo.raison)}</div>`));
    /** @type {HTMLInputElement} */ (document.getElementById("foodCode"))?.focus();
    return;
  }

  const panneau = h(`<div class="scan">
    <video class="scan-vid" muted playsinline></video>
    <div class="scan-viseur" aria-hidden="true"><span></span></div>
    <div class="scan-jauge"><i></i></div>
  </div>`);
  const video = /** @type {HTMLVideoElement} */ (panneau.querySelector("video"));
  const jauge = /** @type {HTMLElement} */ (panneau.querySelector(".scan-jauge i"));
  const etat = h(`<div class="scan-etat muted small" role="status">Vise le code-barres du produit.</div>`);
  const barre = h(`<div class="row" style="margin-top:8px;gap:8px"></div>`);
  const bStop = h(`<button class="btn ghost" style="flex:1">Fermer</button>`);
  const bLampe = h(`<button class="btn ghost" aria-pressed="false" hidden>Lampe</button>`);
  barre.append(bStop, bLampe);

  const fermer = () => { arreterScan(); boite.textContent = ""; };
  bStop.addEventListener("click", fermer);

  SCAN = demarrerScan({
    video,
    onProgression: (p) => { jauge.style.width = Math.round(p * 100) + "%"; },
    onTorche: (ok) => { bLampe.hidden = !ok; },
    onErreur: (msg) => {
      boite.textContent = "";
      boite.append(h(`<div class="hint">${esc(msg)}</div>`));
      SCAN = null;
      /** @type {HTMLInputElement} */ (document.getElementById("foodCode"))?.focus();
    },
    onCode: (code) => {
      SCAN = null;
      try { navigator.vibrate?.(18); } catch (e) { /* pas de vibreur */ }
      jouer("record");
      // Le panneau se referme dès la lecture : garder la caméra ouverte pendant
      // qu'on lit la fiche produit n'apporte rien et consomme.
      boite.textContent = "";
      onCode(code);
    },
  });

  let lampe = false;
  bLampe.addEventListener("click", async () => {
    if (!SCAN) return;
    lampe = !lampe;
    const ok = await SCAN.torche(lampe);
    if (!ok) { lampe = false; bLampe.hidden = true; return; }
    bLampe.setAttribute("aria-pressed", String(lampe));
    bLampe.classList.toggle("accent", lampe);
  });

  boite.append(panneau, etat, barre);
}

/* ======================================================================
   PROGRÈS
   ====================================================================== */
/* ---------- graphique de progression interactif ---------- */
/** Mesures du corps traçables : celles qui ont au moins une valeur, avec leur unité d'affichage. */
function champsCorpsDispo() {
  const m = Etat.data.metrics || [];
  return CHAMPS_MESURES.filter((c) => m.some((x) => x && x[c.cle] != null))
    .map((c) => ({ cle: c.cle, type: c.type, label: `${c.label} (${c.type === "masse" ? uUnite() : c.type === "pct" ? "%" : uniteLongueur(uImp())})` }));
}
const PERIODES = [{ j: 0, label: "Tout" }, { j: 30, label: "30 j" }, { j: 90, label: "90 j" }, { j: 180, label: "6 mois" }];
/** @type {{type:string, exerciceId:string|null, metrique:string, champCorps:string, periode:number}} */
let PROG_CHART = { type: "exercice", exerciceId: null, metrique: "1rm", champCorps: "poidsKg", periode: 0 };

function carteProgression(v) {
  const logs = Etat.data.logs;
  const exos = [...new Set(logs.flatMap((l) => (l.exercices || []).map((e) => e.exerciceId)))];
  const CHAMPS_CORPS = champsCorpsDispo();
  const aCorps = CHAMPS_CORPS.length > 0;
  if (aCorps && !CHAMPS_CORPS.some((c) => c.cle === PROG_CHART.champCorps)) PROG_CHART.champCorps = CHAMPS_CORPS[0].cle;
  if (!exos.length && !aCorps) return; // rien à tracer pour l'instant
  if (PROG_CHART.type === "exercice" && !exos.length) PROG_CHART.type = "corps";
  if (!PROG_CHART.exerciceId || !exos.includes(PROG_CHART.exerciceId)) PROG_CHART.exerciceId = exos[0] || null;

  const card = h(`<div class="card stack"><h2 style="margin:0">Progression</h2></div>`);
  // Les sélecteurs héritaient de `width:100%` : quatre blocs gris empilés sur
  // quatre lignes, qui écrasaient la courbe. En puces, ils tiennent sur une ou
  // deux lignes et redeviennent ce qu'ils sont — des filtres, pas le sujet.
  const ctr = h(`<div class="selrow"></div>`);
  const zone = h(`<div></div>`);
  card.append(ctr, zone);
  v.append(card);

  const opt = (val, lab, sel) => `<option value="${esc(String(val))}"${sel ? " selected" : ""}>${esc(lab)}</option>`;

  const rebuild = () => {
    ctr.innerHTML = "";
    // sélecteur de type (si les deux existent)
    if (exos.length && aCorps) {
      const selType = h(`<select class="selchip" aria-label="Type">${opt("exercice", "Exercice", PROG_CHART.type === "exercice")}${opt("corps", "Corps", PROG_CHART.type === "corps")}</select>`);
      selType.addEventListener("change", () => { PROG_CHART.type = selType.value; rebuild(); });
      ctr.append(selType);
    }
    if (PROG_CHART.type === "exercice") {
      const selExo = h(`<select class="selchip" aria-label="Exercice">${exos.map((id) => opt(id, nomExo(id), id === PROG_CHART.exerciceId)).join("")}</select>`);
      selExo.addEventListener("change", () => { PROG_CHART.exerciceId = selExo.value; rebuild(); });
      // Seules les métriques que l'exercice MESURE : distance et vitesse pour
      // une course, maintien pour une planche, 1RM et tonnage pour un développé.
      const mets = metriquesPour(mesuresExercice(getExercise(PROG_CHART.exerciceId)));
      if (!mets.includes(PROG_CHART.metrique)) PROG_CHART.metrique = mets[0];
      const defs = mets.map((k) => METRIQUES_EXO.find((m) => m.cle === k)).filter(Boolean);
      const selMet = h(`<select class="selchip" aria-label="Métrique">${defs.map((m) => opt(m.cle, m.label, m.cle === PROG_CHART.metrique)).join("")}</select>`);
      selMet.addEventListener("change", () => { PROG_CHART.metrique = selMet.value; rebuild(); });
      ctr.append(selExo, selMet);
    } else {
      const selC = h(`<select class="selchip" aria-label="Mesure">${CHAMPS_CORPS.map((c) => opt(c.cle, c.label, c.cle === PROG_CHART.champCorps)).join("")}</select>`);
      selC.addEventListener("change", () => { PROG_CHART.champCorps = selC.value; rebuild(); });
      ctr.append(selC);
    }
    const selP = h(`<select class="selchip" aria-label="Période">${PERIODES.map((p) => opt(p.j, p.label, p.j === PROG_CHART.periode)).join("")}</select>`);
    selP.addEventListener("change", () => { PROG_CHART.periode = +selP.value; rebuild(); });
    ctr.append(selP);
    redraw();
  };

  const redraw = () => {
    let points, label;
    if (PROG_CHART.type === "exercice" && PROG_CHART.exerciceId) {
      points = serieExercice(logs, PROG_CHART.exerciceId, PROG_CHART.metrique);
      const met = METRIQUES_EXO.find((m) => m.cle === PROG_CHART.metrique);
      label = `${nomExo(PROG_CHART.exerciceId)} · ${met ? met.label : ""}`;
    } else {
      points = serieCorps(Etat.data.metrics, PROG_CHART.champCorps);
      const c = CHAMPS_CORPS.find((x) => x.cle === PROG_CHART.champCorps);
      label = c ? c.label : "";
    }
    points = filtrerDepuis(points, PROG_CHART.periode);
    // Livres : on convertit les séries exprimées en kg (charges, volume, poids
    // du corps) au moment du tracé — les données restent en kg.
    // Seules les masses se convertissent : ni les reps, ni les km, ni les secondes.
    const metDef = METRIQUES_EXO.find((m) => m.cle === PROG_CHART.metrique);
    const enKg = PROG_CHART.type === "exercice" && PROG_CHART.exerciceId
      ? !!metDef && metDef.unite === "kg" : champMesure(PROG_CHART.champCorps)?.type === "masse";
    if (uImp() && enKg) {
      points = points.map((pt) => ({ ...pt, v: PROG_CHART.metrique === "volume" && PROG_CHART.type === "exercice" ? Math.round(pt.v * 2.20462) : uAff(pt.v) }));
      label = label.replace(/\(kg\)/g, "(lb)").replace(/\bkg\b/g, "lb");
    }
    // Longueurs en pouces (le libellé porte déjà « in ») ; données en cm.
    if (PROG_CHART.type !== "exercice" && champMesure(PROG_CHART.champCorps)?.type === "longueur" && uImp()) {
      points = points.map((pt) => ({ ...pt, v: longueurAffichage(pt.v, true) }));
    }
    zone.innerHTML = svgLine(points, label);
    if (PROG_CHART.type === "exercice" && PROG_CHART.exerciceId) zone.append(listeMensuelle(PROG_CHART.exerciceId, PROG_CHART.metrique));
  };

  rebuild();
}

/** Valeur d'une métrique d'exercice, dans son unité (kg/lb, km, km/h, min, s). */
function texteMetrique(cle, v) {
  const n = Number(v) || 0;
  if (cle === "1rm" || cle === "poids") return uCharge(n);
  if (cle === "volume") return uVolume(n);
  if (cle === "reps") return `${Math.round(n)} reps`;
  if (cle === "distance") return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}\u00A0km`;
  if (cle === "vitesse") return texteVitesse(n);
  if (cle === "dureeTotale") return `${Math.round(n)}\u00A0min`;
  if (cle === "maintien") return texteDuree(n);
  return String(n);
}
/**
 * Progression MOIS PAR MOIS sous la courbe : meilleure valeur (ou total) et
 * écart au mois précédent. La courbe montre la forme, ce tableau répond à la
 * question qu'on se pose vraiment : « est-ce que j'avance ce mois-ci ? ».
 */
function listeMensuelle(exId, metrique) {
  const mois = progressionMensuelle(Etat.data.logs || [], exId, metrique).slice(-6).reverse();
  const box = h(`<div class="mois-liste"></div>`);
  if (!mois.length) return box;
  const def = METRIQUES_EXO.find((m) => m.cle === metrique);
  box.append(h(`<div class="eyebrow">Mois par mois · ${def && def.agregat === "somme" ? "total du mois" : "meilleure valeur du mois"}</div>`));
  mois.forEach((m) => {
    const d = m.delta;
    const ecart = d == null ? `<span class="ml-d muted">premier mois</span>`
      : d === 0 ? `<span class="ml-d muted">stable</span>`
      : `<span class="ml-d ${d > 0 ? "up" : "down"}">${d > 0 ? "+" : "−"}${texteMetrique(metrique, Math.abs(d))}${m.deltaPct != null ? ` (${d > 0 ? "+" : "−"}${Math.abs(m.deltaPct)}\u00A0%)` : ""}</span>`;
    box.append(h(`<div class="ml-row"><span class="ml-m">${esc(m.label)}<span class="muted"> · ${m.seances} séance${m.seances > 1 ? "s" : ""}</span></span><b class="num">${texteMetrique(metrique, m.v)}</b>${ecart}</div>`));
  });
  return box;
}

/* ---------- Charge d'entraînement : tonnage, volume, intensité ---------- */
/** @type {{unite:"semaine"|"mois", mesure:string}} */
let CHARGE_VUE = { unite: "semaine", mesure: "tonnage" };
function carteChargeEntrainement(b) {
  const logs = Etat.data.logs || [];
  const mois = CHARGE_VUE.unite === "mois";
  const per = chargeParPeriode(logs, CHARGE_VUE.unite, mois ? 6 : 8);
  // Chiffres et écarts : période en cours vs MÊME STADE de la précédente
  // (1–7 nov. contre 1–7 oct.), sinon chaque début de mois affiche « −70 % ».
  const cmp = comparaisonMemeStade(logs, CHARGE_VUE.unite);
  const cur = cmp.actuelle, prev = cmp.precedente;
  const chips = h(`<div class="row ct-chips" role="group" aria-label="Période"></div>`);
  [["semaine", "Semaine"], ["mois", "Mois"]].forEach(([val, lab]) => {
    const c = h(`<button class="chip ${CHARGE_VUE.unite === val ? "on" : ""}" aria-pressed="${CHARGE_VUE.unite === val}">${lab}</button>`);
    c.addEventListener("click", () => { CHARGE_VUE.unite = /** @type {"semaine"|"mois"} */ (val); render(); });
    chips.append(c);
  });
  b.append(chips);
  const quand = mois ? "ce mois-ci" : "cette semaine";
  const varTxt = (avant, apres) => {
    const pct = variationPct(avant, apres);
    return pct == null ? "" : `${pct > 0 ? "+" : pct < 0 ? "−" : "±"}${Math.abs(pct)}\u00A0%`;
  };
  const relVar = cur.intensiteRelPct != null && prev && prev.intensiteRelPct != null
    ? `${cur.intensiteRelPct - prev.intensiteRelPct >= 0 ? "+" : "−"}${Math.abs(cur.intensiteRelPct - prev.intensiteRelPct)}\u00A0pts` : "";
  const trio = h(`<div class="ct-trio">
    <div class="ct"><span class="ct-lab">Tonnage</span><b class="ct-val num">${cur.tonnageKg ? uVolume(cur.tonnageKg) : "—"}</b><span class="ct-sub">${esc(varTxt(prev && prev.tonnageKg, cur.tonnageKg)) || "charge × reps"}</span></div>
    <div class="ct"><span class="ct-lab">Volume</span><b class="ct-val num">${cur.series} série${cur.series > 1 ? "s" : ""}</b><span class="ct-sub">${cur.reps} reps${prev && varTxt(prev.series, cur.series) ? ` · ${esc(varTxt(prev.series, cur.series))}` : ""}</span></div>
    <div class="ct"><span class="ct-lab">Intensité</span><b class="ct-val num">${cur.intensiteRelPct != null ? `${cur.intensiteRelPct}\u00A0% 1RM` : "—"}</b><span class="ct-sub">${cur.intensiteKgRep != null ? `${uCharge(cur.intensiteKgRep)}/rép.` : "aucune charge"}${relVar ? ` · ${esc(relVar)}` : ""}</span></div>
  </div>`);
  const jj = (d) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", ...(mois ? {} : { timeZone: "UTC" }) });
  const finP = new Date(cmp.finPrec.getTime() - 1);
  b.append(h(`<div class="small muted">${cur.seances} séance${cur.seances > 1 ? "s" : ""} ${quand}${cur.distanceM ? ` · cardio ${texteDistance(cur.distanceM)} en ${texteDuree(cur.dureeCardioSec)}` : ""}<br>Écarts comparés au même stade : ${jj(cmp.debutPrec)} → ${jj(finP)}</div>`));
  b.append(trio);
  // Une mesure à la fois sur l'histogramme : trois séries d'échelles
  // différentes sur un même graphique ne se lisent pas.
  const mesures = [["tonnage", "Tonnage"], ["series", "Séries"], ["intensite", "Intensité"]];
  const chM = h(`<div class="row ct-chips" role="group" aria-label="Mesure du graphique"></div>`);
  mesures.forEach(([val, lab]) => {
    const c = h(`<button class="chip ${CHARGE_VUE.mesure === val ? "on" : ""}" aria-pressed="${CHARGE_VUE.mesure === val}">${lab}</button>`);
    c.addEventListener("click", () => { CHARGE_VUE.mesure = val; render(); });
    chM.append(c);
  });
  b.append(chM);
  const court = (p) => (mois ? p.label.split(" ")[0] : p.label);
  const barres = per.map((p) => ({
    x: court(p),
    v: CHARGE_VUE.mesure === "series" ? p.series
      : CHARGE_VUE.mesure === "intensite" ? (p.intensiteRelPct || 0)
      : (uImp() ? Math.round(p.tonnageKg * 2.20462) : p.tonnageKg),
  }));
  const titre = CHARGE_VUE.mesure === "series" ? `Séries par ${mois ? "mois" : "semaine"}`
    : CHARGE_VUE.mesure === "intensite" ? "Intensité moyenne (% du 1RM estimé)"
    : `Tonnage par ${mois ? "mois" : "semaine"} (${uUnite()})`;
  b.append(h(`<div class="card">${barres.some((x) => x.v) ? svgBars(barres, titre) : `<div class="muted small">Aucune série chargée sur la période.</div>`}</div>`));
  b.append(h(`<div class="hint">${esc(DEFINITIONS_CHARGE.tonnage)}<br>${esc(DEFINITIONS_CHARGE.volume)}<br>${esc(DEFINITIONS_CHARGE.intensite)}</div>`));
}

/* ---------- Calculateurs de force ----------
   Sept formules plutôt qu'une : elles ne s'accordent pas, et donner un seul
   chiffre laisserait croire à une précision qui n'existe pas. On affiche donc
   le consensus, la fourchette, et de quoi programmer réellement ses charges. */
let FORCE = { charge: "", reps: "", cible: "", barre: "20", rpe: "8", repsRpe: "5" };

function carteForce(v) {
  const nb = (x) => { const n = parseFloat(String(x).replace(",", ".")); return Number.isFinite(n) ? n : 0; };
  const rmCourant = () => estimer1RMComplet(nb(FORCE.charge), nb(FORCE.reps));

  /* --- 1. Point de départ : une série réelle, reprise de l'historique --- */
  const c1 = h(`<div class="card stack"></div>`);
  c1.append(h(`<div class="eyebrow">Ta série de référence</div>`));
  const meilleures = meilleuresSeries(Etat.data.logs || [], getExercise, 8);
  if (meilleures.length) {
    c1.append(h(`<div class="muted small">Tes meilleures séries enregistrées — touche pour calculer dessus.</div>`));
    const ch = h(`<div class="row scrollx" style="margin-top:8px"></div>`);
    meilleures.forEach((m) => {
      const b = h(`<button class="chip">${esc(m.nom)} · ${fr(m.kg)}×${m.reps}</button>`);
      b.addEventListener("click", () => { FORCE.charge = String(m.kg); FORCE.reps = String(m.reps); tout(); });
      ch.append(b);
    });
    c1.append(ch);
  }
  const l1 = h(`<div class="champs">
  </div>`);
  const inC = h(`<label class="champ">Charge (kg)<input inputmode="decimal" placeholder="100" value="${esc(FORCE.charge)}"></label>`);
  const inR = h(`<label class="champ">Répétitions<input inputmode="numeric" placeholder="5" value="${esc(FORCE.reps)}"></label>`);
  l1.append(inC, inR); c1.append(l1);
  v.append(c1);

  /* --- 1 bis. Le rang de force : « je suis où ? » --- */
  carteRang(v, meilleures);

  /* --- 2. 1RM : consensus, fourchette, détail des sept formules --- */
  const c2 = h(`<div class="card stack"></div>`);
  v.append(c2);

  /* --- 3. Charges de travail par objectif --- */
  const c3 = h(`<div class="card stack"></div>`);
  v.append(c3);

  /* --- 4. Table des pourcentages --- */
  const c4 = h(`<div class="card stack"></div>`);
  v.append(c4);

  /* --- 5. Charge à un RPE donné --- */
  const c5 = h(`<div class="card stack"></div>`);
  v.append(c5);

  /* --- 6. Chargement de la barre --- */
  const c6 = h(`<div class="card stack"></div>`);
  v.append(c6);

  /* --- 7. Équilibre entre mouvements --- */
  const eq = equilibreForce(meilleures);
  if (eq.length) {
    const c7 = h(`<div class="card stack"></div>`);
    c7.append(h(`<div class="eyebrow">Équilibre entre mouvements</div>`));
    c7.append(h(`<div class="muted small">Repères indicatifs de force athlétique, calculés sur tes meilleures séries.</div>`));
    eq.forEach((r) => {
      const coul = r.verdict === "équilibré" ? "var(--accent)" : r.verdict === "en retard" ? "var(--amber)" : "var(--ink-soft)";
      c7.append(h(`<div class="spread small" style="margin-top:8px"><span>${esc(r.nom)}</span>
        <span><b class="num" style="color:${coul}">${fr(r.ratio)}</b> <span class="muted">cible ${fr(r.cible)} · ${esc(r.verdict)}</span></span></div>`));
    });
    v.append(c7);
  }

  /* --- rendu, recalculé à chaque frappe --- */
  const tout = () => {
    const r = rmCourant();
    const rm = r.consensus;

    c2.innerHTML = "";
    c2.append(h(`<div class="eyebrow">Maximum estimé (1RM)</div>`));
    if (!r.valide) {
      c2.append(h(`<div class="muted small">Saisis une charge et un nombre de répétitions, ou touche une de tes séries ci-dessus.</div>`));
    } else {
      c2.append(h(`<div class="out-big"><b class="num">${fr(rm)} kg</b><span>Consensus de ${r.detail.length} formules</span></div>`));
      c2.append(h(`<div class="muted small">Fourchette ${fr(r.min)} – ${fr(r.max)} kg · écart ${fr(r.ecartPct)} %. ${nb(FORCE.reps)} rép. à ${nb(FORCE.charge)} kg ≈ ${fr(pctPourReps(nb(FORCE.reps)))} % du maximum.</div>`));
      if (r.avertissement) c2.append(h(`<div class="warn small" style="margin-top:8px">${esc(r.avertissement)}</div>`));
      const det = h(`<div class="stack" style="margin-top:10px"></div>`);
      det.append(h(`<div class="eyebrow">Détail par formule</div>`));
      r.detail.forEach((d) => det.append(h(`<div class="spread small"><span class="muted" title="${esc(d.formule)}">${esc(d.nom)}</span><b class="num">${fr(d.kg)} kg</b></div>`)));
      c2.append(det);
      c2.append(h(`<div class="hint">Une estimation n'est pas une mesure. Ne teste jamais un vrai maximum en reprise, seul, ou sans échauffement complet.</div>`));
    }

    c3.innerHTML = "";
    c3.append(h(`<div class="eyebrow">Charges de travail par objectif</div>`));
    if (!rm) c3.append(h(`<div class="muted small">En attente d'une série de référence.</div>`));
    else chargesParZone(rm).forEach((z) => {
      c3.append(h(`<div class="zone-force">
        <div class="spread"><b>${esc(z.nom)}</b><b class="num zf-kg">${fr(z.kgMin)} – ${fr(z.kgMax)} kg</b></div>
        <div class="spread small muted"><span>${z.reps[0]}–${z.reps[1]} répétitions · repos ${formatRepos(z.reposSec)}</span></div>
        <div class="muted" style="font-size:var(--fs-caption)">${esc(z.but)}</div></div>`));
    });

    c4.innerHTML = "";
    c4.append(h(`<div class="eyebrow">Table des pourcentages</div>`));
    if (!rm) c4.append(h(`<div class="muted small">En attente d'une série de référence.</div>`));
    else {
      const t = h(`<div class="pct-table"></div>`);
      t.append(h(`<div class="pct-row head"><span>%</span><span>Charge</span><span>Reps</span></div>`));
      tableComplete(rm).forEach((x) => t.append(h(`<div class="pct-row"><span>${fr(x.pct)} %</span><b class="num">${fr(x.kg)} kg</b><span class="muted">${x.reps}</span></div>`)));
      c4.append(t);
    }

    c5.innerHTML = "";
    c5.append(h(`<div class="eyebrow">Charge à un RPE donné</div>`));
    c5.append(h(`<div class="muted small">RPE 8 = « il me restait 2 répétitions ». La série équivaut alors à une série à l'échec de reps + réserve.</div>`));
    const lr = h(`<div class="champs" style="margin-top:8px"></div>`);
    const inRR = h(`<label class="champ">Répétitions<input inputmode="numeric" value="${esc(FORCE.repsRpe)}"></label>`);
    const inRP = h(`<label class="champ">RPE (1–10)<input inputmode="decimal" value="${esc(FORCE.rpe)}"></label>`);
    lr.append(inRR, inRP); c5.append(lr);
    inRR.querySelector("input").addEventListener("input", (e) => { FORCE.repsRpe = e.target.value; tout(); });
    inRP.querySelector("input").addEventListener("input", (e) => { FORCE.rpe = e.target.value; tout(); });
    const kgRpe = rm ? chargePourRPE(rm, nb(FORCE.repsRpe), nb(FORCE.rpe)) : 0;
    c5.append(h(kgRpe
      ? `<div class="out-big" style="margin-top:8px"><b class="num">${fr(kgRpe)} kg</b><span>${nb(FORCE.repsRpe)} rép. @ RPE ${fr(FORCE.rpe)} · ${fr(pctPourRPE(nb(FORCE.repsRpe), nb(FORCE.rpe)))} % du max</span></div>`
      : `<div class="muted small" style="margin-top:8px">Renseigne un maximum, des répétitions et un RPE entre 1 et 10.</div>`));

    c6.innerHTML = "";
    c6.append(h(`<div class="eyebrow">Chargement de la barre</div>`));
    const l6 = h(`<div class="champs"></div>`);
    const inCible = h(`<label class="champ">Charge visée<input inputmode="decimal" placeholder="${rm ? Math.round(rm * 0.8) : 100}" value="${esc(FORCE.cible)}"></label>`);
    const inBarre = h(`<label class="champ">Barre (kg)<input inputmode="decimal" value="${esc(FORCE.barre)}"></label>`);
    l6.append(inCible, inBarre); c6.append(l6);
    inCible.querySelector("input").addEventListener("input", (e) => { FORCE.cible = e.target.value; tout(); });
    inBarre.querySelector("input").addEventListener("input", (e) => { FORCE.barre = e.target.value; tout(); });
    const cible = nb(FORCE.cible) || (rm ? arrondirForce(rm * 0.8) : 0);
    if (cible > 0) {
      const d = disquesParCote(cible, nb(FORCE.barre) || 20);
      c6.append(h(`<div class="muted small" style="margin-top:8px">${d.possible
        ? `Par côté : <b>${d.parCote.length ? d.parCote.map(fr).join(" + ") + " kg" : "aucun disque"}</b>${d.exact ? "" : ` — au plus proche : <b>${fr(d.totalReel)} kg</b>`}`
        : esc(d.message || "Charge inférieure à la barre.")}</div>`));
      const ech = echauffement(d.totalReel || cible, nb(FORCE.barre) || 20);
      if (ech.length) {
        c6.append(h(`<div class="eyebrow" style="margin-top:12px">Montée en charge</div>`));
        const row = h(`<div class="row" style="flex-wrap:wrap;gap:6px;margin-top:6px"></div>`);
        ech.forEach((e2) => row.append(h(`<span class="pill">${fr(e2.kg)} kg × ${e2.reps}</span>`)));
        c6.append(row);
      }
    }
  };

  inC.querySelector("input").addEventListener("input", (e) => { FORCE.charge = e.target.value; tout(); });
  inR.querySelector("input").addEventListener("input", (e) => { FORCE.reps = e.target.value; tout(); });
  tout();
}

/**
 * Carte « Rang de force ».
 *
 * Une application à classement répond à « je suis où ? » avec les autres
 * utilisateurs. Ici il n'y en a pas : la réponse vient des standards de force
 * exprimés en multiples du poids de corps.
 *
 * Deux garde-fous d'affichage, sans lesquels ça décourage au lieu d'aider :
 * le niveau suivant est TOUJOURS chiffré en kilos, et l'app se tait quand elle
 * ne peut pas se prononcer — plutôt que de juger sur des données absentes.
 */
function carteRang(v, meilleures) {
  const c = h(`<div class="card stack"></div>`);
  v.append(c);

  /** Redessine la carte sur place — le calibrage doit se voir immédiatement,
   *  sans re-rendre l'écran entier (ni perdre la position de défilement). */
  function dessiner() {
    c.textContent = "";
    const r = rangForce(meilleures, Etat.data.profil || {}, seuilsPerso());
    c.append(h(`<div class="eyebrow">Ton rang de force</div>`));

    if (!r.mesurable) {
      c.append(h(`<div class="muted small">${esc(r.raison || "")}</div>`));
      return;
    }

    const nv = NIVEAUX[r.rang - 1];
    c.append(h(`<div class="rang-tete">
      ${medaille({ rang: r.rang, titre: `Niveau ${nv.nom}`, taille: 58 })}
      <span class="rang-tete-txt"><b>${esc(nv.nom)}</b>
        <span class="muted small">${esc(nv.quoi)}</span></span></div>`));
    // L'échelle complète, pour situer le niveau atteint parmi les cinq.
    const ech = h(`<div class="rang-echelle" role="img" aria-label="Niveau ${esc(nv.nom)}, ${r.rang} sur ${NIVEAUX.length}"></div>`);
    NIVEAUX.forEach((n, i) => ech.append(h(`<span class="rang-cran${i < r.rang ? " on" : ""}"></span>`)));
    c.append(ech);

    r.mouvements.forEach((m) => {
      const bloc = h(`<div class="rang-mvt"></div>`);
      bloc.append(h(`<div class="spread small"><b>${esc(m.nom)}</b>
        <span><b class="num">${fr(m.kg)} kg</b> <span class="muted">${fr(m.ratio)} × PC</span></span></div>`));
      bloc.append(h(`<div class="bar"><div style="width:${Math.round(m.progression * 100)}%"></div></div>`));
      bloc.append(h(`<div class="spread" style="font-size:var(--fs-caption);margin-top:4px">
        <span class="muted">${esc(m.niveau)}${m.perso ? " · tes seuils" : ""}</span>
        ${m.prochain
          ? `<span class="muted">${esc(m.prochain.nom)} à ${fr(m.prochain.kg)} kg · encore ${fr(m.prochain.manque)} kg</span>`
          : `<span class="badge accent">Niveau maximal ✓</span>`}</div>`));
      c.append(bloc);
    });
    c.append(h(`<div class="hint">${r.perso
      ? "Seuils ajustés par toi pour les mouvements marqués « tes seuils ». Les autres suivent les repères publiés."
      : esc(AVERT_RANG)}</div>`));
  }

  dessiner();
  section(v, "rang-calib", "Ajuster les seuils", (b) => calibrageRang(b, dessiner),
    { resume: Object.keys(seuilsPerso()).length ? "personnalisés" : "repères publiés" });
}

/** Seuils saisis à la main, toujours un objet (jamais undefined). */
function seuilsPerso() {
  const rg = /** @type {any} */ (Etat.data.reglages || {});
  if (!rg.standardsForce || typeof rg.standardsForce !== "object") rg.standardsForce = {};
  return rg.standardsForce;
}

/**
 * CALIBRAGE DU RANG — les repères publiés ne sont qu'un point de départ.
 *
 * Les standards de force varient de 10 à 15 % d'une source à l'autre, et selon
 * la fédération, la profondeur de squat, l'équipement. Plutôt que d'imposer MA
 * table, l'app laisse écrire la tienne : quatre nombres par mouvement, en
 * multiples du poids de corps.
 *
 * Trois précautions, sinon ça produit des rangs absurdes sans rien dire :
 *  · les seuils doivent MONTER (sinon un niveau devient inatteignable) ;
 *  · l'équivalent en kilos s'affiche en direct, parce que personne ne raisonne
 *    en « 1,75 × PC » — on raisonne en « 140 kg » ;
 *  · une saisie refusée ne casse rien : le mouvement reste sur son repère publié
 *    et le message dit pourquoi.
 */
function calibrageRang(v, apresChangement) {
  const c = h(`<div class="card stack"></div>`);
  const profil = Etat.data.profil || {};
  const pc = Number(profil.poidsKg) || 0;
  const col = profil.sexe === "F" ? "F" : "H";
  const perso = seuilsPerso();

  c.append(h(`<div class="muted small">Quatre seuils par mouvement, en multiples de ton poids de corps.
    Ils remplacent les repères publiés — laisse vide pour revenir à ceux-ci.</div>`));
  if (!pc) c.append(h(`<div class="hint">Renseigne ton poids de corps dans le profil pour voir l'équivalent en kilos.</div>`));

  for (const [id, std] of Object.entries(STANDARDS)) {
    const eff = standardsEffectifs(perso)[id][col];
    const bloc = h(`<div class="calib-mvt"></div>`);
    const surTitre = h(`<div class="spread small"><b>${esc(std.nom)}</b></div>`);
    const etat = h(`<span class="muted" style="font-size:var(--fs-caption)">${perso[id] && perso[id][col] ? "tes seuils" : "repères publiés"}</span>`);
    surTitre.append(etat);
    bloc.append(surTitre);

    const grille = h(`<div class="calib-grille"></div>`);
    /** @type {HTMLInputElement[]} */
    const champs = [];
    /** @type {HTMLElement[]} */
    const kgs = [];
    // Un seuil par niveau à ATTEINDRE : novice → élite. Le débutant est le
    // niveau de départ, il n'a pas de seuil d'entrée.
    NIVEAUX.slice(1).forEach((n, i) => {
      // Libellé et équivalent en kilos sur la MÊME ligne : en trois lignes par
      // champ, les quatre mouvements faisaient 1 800 px de haut pour seize
      // nombres. Le kilo reste à côté du niveau, là où on le cherche.
      const lab = h(`<label class="champ calib-champ"><span class="calib-t">${esc(n.nom)}<span class="calib-kg"></span></span></label>`);
      const inp = /** @type {HTMLInputElement} */ (h(`<input inputmode="decimal" aria-label="${esc(std.nom)} — seuil ${esc(n.nom)}, en multiples du poids de corps" value="${fr(eff[i])}">`));
      const kg = /** @type {HTMLElement} */ (lab.querySelector(".calib-kg"));
      lab.append(inp);
      grille.append(lab);
      champs.push(inp); kgs.push(kg);
    });
    bloc.append(grille);

    const msg = h(`<div class="calib-msg hint"></div>`);
    bloc.append(msg);

    const majKg = () => champs.forEach((inp, i) => {
      const r = Number(String(inp.value).replace(",", "."));
      kgs[i].textContent = pc && Number.isFinite(r) && r > 0 ? `≈ ${fr(arrondirForce(r * pc))} kg` : "";
    });

    const appliquer = () => {
      const brut = champs.map((x) => x.value.trim());
      // Tout vide : retour explicite aux repères publiés.
      if (brut.every((x) => !x)) {
        if (perso[id]) { delete perso[id][col]; if (!perso[id].H && !perso[id].F) delete perso[id]; }
        Etat.sauver(); etat.textContent = "repères publiés"; msg.textContent = "";
        champs.forEach((inp, i) => { inp.value = fr(std[col][i]); inp.classList.remove("err"); });
        majKg(); apresChangement(); return;
      }
      const ok = validerSeuils(brut);
      if (!ok) {
        champs.forEach((x) => x.classList.add("err"));
        msg.textContent = `Quatre nombres qui montent, entre ${fr(LIM_RANG.min)} et ${fr(LIM_RANG.max)} × le poids de corps. `
          + `Le repère publié reste appliqué en attendant.`;
        return;
      }
      champs.forEach((x) => x.classList.remove("err"));
      msg.textContent = "";
      perso[id] = { ...(perso[id] || {}), [col]: ok };
      Etat.sauver();
      etat.textContent = "tes seuils";
      majKg(); apresChangement();
    };

    champs.forEach((inp) => {
      inp.addEventListener("input", majKg);
      inp.addEventListener("change", appliquer);
    });
    majKg();
    c.append(bloc);
  }

  const bReset = h(`<button class="btn ghost">Revenir aux repères publiés</button>`);
  bReset.addEventListener("click", () => {
    if (!Object.keys(perso).length) return;
    if (!confirm("Effacer tous tes seuils et revenir aux repères publiés ?")) return;
    for (const k of Object.keys(perso)) delete perso[k];
    Etat.sauver(); apresChangement(); v.textContent = ""; calibrageRang(v, apresChangement);
  });
  c.append(bReset);
  v.append(c);
}

/** Arrondi 2,5 kg — le pas des disques les plus courants. */
function arrondirForce(kg) { return Math.round(Number(kg) / 2.5) * 2.5; }
/** Nombre à la française : virgule décimale, sans décimale inutile. */
function fr(n) { return String(n).replace(".", ","); }

let SERIES_MUSCLE_JOURS = 7;
/**
 * Séries de travail par muscle sur 7 ou 30 jours, avec l'écart par rapport à
 * la période précédente : « est-ce que je fais plus ou moins qu'avant, et
 * quels muscles je néglige ? ».
 */
function carteSeriesParMuscle(v) {
  const logs = Etat.data.logs || [];
  if (!logs.length) return;
  const card = h(`<div class="card stack spm"></div>`);
  const dessiner = () => {
    const J = SERIES_MUSCLE_JOURS;
    const lignes = seriesParMuscle(logs, getExercise, J);
    const max = Math.max(1, ...lignes.map((x) => Math.max(x.series, x.avant)));
    const nb = (n) => String(Math.round(n * 10) / 10).replace(".", ",");
    card.innerHTML = "";
    card.append(h(`<div class="spread"><h2 class="row" style="margin:0;gap:8px">${mi(IC.bars, "mi-blue")}Séries par muscle</h2>
      <span class="row spm-per" role="group" aria-label="Période"></span></div>`));
    [[7, "7 j"], [30, "30 j"]].forEach(([j, lab]) => {
      const b = h(`<button type="button" class="chip${j === J ? " on" : ""}" aria-pressed="${j === J}">${lab}</button>`);
      b.addEventListener("click", () => { SERIES_MUSCLE_JOURS = /** @type {number} */ (j); dessiner(); });
      card.querySelector(".spm-per").append(b);
    });
    card.append(h(`<div class="small muted">Séries de travail des ${J} derniers jours, comparées aux ${J} jours d'avant. Muscle principal = 1 série, secondaire = ½. Échauffement non compté.</div>`));
    if (!lignes.length) { card.append(h(`<div class="hint">Aucune séance sur cette période ni sur la précédente.</div>`)); return; }
    const liste = h(`<div class="spm-liste" role="list"></div>`);
    lignes.forEach((x) => {
      const ec = Math.round(x.ecart * 10) / 10;
      liste.append(h(`<div class="spm-l" role="listitem">
        <span class="spm-n">${esc(MUSCLE_LABELS[x.muscle] || x.muscle)}</span>
        <span class="spm-b" aria-hidden="true"><i class="av" style="width:${(x.avant / max) * 100}%"></i><i style="width:${(x.series / max) * 100}%"></i></span>
        <b class="num spm-v">${nb(x.series)}</b>
        <span class="num spm-e ${ec > 0 ? "up" : ec < 0 ? "down" : ""}">${ec === 0 ? "=" : (ec > 0 ? "+" : "−") + nb(Math.abs(ec))}</span></div>`));
    });
    card.append(liste);
  };
  dessiner();
  v.append(card);
}

/** Carte de chaleur musculaire : zones réellement travaillées (données locales). */
function carteMuscleHeatmap(v) {
  const logs = Etat.data.logs || [];
  if (!logs.length) return;
  const recents = logs.filter((l) => Date.now() - Date.parse(l.date) < 30 * 864e5);
  const source = recents.length ? recents : logs;
  const vm = volumeParMuscle(source, getExercise);
  if (!vm.length) return;
  const max = Math.max(...vm.map((x) => x.v), 1);
  /** @type {Record<string, number>} */
  const intensites = {};
  for (const x of vm) intensites[x.muscle] = x.v / max;
  const card = h(`<div class="card stack"><h2 class="row" style="margin:0;gap:8px">${mi(IC.map, "mi-blue")}Carte musculaire</h2><div class="small muted">Zones travaillées ${recents.length ? "(30 derniers jours)" : "(tout l'historique)"} · plus c'est vif, plus c'est sollicité</div></div>`);
  const wrap = h(`<div>${muscleHeatmap(intensites)}</div>`);
  let repli = false;
  wrap.querySelectorAll("img.base").forEach((img) => img.addEventListener("error", () => {
    if (repli) return; repli = true;
    wrap.innerHTML = `<div class="hint" style="text-align:center;padding:8px 0">Planche musculaire indisponible hors ligne pour l'instant.</div>`;
  }));
  // La planche était DÉCORATIVE : on voyait que le dos était vif sans pouvoir
  // savoir pourquoi. Un toucher ouvre maintenant la fiche du muscle.
  wrap.addEventListener("click", (ev) => {
    const g = /** @type {any} */ (ev.target).closest("g[data-m]");
    if (g && g.getAttribute("data-m")) ouvrirFicheMuscle(g.getAttribute("data-m"));
  });
  wrap.querySelectorAll("g[data-m]").forEach((g) => {
    g.setAttribute("role", "button");
    g.setAttribute("tabindex", "0");
    const nom = MUSCLE_LABELS[g.getAttribute("data-m")] || g.getAttribute("data-m");
    g.setAttribute("aria-label", `Voir le détail : ${nom}`);
    g.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ouvrirFicheMuscle(g.getAttribute("data-m")); }
    });
  });
  card.append(wrap);
  card.append(h(`<div class="hint" style="margin-top:2px;text-align:center">Touche un muscle pour voir son détail</div>`));
  const top = vm.slice(0, 4).map((x) => `<span class="tag">${esc(MUSCLE_LABELS[x.muscle] || x.muscle)}</span>`).join(" ");
  if (top) card.append(h(`<div class="row" style="flex-wrap:wrap;gap:4px;margin-top:6px">${top}</div>`));
  v.append(card);
}

/** Carte « Récupération musculaire » : quels groupes sont frais vs récemment
 *  travaillés, d'après tes vraies séances (aucune donnée inventée). */
function carteRecup(v) {
  const logs = Etat.data.logs || [];
  if (!logs.length) return;
  const recup = recuperationParMuscle(logs, getExercise).filter((r) => r.muscle !== "corps_entier");
  if (!recup.length) return;
  const card = h(`<div class="card stack"><h2 class="row" style="margin:0;gap:8px">${mi(IC.activity, "mi-green")}Récupération</h2><div class="small muted">D'après tes séances · 100 % = prêt à travailler, faible = récemment sollicité.</div></div>`);
  const liste = h(`<div class="recup-list"></div>`);
  recup.forEach((r) => {
    const col = r.pct >= 80 ? "var(--ok)" : r.pct >= 40 ? "var(--amber)" : "var(--danger)";
    const quand = r.jours < 1 ? "aujourd'hui" : `il y a ${Math.round(r.jours)} j`;
    liste.append(h(`<div class="recup-row">
      <span class="recup-sil">${miniSilhouette([r.muscle], "auto", { zoom: true, ratio: 0.67 })}</span>
      <div class="recup-main">
        <div class="spread"><b>${esc(MUSCLE_LABELS[r.muscle] || r.muscle)}</b><span class="num" style="color:${col};font-weight:800">${r.pct}%</span></div>
        <div class="bar"><div style="width:${r.pct}%;background:${col}"></div></div>
        <span class="muted small">${quand}</span>
      </div></div>`));
  });
  card.append(liste);
  v.append(card);
}

/** Rangée de silhouettes des muscles ciblés (une par muscle, surlignée + label). */
/**
 * BANDE DE RÉCUPÉRATION — « où en sont les muscles que cette séance va taper ».
 *
 * L'ancienne rangée alignait des silhouettes avec un nom dessous : joli, mais
 * elle ne disait rien qu'on ne savait déjà en lisant le titre de la séance.
 * Toute la donnée utile existait pourtant depuis longtemps dans le moteur de
 * fatigue — elle n'était visible que dans un écran séparé, qu'on n'ouvre pas
 * avant de commencer.
 *
 * Chaque tuile répond maintenant à la seule question qu'on se pose avant
 * d'attaquer : CE MUSCLE EST-IL REMIS ? Le pourcentage vient d'`etatMusculaire`
 * (décroissance exponentielle, demi-vie fonction du volume et de l'échec), le
 * libellé des zones existantes — rien n'est inventé ici, tout est affiché.
 *
 * @param {string[]} muscles clés de muscles du catalogue
 */
/**
 * Ce que la séance VA COÛTER, muscle par muscle.
 *
 * FitAI affiche « 100 % à 46 % » au-dessus de chaque muscle d'une routine : la
 * fraîcheur actuelle, puis celle qui restera une fois la séance faite. C'est
 * l'information la plus utile avant de commencer — elle dit si le programme de
 * demain tiendra encore.
 *
 * Le calcul n'invente rien : il réutilise la chaîne du moteur de fatigue
 * (`analyserSeance` → `saturation` → `combinerFatigue`). `analyserSeance`
 * attend un JOURNAL de séance réalisée ; on lui en fabrique un à partir des
 * séries PRÉVUES. Deux hypothèses, et elles sont assumées : les répétitions
 * sont prises au milieu de la fourchette visée, et l'effort à RIR 2 — une série
 * de travail menée près de l'échec sans y aller. Les séries d'échauffement sont
 * exclues, comme elles le sont dans le calcul d'une séance réelle.
 *
 * @returns {Record<string, number>|null} readiness projeté par muscle du catalogue
 */
function projectionSeance(seance, etat) {
  if (!seance || !Array.isArray(seance.exercices) || !seance.exercices.length) return null;
  const journal = { exercices: seance.exercices.map((e) => ({
    exerciceId: e.exerciceId,
    series: (e.series || []).filter((s) => s.type !== "echauffement").map((s) => ({
      reps: s.dureeSec ? 0 : (s.repsCible ? Math.round((s.repsCible[0] + s.repsCible[1]) / 2) : 10),
      chargeKg: 0,
      dureeSec: s.dureeSec || 0,
      rir: 2,
    })),
  })) };
  const { parMuscle } = analyserSeance(journal, getExercise);
  /** @type {Record<string, number>} */
  const out = {};
  for (const [cleFine, d] of Object.entries(parMuscle)) {
    const cat = FIN_VERS_CATALOGUE[cleFine] || cleFine;
    const fatigueAvant = etat && etat[cleFine] ? 100 - etat[cleFine].readiness : 0;
    const reste = Math.round(100 - combinerFatigue(fatigueAvant, saturation(d.stress)));
    // Une catégorie peut couvrir plusieurs clés fines : on retient la plus
    // entamée, c'est elle qui limitera la prochaine séance.
    out[cat] = out[cat] == null ? reste : Math.min(out[cat], reste);
  }
  return out;
}

function bandeRecuperation(muscles, seance = null) {
  const list = (muscles || []).filter((m) => m !== "corps_entier").slice(0, 8);
  if (!list.length) return null;
  const etat = (AUTO && AUTO.etat) || etatMusculaire(Etat.data.logs || [], getExercise, Date.now());
  const apresParMuscle = projectionSeance(seance, etat);
  const row = h(`<div class="musc-row recup-row"></div>`);
  let connus = 0;
  for (const m of list) {
    // Une clé du catalogue couvre parfois plusieurs clés du moteur (les trois
    // faisceaux de l'épaule) : readinessGroupe retient la plus fatiguée.
    const cles = CLES_MOTEUR.filter((c) => FIN_VERS_CATALOGUE[c] === m);
    const r = readinessGroupe(etat, cles);
    const z = r == null ? null : zoneDisponibilite(r);
    if (r != null) connus++;
    const ton = !z ? "inconnu"
      : z.cle === "frais" || z.cle === "pret" ? "ok"
        : z.cle === "prudence" ? "moyen" : "bas";
    const cell = h(`<button class="musc-cell recup-cell ton-${ton}" aria-label="${esc(MUSCLE_LABELS[m] || m)}${r == null ? "" : ` — ${r} % récupéré, ${esc(z.nom)}`}">
      <span class="musc-sil">${miniSilhouette([m], "auto", { zoom: true, ratio: 0.61 })}</span>
      <span class="rc-nom">${esc(MUSCLE_LABELS[m] || m)}</span>
      <span class="rc-pct num">${r == null ? "—"
        : (apresParMuscle && apresParMuscle[m] != null
          ? `${r} %<em> à </em><b>${apresParMuscle[m]} %</b>`
          : `${r} %`)}</span>
      <span class="rc-bar"><i style="width:${
        apresParMuscle && apresParMuscle[m] != null ? apresParMuscle[m] : (r == null ? 0 : r)}%"></i></span>
    </button>`);
    // La tuile ouvre la fiche du muscle : le pourcentage donne l'alerte, la
    // fiche donne l'historique qui l'explique.
    cell.addEventListener("click", () => ouvrirFicheMuscle(m));
    row.append(cell);
  }
  // Sans aucune donnée, la bande n'apprendrait rien : on garde l'ancienne
  // rangée, purement illustrative, plutôt qu'une ligne de tirets.
  if (!connus) return rangeeMuscles(muscles);
  return row;
}

function rangeeMuscles(muscles) {
  const list = (muscles || []).filter((m) => m !== "corps_entier").slice(0, 6);
  if (!list.length) return null;
  const row = h(`<div class="musc-row"></div>`);
  list.forEach((m) => row.append(h(`<div class="musc-cell"><span class="musc-sil">${miniSilhouette([m], "auto", { zoom: true, ratio: 0.55 })}</span><span>${esc(MUSCLE_LABELS[m] || m)}</span></div>`)));
  return row;
}

/** Carte "Calendrier d'assiduité" : grille du mois avec navigation. */
function carteCalendrier(v, logs) {
  const auj = new Date();
  if (!CAL_VIEW) CAL_VIEW = { annee: auj.getFullYear(), mois: auj.getMonth() + 1 };
  const p2 = (n) => String(n).padStart(2, "0");
  const isoAuj = `${auj.getFullYear()}-${p2(auj.getMonth() + 1)}-${p2(auj.getDate())}`;
  const g = grilleMois(CAL_VIEW.annee, CAL_VIEW.mois, logs);
  const c = h(`<div class="card stack"></div>`);
  c.append(h(`<div class="cal-head"><button class="chip" id="calPrev" aria-label="Mois précédent">‹</button><b>${esc(g.nomMois)} ${g.annee}</b><button class="chip" id="calNext" aria-label="Mois suivant">›</button></div>`));
  const grid = h(`<div class="cal-grid"></div>`);
  NOMS_JOURS_COURTS.forEach((d) => grid.append(h(`<div class="cal-dow">${d}</div>`)));
  g.cases.forEach((cell) => {
    if (!cell) { grid.append(h(`<div class="cal-cell empty"></div>`)); return; }
    const on = cell.seances > 0, isAuj = cell.iso === isoAuj;
    grid.append(h(`<div class="cal-cell${on ? " on" : ""}${isAuj ? " today" : ""}">${cell.jour}${on ? `<span class="n">${cell.seances}</span>` : ""}</div>`));
  });
  c.append(grid);
  c.append(h(`<div class="small muted" style="margin-top:6px">${g.joursEntraines} jour${g.joursEntraines > 1 ? "s" : ""} entraîné${g.joursEntraines > 1 ? "s" : ""} · ${g.totalSeances} séance${g.totalSeances > 1 ? "s" : ""} ce mois-ci.</div>`));
  v.append(c);
  $("#calPrev", c).addEventListener("click", () => { CAL_VIEW = moisAdjacent(g.annee, g.mois, -1); render(); });
  $("#calNext", c).addEventListener("click", () => { CAL_VIEW = moisAdjacent(g.annee, g.mois, 1); render(); });
}
let STATS_PERIODE = "30"; // période sélectionnée dans l'aperçu Progrès
function vStats(v) {
  const logs = Etat.data.logs;
  const p = Etat.data.profil;
  v.append(h(`<div class="dash-hi"><div><span class="eyebrow">Ton évolution</span><h1>Progrès</h1></div></div>`));
  // Récupération : accès direct depuis Progrès (elle n'est plus dans la barre).
  {
    const bR = h(`<button class="card plusitem lien-recup"><span class="pm-ic mi-blue">${IC.activity}</span><span class="pm-main"><b>Récupération musculaire</b><br><span class="muted small">Muscles prêts, en récupération, sollicités</span></span><span class="chev" aria-hidden="true">›</span></button>`);
    bR.addEventListener("click", () => nav("recup"));
    v.append(bR);
  }

  const sm = statsSemaine(logs);
  const dm = dureeMoyenneMin(logs);
  const objSem = p.joursParSemaine || 3;

  // Objectif de la semaine sur une ligne : l'ancienne carte héro répétait ce
  // que la grille de statistiques affiche juste en dessous.
  const objPct = Math.min(1, sm.seances / Math.max(1, objSem));
  v.append(h(`<div class="card objweek">
    <div class="spread"><span class="small"><b>${sm.seances}/${objSem}</b> séance${sm.seances > 1 ? "s" : ""} cette semaine</span>
    <span class="small muted">${sm.seances ? uVolume(sm.volume) : "à démarrer"}</span></div>
    <div class="bar" style="margin-top:7px"><div style="width:${Math.round(objPct * 100)}%${objPct >= 1 ? ";background:var(--ok)" : ""}"></div></div>
  </div>`));

  // Aperçu par période : filtres 7J · 30J · 3M · 6M · 1A · Tout
  const PERIODES = [["7", "7J"], ["30", "30J"], ["90", "3M"], ["180", "6M"], ["365", "1A"], ["0", "Tout"]];
  const chipsP = h(`<div class="row" style="overflow-x:auto;flex-wrap:nowrap;margin:10px 0 12px;scrollbar-width:none"></div>`);
  PERIODES.forEach(([val, lab]) => {
    const b = h(`<button class="chip ${STATS_PERIODE === val ? "on" : ""}">${lab}</button>`);
    b.addEventListener("click", () => { STATS_PERIODE = val; render(); });
    chipsP.append(b);
  });
  v.append(chipsP);
  const jp = Number(STATS_PERIODE), depuis = jp ? Date.now() - jp * 864e5 : 0;
  const lp = logs.filter((l) => new Date(l.date).getTime() >= depuis);
  const volP = Math.round(lp.reduce((a, l) => a + volumeLog(l), 0));
  const dureeP = Math.round(lp.reduce((a, l) => a + (l.dureeSec || 0), 0) / 60);
  const g = h(`<div class="statgrid"></div>`);
  g.append(statCard(IC.dumbbell, `${lp.length}`, "Séances"));
  g.append(statCard(IC.clock, `${Math.floor(dureeP / 60)}h${String(dureeP % 60).padStart(2, "0")}`, "Temps total"));
  g.append(statCard(IC.bars, uVolume(volP).replace(/ (kg|lb)$/, ""), `Volume ${uUnite()}`));
  const kcalP = lp.reduce((a, l) => a + kcalLog(l), 0);
  g.append(statCard(IC.flame, kcalP.toLocaleString("fr-FR"), "kcal estimées"));
  v.append(g);

  // Graphique de progression interactif : LE graphique utile, toujours visible.
  carteProgression(v);

  // Le reste est rangé en sections repliables — l'écran faisait 6 écrans de
  // long, on ne lisait plus rien. Priorité : régularité, muscles, records.
  const prs = classementRecords(logs, nomExo, 8);

  section(v, "regularite", "Régularité", (b) => {
    carteCalendrier(b, logs);
    carteDefis(b);
  }, { ouvert: true, resume: `${sm.seances}/${objSem} cette semaine` });

  section(v, "volume", "Volume", (b) => {
    const sem2 = volumeParSemaine(logs);
    if (sem2.length >= 1) b.append(h(`<div class="card">${svgBars(uImp() ? sem2.map((x) => ({ ...x, v: Math.round(x.v * 2.20462) })) : sem2, `Volume par semaine (${uUnite()})`)}</div>`));
    const parMuscle = volumeParMuscle(logs, getExercise).slice(0, 8)
      .map((x) => ({ x: MUSCLE_LABELS[x.muscle] || x.muscle, v: x.v }));
    if (parMuscle.length) b.append(h(`<div class="card">${svgBars(parMuscle, "Volume par groupe musculaire")}</div>`));
    if (!sem2.length && !parMuscle.length) b.append(h(`<div class="muted small">Aucune séance enregistrée pour l'instant.</div>`));
  }, { resume: uVolume(volP) });

  const semC = chargeParPeriode(logs, "semaine", 1)[0];
  section(v, "charge", "Charge d'entraînement", (b) => carteChargeEntrainement(b), {
    resume: semC && semC.series ? `${semC.series} séries cette semaine` : "",
  });

  section(v, "muscles", "Muscles & récupération", (b) => {
    carteSeriesParMuscle(b);
    carteMuscleHeatmap(b);
    carteRecup(b);
  });

  // Records des exercices qui ne se jugent pas au 1RM : distance et vitesse
  // pour le cardio, durée de maintien pour le gainage. Jamais mélangés.
  const bpTous = meilleuresPerfs(logs);
  const autresRecs = Object.entries(bpTous).flatMap(([id, bp]) => {
    const mes = mesuresExercice(getExercise(id));
    if (mes.distance && bp.distanceMax) return [{ id, nom: nomExo(id), val: texteDistance(bp.distanceMax), sub: bp.vitesseMax ? `${texteVitesse(bp.vitesseMax)} max` : "distance max", tri: bp.distanceMax }];
    if (mes.isometrique && bp.dureeMax) return [{ id, nom: nomExo(id), val: texteDuree(bp.dureeMax), sub: bp.chargeMax ? `lest max ${uCharge(bp.chargeMax)}` : "maintien max", tri: bp.dureeMax }];
    return [];
  }).sort((a, b) => b.tri - a.tri).slice(0, 6);
  if (prs.length || autresRecs.length) {
    section(v, "records", "Records personnels", (b) => {
      if (prs.length) {
        const rg = h(`<div class="recgrid"></div>`);
        prs.slice(0, 6).forEach((r) => rg.append(h(`<div class="reccard"><div class="rc-name">${esc(r.nom)}</div><div class="rc-val num">${uAff(r.e1rm)}<span> ${uUnite()}</span></div><div class="rc-sub muted">${uCharge(r.charge)} × ${r.reps}</div></div>`)));
        b.append(rg);
        b.append(h(`<div class="hint">${esc(FORMULE_1RM)}. Estimation indicative — ne teste jamais un vrai maximum en reprise.</div>`));
      }
      if (autresRecs.length) {
        b.append(h(`<div class="eyebrow" style="margin-top:var(--space-3)">Cardio et gainage</div>`));
        const rg2 = h(`<div class="recgrid"></div>`);
        autresRecs.forEach((r) => rg2.append(h(`<div class="reccard"><div class="rc-name">${esc(r.nom)}</div><div class="rc-val num">${esc(r.val)}</div><div class="rc-sub muted">${esc(r.sub)}</div></div>`)));
        b.append(rg2);
      }
    }, { resume: `${prs.length + autresRecs.length}` });
  }

  section(v, "force", "Calculateurs de force", (b) => carteForce(b));

  // poids — rangé dans une section (consulté occasionnellement, pas à chaque ouverture)
  const secPoids = h(`<div></div>`);
  const c = h(`<div class="card stack"><h2 style="margin:0">Poids du corps</h2></div>`);
  const rowW = h(`<div class="row"><input id="wKg" aria-label="Poids du matin en ${uUnite()}" inputmode="decimal" placeholder="Poids du matin (${uUnite()})" style="flex:1"><button class="primary" id="wAdd">Ajouter</button></div>`);
  c.append(rowW);
  // Tri par date : un relevé peut être saisi après coup (date choisie).
  const poids = Etat.data.metrics.filter((m) => m.poidsKg).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  // Jauge IMC (dernier poids connu ou poids du profil), façon carte « BMI »
  const poidsActuel = poids.length ? poids[poids.length - 1].poidsKg : p.poidsKg;
  if (poidsActuel && p.tailleCm) {
    const imc = poidsActuel / Math.pow(p.tailleCm / 100, 2);
    const cat = categorieIMC(imc);
    const cimc = h(`<div class="ringstat"></div>`);
    cimc.append(h(gaugeIMC(imc)));
    const ii = h(`<div style="flex:1;min-width:0"></div>`);
    ii.append(h(`<div class="eyebrow" style="color:var(--accent-ink)">Indice de masse corporelle</div>`));
    ii.append(h(`<div style="margin:2px 0"><b style="font-size:1.4rem">${imc.toFixed(1)}</b> <span class="badge" style="background:color-mix(in srgb,${cat.col} 18%,transparent);color:${cat.col}">${cat.txt}</span></div>`));
    ii.append(h(`<div class="muted small">${uCharge(poidsActuel)} · ${p.tailleCm} cm. L'IMC est indicatif et ne distingue pas muscle et graisse.</div>`));
    cimc.append(ii);
    c.append(cimc);
  }
  // Courbe de poids lissée (tendance)
  if (poids.length >= 2) {
    const dp = poids.slice(-14).map((m) => ({ x: new Date(m.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), v: uAff(m.poidsKg) }));
    c.append(h(`<div>${svgLine(dp, `Tendance du poids (${uUnite()})`)}</div>`));
  }
  if (poids.length) c.append(h(`<div class="small muted">Dernier : ${uCharge(poids[poids.length - 1].poidsKg)} · ${poids.length} mesure(s)</div>`));
  c.append(h(`<div class="hint">Pèse-toi le matin à jeun. Aucune décision sur une seule pesée : on regarde la tendance sur 1–2 semaines.</div>`));
  secPoids.append(c);
  section(v, "poids", "Poids du corps", (b) => b.append(secPoids), {
    resume: poids.length ? uCharge(poids[poids.length - 1].poidsKg) : "",
  });
  c.querySelector("#wAdd").addEventListener("click", () => {
    const kg = depuisSaisie(c.querySelector("#wKg").value, uImp()); if (!kg) return;
    Etat.data.metrics.push({ id: Etat.uid(), date: new Date().toISOString(), poidsKg: kg }); Etat.sauver(); render();
  });

  {
    const jm = joursDeMesure(Etat.data.metrics || []);
    section(v, "mensurations", "Mensurations", (b) => carteMensurations(b), {
      resume: jm.length ? `dernière : ${new Date(jm[0] + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : "",
    });
  }

  // Équilibre du corps — le seul déséquilibre qu'aucun total de volume ne montre.
  {
    const eq = equilibre(Etat.data.logs || [], getExercise);
    section(v, "equilibre", "Équilibre du corps", (b) => carteEquilibre(b, eq),
      { resume: resumeEquilibre(eq) });
  }

  // Photos de progression — ce que la balance ne dit pas.
  {
    const nb = (Etat.data.photos || []).length;
    section(v, "photos", "Photos de progression", (b) => cartephotos(b),
      { resume: nb ? String(nb) : "" });
  }

  // Bilan & ajustement (2 semaines)
  const cb = h(`<div class="card stack"><h2 style="margin:0">Bilan & ajustement</h2><div class="muted small">Sur 2 semaines — une seule action à la fois.</div><div id="bilanOut"></div></div>`);
  const bBilan = h(`<button class="primary">Analyser mes 2 dernières semaines</button>`);
  bBilan.addEventListener("click", () => {
    const r = bilan(Etat.data.profil, Etat.data.metrics);
    $("#bilanOut", v).innerHTML = `<div class="notice small">${esc(r.message)}</div>`;
    (Etat.data.reviews ||= []).push({ date: new Date().toISOString(), statut: r.statut, message: r.message });
    Etat.sauver();
  });
  cb.append(bBilan);
  section(v, "bilan", "Bilan & ajustement", (b) => b.append(cb));

  // historique
  if (logs.length) {
    const hist = h(`<div class="card stack"></div>`);
    logs.slice(-8).reverse().forEach((l) => {
      hist.append(h(`<div class="spread small" style="padding:6px 0;border-bottom:1px solid var(--line)">
        <span>${new Date(l.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — ${esc(l.seanceNom || "")}</span>
        <span class="muted">${(l.exercices || []).length} exos</span></div>`));
    });
    section(v, "historique", "Historique des séances", (b) => b.append(hist), { resume: `${logs.length}` });
  } else {
    v.append(h(`<div class="notice small">Réalise ta première séance pour voir tes statistiques se remplir.</div>`));
  }
}

/* ---------- Santé Connect : lecture seule, import sur demande ---------- */
function carteSanteConnect(b) {
  const lien = `<a href="privacypolicy.html" target="_blank" rel="noopener">règles de confidentialité</a>`;
  if (!estNatif()) {
    b.append(h(`<div class="small muted">Dans l'application Android, ${esc(IDENTITE.nom)} peut <b>lire</b> dans Santé Connect ton poids, ta taille, ta masse grasse et tes activités (distance, calories, séances). Rien n'est écrit, rien n'est envoyé : voir les ${lien}.</div>`));
    return;
  }
  const statut = h(`<div class="small muted">Vérification de Santé Connect…</div>`);
  const zone = h(`<div class="stack sc-zone"></div>`);
  const acts = h(`<div class="sc-actions"></div>`);
  const bAut = h(`<button class="primary sc-large">Autoriser la lecture</button>`);
  const bMes = h(`<button>Mes mesures</button>`);
  const bAct = h(`<button>Activités 7 j</button>`);
  const bReg = h(`<button class="secondary sc-large">Gérer les autorisations</button>`);
  acts.append(bAut, bMes, bAct, bReg);
  b.append(statut, acts, zone, h(`<div class="hint">Lecture seule de 6 types de données, à ta demande. Tu peux retirer l'accès à tout moment dans Santé Connect. Voir les ${lien}.</div>`));
  SanteConnect.disponibilite().then((d) => {
    statut.textContent = d.ok ? "Santé Connect est disponible sur ce téléphone."
      : "Santé Connect n'est pas disponible : installe ou mets à jour l'application « Santé Connect » (Android 13 et moins), puis réessaie.";
    [bAut, bMes, bAct].forEach((x) => { x.disabled = !d.ok; });
  });
  bAut.addEventListener("click", async () => {
    try {
      const r = await SanteConnect.autoriser();
      const ok = (r && r.readAuthorized) || [];
      toast(ok.length ? `${ok.length} type${ok.length > 1 ? "s" : ""} autorisé${ok.length > 1 ? "s" : ""}` : "Aucune autorisation accordée");
    } catch (e) { toast("Autorisation impossible"); }
  });
  bReg.addEventListener("click", () => SanteConnect.ouvrirReglages());
  bMes.addEventListener("click", async () => {
    zone.innerHTML = `<div class="small muted">Lecture…</div>`;
    const m = await SanteConnect.lireMesures();
    zone.innerHTML = "";
    /** @type {[string, string, (x:number)=>string][]} */
    const champs = [["poidsKg", "Poids", (x) => uCharge(x)], ["masseGrassePct", "Masse grasse", (x) => `${String(x).replace(".", ",")} %`], ["tailleCm", "Taille", (x) => `${Math.round(x)} cm`]];
    const lignes = champs.filter(([k]) => m[k]);
    if (!lignes.length) { zone.append(h(`<div class="notice small">Aucune mesure lisible (autorisation refusée, ou rien d'enregistré dans Santé Connect sur l'année).</div>`)); return; }
    lignes.forEach(([k, lab, fmt]) => {
      const x = m[k];
      const deja = k === "tailleCm" ? Math.round(Etat.data.profil?.tailleCm || 0) === Math.round(x.v)
        : (Etat.data.metrics || []).some((r) => r[k] === x.v && jourLocal(r.date) === jourLocal(x.date));
      const ligne = h(`<div class="spread sc-ligne"><span><b>${lab}</b> <span class="num">${fmt(x.v)}</span><br><span class="muted small">${esc(new Date(x.date).toLocaleDateString("fr-FR"))} · ${esc(x.source)}</span></span></div>`);
      if (deja) ligne.append(h(`<span class="badge ok">déjà enregistré</span>`));
      else {
        const bAdd = h(`<button class="chip" aria-label="${k === "tailleCm" ? "Mettre cette taille dans mon profil" : `Ajouter ce ${lab === "Poids" ? "poids" : "taux de masse grasse"} à mes mesures`}">${k === "tailleCm" ? "Au profil" : "Ajouter"}</button>`);
        bAdd.addEventListener("click", () => {
          if (k === "tailleCm") { Etat.data.profil.tailleCm = Math.round(x.v); Etat.sauver(); }
          else {
            const r = construireReleve({ [k]: x.v }, new Date(x.date).toISOString(), Etat.uid());
            if (r.ok === false) { toast(r.erreurs[0]); return; }
            Etat.data.metrics.push(r.releve); Etat.sauver();
          }
          bAdd.replaceWith(h(`<span class="badge ok">ajouté</span>`));
          toast(`${lab} importé de Santé Connect`);
        });
        ligne.append(bAdd);
      }
      zone.append(ligne);
    });
  });
  bAct.addEventListener("click", async () => {
    zone.innerHTML = `<div class="small muted">Lecture…</div>`;
    const a = await SanteConnect.lireActivites(7);
    zone.innerHTML = "";
    if (!a.liste.length) { zone.append(h(`<div class="notice small">Aucune séance dans Santé Connect sur 7 jours (ou lecture non autorisée).</div>`)); return; }
    zone.append(h(`<div class="small"><b>${a.total.seances} séance${a.total.seances > 1 ? "s" : ""}</b> · ${texteDuree(a.total.dureeSec)}${a.total.distanceM ? ` · ${texteDistance(a.total.distanceM)}` : ""}${a.total.kcal ? ` · ${a.total.kcal} kcal (selon la source)` : ""}</div>`));
    a.liste.slice(0, 10).forEach((x) => zone.append(h(`<div class="spread sc-ligne small"><span><b>${esc(x.type)}</b> · ${esc(new Date(x.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }))}<br><span class="muted">${esc(x.source)}</span></span><span class="num">${texteDuree(x.dureeSec)}${x.distanceM ? ` · ${texteDistance(x.distanceM)}` : ""}</span></div>`)));
  });
}

/* ---------- Mensurations : 16 mesures, comparaison de dates, asymétries ---------- */
let MES_CMP = { a: null, b: null };
/** Valeur d'une mesure dans l'unité de l'utilisateur. */
function texteMesure(c, v) {
  if (v == null) return "—";
  if (c.type === "masse") return uCharge(v);
  if (c.type === "pct") return `${(Math.round(v * 10) / 10).toLocaleString("fr-FR")}\u00A0%`;
  return `${longueurAffichage(v, uImp()).toLocaleString("fr-FR")}\u00A0${uniteLongueur(uImp())}`;
}
function texteEcartMesure(c, d) {
  if (d == null) return "";
  if (Math.abs(d) < 0.05) return "=";
  return `${d > 0 ? "+" : "−"}${texteMesure(c, Math.abs(d))}`;
}
const jourCourt = (j) => new Date(j + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

function carteMensurations(b) {
  const metrics = Etat.data.metrics || [];
  const jours = joursDeMesure(metrics);
  const acts = h(`<div class="row"></div>`);
  const bNew = h(`<button class="primary"><span class="btn-ico">${IC.plus}</span>Nouvelle mesure</button>`);
  bNew.addEventListener("click", () => ouvrirSaisieMesures());
  acts.append(bNew);
  if (jours.length) {
    const bCsv = h(`<button class="chip">Exporter (CSV)</button>`);
    bCsv.addEventListener("click", () => telechargerCSV(metriquesVersCSV(metrics), nomFichierExport("suivi-corporel")));
    acts.append(bCsv);
  }
  b.append(acts);
  if (!jours.length) {
    b.append(etatVide(illustration("courbe"), "Aucune mensuration", "Poids, masse grasse et 14 tours (gauche et droite) : mesure-toi une fois par semaine, mêmes conditions."));
    return;
  }
  // Comparaison de deux dates. Par défaut : la plus ancienne et la plus récente.
  const ja = jours.includes(MES_CMP.a) ? MES_CMP.a : jours[jours.length - 1];
  const jb = jours.includes(MES_CMP.b) ? MES_CMP.b : jours[0];
  const opt = (j, sel) => `<option value="${j}"${sel ? " selected" : ""}>${esc(jourCourt(j))}</option>`;
  const ctr = h(`<div class="selrow mes-dates">
    <label class="small muted">Du <select class="selchip" aria-label="Première date">${jours.map((j) => opt(j, j === ja)).join("")}</select></label>
    <label class="small muted">au <select class="selchip" aria-label="Seconde date">${jours.map((j) => opt(j, j === jb)).join("")}</select></label></div>`);
  const [sa, sb] = ctr.querySelectorAll("select");
  sa.addEventListener("change", () => { MES_CMP.a = sa.value; render(); });
  sb.addEventListener("change", () => { MES_CMP.b = sb.value; render(); });
  b.append(ctr);
  const lignes = comparerMesures(metrics, ja, jb);
  const tab = h(`<div class="mes-table" role="table" aria-label="Comparaison des mensurations"></div>`);
  tab.append(h(`<div class="mes-row mes-tete" role="row"><span role="columnheader">Mesure</span><span role="columnheader">${esc(new Date(ja + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }))}</span><span role="columnheader">${esc(new Date(jb + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }))}</span><span role="columnheader">Écart</span></div>`));
  for (const g of GROUPES_MESURES) {
    const dansG = lignes.filter((l) => champMesure(l.cle).groupe === g);
    if (!dansG.length) continue;
    tab.append(h(`<div class="mes-groupe" role="row"><span role="cell">${esc(g)}</span></div>`));
    dansG.forEach((l) => {
      const c = champMesure(l.cle);
      // Valeur recopiée d'un relevé plus ancien : atténuée, datée, sans écart.
      const cel = (v, d, frais) => (v == null ? `<span role="cell" class="num muted">—</span>`
        : frais ? `<span role="cell" class="num">${texteMesure(c, v)}</span>`
        : `<span role="cell" class="num mes-ancien" title="Relevé le ${esc(new Date(d).toLocaleDateString("fr-FR"))}">${texteMesure(c, v)}*</span>`);
      tab.append(h(`<div class="mes-row" role="row"><span role="cell">${esc(c.court)}</span>${cel(l.a, l.dateA, l.fraisA)}${cel(l.b, l.dateB, l.fraisB)}<span role="cell" class="num mes-ecart">${esc(texteEcartMesure(c, l.delta))}</span></div>`));
    });
  }
  b.append(tab);
  b.append(h(`<div class="hint">Chaque colonne montre la dernière valeur connue à cette date (relevée dans les 7 jours). * : valeur plus ancienne, sans écart calculé.</div>`));
  // Asymétries gauche / droite à la date la plus récente choisie.
  const asy = asymetries(metrics, jb);
  if (asy.length) {
    const noms = { bras: "Biceps", avantBras: "Avant-bras", cuisse: "Cuisses", mollet: "Mollets" };
    const box = h(`<div class="stack" style="gap:var(--space-2)"><div class="eyebrow">Gauche / droite</div></div>`);
    asy.forEach((x) => {
      const cote = x.plusFort ? `côté ${x.plusFort === "G" ? "gauche" : "droit"} plus fort` : "symétrique";
      box.append(h(`<div class="spread small"><span>${esc(noms[x.paire] || x.paire)}</span><span class="${x.aSurveiller ? "mes-asy-alerte" : "muted"}">${x.ecartCm ? `${texteMesure({ type: "longueur" }, x.ecartCm)} · ${x.ecartPct.toLocaleString("fr-FR")}\u00A0% · ${cote}` : "symétrique"}</span></div>`));
    });
    if (asy.some((x) => x.aSurveiller)) box.append(h(`<div class="hint">Plus de 5 % d'écart : fréquent du côté dominant. Commence les exercices unilatéraux par le côté le plus faible et suis l'évolution.</div>`));
    b.append(box);
  }
}

/** Feuille de saisie d'un relevé (16 mesures, date modifiable, unités de l'utilisateur). */
function ouvrirSaisieMesures() {
  const imp = uImp();
  const metrics = Etat.data.metrics || [];
  const auj = jourLocal(new Date().toISOString());
  const dernier = etatAu(metrics, auj);
  const unite = (c) => (c.type === "masse" ? uUnite() : c.type === "pct" ? "%" : uniteLongueur(imp));
  const versAff = (c, v) => (v == null ? "" : c.type === "masse" ? uAff(v) : c.type === "pct" ? v : longueurAffichage(v, imp));
  const sheet = h(`<div class="sheet"><div class="inner mes-saisie"></div></div>`);
  const inner = sheet.querySelector(".inner");
  const fermer = () => sheet.remove();
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0">Nouvelle mesure</h2><button class="chip" id="mesX" aria-label="Fermer">✕</button></div>`));
  inner.append(h(`<label class="mes-date small muted">Date <input type="date" id="mesDate" value="${auj}" max="${auj}"></label>`));
  inner.append(h(`<div class="hint">Remplis seulement ce que tu as mesuré. En gris : ta dernière valeur. Mesure le matin, au même endroit, ruban à plat sans serrer.</div>`));
  for (const g of GROUPES_MESURES) {
    const bloc = h(`<fieldset class="mes-bloc"><legend>${esc(g)}</legend><div class="mes-grille"></div></fieldset>`);
    const grille = bloc.querySelector(".mes-grille");
    CHAMPS_SAISIE.filter((c) => c.groupe === g).forEach((c) => {
      const prec = dernier[c.cle] ? versAff(c, dernier[c.cle].v) : "";
      grille.append(h(`<label class="mes-champ"><span>${esc(c.court)}</span><span class="mes-in"><input inputmode="decimal" data-cle="${c.cle}" placeholder="${esc(String(prec).replace(".", ",")) || "—"}" aria-label="${esc(c.label)} en ${unite(c)}"><i>${unite(c)}</i></span></label>`));
    });
    inner.append(bloc);
  }
  const err = h(`<div class="warn small" hidden></div>`);
  const bOk = h(`<button class="primary big">Enregistrer la mesure</button>`);
  inner.append(err, bOk);
  bOk.addEventListener("click", () => {
    /** @type {Record<string, number>} */
    const valeurs = {};
    inner.querySelectorAll("input[data-cle]").forEach((inp) => {
      const c = champMesure(inp.dataset.cle);
      const brut = inp.value.trim();
      if (!brut) return;
      valeurs[c.cle] = c.type === "masse" ? depuisSaisie(brut, imp)
        : c.type === "pct" ? (Number(brut.replace(",", ".")) || NaN)
        : (longueurDepuisSaisie(brut, imp) ?? NaN);
    });
    // Bornes exprimées dans l'unité de l'utilisateur (pouces, livres) : un
    // message en cm pour une saisie en pouces serait incompréhensible.
    const horsBornes = Object.entries(valeurs).filter(([cle, v]) => {
      const c = champMesure(cle);
      return !Number.isFinite(v) || v < c.min || v > c.max;
    }).map(([cle]) => {
      const c = champMesure(cle);
      return `${c.label} : valeur improbable (attendu entre ${texteMesure(c, c.min)} et ${texteMesure(c, c.max)}).`;
    });
    if (horsBornes.length) { err.hidden = false; err.textContent = horsBornes.join(" "); return; }
    const jour = inner.querySelector("#mesDate").value || auj;
    // Aujourd'hui : l'heure réelle ; un autre jour : midi local (ordre stable).
    const dateISO = jour === auj ? new Date().toISOString() : new Date(jour + "T12:00:00").toISOString();
    const r = construireReleve(valeurs, dateISO, Etat.uid());
    if (r.ok === false) { err.hidden = false; err.textContent = r.erreurs.join(" "); return; }
    Etat.data.metrics.push(r.releve);
    Etat.sauver();
    fermer();
    MES_CMP.b = null;   // la comparaison montre le nouveau relevé
    toast("Mesure enregistrée");
    render();
  });
  sheet.querySelector("#mesX").addEventListener("click", fermer);
  sheet.addEventListener("click", (ev) => { if (ev.target === sheet) fermer(); });
  document.body.append(sheet);
}

/* ======================================================================
   RÉGLAGES
   ====================================================================== */
/** Déclenche le téléchargement d'un fichier texte (CSV) dans le navigateur. */
async function telechargerCSV(contenu, nomFichier) {
  // Dans l'APK, une WebView ne sait pas télécharger : on partage le fichier.
  if (estNatif()) {
    try { if (await partagerFichier(nomFichier, contenu, "Export CSV")) return; } catch (e) { toast("Export impossible sur cet appareil"); return; }
  }
  const blob = new Blob([contenu], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = nomFichier; a.click();
  URL.revokeObjectURL(a.href);
}
/** Dictionnaire fitness — la vue vit dans src/ui/dico.js. */
function vDico(v) {
  vueDico(v, { Etat, nav, render, ouvrirCoach, ouvrirOutils, IC });
}

function vSet(v) {
  const p = Etat.data.profil;
  v.append(h(`<div class="eyebrow">Ton compte</div>`));
  v.append(h(`<h1 style="margin-bottom:14px">Profil</h1>`));

  // Carte profil : avatar + nom + « Modifier le profil »
  const hero = h(`<div class="hero"><span class="glow"></span></div>`);
  const row = h(`<div class="ringstat"></div>`);
  row.append(h(`<div class="avatar">${esc((p.prenom || "A").slice(0, 1).toUpperCase())}</div>`));
  const pi = h(`<div style="flex:1;min-width:0"></div>`);
  pi.append(h(`<h2 style="margin:0 0 1px">${esc(p.prenom || "Athlète")}</h2>`));
  // Sous-titre « 40 ans · 180 cm », comme la carte Profil de FitAI : l'identité
  // tient en une ligne, les mesures qui bougent sont dans les colonnes dessous.
  const ident = [p.age ? `${p.age} ans` : null, p.tailleCm ? `${p.tailleCm} cm` : null].filter(Boolean).join(" · ");
  if (ident) pi.append(h(`<div class="muted small" style="margin-bottom:3px">${esc(ident)}</div>`));
  const bModif = h(`<button class="linklike">Modifier le profil</button>`);
  bModif.addEventListener("click", async () => { if (await confirmer("Modifier ton profil ? Tu repasses par les questions et ton programme est régénéré (ton historique est conservé).", { ok: "Modifier" })) { DRAFT = { ...p }; STEP = 0; Etat.data.profil = null; render(); } });
  pi.append(bModif);
  row.append(pi);
  hero.append(row);
  v.append(hero);

  // 3 colonnes : Objectif · Poids · Fréquence — exactement celles de la carte
  // Profil de FitAI. Elles répondent à « où je vais, où j'en suis, à quel
  // rythme » ; la taille et l'âge ne changent pas et sont remontés au-dessus.
  const ps = h(`<div class="profstats"></div>`);
  ps.append(h(`<div><b>${esc(GOAL_LABELS[p.objectif] || p.objectif || "—")}</b><span>Objectif</span></div>`));
  ps.append(h(`<div><b>${p.poidsKg ? uCharge(p.poidsKg) : "—"}</b><span>Poids</span></div>`));
  ps.append(h(`<div><b>${p.joursParSemaine ? p.joursParSemaine + "/sem." : "—"}</b><span>Fréquence</span></div>`));
  v.append(ps);

  // Lignes d'informations
  const info = h(`<div class="deflist" style="margin-top:12px"></div>`);
  const ligneI = (k, val) => { if (val) info.append(h(`<div class="spread small"><span class="muted">${k}</span><b>${esc(val)}</b></div>`)); };
  ligneI("Objectif", GOAL_LABELS[p.objectif] || p.objectif);
  ligneI("Niveau", LEVEL_LABELS[p.niveau] || p.niveau);
  ligneI("Jours par semaine", `${p.joursParSemaine} jours`);
  ligneI("Répartition", ({ full_body: "Corps entier", haut_bas: "Haut / Bas", push_pull_legs: "Poussée · Tirage · Jambes", bro_split: "Par groupe musculaire" })[p.split] || "Automatique");
  ligneI("Durée de séance", `${p.dureeSeanceMin} min`);
  ligneI("Lieu", p.lieu);
  ligneI("Unité de poids", uImp() ? "Livres (lb)" : "Kilogrammes (kg)");
  v.append(info);

  // Outils (accès aux rubriques hors barre de navigation)
  const outils = h(`<div class="card" style="padding:6px 4px"></div>`);
  const outil = (icone, cls, label, tab) => {
    const b = h(`<button class="plusitem" data-tab="${tab}"><span class="pm-ic ${cls}">${icone}</span><span class="pm-main"><b>${label}</b></span><span class="chev">›</span></button>`);
    b.addEventListener("click", () => nav(tab));
    outils.append(b);
  };
  // « Récupération » a quitté la barre du bas (remplacée par « Progrès ») :
  // elle reste ouverte d'ici et de Progrès ; l'accueil ouvre la feuille « État musculaire ».
  outil(IC.activity, "mi-blue", "Récupération musculaire", "recup");
  outil(IC.apple, "mi-green", "Nutrition", "food");
  outil(IC.dumbbell, "mi-indigo", "Programme Anatoly", "anatoly");
  outil(IC.livre, "mi-blue", "Dictionnaire fitness", "dico");
  const bCoach = h(`<button class="plusitem"><span class="pm-ic mi-blue">${IC.message}</span><span class="pm-main"><b>Coach — poser une question</b></span><span class="chev">›</span></button>`);
  bCoach.addEventListener("click", () => ouvrirCoach());
  outils.append(bCoach);
  const bOutils = h(`<button class="plusitem"><span class="pm-ic mi-orange">${IC.spark}</span><span class="pm-main"><b>Outils de calcul</b><br><span class="muted small">FC cible, macros, 1RM, composition, test vélo</span></span><span class="chev">›</span></button>`);
  bOutils.addEventListener("click", () => ouvrirOutils());
  outils.append(bOutils);
  v.append(outils);

  // Affiner l'entraînement : les réglages retirés de l'onboarding pour le
  // raccourcir à 5 étapes. Ils gardent des valeurs par défaut prudentes.
  section(v, "p-affiner", "Affiner mon entraînement", (b) => {
    const c = h(`<div class="card stack"></div>`);
    c.append(h(`<div class="muted small">Optionnel. Ces réglages précisent la génération de programme et le choix des exercices.</div>`));
    c.append(h(`<div class="eyebrow" style="margin-top:8px">Muscles prioritaires</div>`));
    chips(c, MUSCLES.filter((m) => m !== "corps_entier").map((m) => [m, MUSCLE_LABELS[m]]),
      (val) => (p.musclesPrioritaires || []).includes(val),
      (val) => {
        p.musclesPrioritaires = (p.musclesPrioritaires || []).includes(val)
          ? p.musclesPrioritaires.filter((x) => x !== val) : [...(p.musclesPrioritaires || []), val];
        Etat.sauver();
      });
    c.append(h(`<div class="eyebrow" style="margin-top:12px">Limitations / douleurs déclarées</div>`));
    const LIMS = [["dos", "Dos"], ["epaule", "Épaule"], ["genou", "Genou"], ["poignet", "Poignet"], ["cheville", "Cheville"], ["coude", "Coude"], ["hanche", "Hanche"]];
    chips(c, LIMS, (val) => (p.limitations || []).includes(val),
      (val) => {
        p.limitations = (p.limitations || []).includes(val)
          ? p.limitations.filter((x) => x !== val) : [...(p.limitations || []), val];
        Etat.sauver();
      });
    c.append(h(`<div class="warn small" style="margin-top:10px">${mi(IC.cross, "mi-amber")}Cette app ne remplace pas un professionnel de santé. En cas de douleur, blessure ou maladie, demande un avis médical.</div>`));
    c.append(h(`<div class="eyebrow" style="margin-top:12px">Récupération</div>`));
    field(c, "Qualité de récupération", chipsInline([1, 2, 3, 4, 5].map((n) => [n, `${n}`]),
      (val) => p.recuperation === val, (val) => { p.recuperation = val; Etat.sauver(); }),
      "1 = épuisé en permanence, 5 = toujours frais.");
    const som = h(`<input inputmode="decimal" value="${p.sommeilH ?? 7}" aria-label="Sommeil moyen en heures">`);
    som.addEventListener("input", () => { p.sommeilH = +som.value || 7; Etat.sauver(); });
    field(c, "Sommeil moyen (h)", som);
    field(c, "Niveau de stress", chipsInline([1, 2, 3, 4, 5].map((n) => [n, `${n}`]),
      (val) => p.stress === val, (val) => { p.stress = val; Etat.sauver(); }));
    const bRegen = h(`<button class="secondary big" style="margin-top:10px">Régénérer mon programme avec ces réglages</button>`);
    bRegen.addEventListener("click", async () => {
      if (!await confirmer("Régénérer le programme avec ces réglages ? Ton historique est conservé.", { ok: "Régénérer" })) return;
      Etat.data.programme = genererProgramme(p); Etat.sauver();
      toast("Programme régénéré"); render();
    });
    c.append(bRegen);
    b.append(c);
  });

  // Interface progressive : le mode débutant garde l'écran de séance minimal,
  // le mode avancé débloque les options sans rien retirer au premier.
  section(v, "p-mode", "Mode d'interface", (b) => {
    const c = h(`<div class="card stack"></div>`);
    const av = modeAvance();
    c.append(chipsInline([[false, "Débutant"], [true, "Avancé"]],
      (val) => av === val,
      (val) => { Etat.data.reglages.modeAvance = val; Etat.sauver(); render(); }));
    c.append(h(`<div class="muted small">${av
      ? "Pendant la séance : colonne d'effort visible, types de séries (drop set, rest-pause) en touchant le numéro de série, supersets et tempo."
      : "Pendant la séance : charge, répétitions et validation. Rien d'autre à l'écran."}</div>`));
    if (av) {
      c.append(h(`<div class="eyebrow" style="margin-top:10px">Métrique d'effort</div>`));
      c.append(chipsInline([["rir", "RIR"], ["rpe", "RPE"]],
        (val) => (Etat.data.reglages.metrique || "rir") === val,
        (val) => { Etat.data.reglages.metrique = val; Etat.sauver(); render(); }));
      c.append(h(`<div class="muted small">RIR = répétitions gardées en réserve (2 = tu aurais pu en faire 2 de plus). RPE = effort perçu sur 10. L'historique convertit en RIR pour rester comparable.</div>`));
    }
    b.append(c);
  });

  // Réglages d'entraînement : mode automatique, retour haptique.
  section(v, "p-moteur", "Séance automatique", (b) => {
    const c = h(`<div class="card stack"></div>`);
    const on = Etat.data.reglages.moteurAuto !== false;
    c.append(h(`<div class="muted small">Quand il est actif, l'application analyse ta récupération et construit la prochaine séance à ta place. Ton programme reste disponible dans son onglet.</div>`));
    const bt = h(`<button class="big ${on ? "primary" : "secondary"}">${on ? "Mode automatique actif" : "Activer le mode automatique"}</button>`);
    bt.addEventListener("click", () => {
      Etat.data.reglages.moteurAuto = !on; Etat.sauver();
      toast(on ? "Mode automatique désactivé" : "Mode automatique activé");
      render();
    });
    c.append(bt);
    c.append(h(`<div class="spread" style="margin-top:10px"><span class="small">Retour haptique (vibrations)</span></div>`));
    c.append(chipsInline([[true, "Activé"], [false, "Désactivé"]],
      (val) => (Etat.data.reglages.vibrations !== false) === val,
      (val) => { Etat.data.reglages.vibrations = val; Etat.sauver(); }));
    // `reglages.sons` existait dans le modèle de données depuis le début, sans
    // interrupteur ni le moindre son. Les deux sont là désormais.
    c.append(h(`<div class="spread" style="margin-top:12px"><span class="small">Sons de séance</span></div>`));
    c.append(h(`<div class="hint" style="margin-top:0">Un clic à la validation d'une série, un décompte sur les trois dernières secondes de repos, et un signal quand c'est reparti — pour ne pas avoir à regarder l'écran.</div>`));
    c.append(chipsInline([[true, "Activés"], [false, "Coupés"]],
      (val) => (Etat.data.reglages.sons !== false) === val,
      (val) => {
        Etat.data.reglages.sons = val; Etat.sauver();
        // On fait ENTENDRE le réglage : un interrupteur de son muet est absurde.
        if (val) jouer("reprise", Etat.data.reglages);
      }));

    // Notification de fin de repos — le seul canal qui traverse l'écran
    // verrouillé, puisque son et vibration exigent que la page tourne.
    // Dans l'APK, ce sont des notifications Android natives (programmées à
    // l'heure exacte de fin du repos) : l'API web n'y existe pas.
    const natifNotifs = notifsNativesDispo();
    const en = natifNotifs ? { actif: true, permission: "native", raison: "" } : etatNotifs();
    c.append(h(`<div class="spread" style="margin-top:12px"><span class="small">Prévenir écran verrouillé</span></div>`));
    c.append(h(`<div class="hint" style="margin-top:0">Pendant le repos, le téléphone est posé et l'écran s'éteint : le navigateur gèle la page et le son ne part pas. Une notification, elle, s'affiche sur l'écran de verrouillage.</div>`));
    c.append(chipsInline([[true, "Activé"], [false, "Désactivé"]],
      (val) => (Etat.data.reglages.notifsRepos !== false) === val,
      async (val) => {
        Etat.data.reglages.notifsRepos = val; Etat.sauver();
        // La permission ne peut se demander que depuis un geste : c'en est un.
        if (val && natifNotifs) {
          if (!(await autoriserNotifs())) toast("Notifications refusées — le son et la vibration restent actifs");
        } else if (val && etatNotifs().permission === "default") {
          const ok = await demanderNotifs();
          if (!ok) toast("Notifications refusées — le son et la vibration restent actifs");
        }
        render();
      }));
    // Un interrupteur mort sans explication passe pour un bug de l'app, alors
    // que le blocage vient du navigateur.
    if (Etat.data.reglages.notifsRepos !== false && !en.actif) {
      c.append(h(`<div class="warn small" style="margin-top:8px">${mi(IC.alert, "mi-amber")}${esc(en.raison)}</div>`));
    }

    // REPOS PAR DÉFAUT. Chaque série porte son propre repos, calculé à la
    // génération du programme : juste en théorie, pénible en pratique. Qui
    // s'entraîne en force veut trois minutes PARTOUT et devait jusqu'ici éditer
    // chaque série une par une.
    const libelleRepos = (v) => (v === 0 ? "Programme" : v < 60 ? `${v} s` : v % 60 === 0 ? `${v / 60} min` : `${Math.floor(v / 60)} min ${v % 60}`);
    c.append(h(`<div class="spread" style="margin-top:12px"><span class="small">Repos par défaut</span></div>`));
    c.append(h(`<div class="hint" style="margin-top:0">« Programme » garde le repos prévu pour chaque série. Choisir une durée l'impose partout — pratique quand on travaille en force et qu'on veut le même temps sur tous les mouvements.</div>`));
    c.append(chipsInline(REPOS_CHOIX.map((v) => [v, libelleRepos(v)]),
      (val) => (Number(Etat.data.reglages.reposDefautSec) || 0) === val,
      (val) => { Etat.data.reglages.reposDefautSec = val; Etat.sauver(); render(); }));

    // VOIX DU COACH. Le même interrupteur existe dans le lecteur guidé, là où
    // elle sert ; il est ici pour qui cherche ses réglages à l'endroit habituel.
    const voxOk = voixDisponible();
    c.append(h(`<div class="spread" style="margin-top:12px"><span class="small">Voix du coach</span></div>`));
    c.append(h(`<div class="hint" style="margin-top:0">En séance guidée, l'app annonce l'exercice, la série en cours, la durée du repos et les trois dernières secondes. Ce n'est pas un coach IA : chaque phrase est construite à partir de ta séance, toujours la même, sans réseau.</div>`));
    c.append(chipsInline([[true, "Activée"], [false, "Coupée"]],
      (val) => (Etat.data.reglages.voix === true) === val,
      (val) => {
        Etat.data.reglages.voix = val; Etat.sauver();
        // On fait ENTENDRE le réglage, comme pour les sons : sans retour, on ne
        // sait pas si c'est l'app ou le volume du téléphone qui est muet.
        if (val) dire("Voix activée."); else couperVoix();
        render();
      }));
    if (!voxOk) {
      c.append(h(`<div class="warn small" style="margin-top:8px">${mi(IC.alert, "mi-amber")}Ce navigateur ne propose pas de synthèse vocale : la voix restera silencieuse.</div>`));
    }
    b.append(c);
  });

  // Coach IA (facultatif) — désactivé par défaut, l'app reste déterministe.
  v.append(carteCoachIA());
  v.append(carteCoachCloud());

  const prof = h(`<div class="card stack"></div>`);
  const bReg = h(`<button>Régénérer le programme avec le profil actuel</button>`);
  bReg.addEventListener("click", () => { Etat.data.programme = genererProgramme(p); Etat.sauver(); nav("prog"); toast("Programme régénéré ✔"); });
  prof.append(bReg);
  section(v, "p-prog", "Programme d'entraînement", (b) => b.append(prof));

  const aff = h(`<div class="card stack"></div>`);
  aff.append(h(`<span class="small">Thème</span>`));
  aff.append(chipsInline([["auto", "Auto"], ["light", "Clair"], ["dark", "Sombre"], ["nuit", "Nuit"]], (val) => Etat.data.reglages.theme === val, (val) => { Etat.data.reglages.theme = val; Etat.sauver(); appliquerTheme(); }));
  // Unité de poids : purement d'affichage, l'historique reste stocké en kg et
  // s'affiche aussitôt dans l'autre unité. Une séance déjà commencée garde
  // l'unité dans laquelle elle a été saisie jusqu'à sa fin.
  aff.append(h(`<span class="small" style="margin-top:8px">Unité de poids</span>`));
  aff.append(chipsInline([["metrique", "Kilogrammes (kg)"], ["imperial", "Livres (lb)"]],
    (val) => (Etat.data.reglages.unites === "imperial" ? "imperial" : "metrique") === val,
    (val) => {
      Etat.data.reglages.unites = val;
      if (Etat.data.profil) Etat.data.profil.unites = val;
      Etat.sauver();
      toast(val === "imperial" ? "Charges et poids affichés en livres" : "Charges et poids affichés en kilogrammes");
    }));
  aff.append(h(`<div class="hint" style="margin-top:0">Tout l'historique est converti à l'affichage, rien n'est modifié. Les calculateurs de force et le chargement de barre restent en kg.</div>`));
  section(v, "p-app", "Apparence", (b) => b.append(aff));

  // Démonstrations
  const cwx = h(`<div class="card stack">
    <div class="hint">Les visuels des exercices viennent du dataset GitHub <b>hasaneyldrm/exercises-dataset</b> (référencés par URL, avec attribution), avec repli sur ExerciseDB open-source. La carte musculaire est un SVG intégré adapté de <b>react-muscle-highlighter</b> (licence MIT). Aucune clé requise.</div>
    <div class="hint">Bibliothèque : exercices maison ; exercices de <b>wger.de</b> (licence CC-BY-SA 4.0) ; métadonnées de <b>free-exercise-db</b> (domaine public, sans textes ni images). Calories : MET du <b>2024 Adult Compendium of Physical Activities</b> (Herrmann et al., pacompendium.com).</div></div>`);
  section(v, "p-med", "Démonstrations & sources", (b) => b.append(cwx));

  const don = h(`<div class="card stack">
    <div class="small muted">Tout est stocké localement sur cet appareil, sans compte ni serveur. Seule exception, si tu l'actives : les questions posées au coach IA connecté partent chez le fournisseur choisi (Compte → Coach). Exporte régulièrement une sauvegarde.</div></div>`);
  const bExp = h(`<button><span class="cic">${IC.download || IC.cornerDown}</span>Sauvegarde complète (JSON)</button>`);
  bExp.addEventListener("click", async () => {
    const contenu = JSON.stringify(construireExport(Etat.data), null, 1);
    if (estNatif()) {
      try { if (await partagerFichier(nomFichierBackup(), contenu, `Sauvegarde ${IDENTITE.nom}`)) return; }
      catch (e) { toast("Sauvegarde impossible sur cet appareil"); return; }
    }
    const blob = new Blob([contenu], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nomFichierBackup(); a.click();
    URL.revokeObjectURL(a.href);
  });
  const bImp = h(`<button><span class="cic">${IC.cornerDown}</span>Restaurer une sauvegarde (JSON)</button>`);
  const file = h(`<input type="file" accept=".json,application/json" hidden>`);
  bImp.addEventListener("click", () => file.click());
  file.addEventListener("change", (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      let obj;
      try { obj = JSON.parse(String(r.result)); } catch (e) { await info("Fichier illisible : ce n'est pas un JSON valide.", { titre: "Import impossible" }); file.value = ""; return; }
      const v = validerImport(obj);
      if (!v.ok) { await info(v.erreurs.join("\n"), { titre: "Import impossible" }); file.value = ""; return; }
      const mode = await dialogue({
        titre: "Restaurer cette sauvegarde",
        message: "Fusionner ajoute sans rien perdre (recommandé). Remplacer écrase toutes tes données actuelles.",
        cancelVal: null,
        actions: [
          { label: "Annuler", valeur: null },
          { label: "Remplacer tout", valeur: "remplacer", danger: true },
          { label: "Fusionner", valeur: "fusionner", primary: true },
        ],
      });
      if (!mode) { file.value = ""; return; }
      if (mode === "remplacer" && !(await confirmer("Remplacer définitivement toutes tes données actuelles par cette sauvegarde ?", { danger: true, ok: "Remplacer" }))) { file.value = ""; return; }
      Etat.data = appliquerImport(Etat.data, v.data, mode);
      Etat.sauver();
      file.value = "";
      appliquerTheme();
      if (Etat.data.profil) { $("#tabs").hidden = false; nav("dash"); } else render();
      toast(mode === "fusionner" ? "Sauvegarde fusionnée ✔" : "Données remplacées ✔");
    };
    r.readAsText(f);
  });
  const bExpCsvSeances = h(`<button>Exporter mes séances (CSV)</button>`);
  bExpCsvSeances.addEventListener("click", () => telechargerCSV(seancesVersCSV(Etat.data.logs, (id) => getExercise(id)?.nom || id), nomFichierExport("seances")));
  const bExpCsvPoids = h(`<button>Exporter mon poids/mensurations (CSV)</button>`);
  bExpCsvPoids.addEventListener("click", () => telechargerCSV(metriquesVersCSV(Etat.data.metrics), nomFichierExport("suivi-corporel")));
  const bDel = h(`<button class="danger">Tout effacer</button>`);
  bDel.addEventListener("click", async () => { if (await confirmer("Effacer TOUTES les données (profil, programme, historique) ? Cette action est irréversible.", { danger: true, ok: "Tout effacer" })) { Etat.reset(); DRAFT = null; STEP = 0; $("#tabs").hidden = true; render(); } });
  don.append(bExp, bImp, file, bExpCsvSeances, bExpCsvPoids, bDel);
  section(v, "p-sante", "Santé Connect", (b) => carteSanteConnect(b), { resume: estNatif() ? "lecture seule" : "Android" });
  section(v, "p-data", "Mes données & sauvegarde", (b) => b.append(don));

  v.append(h(`<div class="card flat small muted">${esc(IDENTITE.nom)} — ${esc(IDENTITE.signature)}</div>`));
}

/* ======================================================================
   INIT
   ====================================================================== */
/**
 * Démarrage asynchrone : charge/migre les données (IndexedDB principal,
 * localStorage en secours) AVANT le premier rendu, sans rien effacer.
 */
async function amorcerApp() {
  // Planche anatomique partagée par toutes les vignettes de muscle.
  if (!document.getElementById("anat-sprite")) document.body.insertAdjacentHTML("afterbegin", spriteAnatomie());
  try {
    await Etat.init();
    // Exercices créés par l'utilisateur : dans le catalogue AVANT tout rendu,
    // sinon une routine qui les contient les verrait « indisponibles ».
    enregistrerExercicesPerso(Etat.data.exercicesPerso || []);
    appliquerIdentite();
    appliquerTheme();
    // Exercices de l'extension (wger) présents dans les données : on charge
    // l'extension AVANT le premier rendu (fichier local, mis en cache par le
    // service worker). Sans cela, une séance reprise affichait « Exercice
    // indisponible » et l'historique des identifiants bruts, tant que l'onglet
    // Exercices n'avait pas été ouvert. Plafonné à 1,5 s : au-delà, on rend et
    // on rafraîchit dès que l'extension arrive.
    if (!catalogueEtenduCharge() && idsReferencesInconnus(Etat.data).length) {
      const charge = chargerCatalogueEtendu().catch(() => {});
      const aTemps = await Promise.race([charge.then(() => true), new Promise((r) => setTimeout(() => r(false), 1500))]);
      if (!aTemps) charge.then(() => render());
    }
    // Séance interrompue : on la restaure MAINTENANT, pas à l'ouverture de
    // l'onglet Séance. Tant que `LIVE` restait nul, l'accueil ignorait qu'une
    // séance tournait et proposait « Commencer la séance » — un tap effaçait le
    // travail en cours.
    if (!LIVE && estReprenable(Etat.data.sessionEnCours, trouverSeance)) {
      LIVE = restaurer(Etat.data.sessionEnCours);
    }
    reprendreRepos();   // un repos lancé avant un rechargement doit continuer
    // État réseau INITIAL : les écouteurs `online`/`offline` ne se déclenchent
    // qu'au changement. Ouvrir l'app déjà hors connexion — le cas normal dans une
    // salle en sous-sol — ne montrait donc jamais la bannière.
    majEtatReseau();
    if (Etat.data.profil) {
      $("#tabs").hidden = false;
      // Raccourcis d'app (appui long sur l'icône) : ?vue=train / ?vue=food …
      const vue = new URLSearchParams(location.search).get("vue");
      nav(TABS[vue] ? vue : "dash", true);
    } else { history.replaceState({ tab: null }, ""); render(); }
  } finally {
    // Le splash se retire QUOI QU'IL ARRIVE. Sans ce `finally`, la moindre
    // erreur pendant le premier rendu laissait l'écran de démarrage par-dessus
    // l'application : plus aucun clic ne passait, et un rechargement rejouait
    // exactement la même panne. Une app bloquée est pire qu'un écran incomplet.
    retirerSplash();
  }
}

/**
 * Applique l'identité (src/config/identite.js) à tout ce que le HTML a écrit en
 * dur : titre de l'onglet, nom et sur-titre de l'en-tête, slogan du démarrage.
 * Le HTML garde des valeurs par défaut pour ne pas afficher un en-tête vide le
 * temps que le module se charge ; cette fonction les remplace.
 */
function appliquerIdentite() {
  document.title = titreComplet();
  // Marque et bouton de thème peints ici : en ligne, ils suivent l'accent du
  // thème, ce qu'un <img> isolé ne peut pas faire.
  const lg = document.getElementById("hdLogo");
  if (lg) lg.innerHTML = IC.marque;
  const tb = document.getElementById("themeBtn");
  if (tb) tb.innerHTML = IC.theme;
  const t = document.getElementById("hdTitle");
  if (t) t.textContent = IDENTITE.nom;
  const e = document.getElementById("hdEyebrow");
  if (e) e.textContent = IDENTITE.surTitre;
  const n = document.querySelector("#splash .sp-name");
  if (n) n.textContent = IDENTITE.nom;
  // Le slogan peut être vide : on n'affiche alors rien plutôt qu'une ligne vide.
  const s = document.querySelector("#splash .sp-tag");
  if (s instanceof HTMLElement) { s.textContent = IDENTITE.slogan; s.hidden = !IDENTITE.slogan; }
}

/** Retire l'écran de démarrage (avec son fondu). */
function retirerSplash() {
  const sp = document.getElementById("splash");
  if (!sp) return;
  // AUCUN délai avant de le masquer. Mesuré sur processeur bridé ×4 : l'app
  // était prête à 596 ms mais le splash continuait d'intercepter le tactile
  // jusqu'à 928 ms — un tiers de seconde à taper dans le vide, à chaque
  // ouverture. Le fondu suffit à éviter la coupure brutale, et `.hidden` pose
  // `pointer-events:none` : les taps passent dès la première image.
  sp.classList.add("hidden");
  setTimeout(() => sp.remove(), 320);
}
amorcerApp();
