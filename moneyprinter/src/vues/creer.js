/* Écran « Créer » : du sujet à la vidéo lancée, en descendant l'écran.
   Trois étapes réelles (sujet → script → mots-clés), puis les réglages rangés
   dans des sections repliées, et un bouton de lancement toujours accessible. */

import * as api from "../api.js";
import {
  reglages, versParametresApi,
  VOIX, POLICES, FORMATS, SOURCES, TRANSITIONS, POSITIONS, MUSIQUES,
} from "../reglages.js";
import {
  h, carte, titreCarte, repli, champ, pastilles, curseur, texteAuto,
  bouton, icone, message,
} from "../dom.js";

const CLE_BROUILLON = "moneyprinter.brouillon.v1";

function lireBrouillon() {
  try {
    return { sujet: "", script: "", motsCles: [], ...(JSON.parse(localStorage.getItem(CLE_BROUILLON)) || {}) };
  } catch {
    return { sujet: "", script: "", motsCles: [] };
  }
}

function ecrireBrouillon(brouillon) {
  try {
    localStorage.setItem(CLE_BROUILLON, JSON.stringify(brouillon));
  } catch { /* stockage indisponible : le brouillon vit le temps de la session */ }
}

export function vueCreer(aller) {
  const brouillon = lireBrouillon();
  const ecran = h("div", { class: "ecran" });

  /* ── 1. Sujet ─────────────────────────────────────────────────────── */

  const zoneSujet = texteAuto({
    placeholder: "Ex. : 3 astuces pour mieux dormir",
    class: "zone",
    maxlength: 500,
  });
  zoneSujet.value = brouillon.sujet;
  zoneSujet.addEventListener("input", () => {
    brouillon.sujet = zoneSujet.value;
    ecrireBrouillon(brouillon);
    majLancement();
  });

  const boutonScript = bouton("Écrire le script", { nomIcone: "plume", variante: "bouton--fort" });

  const carteSujet = carte([
    titreCarte("Sujet de la vidéo", "etincelle"),
    h("p", { class: "carte-phrase", text: "Une phrase suffit. Le moteur s'occupe du reste." }),
    zoneSujet,
    boutonScript,
  ]);

  /* ── 2. Script ────────────────────────────────────────────────────── */

  const compteur = h("span", { class: "compteur", text: "" });
  const zoneScript = texteAuto({
    placeholder: "Le script apparaîtra ici. Tu peux le réécrire librement.",
    class: "zone zone--script",
  });
  zoneScript.value = brouillon.script;

  function majCompteur() {
    const n = zoneScript.value.trim().length;
    const secondes = Math.round(n / 14);
    compteur.textContent = n ? `${n} caractères · ~${secondes} s de voix` : "";
  }
  zoneScript.addEventListener("input", () => {
    brouillon.script = zoneScript.value;
    ecrireBrouillon(brouillon);
    majCompteur();
    majLancement();
  });
  majCompteur();

  const boutonMots = bouton("Trouver les images", { nomIcone: "etiquette" });

  const carteScript = carte([
    titreCarte("Script", "plume", compteur),
    zoneScript,
    boutonMots,
  ]);

  /* ── 3. Mots-clés ─────────────────────────────────────────────────── */

  let motsCles = Array.isArray(brouillon.motsCles) ? [...brouillon.motsCles] : [];
  const listeMots = h("div", { class: "mots" });

  function dessinerMots() {
    listeMots.replaceChildren();
    if (!motsCles.length) {
      listeMots.append(
        h("p", { class: "carte-phrase", text: "Aucun mot-clé. Le moteur cherchera à partir du sujet." })
      );
    }
    motsCles.forEach((mot, index) => {
      const puce = h("span", { class: "mot" }, [
        h("span", { text: mot }),
        h("button", { type: "button", class: "mot-retirer", "aria-label": `Retirer ${mot}` }, [icone("croix", 14)]),
      ]);
      puce.querySelector("button").addEventListener("click", () => {
        motsCles.splice(index, 1);
        brouillon.motsCles = motsCles;
        ecrireBrouillon(brouillon);
        dessinerMots();
      });
      listeMots.append(puce);
    });
    const ajout = h("input", {
      type: "text",
      class: "mot-ajout",
      placeholder: "+ ajouter",
      "aria-label": "Ajouter un mot-clé",
    });
    ajout.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const valeur = ajout.value.trim();
      if (!valeur) return;
      motsCles.push(valeur);
      brouillon.motsCles = motsCles;
      ecrireBrouillon(brouillon);
      dessinerMots();
      ecran.querySelector(".mot-ajout")?.focus();
    });
    listeMots.append(ajout);
  }
  dessinerMots();

  const carteMots = carte([
    titreCarte("Mots-clés des images", "etiquette"),
    h("p", { class: "carte-phrase", text: "Ils pilotent la recherche de rushes. En anglais, la banque d'images trouve davantage." }),
    listeMots,
  ]);

  /* ── Réglages repliés ─────────────────────────────────────────────── */

  const replis = [
    replisVideo(),
    replisVoix(),
    replisSousTitres(),
    replisMusique(),
  ];

  /* ── Lancement ────────────────────────────────────────────────────── */

  const boutonLancer = bouton("Lancer la production", { nomIcone: "film", variante: "bouton--fort bouton--large" });
  const barre = h("div", { class: "barre-action" }, [boutonLancer]);

  function majLancement() {
    boutonLancer.disabled = !zoneSujet.value.trim() && !zoneScript.value.trim();
  }
  majLancement();

  /* ── Actions ──────────────────────────────────────────────────────── */

  boutonScript.addEventListener("click", async () => {
    const sujet = zoneSujet.value.trim();
    if (!sujet) {
      message("Écris d'abord un sujet.", "erreur");
      zoneSujet.focus();
      return;
    }
    boutonScript.charger(true, "Rédaction…");
    try {
      const script = await api.ecrireScript({
        sujet,
        langue: reglages.get("langue"),
        paragraphes: reglages.get("paragraphes"),
        consigne: reglages.get("consigne"),
      });
      if (!script) throw new Error("Le moteur a renvoyé un script vide.");
      zoneScript.value = script;
      zoneScript.ajuster();
      brouillon.script = script;
      ecrireBrouillon(brouillon);
      majCompteur();
      majLancement();
      carteScript.scrollIntoView({ behavior: "smooth", block: "start" });
      message("Script écrit.");
    } catch (err) {
      message(err.message, "erreur");
    } finally {
      boutonScript.charger(false);
    }
  });

  boutonMots.addEventListener("click", async () => {
    const script = zoneScript.value.trim();
    if (!script) {
      message("Il faut un script avant de chercher les images.", "erreur");
      return;
    }
    boutonMots.charger(true, "Recherche…");
    try {
      const trouves = await api.trouverMotsCles({
        sujet: zoneSujet.value.trim() || script.slice(0, 80),
        script,
        nombre: 5,
      });
      motsCles = trouves;
      brouillon.motsCles = motsCles;
      ecrireBrouillon(brouillon);
      dessinerMots();
      carteMots.scrollIntoView({ behavior: "smooth", block: "start" });
      message(`${trouves.length} mots-clés trouvés.`);
    } catch (err) {
      message(err.message, "erreur");
    } finally {
      boutonMots.charger(false);
    }
  });

  boutonLancer.addEventListener("click", async () => {
    const sujet = zoneSujet.value.trim();
    const script = zoneScript.value.trim();
    if (!sujet && !script) {
      message("Il faut au moins un sujet.", "erreur");
      return;
    }
    boutonLancer.charger(true, "Envoi…");
    try {
      const params = versParametresApi({ sujet: sujet || script.slice(0, 120), script, motsCles });
      const idTache = await api.lancerVideo(params);
      message("Production lancée. Suis-la dans Vidéos.");
      aller("#/videos", { nouvelle: idTache });
    } catch (err) {
      message(err.message, "erreur");
    } finally {
      boutonLancer.charger(false);
    }
  });

  ecran.append(carteSujet, carteScript, carteMots, ...replis, barre);
  return ecran;
}

