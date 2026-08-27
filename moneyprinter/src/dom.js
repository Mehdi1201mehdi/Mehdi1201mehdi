/* Fabrique d'éléments et petits utilitaires d'interface. Pas de framework :
   h() suffit, et le DOM reste inspectable tel quel. */

export function h(balise, attrs = {}, enfants = []) {
  const el = document.createElement(balise);
  for (const [cle, valeur] of Object.entries(attrs || {})) {
    if (valeur === null || valeur === undefined || valeur === false) continue;
    if (cle === "class") el.className = valeur;
    else if (cle === "html") el.innerHTML = valeur;
    else if (cle === "text") el.textContent = valeur;
    else if (cle === "style" && typeof valeur === "object") Object.assign(el.style, valeur);
    else if (cle.startsWith("on") && typeof valeur === "function") {
      el.addEventListener(cle.slice(2).toLowerCase(), valeur);
    } else if (cle === "dataset" && typeof valeur === "object") {
      Object.assign(el.dataset, valeur);
    } else el.setAttribute(cle, valeur === true ? "" : valeur);
  }
  const liste = Array.isArray(enfants) ? enfants : [enfants];
  for (const enfant of liste) {
    if (enfant === null || enfant === undefined || enfant === false) continue;
    el.append(enfant instanceof Node ? enfant : document.createTextNode(String(enfant)));
  }
  return el;
}

export const vider = (el) => {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
};

/* ── Icônes ────────────────────────────────────────────────────────────── */
/* Traits SVG 24×24, épaisseur 1.75 — jamais d'emoji comme iconographie. */

const TRACES = {
  etincelle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M3 15h18M8 4v16M16 4v16"/>',
  reglage: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.07a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.07A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.07A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.07A1.7 1.7 0 0 0 21 10.1h.07"/>',
  play: '<path d="M7 4.5v15l12-7.5-12-7.5Z"/>',
  telecharger: '<path d="M12 3v12"/><path d="m7.5 11 4.5 4.5 4.5-4.5"/><path d="M4 20h16"/>',
  partager: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.3 10.8 7.4-4M8.3 13.2l7.4 4"/>',
  poubelle: '<path d="M4 7h16"/><path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2"/><path d="M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12"/><path d="M10.5 11v6M13.5 11v6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  plume: '<path d="M20 4c0 8-6.5 13-13 15"/><path d="M20 4C11 5 6 9 5.5 15.5A5.5 5.5 0 0 0 11 21c6.5-.5 10.5-5.5 9-17Z"/>',
  etiquette: '<path d="M3 12V5.5A2.5 2.5 0 0 1 5.5 3H12l9 9-8.5 8.5L3 12Z"/><circle cx="7.8" cy="7.8" r="1.3"/>',
  serveur: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  alerte: '<path d="M12 4.5 2.8 20h18.4L12 4.5Z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  horloge: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.2 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  croix: '<path d="m6 6 12 12M18 6 6 18"/>',
  retour: '<path d="M15 19 8 12l7-7"/>',
  copier: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
};

export function icone(nom, taille = 22) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", taille);
  svg.setAttribute("height", taille);
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.75");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = TRACES[nom] || "";
  if (nom === "play") svg.setAttribute("fill", "currentColor");
  return svg;
}

/* ── Messages ──────────────────────────────────────────────────────────── */

let porteMessages = null;

export function message(texte, ton = "info") {
  if (!porteMessages) {
    porteMessages = h("div", { class: "messages", role: "status", "aria-live": "polite" });
    document.body.append(porteMessages);
  }
  const bulle = h("div", { class: `message message--${ton}` }, [
    icone(ton === "erreur" ? "alerte" : "check", 18),
    h("span", { text: texte }),
  ]);
  porteMessages.append(bulle);
  setTimeout(() => {
    bulle.classList.add("message--sortie");
    setTimeout(() => bulle.remove(), 260);
  }, ton === "erreur" ? 5200 : 3200);
}

/* ── Composants partagés ───────────────────────────────────────────────── */

export function carte(enfants, attrs = {}) {
  return h("section", { ...attrs, class: `carte ${attrs.class || ""}`.trim() }, enfants);
}

export function titreCarte(texte, nomIcone, aDroite = null) {
  return h("header", { class: "carte-titre" }, [
    nomIcone ? h("span", { class: "carte-titre-icone" }, [icone(nomIcone, 18)]) : null,
    h("h2", { text: texte }),
    aDroite,
  ]);
}

/* Section repliable : garde l'essentiel visible et range le reste à un tap.
   Sur un écran de 360 px, c'est la seule façon d'avoir tous les réglages
   sans un mur de champs. */
