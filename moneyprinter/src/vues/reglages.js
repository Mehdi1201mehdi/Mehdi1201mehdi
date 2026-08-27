/* Écran « Réglages » : le lien avec le moteur, et les préférences par défaut
   qui ne changent pas d'une vidéo à l'autre. */

import * as api from "../api.js";
import { reglages } from "../reglages.js";
import { h, carte, titreCarte, champ, bouton, message, repli, curseur } from "../dom.js";

export function vueReglages() {
  const ecran = h("div", { class: "ecran" });

  /* ── Connexion au moteur ──────────────────────────────────────────── */

  const memeOrigine = api.origineAutoDetectee();

  const champAdresse = h("input", {
    type: "url",
    class: "saisie",
    inputmode: "url",
    autocapitalize: "off",
    autocorrect: "off",
    spellcheck: "false",
    placeholder: "http://192.168.1.20:8080",
    value: reglages.get("apiBase"),
  });
  champAdresse.addEventListener("change", () => {
    reglages.set("apiBase", champAdresse.value.trim().replace(/\/+$/, ""));
    majEtat("inconnu");
  });

  const champCle = h("input", {
    type: "password",
    class: "saisie",
    autocapitalize: "off",
    autocorrect: "off",
    spellcheck: "false",
    placeholder: "Vide si non demandée",
    value: reglages.get("apiKey"),
  });
  champCle.addEventListener("change", () => reglages.set("apiKey", champCle.value.trim()));

  const voyant = h("div", { class: "voyant voyant--inconnu" }, [
    h("span", { class: "voyant-point" }),
    h("span", { class: "voyant-texte", text: "Connexion non vérifiée" }),
  ]);

  function majEtat(etat, texte) {
    voyant.className = `voyant voyant--${etat}`;
    voyant.querySelector(".voyant-texte").textContent =
      texte ||
      { ok: "Moteur joignable", ko: "Moteur injoignable", inconnu: "Connexion non vérifiée" }[etat];
  }

  const boutonTest = bouton("Tester la connexion", { nomIcone: "serveur", variante: "bouton--fort" });
  boutonTest.addEventListener("click", async () => {
    const saisie = champAdresse.value.trim().replace(/\/+$/, "");
    reglages.set("apiBase", saisie);
    reglages.set("apiKey", champCle.value.trim());
    boutonTest.charger(true, "Test…");
    majEtat("inconnu", "Test en cours…");
    try {
      await api.ping(saisie || undefined);
      majEtat("ok");
      message("Moteur joignable.");
    } catch (err) {
      majEtat("ko", err.message);
    } finally {
      boutonTest.charger(false);
    }
  });

  const carteServeur = carte([
    titreCarte("Moteur MoneyPrinterTurbo", "serveur"),
    memeOrigine
      ? h("p", { class: "carte-phrase", text: "Cette page est servie par le moteur lui-même : rien à configurer. Laisse l'adresse vide." })
      : h("p", { class: "carte-phrase", text: "Adresse du serveur qui fabrique les vidéos, telle qu'elle s'ouvre dans le navigateur du téléphone." }),
    champ("Adresse du serveur", champAdresse, "Sans barre oblique finale. Vide = même serveur que cette page."),
    champ("Clé d'API", champCle, "Seulement si api_key est renseigné dans config.toml côté serveur."),
    voyant,
    boutonTest,
  ]);

  /* ── Écriture ─────────────────────────────────────────────────────── */

  const champLangue = h("select", { class: "selection" }, [
    h("option", { value: "fr-FR", text: "Français" }),
    h("option", { value: "en-US", text: "Anglais" }),
    h("option", { value: "es-ES", text: "Espagnol" }),
    h("option", { value: "de-DE", text: "Allemand" }),
    h("option", { value: "it-IT", text: "Italien" }),
    h("option", { value: "ar-SA", text: "Arabe" }),
    h("option", { value: "", text: "Détection automatique" }),
  ]);
  champLangue.value = reglages.get("langue");
  champLangue.addEventListener("change", () => reglages.set("langue", champLangue.value));

  const champConsigne = h("textarea", {
    class: "zone",
    rows: 3,
    maxlength: 2000,
    placeholder: "Ex. : ton direct, phrases courtes, pas d'introduction, termine par une question.",
  });
  champConsigne.value = reglages.get("consigne");
  champConsigne.addEventListener("change", () => reglages.set("consigne", champConsigne.value));

  const carteEcriture = carte([
    titreCarte("Écriture", "plume"),
    champ("Langue du script", champLangue),
    champ("Longueur",
      curseur({
        min: 1, max: 6, pas: 1, valeur: reglages.get("paragraphes"),
        format: (v) => (v === 1 ? "1 paragraphe" : `${v} paragraphes`),
        auChangement: (v) => reglages.set("paragraphes", v),
      }).bloc,
      "Un paragraphe ≈ 20 à 30 secondes de vidéo."),
    champ("Consigne de style", champConsigne, "Ajoutée à la demande envoyée au modèle de langage."),
  ]);

  /* ── Avancé ───────────────────────────────────────────────────────── */

  const carteAvance = repli("Avancé", "reglage", [
    champ("Fils de calcul du montage",
      curseur({
        min: 1, max: 8, pas: 1, valeur: reglages.get("fils"),
        format: (v) => `${v} fil${v > 1 ? "s" : ""}`,
        auChangement: (v) => reglages.set("fils", v),
      }).bloc,
      "Plus de fils accélère le montage mais charge la machine qui héberge le moteur."),
    h("div", { class: "champ" }, [
      h("span", { class: "champ-libelle", text: "Réinitialiser" }),
      bouton("Remettre les réglages par défaut", {
        nomIcone: "retour",
        variante: "bouton--discret",
        onClick: () => {
          reglages.reinitialiser({ garderServeur: true });
          message("Réglages remis à zéro. L'adresse du serveur est conservée.");
          setTimeout(() => location.reload(), 700);
        },
      }),
    ]),
  ]);

  /* ── Aide ─────────────────────────────────────────────────────────── */

  const carteAide = carte([
    titreCarte("Comment ça marche", "etincelle"),
    h("ol", { class: "aide" }, [
      h("li", { html: "Le <b>moteur</b> (MoneyPrinterTurbo) tourne sur un ordinateur : c'est lui qui écrit, télécharge les rushes, synthétise la voix et monte." }),
      h("li", { html: "Cette <b>application</b> est la télécommande : elle ne fabrique rien toute seule, elle pilote le moteur." }),
      h("li", { html: "Le téléphone doit pouvoir joindre l'ordinateur : même Wi-Fi, ou tunnel type Tailscale / Cloudflare." }),
      h("li", { html: "Les clés (modèle de langage, Pexels) se renseignent dans <code>config.toml</code> côté serveur, jamais ici." }),
    ]),
  ]);

  ecran.append(carteServeur, carteEcriture, carteAvance, carteAide);

  /* Vérification discrète à l'ouverture : autant savoir tout de suite.
     Si l'origine vient d'être détectée au démarrage, inutile de la retester. */
  if (api.origineAutoDetectee()) majEtat("ok");
  else if (api.baseDefinie()) {
    api.ping().then(() => majEtat("ok")).catch((err) => majEtat("ko", err.message));
  }

  return ecran;
}