/* ── Blocs de réglages ─────────────────────────────────────────────────── */

function replisVideo() {
  const resume = () => {
    const f = FORMATS.find((x) => x.id === reglages.get("format"));
    const s = SOURCES.find((x) => x.id === reglages.get("source"));
    return `${f ? f.nom : ""} · ${s ? s.nom : ""}`;
  };
  const bloc = repli("Image", "film", [], { resume: resume() });
  const rafraichir = () => bloc.majResume(resume());

  const corps = bloc.querySelector(".repli-corps");
  corps.append(
    champ("Format", pastilles(FORMATS, reglages.get("format"), (v) => { reglages.set("format", v); rafraichir(); })),
    champ("Source des rushes", pastilles(SOURCES, reglages.get("source"), (v) => { reglages.set("source", v); rafraichir(); }),
      "Pexels et Pixabay demandent une clé gratuite dans config.toml côté serveur."),
    champ("Ordre des plans", pastilles(
      [{ id: "random", nom: "Aléatoire" }, { id: "sequential", nom: "Séquentiel" }],
      reglages.get("ordre"), (v) => reglages.set("ordre", v)
    )),
    champ("Transition", pastilles(TRANSITIONS, reglages.get("transition"), (v) => reglages.set("transition", v))),
    champ("Durée d'un plan",
      curseur({
        min: 2, max: 10, pas: 1, valeur: reglages.get("dureeClip"),
        format: (v) => `${v} s`,
        auChangement: (v) => reglages.set("dureeClip", v),
      }).bloc),
    champ("Nombre de vidéos",
      curseur({
        min: 1, max: 5, pas: 1, valeur: reglages.get("nombreVideos"),
        format: (v) => (v > 1 ? `${v} variantes` : "1 vidéo"),
        auChangement: (v) => reglages.set("nombreVideos", v),
      }).bloc,
      "Plusieurs variantes du même script, avec des plans différents.")
  );
  return bloc;
}