export function repli(titre, nomIcone, contenu, { ouvert = false, resume = "" } = {}) {
  const corps = h("div", { class: "repli-corps" }, contenu);
  const marqueur = h("span", { class: "repli-resume", text: resume });
  const bouton = h(
    "button",
    { class: "repli-tete", type: "button", "aria-expanded": ouvert ? "true" : "false" },
    [
      nomIcone ? h("span", { class: "carte-titre-icone" }, [icone(nomIcone, 18)]) : null,
      h("span", { class: "repli-titre", text: titre }),
      marqueur,
      h("span", { class: "repli-chevron" }, [icone("chevron", 18)]),
    ]
  );
  const bloc = h("section", { class: `carte repli ${ouvert ? "repli--ouvert" : ""}` }, [bouton, corps]);
  bouton.addEventListener("click", () => {
    const desormaisOuvert = !bloc.classList.contains("repli--ouvert");
    bloc.classList.toggle("repli--ouvert", desormaisOuvert);
    bouton.setAttribute("aria-expanded", desormaisOuvert ? "true" : "false");
  });
  bloc.majResume = (texte) => { marqueur.textContent = texte; };
  return bloc;
}

export function champ(libelle, controle, aide = "") {
  const id = controle.id || `c${Math.random().toString(36).slice(2, 8)}`;
  controle.id = id;
  return h("div", { class: "champ" }, [
    h("label", { class: "champ-libelle", for: id, text: libelle }),
    controle,
    aide ? h("p", { class: "champ-aide", text: aide }) : null,
  ]);
}

/* Rangée de pastilles : un choix parmi N, lisible et tapable au pouce. */
export function pastilles(options, valeurCourante, auChoix) {
  const rangee = h("div", { class: "pastilles", role: "radiogroup" });
  const boutons = options.map((option) => {
    const actif = String(option.id) === String(valeurCourante);
    const bouton = h(
      "button",
      {
        type: "button",
        class: `pastille ${actif ? "pastille--on" : ""}`,
        role: "radio",
        "aria-checked": actif ? "true" : "false",
      },
      [
        h("span", { class: "pastille-nom", text: option.nom }),
        option.detail ? h("span", { class: "pastille-detail", text: option.detail }) : null,
      ]
    );
    bouton.addEventListener("click", () => {
      boutons.forEach((b) => {
        b.classList.remove("pastille--on");
        b.setAttribute("aria-checked", "false");
      });
      bouton.classList.add("pastille--on");
      bouton.setAttribute("aria-checked", "true");
      auChoix(option.id);
    });
    rangee.append(bouton);
    return bouton;
  });
  return rangee;
}

/* Curseur avec valeur affichée : indispensable quand on règle une vitesse de
   voix ou un volume sans clavier. */
export function curseur({ min, max, pas, valeur, format, auChangement }) {
  const sortie = h("span", { class: "curseur-valeur", text: format(valeur) });
  const entree = h("input", {
    type: "range",
    min,
    max,
    step: pas,
    value: valeur,
    class: "curseur",
  });
  entree.addEventListener("input", () => {
    sortie.textContent = format(Number(entree.value));
    auChangement(Number(entree.value));
  });
  return { bloc: h("div", { class: "curseur-bloc" }, [entree, sortie]), entree };
}

/* Zone de texte qui grandit avec son contenu : sur mobile, une barre de
   défilement interne dans un textarea est une plaie. */
export function texteAuto(attrs = {}) {
  const zone = h("textarea", { rows: 3, ...attrs });
  const ajuster = () => {
    zone.style.height = "auto";
    zone.style.height = Math.min(zone.scrollHeight + 2, 520) + "px";
  };
  zone.addEventListener("input", ajuster);
  requestAnimationFrame(ajuster);
  zone.ajuster = ajuster;
  return zone;
}

export function bouton(texte, { nomIcone, variante = "", type = "button", onClick } = {}) {
  const b = h("button", { type, class: `bouton ${variante}`.trim() }, [
    nomIcone ? icone(nomIcone, 19) : null,
    h("span", { text: texte }),
  ]);
  if (onClick) b.addEventListener("click", onClick);
  b.charger = (actif, texteAttente = "Un instant…") => {
    b.disabled = actif;
    b.classList.toggle("bouton--attente", actif);
    const etiquette = b.querySelector("span");
    if (actif) {
      b.dataset.texte = etiquette.textContent;
      etiquette.textContent = texteAttente;
    } else if (b.dataset.texte) {
      etiquette.textContent = b.dataset.texte;
    }
  };
  return b;
}

export function etatVide(titre, phrase, nomIcone = "film") {
  return h("div", { class: "vide" }, [
    h("span", { class: "vide-icone" }, [icone(nomIcone, 26)]),
    h("h3", { text: titre }),
    h("p", { text: phrase }),
  ]);
}
