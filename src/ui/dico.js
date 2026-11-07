// @ts-check
/**
 * Écran « Dictionnaire » : recherche instantanée, catégories, favoris, fiche
 * détaillée avec renvois et lien vers l'écran concerné de l'application.
 *
 * Module extrait d'app.js : il ne connaît de l'application que ce qu'on lui
 * passe dans `ctx` (état, navigation, ouverture du coach…). Les données sont
 * chargées à la première ouverture (import dynamique) : elles ne pèsent rien au
 * démarrage.
 */
import { esc, h } from "./dom.js";
import { IDENTITE } from "../config/identite.js";
import {
  chercher, grouperParLettre, termesLies, compterParCategorie, termeDuJour, normaliser,
} from "../engine/dictionnaire.js";

/**
 * @typedef {object} CtxDico
 * @property {any} Etat                       état persistant de l'app
 * @property {(tab:string)=>void} nav         navigation vers un onglet
 * @property {()=>void} render                redessine la vue courante
 * @property {()=>void} ouvrirCoach
 * @property {()=>void} ouvrirOutils
 * @property {Record<string,string>} IC        icônes SVG
 */

/** @type {null | typeof import("../data/dictionnaire.js")} */
let DATA = null;
/** @type {Promise<any> | null} */
let CHARGEMENT = null;
// État d'écran : survit à un changement d'onglet, comme les filtres du catalogue.
let Q = "";
let CAT = "";
let FAV_SEUL = false;

/** Charge les données une fois. */
function charger() {
  if (DATA) return Promise.resolve(DATA);
  if (!CHARGEMENT) CHARGEMENT = import("../data/dictionnaire.js").then((m) => { DATA = m; return m; });
  return CHARGEMENT;
}

/** Libellé d'une catégorie. */
const nomCat = (id) => (DATA?.CATEGORIES_DICO.find((c) => c.id === id)?.nom) || id;

/** Favoris du dictionnaire (liste d'identifiants). */
function favoris(ctx) {
  const f = ctx.Etat.data.dicoFavoris;
  return Array.isArray(f) ? f : [];
}
function basculer(ctx, id) {
  const f = favoris(ctx);
  ctx.Etat.data.dicoFavoris = f.includes(id) ? f.filter((x) => x !== id) : [id, ...f];
  ctx.Etat.sauver();
}

/** Ouvre l'écran ou l'action liée à un terme. */
function allerVers(ctx, ecran) {
  if (ecran === "coach") return ctx.ouvrirCoach();
  if (ecran === "outils") return ctx.ouvrirOutils();
  ctx.nav(ecran);
}

/** Libellé du bouton « Ouvrir » selon la destination. */
const LIBELLE_ECRAN = {
  dash: "Ouvrir l'onglet Séance", prog: "Ouvrir mes routines", cat: "Ouvrir les exercices",
  recup: "Ouvrir la récupération", set: "Ouvrir mon compte", stats: "Ouvrir mes progrès",
  food: "Ouvrir la nutrition", anatoly: "Ouvrir le programme Anatoly",
  coach: "Ouvrir le coach", outils: "Ouvrir les outils de calcul",
};

/**
 * Vue principale.
 * @param {HTMLElement} v
 * @param {CtxDico} ctx
 */
