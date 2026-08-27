/* Écran « Vidéos » : l'état de chaque production, en direct, et le résultat
   lisible sur le téléphone — lire, télécharger, partager, supprimer. */

import * as api from "../api.js";
import { sujetDe, dateDe, oublier } from "../journal.js";
import { h, carte, icone, message, bouton, etatVide } from "../dom.js";

const EN_COURS = 4;
const TERMINEE = 1;
const ECHOUEE = -1;

const ETAPES = {
  script: "l'écriture du script",
  terms: "la recherche des mots-clés",
  audio: "la synthèse vocale",
  subtitle: "les sous-titres",
  materials: "le téléchargement des rushes",
  video: "le montage",
  final: "l'assemblage final",
};

/* Le serveur ne renvoie pas d'étape en clair pendant le travail : l'avancement
   est en revanche jalonné très régulièrement, ce qui suffit à dire où on en est. */
function etapeDepuisAvancement(progression) {
  if (progression < 10) return "Écriture du script";
  if (progression < 20) return "Recherche des mots-clés";
  if (progression < 30) return "Synthèse de la voix";
  if (progression < 40) return "Calage des sous-titres";
  if (progression < 50) return "Téléchargement des rushes";
  if (progression < 100) return "Montage";
  return "Finalisation";
}

function dateLisible(horodatage) {
  if (!horodatage) return "";
  const d = new Date(horodatage);
  const aujourdhui = new Date();
  const memeJour = d.toDateString() === aujourdhui.toDateString();
  const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (memeJour) return `Aujourd'hui ${heure}`;
  return `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} ${heure}`;
}

function titreDeTache(tache) {
  const local = sujetDe(tache.task_id);
  if (local) return local;
  const script = String(tache.script || "").trim();
  if (script) return script.length > 90 ? script.slice(0, 90) + "…" : script;
  return "Vidéo sans titre";
}