function replisVoix() {
  const nomVoix = () => {
    const v = VOIX.find((x) => x.id === reglages.get("voix"));
    return v ? v.nom : "Voix";
  };
  const bloc = repli("Voix", "plume", [], { resume: nomVoix() });
  const rafraichir = () => bloc.majResume(nomVoix());
  const corps = bloc.querySelector(".repli-corps");

  corps.append(
    champ("Voix de synthèse", pastilles(VOIX, reglages.get("voix"), (v) => { reglages.set("voix", v); rafraichir(); })),
    champ("Débit",
      curseur({
        min: 0.6, max: 1.6, pas: 0.05, valeur: reglages.get("vitesse"),
        format: (v) => `${v.toFixed(2)}×`,
        auChangement: (v) => reglages.set("vitesse", v),
      }).bloc),
    champ("Volume de la voix",
      curseur({
        min: 0.2, max: 2, pas: 0.1, valeur: reglages.get("volumeVoix"),
        format: (v) => `${Math.round(v * 100)} %`,
        auChangement: (v) => reglages.set("volumeVoix", v),
      }).bloc)
  );
  return bloc;
}

function replisSousTitres() {
  const resume = () => (reglages.get("sousTitres") ? "Activés" : "Désactivés");
  const bloc = repli("Sous-titres", "etiquette", [], { resume: resume() });
  const corps = bloc.querySelector(".repli-corps");

  const interrupteur = h("button", {
    type: "button",
    class: `bascule ${reglages.get("sousTitres") ? "bascule--on" : ""}`,
    role: "switch",
    "aria-checked": reglages.get("sousTitres") ? "true" : "false",
    "aria-label": "Afficher les sous-titres",
  }, [h("span", { class: "bascule-piste" }, [h("span", { class: "bascule-pouce" })])]);

  const reste = h("div", { class: "champs" });

  function majAffichage() {
    const actif = Boolean(reglages.get("sousTitres"));
    reste.hidden = !actif;
    bloc.majResume(resume());
  }

  interrupteur.addEventListener("click", () => {
    const actif = !reglages.get("sousTitres");
    reglages.set("sousTitres", actif);
    interrupteur.classList.toggle("bascule--on", actif);
    interrupteur.setAttribute("aria-checked", actif ? "true" : "false");
    majAffichage();
  });

  const couleurTexte = h("input", { type: "color", class: "couleur", value: reglages.get("couleurTexte") });
  couleurTexte.addEventListener("input", () => reglages.set("couleurTexte", couleurTexte.value.toUpperCase()));
  const couleurContour = h("input", { type: "color", class: "couleur", value: reglages.get("couleurContour") });
  couleurContour.addEventListener("input", () => reglages.set("couleurContour", couleurContour.value.toUpperCase()));

  reste.append(
    champ("Position", pastilles(POSITIONS, reglages.get("position"), (v) => reglages.set("position", v))),
    champ("Police", pastilles(POLICES, reglages.get("police"), (v) => reglages.set("police", v)),
      "Les polices chinoises livrées avec le moteur rendent mal les accents : celles-ci sont sûres."),
    champ("Taille",
      curseur({
        min: 30, max: 110, pas: 2, valeur: reglages.get("taillePolice"),
        format: (v) => `${v} px`,
        auChangement: (v) => reglages.set("taillePolice", v),
      }).bloc),
    h("div", { class: "duo" }, [
      champ("Couleur du texte", couleurTexte),
      champ("Couleur du contour", couleurContour),
    ]),
    champ("Épaisseur du contour",
      curseur({
        min: 0, max: 5, pas: 0.5, valeur: reglages.get("epaisseurContour"),
        format: (v) => (v === 0 ? "Aucun" : `${v} px`),
        auChangement: (v) => reglages.set("epaisseurContour", v),
      }).bloc)
  );

  corps.append(
    h("div", { class: "ligne-bascule" }, [
      h("span", { class: "ligne-bascule-texte", text: "Afficher les sous-titres" }),
      interrupteur,
    ]),
    reste
  );
  majAffichage();
  return bloc;
}