export function vueDico(v, ctx) {
  const { IC } = ctx;
  v.append(h(`<div class="dash-hi"><div><span class="eyebrow">Ton lexique</span><h1>Dictionnaire</h1></div></div>`));
  if (!DATA) {
    v.append(h(`<div class="card dico-charge" role="status"><div class="spin"></div><span class="muted small">Chargement du dictionnaire…</span></div>`));
    charger().then(() => ctx.render()).catch(() => {
      v.innerHTML = "";
      v.append(h(`<div class="card warn">Le dictionnaire n'a pas pu être chargé. Vérifie ta connexion lors de la première ouverture, il sera ensuite disponible hors ligne.</div>`));
    });
    return;
  }
  const { TERMES, CATEGORIES_DICO, TERMES_PAR_ID } = DATA;
  const n = compterParCategorie(TERMES);

  v.append(h(`<p class="muted small dico-intro">${TERMES.length} termes de musculation, d'anatomie, de biomécanique, de cardio, de nutrition et de récupération, expliqués simplement — avec leur place dans l'app.</p>`));

  // Recherche : seule la liste se redessine à la frappe, pour garder le focus
  // et le clavier ouverts.
  const recherche = h(`<label class="dico-search"><span class="dico-search-ic" aria-hidden="true">${IC.search}</span>
    <input type="search" id="dicoQ" enterkeyhint="search" autocomplete="off" spellcheck="false"
      placeholder="RIR, drop set, créatine…" aria-label="Rechercher un terme" value="${esc(Q)}"></label>`);
  v.append(recherche);

  // Catégories + favoris : une seule bande défilante.
  const rail = h(`<div class="row cat-fline dico-rail" role="toolbar" aria-label="Filtrer par catégorie"></div>`);
  const nbFav = favoris(ctx).filter((id) => TERMES_PAR_ID[id]).length;
  const puce = (label, actif, onClick, extra = "") => {
    const b = h(`<button class="chip${actif ? " on" : ""}" aria-pressed="${actif}" type="button">${extra}<span>${esc(label)}</span></button>`);
    b.addEventListener("click", onClick);
    rail.append(b);
  };
  puce("Tous", !CAT && !FAV_SEUL, () => { CAT = ""; FAV_SEUL = false; ctx.render(); });
  puce(`Favoris${nbFav ? " · " + nbFav : ""}`, FAV_SEUL, () => { FAV_SEUL = !FAV_SEUL; ctx.render(); }, `<span class="dico-chip-ic" aria-hidden="true">${IC.star}</span>`);
  const puceFav = rail.lastElementChild;
  const majPuceFavoris = () => {
    const nb = favoris(ctx).filter((id) => TERMES_PAR_ID[id]).length;
    const span = puceFav && puceFav.querySelector("span:last-child");
    if (span) span.textContent = `Favoris${nb ? " · " + nb : ""}`;
  };
  for (const c of CATEGORIES_DICO) {
    puce(`${c.nom} · ${n[c.id] || 0}`, CAT === c.id, () => { CAT = CAT === c.id ? "" : c.id; ctx.render(); });
  }
  v.append(rail);

  const zone = h(`<div class="dico-zone"></div>`);
  v.append(zone);

  const dessiner = () => {
    zone.innerHTML = "";
    const libre = !normaliser(Q) && !CAT && !FAV_SEUL;

    // Terme du jour : une porte d'entrée quand on ne cherche rien de précis.
    if (libre) {
      const t = termeDuJour(TERMES, new Date().toISOString().slice(0, 10));
      if (t) {
        const carte = h(`<button class="card dico-jour" type="button">
          <span class="eyebrow accent">Terme du jour</span>
          <b class="dico-jour-t">${esc(t.terme)}</b>
          <span class="muted small">${esc(t.def)}</span>
          <span class="dico-jour-cta">Lire la fiche <span aria-hidden="true">›</span></span></button>`);
        carte.addEventListener("click", () => ouvrirTermeDico(t, ctx));
        zone.append(carte);
      }
    }

    const res = chercher(TERMES, { q: Q, cat: CAT, favoris: favoris(ctx), seulsFavoris: FAV_SEUL });
    const cat = CAT ? CATEGORIES_DICO.find((c) => c.id === CAT) : null;
    zone.append(h(`<div class="spread dico-compte"><span class="muted small" aria-live="polite">${res.length} terme${res.length > 1 ? "s" : ""}${cat ? ` · ${esc(cat.desc)}` : ""}</span></div>`));

    if (!res.length) {
      const vide = h(`<div class="card dico-vide"></div>`);
      if (FAV_SEUL && !normaliser(Q)) {
        vide.append(h(`<b>Aucun favori pour l'instant</b>`));
        vide.append(h(`<span class="muted small">Touche l'étoile d'un terme pour le retrouver ici, même hors ligne.</span>`));
      } else {
        vide.append(h(`<b>Aucun terme ne correspond à « ${esc(Q)} »</b>`));
        vide.append(h(`<span class="muted small">Essaie un synonyme ou l'équivalent anglais (« PR », « set », « bulk »), ou pose la question au coach.</span>`));
        const b = h(`<button class="secondary" type="button">Demander au coach</button>`);
        b.addEventListener("click", () => ctx.ouvrirCoach());
        vide.append(b);
      }
      if (CAT || FAV_SEUL) {
        const raz = h(`<button class="linklike" type="button">Voir tous les termes</button>`);
        raz.addEventListener("click", () => { CAT = ""; FAV_SEUL = false; ctx.render(); });
        vide.append(raz);
      }
      zone.append(vide);
      return;
    }

    const fav = new Set(favoris(ctx));
    const ligne = (t) => {
      const on = fav.has(t.id);
      const row = h(`<div class="dico-ligne">
        <button class="dico-item" type="button">
          <span class="dico-item-t">${esc(t.terme)}</span>
          <span class="dico-item-d">${esc(t.def)}</span>
          ${!CAT ? `<span class="dico-item-c">${esc(nomCat(t.cat))}</span>` : ""}
        </button>
        <button class="cat-fav${on ? " on" : ""}" type="button" aria-pressed="${on}" aria-label="${on ? "Retirer" : "Ajouter"} « ${esc(t.terme)} » ${on ? "des" : "aux"} favoris">${IC.star}</button>
      </div>`);
      row.querySelector(".dico-item").addEventListener("click", () => ouvrirTermeDico(t, ctx));
      const etoile = row.querySelector(".cat-fav");
      etoile.addEventListener("click", () => {
        basculer(ctx, t.id);
        majPuceFavoris();
        // Retirer un favori depuis la vue « Favoris » doit le faire disparaître ;
        // ailleurs, on bascule l'étoile sur place : redessiner la liste ferait
        // sauter le défilement au milieu d'une lecture.
        if (FAV_SEUL) { dessiner(); return; }
        const actif = favoris(ctx).includes(t.id);
        etoile.classList.toggle("on", actif);
        etoile.setAttribute("aria-pressed", String(actif));
        etoile.setAttribute("aria-label", `${actif ? "Retirer" : "Ajouter"} « ${t.terme} » ${actif ? "des" : "aux"} favoris`);
      });
      return row;
    };

    // Avec une requête, l'ordre est celui de la pertinence : pas d'intertitres
    // alphabétiques, qui feraient croire à un tri qui n'existe pas.
    if (normaliser(Q)) {
      const liste = h(`<div class="card dico-liste"></div>`);
      res.forEach((t) => liste.append(ligne(t)));
      zone.append(liste);
    } else {
      for (const g of grouperParLettre(res)) {
        zone.append(h(`<h2 class="dico-lettre" id="dico-${g.lettre}">${g.lettre}</h2>`));
        const liste = h(`<div class="card dico-liste"></div>`);
        g.termes.forEach((t) => liste.append(ligne(t)));
        zone.append(liste);
      }
    }
  };
  dessiner();

  const inp = recherche.querySelector("input");
  inp.addEventListener("input", () => { Q = inp.value; dessiner(); });
}