export function vueVideos(aller, options = {}) {
  const ecran = h("div", { class: "ecran" });
  const liste = h("div", { class: "liste" });
  ecran.append(liste);

  /* Détails déjà rapatriés (URL des fichiers) : une tâche terminée ne change
     plus, inutile de la redemander à chaque tour de scrutation. */
  const details = new Map();
  let minuteur = null;
  let vivant = true;

  async function rafraichir({ silencieux = false } = {}) {
    if (!vivant) return;
    try {
      const { taches } = await api.listerTaches(1, 30);
      taches.sort((a, b) => (dateDe(b.task_id) || 0) - (dateDe(a.task_id) || 0));
      await dessiner(taches);

      const travaille = taches.some((t) => t.state === EN_COURS);
      clearTimeout(minuteur);
      if (travaille && vivant) minuteur = setTimeout(rafraichir, 3000);
    } catch (err) {
      clearTimeout(minuteur);
      if (!silencieux) {
        liste.replaceChildren(
          carte([
            h("div", { class: "erreur-bloc" }, [
              h("span", { class: "erreur-icone" }, [icone("alerte", 22)]),
              h("div", {}, [
                h("h3", { text: "Pas de connexion au moteur" }),
                h("p", { text: err.message }),
              ]),
            ]),
            bouton("Ouvrir les réglages", { nomIcone: "reglage", onClick: () => aller("#/reglages") }),
          ])
        );
      }
    }
  }

  async function dessiner(taches) {
    if (!taches.length) {
      liste.replaceChildren(
        etatVide(
          "Aucune vidéo",
          "Lance une production depuis l'onglet Créer : elle apparaîtra ici en direct."
        )
      );
      return;
    }
    const cartes = [];
    for (const tache of taches) {
      cartes.push(await carteTache(tache));
    }
    liste.replaceChildren(...cartes);
  }

  async function carteTache(tache) {
    const id = tache.task_id;
    const estNouvelle = options.nouvelle === id;
    const bloc = carte([], { class: `tache ${estNouvelle ? "tache--nouvelle" : ""}`.trim() });

    bloc.append(
      h("header", { class: "tache-tete" }, [
        h("div", { class: "tache-titre" }, [
          h("h2", { text: titreDeTache(tache) }),
          h("p", { class: "tache-date", text: dateLisible(dateDe(id)) || "Lancée depuis un autre appareil" }),
        ]),
        badge(tache),
      ])
    );

    if (tache.state === EN_COURS) {
      const progression = Math.max(3, Number(tache.progress) || 0);
      bloc.append(
        h("div", { class: "avancement" }, [
          h("div", { class: "avancement-piste" }, [
            h("div", { class: "avancement-jauge", style: { width: `${progression}%` } }),
          ]),
          h("div", { class: "avancement-legende" }, [
            h("span", { text: etapeDepuisAvancement(progression) }),
            h("span", { class: "num", text: `${progression} %` }),
          ]),
        ])
      );
    }

    if (tache.state === ECHOUEE) {
      const etape = ETAPES[tache.failed_stage] || "la production";
      bloc.append(
        h("div", { class: "echec" }, [
          h("p", { class: "echec-titre", text: `Échec pendant ${etape}.` }),
          tache.error ? h("p", { class: "echec-detail", text: String(tache.error) }) : null,
        ])
      );
    }

    if (tache.state === TERMINEE) {
      bloc.append(await blocResultat(id));
    }

    bloc.append(
      h("div", { class: "tache-actions" }, [
        tache.state === EN_COURS
          ? h("span", { class: "tache-note", text: "La production continue même si tu fermes l'app." })
          : boutonSuppression(id, tache),
      ])
    );
    return bloc;
  }

  function badge(tache) {
    if (tache.state === TERMINEE) return h("span", { class: "badge badge--ok" }, [icone("check", 14), "Terminée"]);
    if (tache.state === ECHOUEE) return h("span", { class: "badge badge--ko" }, [icone("alerte", 14), "Échec"]);
    return h("span", { class: "badge badge--cours" }, [icone("horloge", 14), "En cours"]);
  }

  async function blocResultat(id) {
    let detail = details.get(id);
    if (!detail) {
      try {
        detail = await api.detailTache(id);
        details.set(id, detail);
      } catch (err) {
        return h("p", { class: "echec-detail", text: err.message });
      }
    }
    const fichiers = (detail.videos || []).length ? detail.videos : detail.combined_videos || [];
    if (!fichiers.length) {
      return h("p", { class: "echec-detail", text: "Terminée, mais aucun fichier vidéo n'a été trouvé." });
    }
    return h("div", { class: "resultats" }, fichiers.map((chemin, i) => lecteur(chemin, id, i, fichiers.length)));
  }

  /* Le fichier n'est chargé qu'au premier tap : afficher dix lecteurs qui
     préchargent dix vidéos en 4G serait le meilleur moyen de tout bloquer. */
  function lecteur(chemin, id, index, total) {
    const cadre = h("div", { class: "lecteur" });
    const affiche = h("button", { type: "button", class: "lecteur-affiche" }, [
      h("span", { class: "lecteur-play" }, [icone("play", 24)]),
      h("span", { class: "lecteur-legende", text: total > 1 ? `Variante ${index + 1}` : "Voir la vidéo" }),
    ]);

    affiche.addEventListener("click", async () => {
      affiche.disabled = true;
      affiche.querySelector(".lecteur-legende").textContent = "Chargement…";
      try {
        const media = await api.chargerMedia(chemin);
        const video = h("video", {
          class: "lecteur-video",
          src: media.url,
          controls: true,
          playsinline: true,
          preload: "metadata",
        });
        affiche.replaceWith(video);
        video.play().catch(() => { /* lecture auto refusée : les contrôles suffisent */ });
      } catch (err) {
        affiche.disabled = false;
        affiche.querySelector(".lecteur-legende").textContent = "Réessayer";
        message(err.message, "erreur");
      }
    });

    const nomFichier = `${(sujetDe(id) || "video").replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 40) || "video"}${total > 1 ? `-${index + 1}` : ""}.mp4`;

    const actions = h("div", { class: "lecteur-actions" }, [
      bouton("Télécharger", {
        nomIcone: "telecharger",
        onClick: async (e) => {
          const b = e.currentTarget;
          b.charger(true, "Préparation…");
          try {
            const media = await api.chargerMedia(chemin);
            const lien = h("a", { href: media.url, download: nomFichier });
            document.body.append(lien);
            lien.click();
            lien.remove();
            setTimeout(() => media.revoquer(), 60000);
          } catch (err) {
            message(err.message, "erreur");
          } finally {
            b.charger(false);
          }
        },
      }),
      partageDisponible()
        ? bouton("Partager", {
            nomIcone: "partager",
            onClick: async (e) => {
              const b = e.currentTarget;
              b.charger(true, "Préparation…");
              try {
                const blob = await api.telechargerBlob(chemin);
                const fichier = new File([blob], nomFichier, { type: "video/mp4" });
                if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
                  await navigator.share({ files: [fichier], title: sujetDe(id) || "Ma vidéo" });
                } else {
                  message("Le partage de fichiers n'est pas disponible sur ce navigateur.", "erreur");
                }
              } catch (err) {
                if (err && err.name === "AbortError") return;
                message(err.message, "erreur");
              } finally {
                b.charger(false);
              }
            },
          })
        : null,
    ]);

    cadre.append(affiche, actions);
    return cadre;
  }

  function boutonSuppression(id, tache) {
    return bouton("Supprimer", {
      nomIcone: "poubelle",
      variante: "bouton--discret bouton--danger",
      onClick: async (e) => {
        const b = e.currentTarget;
        if (b.dataset.confirme !== "1") {
          b.dataset.confirme = "1";
          b.querySelector("span").textContent = "Confirmer ?";
          setTimeout(() => {
            if (!b.isConnected) return;
            b.dataset.confirme = "0";
            b.querySelector("span").textContent = "Supprimer";
          }, 4000);
          return;
        }
        b.charger(true, "Suppression…");
        try {
          await api.supprimerTache(id);
          oublier(id);
          details.delete(id);
          message("Vidéo supprimée.");
          await rafraichir({ silencieux: true });
        } catch (err) {
          message(err.message, "erreur");
          b.charger(false);
        }
      },
    });
  }

  liste.append(h("div", { class: "chargement", text: "Chargement des vidéos…" }));
  rafraichir();

  /* Reprendre la scrutation au retour d'arrière-plan : sur Android, l'onglet
     est gelé dès que l'écran s'éteint, et le minuteur ne repart pas seul. */
  const reveil = () => {
    if (document.visibilityState === "visible") rafraichir({ silencieux: true });
  };
  document.addEventListener("visibilitychange", reveil);

  ecran.detruire = () => {
    vivant = false;
    clearTimeout(minuteur);
    document.removeEventListener("visibilitychange", reveil);
  };
  return ecran;
}

function partageDisponible() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}
