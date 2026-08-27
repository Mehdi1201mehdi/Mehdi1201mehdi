/* Préférences locales : adresse du serveur, clé d'API, et tous les réglages
   de production mémorisés d'une session à l'autre. Un seul objet en
   localStorage — l'app est mono-utilisateur, pas besoin de plus. */

const CLE = "moneyprinter.fr.v1";

const DEFAUTS = {
  apiBase: "",
  apiKey: "",

  langue: "fr-FR",
  paragraphes: 1,
  consigne: "",

  format: "9:16",
  source: "pexels",
  ordre: "random",
  transition: "",
  dureeClip: 5,
  nombreVideos: 1,

  voix: "fr-FR-DeniseNeural-Female",
  vitesse: 1,
  volumeVoix: 1,

  musique: "random",
  fichierMusique: "",
  volumeMusique: 0.2,

  sousTitres: true,
  position: "bottom",
  police: "BeVietnamPro-Bold.ttf",
  taillePolice: 60,
  couleurTexte: "#FFFFFF",
  couleurContour: "#000000",
  epaisseurContour: 1.5,

  fils: 2,
};

function lire() {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return { ...DEFAUTS };
    return { ...DEFAUTS, ...(JSON.parse(brut) || {}) };
  } catch {
    return { ...DEFAUTS };
  }
}

let etat = lire();

function ecrire() {
  try {
    localStorage.setItem(CLE, JSON.stringify(etat));
  } catch {
    /* Mode privé ou quota plein : l'app continue de tourner en mémoire. */
  }
}

export const reglages = {
  get(nom) {
    return etat[nom];
  },
  tout() {
    return { ...etat };
  },
  set(nom, valeur) {
    etat[nom] = valeur;
    ecrire();
    return valeur;
  },
  fusionner(objet) {
    etat = { ...etat, ...objet };
    ecrire();
  },
  reinitialiser({ garderServeur = true } = {}) {
    const { apiBase, apiKey } = etat;
    etat = { ...DEFAUTS };
    if (garderServeur) {
      etat.apiBase = apiBase;
      etat.apiKey = apiKey;
    }
    ecrire();
  },
  defauts: DEFAUTS,
};

/* ── Catalogues ────────────────────────────────────────────────────────── */

/* Voix Edge TTS francophones exposées par le moteur. Le format attendu par
   l'API est « <nom>-<genre> », exactement comme ci-dessous. */
export const VOIX = [
  { id: "fr-FR-DeniseNeural-Female", nom: "Denise", detail: "France · femme · posée" },
  { id: "fr-FR-EloiseNeural-Female", nom: "Éloïse", detail: "France · femme · jeune" },
  { id: "fr-FR-HenriNeural-Male", nom: "Henri", detail: "France · homme · grave" },
  { id: "fr-FR-VivienneMultilingualNeural-Female", nom: "Vivienne", detail: "France · femme · multilingue" },
  { id: "fr-FR-RemyMultilingualNeural-Male", nom: "Rémy", detail: "France · homme · multilingue" },
  { id: "fr-CA-SylvieNeural-Female", nom: "Sylvie", detail: "Québec · femme" },
  { id: "fr-CA-AntoineNeural-Male", nom: "Antoine", detail: "Québec · homme" },
  { id: "fr-BE-CharlineNeural-Female", nom: "Charline", detail: "Belgique · femme" },
  { id: "fr-CH-FabriceNeural-Male", nom: "Fabrice", detail: "Suisse · homme" },
];

/* Polices livrées avec le moteur. Les deux .ttc chinoises n'ont pas d'accents
   latins corrects : elles ne sont pas proposées ici. */
export const POLICES = [
  { id: "BeVietnamPro-Bold.ttf", nom: "Be Vietnam Pro Gras", detail: "Lisible, recommandée" },
  { id: "BeVietnamPro-Medium.ttf", nom: "Be Vietnam Pro Moyen", detail: "Plus discrète" },
  { id: "Charm-Bold.ttf", nom: "Charm Gras", detail: "Manuscrite" },
  { id: "Charm-Regular.ttf", nom: "Charm", detail: "Manuscrite fine" },
];

export const FORMATS = [
  { id: "9:16", nom: "Vertical", detail: "TikTok · Shorts · Reels" },
  { id: "16:9", nom: "Paysage", detail: "YouTube" },
  { id: "1:1", nom: "Carré", detail: "Fil d'actualité" },
];

export const SOURCES = [
  { id: "pexels", nom: "Pexels", detail: "Banque vidéo gratuite (clé requise)" },
  { id: "pixabay", nom: "Pixabay", detail: "Banque vidéo gratuite (clé requise)" },
  { id: "local", nom: "Mes fichiers", detail: "Vidéos déposées sur le serveur" },
];

export const TRANSITIONS = [
  { id: "", nom: "Aucune" },
  { id: "Shuffle", nom: "Aléatoire" },
  { id: "FadeIn", nom: "Fondu entrant" },
  { id: "FadeOut", nom: "Fondu sortant" },
  { id: "SlideIn", nom: "Glissé entrant" },
  { id: "SlideOut", nom: "Glissé sortant" },
];

export const POSITIONS = [
  { id: "top", nom: "Haut" },
  { id: "center", nom: "Centre" },
  { id: "bottom", nom: "Bas" },
];

export const MUSIQUES = [
  { id: "random", nom: "Aléatoire", detail: "Piste tirée au sort" },
  { id: "", nom: "Aucune", detail: "Voix seule" },
  { id: "custom", nom: "Choisir", detail: "Une piste du serveur" },
];

/* Construit le corps de requête attendu par POST /api/v1/videos à partir des
   préférences et de ce que l'utilisateur vient de saisir. */
export function versParametresApi({ sujet, script, motsCles }) {
  const r = reglages.tout();
  return {
    video_subject: sujet,
    video_script: script || "",
    video_terms: motsCles && motsCles.length ? motsCles.join(", ") : null,
    video_aspect: r.format,
    video_concat_mode: r.ordre,
    video_transition_mode: r.transition || null,
    video_clip_duration: Number(r.dureeClip) || 5,
    video_count: Number(r.nombreVideos) || 1,
    video_source: r.source,
    video_language: r.langue,

    voice_name: r.voix,
    voice_volume: Number(r.volumeVoix),
    voice_rate: Number(r.vitesse),

    bgm_type: r.musique,
    bgm_file: r.musique === "custom" ? r.fichierMusique : "",
    bgm_volume: Number(r.volumeMusique),

    subtitle_enabled: Boolean(r.sousTitres),
    subtitle_position: r.position,
    font_name: r.police,
    font_size: Number(r.taillePolice),
    text_fore_color: r.couleurTexte,
    stroke_color: r.couleurContour,
    stroke_width: Number(r.epaisseurContour),

    n_threads: Number(r.fils) || 2,
    paragraph_number: Number(r.paragraphes) || 1,
    video_script_prompt: r.consigne || "",
  };
}