/**
 * Fiche d'un terme (feuille plein écran). Un renvoi « Voir aussi » remplace le
 * contenu de la feuille au lieu d'empiler les feuilles.
 * @param {any} t
 * @param {CtxDico} ctx
 */
export function ouvrirTermeDico(t, ctx) {
  if (!DATA) { charger().then(() => ouvrirTermeDico(t, ctx)); return; }
  document.getElementById("dicoSheet")?.remove();
  const { IC } = ctx;
  const sheet = h(`<div class="sheet" id="dicoSheet" role="dialog" aria-modal="true" aria-labelledby="dicoT"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  const fermer = () => sheet.remove();

  const remplir = (terme) => {
    inner.innerHTML = "";
    inner.scrollTop = 0;
    const on = favoris(ctx).includes(terme.id);
    inner.append(h(`<div class="sheet-top"><h2 style="margin:0" id="dicoT">${esc(terme.terme)}</h2><button class="chip" type="button" data-x>✕ Fermer</button></div>`));

    const meta = h(`<div class="row dico-meta"><span class="pill">${esc(nomCat(terme.cat))}</span></div>`);
    const bFav = h(`<button class="chip dico-fav${on ? " on" : ""}" type="button" aria-pressed="${on}"><span class="dico-chip-ic" aria-hidden="true">${IC.star}</span><span>${on ? "Dans mes favoris" : "Ajouter aux favoris"}</span></button>`);
    bFav.addEventListener("click", () => { basculer(ctx, terme.id); remplir(terme); });
    meta.append(bFav);
    inner.append(meta);

    inner.append(h(`<p class="dico-def">${esc(terme.def)}</p>`));
    inner.append(h(`<p class="dico-expl">${esc(terme.expl)}</p>`));
    inner.append(h(`<div class="dico-ex"><span class="eyebrow">Exemple</span><span>${esc(terme.ex)}</span></div>`));

    if (terme.syn && terme.syn.length) {
      const syn = h(`<div class="dico-bloc"><span class="eyebrow">Aussi appelé</span><div class="row dico-syn"></div></div>`);
      terme.syn.forEach((s) => syn.querySelector(".dico-syn").append(h(`<span class="pill">${esc(s)}</span>`)));
      inner.append(syn);
    }

    if (terme.app) {
      const app = h(`<div class="card dico-app"><span class="dico-app-ic" aria-hidden="true">${IC.marque || IC.spark}</span>
        <div class="dico-app-txt"><span class="eyebrow accent">Dans ${esc(IDENTITE.nom)}</span><span class="small">${esc(terme.app.txt)}</span></div></div>`);
      if (terme.app.ecran) {
        const b = h(`<button class="secondary dico-app-go" type="button">${esc(LIBELLE_ECRAN[terme.app.ecran] || "Ouvrir")}</button>`);
        b.addEventListener("click", () => { fermer(); allerVers(ctx, terme.app.ecran); });
        app.querySelector(".dico-app-txt").append(b);
      }
      inner.append(app);
    }

    const lies = termesLies(terme, DATA.TERMES_PAR_ID);
    if (lies.length) {
      const bloc = h(`<div class="dico-bloc"><span class="eyebrow">Voir aussi</span><div class="row dico-voir"></div></div>`);
      lies.forEach((l) => {
        const b = h(`<button class="chip" type="button">${esc(l.terme)}</button>`);
        b.addEventListener("click", () => remplir(l));
        bloc.querySelector(".dico-voir").append(b);
      });
      inner.append(bloc);
    }

    inner.append(h(`<p class="muted small dico-note">Repères d'entraînement généraux, pas un avis médical.</p>`));
    inner.querySelector("[data-x]").addEventListener("click", fermer);
  };

  remplir(t);
  sheet.addEventListener("click", (ev) => { if (ev.target === sheet) fermer(); });
  document.body.append(sheet);
  /** @type {HTMLElement|null} */ (sheet.querySelector("[data-x]"))?.focus();
}