function replisMusique() {
  const resume = () => {
    const m = MUSIQUES.find((x) => x.id === reglages.get("musique"));
    return m ? m.nom : "Aléatoire";
  };
  const bloc = repli("Musique", "etincelle", [], { resume: resume() });
  const corps = bloc.querySelector(".repli-corps");

  const choixFichier = h("select", { class: "selection" });
  const blocFichier = champ("Piste", choixFichier, "Fichiers présents dans storage/bgm et resource/songs.");
  blocFichier.hidden = reglages.get("musique") !== "custom";

  let musiquesChargees = false;
  async function chargerMusiques() {
    if (musiquesChargees) return;
    try {
      const fichiers = await api.listerMusiques();
      choixFichier.replaceChildren();
      fichiers.forEach((f) => {
        choixFichier.append(h("option", { value: f.file, text: f.name }));
      });
      if (reglages.get("fichierMusique")) choixFichier.value = reglages.get("fichierMusique");
      else if (fichiers[0]) reglages.set("fichierMusique", fichiers[0].file);
      musiquesChargees = true;
    } catch (err) {
      message(err.message, "erreur");
    }
  }
  choixFichier.addEventListener("change", () => reglages.set("fichierMusique", choixFichier.value));

  const volume = curseur({
    min: 0, max: 1, pas: 0.05, valeur: reglages.get("volumeMusique"),
    format: (v) => `${Math.round(v * 100)} %`,
    auChangement: (v) => reglages.set("volumeMusique", v),
  });
  const blocVolume = champ("Volume de la musique", volume.bloc);
  blocVolume.hidden = reglages.get("musique") === "";

  corps.append(
    champ("Fond sonore", pastilles(MUSIQUES, reglages.get("musique"), (v) => {
      reglages.set("musique", v);
      bloc.majResume(resume());
      blocFichier.hidden = v !== "custom";
      blocVolume.hidden = v === "";
      if (v === "custom") chargerMusiques();
    })),
    blocFichier,
    blocVolume
  );
  if (reglages.get("musique") === "custom") chargerMusiques();
  return bloc;
}
