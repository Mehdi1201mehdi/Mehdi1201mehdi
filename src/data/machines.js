// @ts-check
/**
 * CATALOGUE DES MACHINES ET ÉQUIPEMENTS — rédigé pour Coach Perso.
 *
 * Chaque entrée décrit un équipement de salle (ou un accessoire) : noms
 * français / anglais, type, muscles visés, réglages et consignes générales.
 * Les textes sont ORIGINAUX (connaissances générales d'utilisation en salle),
 * volontairement génériques : ils décrivent le type de machine, pas un modèle
 * de marque. Chaque fabricant a ses propres réglages : la notice affichée sur
 * la machine prime.
 *
 * Le rattachement des exercices est CALCULÉ (`exercicesDeMachine`) à partir du
 * matériel déclaré et des mots du nom (français et anglais), jamais saisi à la
 * main exercice par exercice : une même règle pour tout le catalogue, testée.
 */

/** Groupes de la navigation visuelle « par équipement ». */
export const GROUPES_EQUIPEMENT = [
  { cle: "banc", nom: "Bancs", icone: "bench" },
  { cle: "halteres", nom: "Haltères", icone: "dumbbell" },
  { cle: "barre", nom: "Barres", icone: "barbell" },
  { cle: "machine", nom: "Machines", icone: "machine" },
  { cle: "poulie", nom: "Poulies", icone: "cable" },
  { cle: "smith", nom: "Smith machine", icone: "smith" },
  { cle: "poids_du_corps", nom: "Poids du corps", icone: "body" },
  { cle: "cardio", nom: "Cardio", icone: "heart" },
  { cle: "accessoire", nom: "Accessoires", icone: "band" },
];

/**
 * Texte de recherche d'un exercice : nom, noms alternatifs, nom anglais, slug,
 * minuscules sans accents, ponctuation → espaces.
 * @param {any} e
 */
export function texteExercice(e) {
  return ` ${[e.nom, ...(e.nomsAlternatifs || []), e.nomEn || "", e.slug || ""].join(" ")} `.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");
}
const aEq = (e, ...cles) => (e.equipement || []).some((q) => cles.includes(q));
const estCardio = (e) => e.typeExercice === "cardio" || e.patron === "cardio";
const MACHINE = ["machine_guidee", "machine_leviers"];
/** Exercice sur machine : matériel déclaré OU nom explicite (certaines fiches anciennes déclarent mal leur matériel). */
const estMachine = (e, t) => aEq(e, ...MACHINE) || /\b(machine|lever|leverage|hammer strength|convergent)\b/.test(t);
const estPoulie = (e, t) => aEq(e, "poulie") || /\b(poulie|cable|vis a vis)\b/.test(t);
const BARRE_DROITE = /\b(curl|extension|barre au front|skull|tirage menton|upright row|poignets?|wrist|front raise|elevation frontale|kickback)\b/;

/**
 * @typedef {{ siege?: string, dossier?: string, pieds?: string, mains?: string, amplitude?: string,
 *   depart?: string, trajectoire?: string, fin?: string, securite?: string }} Reglages
 * @typedef {{ id: string, nom: string, nomEn: string, type: string, groupe: string, muscles: string[],
 *   description: string, reglages?: Reglages, variantes?: string[], test: (e:any, t:string) => boolean }} Machine
 */

/** @type {Machine[]} */
export const MACHINES = [
  /* ------------------------------ Bancs ------------------------------ */
  {
    id: "banc-plat", nom: "Banc de musculation plat", nomEn: "Flat bench", type: "banc", groupe: "banc",
    muscles: ["pectoraux", "triceps", "epaules"],
    description: "Banc horizontal fixe : développés, écartés, pull-over et rowing en appui.",
    reglages: { pieds: "Pieds à plat au sol, de part et d'autre du banc.", dossier: "Fixe, à l'horizontale.",
      depart: "Tête, haut du dos et fessiers en contact avec le banc.", securite: "Avec une barre, travailler dans un rack ou avec un pareur." },
    test: (e, t) => !/inclin|declin|swiss|ball|machine|lever|smith/.test(t) && (
      (/\b(couche|bench press|flat bench|sur banc|on bench|pull over|pullover|developpe plat)\b/.test(t) && aEq(e, "halteres", "barre", "barre_ez", "kettlebell"))
      || (aEq(e, "banc") && !/pompe|push up/.test(t))),
  },
  {
    id: "banc-incline", nom: "Banc incliné", nomEn: "Incline bench", type: "banc", groupe: "banc",
    muscles: ["pectoraux", "epaules", "biceps"],
    description: "Dossier relevé (souvent 30 à 45°) : développés et écartés inclinés, curls inclinés, rowing sur le ventre.",
    reglages: { dossier: "Entre 30° et 45° pour le haut des pectoraux ; plus droit, les épaules prennent le relais.",
      siege: "Assise légèrement relevée pour ne pas glisser.", pieds: "À plat au sol, écartés pour la stabilité." },
    test: (e, t) => /\b(incline|inclinee?s?)\b/.test(t) && !/pompe|push up|tapis|treadmill|marche|walk|swiss|ball|squat|machine|lever|smith|poulie|cable/.test(t)
      && aEq(e, "halteres", "barre", "barre_ez", "kettlebell", "banc"),
  },
  {
    id: "banc-decline", nom: "Banc décliné", nomEn: "Decline bench", type: "banc", groupe: "banc",
    muscles: ["pectoraux", "abdominaux", "triceps"],
    description: "Tête plus basse que les hanches, jambes calées : développés déclinés, crunchs et relevés déclinés.",
    reglages: { dossier: "Inclinaison négative de 15 à 30°.", pieds: "Chevilles bloquées sous les boudins.",
      securite: "Se relever lentement : la position tête en bas fait monter la pression." },
    test: (e, t) => /\b(decline|declinee?s?)\b/.test(t) && (!/pompe|push up/.test(t) || aEq(e, "banc")) && !/machine|lever|smith|poulie|cable|hammer strength/.test(t) && !estCardio(e),
  },
  {
    id: "banc-reglable", nom: "Banc réglable", nomEn: "Adjustable bench", type: "banc", groupe: "banc",
    muscles: ["pectoraux", "epaules", "biceps", "triceps"],
    description: "Dossier et assise réglables : couvre le plat, l'incliné et la position assise (développé épaules, curls).",
    reglages: { dossier: "Du plat à la verticale selon l'exercice.", siege: "Relever l'assise dès que le dossier passe au-delà de 30°.",
      securite: "Vérifier que les goupilles sont enfoncées avant de charger." },
    test: (e, t) => (/\b(incline|inclinee?s?)\b/.test(t) || /\b(assis|seated)\b/.test(t)) && aEq(e, "halteres", "barre_ez", "kettlebell")
      && !/swiss|ball|machine|lever/.test(t),
  },
  {
    id: "banc-lombaires", nom: "Banc à lombaires (chaise romaine)", nomEn: "Hyperextension bench / Roman chair", type: "banc", groupe: "banc",
    muscles: ["lombaires", "fessiers", "ischios"],
    description: "Appui des hanches et des chevilles à 45° ou à l'horizontale : extensions lombaires et glute-ham.",
    reglages: { amplitude: "Coussin réglé juste sous les crêtes iliaques pour plier aux hanches.", pieds: "Chevilles calées sous les rouleaux.",
      trajectoire: "Descendre en pliant aux hanches, remonter jusqu'à l'alignement du corps, sans cambrer.",
      securite: "Ne pas hyper-étendre en haut du mouvement." },
    test: (e, t) => /\b(extension lombaire|hyperextension|back extension|glute ham|chaise romaine|roman chair)\b/.test(t)
      && !/swiss|ball|sol|floor|reverse hyper/.test(t),
  },
  /* ------------------------------ Barres ------------------------------ */
  {
    id: "barre-olympique", nom: "Barre olympique", nomEn: "Olympic barbell", type: "barre", groupe: "barre",
    muscles: ["quadriceps", "fessiers", "pectoraux", "dorsaux"],
    description: "Barre de 20 kg (2,20 m), manchons rotatifs : squats, soulevés de terre, développés, mouvements olympiques.",
    reglages: { mains: "Repères de largeur gravés sur la barre (81 cm) pour une prise symétrique.",
      securite: "Toujours des colliers de serrage ; sécurités du rack à la bonne hauteur." },
    test: (e, t) => aEq(e, "barre") && !BARRE_DROITE.test(t) && !/\b(trap bar|landmine|smith)\b/.test(t),
  },
  {
    id: "barre-droite", nom: "Barre droite courte", nomEn: "Straight bar", type: "barre", groupe: "barre",
    muscles: ["biceps", "triceps", "avant_bras", "epaules"],
    description: "Barre courte, souvent à poids fixe : curls, extensions, tirage menton, travail des poignets.",
    test: (e, t) => aEq(e, "barre") && BARRE_DROITE.test(t) && !/\bsmith\b/.test(t),
  },
  {
    id: "barre-ez", nom: "Barre EZ", nomEn: "EZ curl bar", type: "barre", groupe: "barre",
    muscles: ["biceps", "triceps", "avant_bras"],
    description: "Barre coudée : poignets en semi-supination, plus confortable pour les curls et les extensions triceps.",
    reglages: { mains: "Prise sur les coudes de la barre : intérieur pour les triceps, extérieur pour les curls." },
    test: (e, t) => aEq(e, "barre_ez") || /\b(barre ez|ez bar|ez barbell|sz bar)\b/.test(t),
  },
  {
    id: "trap-bar", nom: "Trap bar (barre hexagonale)", nomEn: "Trap bar", type: "barre", groupe: "barre",
    muscles: ["quadriceps", "fessiers", "trapezes"],
    description: "Barre hexagonale dans laquelle on se place : soulevé de terre plus vertical, haussements, marche chargée.",
    test: (e, t) => /\btrap bar\b/.test(t),
  },
  {
    id: "landmine", nom: "Landmine", nomEn: "Landmine", type: "accessoire", groupe: "barre",
    muscles: ["epaules", "dorsaux", "abdominaux"],
    description: "Une extrémité de la barre fixée au sol en pivot : développés, rowing et rotations en arc.",
    test: (e, t) => /\blandmine\b/.test(t),
  },
  /* -------------------------- Charges libres -------------------------- */
  {
    id: "halteres", nom: "Haltères", nomEn: "Dumbbells", type: "charge_libre", groupe: "halteres",
    muscles: ["pectoraux", "epaules", "biceps", "triceps", "quadriceps"],
    description: "Charges indépendantes pour chaque bras : amplitude libre, travail unilatéral, correction des asymétries.",
    test: (e) => aEq(e, "halteres"),
  },
  {
    id: "kettlebells", nom: "Kettlebells", nomEn: "Kettlebells", type: "charge_libre", groupe: "halteres",
    muscles: ["fessiers", "ischios", "epaules", "abdominaux"],
    description: "Charge décentrée sous la poignée : swings, épaulés, arrachés, get-up, portages.",
    test: (e) => aEq(e, "kettlebell"),
  },
  /* ------------------------------ Smith ------------------------------ */
  {
    id: "smith", nom: "Smith machine (barre guidée)", nomEn: "Smith machine", type: "machine_guidee", groupe: "smith",
    muscles: ["quadriceps", "pectoraux", "epaules"],
    description: "Barre guidée sur rails verticaux avec crochets de verrouillage : squats, développés, fentes en sécurité.",
    reglages: { pieds: "Pour le squat, pieds légèrement en avant de la barre : le rail impose une trajectoire droite.",
      depart: "Déverrouiller par une rotation des poignets, verrouiller de même à la fin.",
      amplitude: "Régler les butées de sécurité juste sous le point bas.", securite: "Toujours régler les butées avant la première série." },
    test: (e, t) => aEq(e, "smith") || /\bsmith\b/.test(t),
  },
  {
    id: "rack-squat", nom: "Rack à squat (cage)", nomEn: "Squat rack / power cage", type: "rack", groupe: "barre",
    muscles: ["quadriceps", "fessiers", "epaules"],
    description: "Supports et sécurités réglables pour prendre et reposer la barre : squats, développés, rack pulls.",
    reglages: { depart: "Crochets à hauteur du haut de la poitrine pour le squat, de la clavicule pour le développé militaire.",
      amplitude: "Sécurités juste sous le point bas du mouvement.", securite: "Ne jamais squatter lourd sans sécurités ni pareur." },
    test: (e, t) => aEq(e, "barre") && /\b(squat|developpe militaire|military press|overhead press|developpe debout|rack pull|good morning|split squat|squat fendu)\b/.test(t),
  },
  /* -------------------------- Machines jambes -------------------------- */
  {
    id: "presse-jambes", nom: "Presse à jambes", nomEn: "Leg press", type: "machine_disques", groupe: "machine",
    muscles: ["quadriceps", "fessiers", "ischios", "adducteurs", "mollets"],
    description: "Plateforme poussée par les jambes, dos en appui : presse inclinée à 45°, horizontale ou verticale.",
    reglages: { dossier: "Dossier réglé pour que les genoux atteignent environ 90° sans décoller le bassin.",
      pieds: "Largeur du bassin au milieu du plateau ; plus haut pour les fessiers, plus bas pour les quadriceps.",
      mains: "Sur les poignées latérales, sans pousser avec les bras.", amplitude: "Descendre tant que le bas du dos reste collé au dossier.",
      depart: "Jambes tendues sans verrouiller, sécurités déverrouillées.", trajectoire: "Genoux dans l'axe des pieds.",
      fin: "Remonter sans claquer les genoux en extension.", securite: "Remettre les sécurités avant de sortir de la machine." },
    variantes: ["Presse inclinée 45°", "Presse horizontale", "Presse unilatérale", "Pieds hauts / bas / serrés / larges"],
    test: (e, t) => /\b(presse a cuisses|presse a jambes|leg press|presse inclinee|presse horizontale)\b/.test(t)
      || (/\bsled\b/.test(t) && /\bpress\b/.test(t)) || /\bmollets a la presse\b/.test(t),
  },
  {
    id: "hack-squat", nom: "Hack squat", nomEn: "Hack squat machine", type: "machine_disques", groupe: "machine",
    muscles: ["quadriceps", "fessiers"],
    description: "Squat sur glissière inclinée, épaules sous les épaulières : trajectoire guidée, dos soutenu.",
    reglages: { pieds: "Au milieu de la plateforme, largeur du bassin.", dossier: "Dos et tête plaqués contre le dossier.",
      amplitude: "Descendre jusqu'à environ 90° de genou ou plus si le bassin ne bascule pas.", securite: "Verrouiller les poignées de sécurité en fin de série." },
    test: (e, t) => /\bhack\b/.test(t) && (estMachine(e, t) || aEq(e, "smith", "barre")),
  },
  {
    id: "leg-extension", nom: "Leg extension", nomEn: "Leg extension machine", type: "machine_guidee", groupe: "machine",
    muscles: ["quadriceps"],
    description: "Extension des genoux en position assise : isolation des quadriceps.",
    reglages: { dossier: "Avancer ou reculer le dossier pour que l'axe du genou soit aligné sur l'axe de la machine.",
      pieds: "Boudin posé sur le bas du tibia, au-dessus de la cheville.", mains: "Sur les poignées, fessiers collés au siège.",
      amplitude: "Butée de départ à environ 90° de flexion.", trajectoire: "Tendre les jambes sans à-coup, marquer une pause en haut.",
      securite: "Éviter de descendre au-delà de la butée en cas de douleur au genou." },
    test: (e, t) => /\bleg extension\b/.test(t) && !/elastique|band/.test(t),
  },
  {
    id: "leg-curl-assis", nom: "Leg curl assis", nomEn: "Seated leg curl", type: "machine_guidee", groupe: "machine",
    muscles: ["ischios"],
    description: "Flexion des genoux en position assise, cuisses bloquées : ischio-jambiers en position étirée.",
    reglages: { dossier: "Axe du genou aligné sur l'axe de rotation.", pieds: "Boudin sous les mollets, juste au-dessus du talon.",
      depart: "Boudin de cuisse serré au-dessus des genoux.", trajectoire: "Ramener les talons sous le siège, revenir lentement." },
    test: (e, t) => /\bleg curl\b/.test(t) && /\b(assis|seated)\b/.test(t),
  },
  {
    id: "leg-curl-couche", nom: "Leg curl couché", nomEn: "Lying leg curl", type: "machine_guidee", groupe: "machine",
    muscles: ["ischios"],
    description: "Flexion des genoux à plat ventre : isolation des ischio-jambiers.",
    reglages: { pieds: "Boudin sur le bas des mollets.", depart: "Genoux juste au-delà du bord du banc, hanches plaquées.",
      securite: "Ne pas décoller les hanches pour finir la répétition." },
    test: (e, t) => /\bleg curl\b/.test(t) && /\b(allonge|couche|lying|machine)\b/.test(t) && !/\b(assis|seated|debout|standing|swiss|ball|elastique|band|nordique)\b/.test(t),
  },
  {
    id: "abducteurs", nom: "Machine abducteurs", nomEn: "Hip abduction machine", type: "machine_guidee", groupe: "machine",
    muscles: ["abducteurs", "fessiers"],
    description: "Écarter les cuisses contre résistance, en position assise : moyen fessier et abducteurs.",
    reglages: { depart: "Amplitude de départ réglée jambes serrées sans tension.", dossier: "Dos droit ; buste penché en avant pour davantage de fessiers.",
      trajectoire: "Écarter sans à-coup, revenir lentement sans laisser claquer les plaques." },
    test: (e, t) => /abduct/.test(t) && estMachine(e, t) && !/etirement|stretch/.test(t),
  },
  {
    id: "adducteurs", nom: "Machine adducteurs", nomEn: "Hip adduction machine", type: "machine_guidee", groupe: "machine",
    muscles: ["adducteurs"],
    description: "Serrer les cuisses contre résistance, en position assise : adducteurs.",
    reglages: { amplitude: "Écartement de départ confortable, sans étirement douloureux de l'aine.", trajectoire: "Serrer jusqu'au contact des coussins, revenir lentement." },
    test: (e, t) => /adduct/.test(t) && estMachine(e, t) && !/etirement|stretch/.test(t),
  },
  {
    id: "mollets-machine", nom: "Machine à mollets", nomEn: "Calf raise machine", type: "machine_guidee", groupe: "machine",
    muscles: ["mollets"],
    description: "Extension des chevilles debout, assis ou à la presse : gastrocnémiens (jambes tendues) ou soléaire (genoux fléchis).",
    reglages: { pieds: "Avant-pied sur le bord de la marche, talons libres.", amplitude: "Descendre talons sous la marche, monter sur la pointe.",
      trajectoire: "Marquer une pause en haut et en bas, sans rebond." },
    test: (e, t) => /\b(mollets?|calf|calves|donkey)\b/.test(t) && !/etirement|stretch/.test(t) && (estMachine(e, t) || aEq(e, "smith") || /\b(presse|press|hack)\b/.test(t)),
  },
  /* -------------------------- Machines haut du corps -------------------------- */
  {
    id: "chest-press", nom: "Chest press (développé pectoraux)", nomEn: "Chest press machine", type: "machine_guidee", groupe: "machine",
    muscles: ["pectoraux", "triceps", "epaules"],
    description: "Développé assis guidé : poussée horizontale stable, idéale pour débuter ou finir une séance.",
    reglages: { siege: "Poignées à hauteur du milieu de la poitrine.", dossier: "Dos plaqué, omoplates serrées.",
      mains: "Prise pronation ou neutre selon les poignées.", amplitude: "Ne pas laisser les coudes passer loin derrière le buste.",
      trajectoire: "Pousser droit devant sans verrouiller les coudes." },
    variantes: ["Développé incliné machine", "Développé décliné machine", "Chest press convergent"],
    test: (e, t) => /\b(developpe pectoraux|chest press|presse pectorale|developpe plat|developpe (couche|incline|decline)e?)\b/.test(t) && estMachine(e, t) && !/smith/.test(t),
  },
  {
    id: "pec-deck", nom: "Pec deck / Butterfly", nomEn: "Pec deck / Butterfly machine", type: "machine_guidee", groupe: "machine",
    muscles: ["pectoraux", "epaules"],
    description: "Rapprocher les bras devant soi, coudes légèrement fléchis : écarté guidé des pectoraux ; en sens inverse, oiseau pour l'arrière d'épaule.",
    reglages: { siege: "Poignées à hauteur des épaules ou légèrement en dessous.", amplitude: "Bras en arrière juste dans le plan du buste au départ.",
      trajectoire: "Arc de cercle, coudes fixes.", securite: "Pas d'étirement forcé derrière la ligne des épaules." },
    test: (e, t) => /\b(pec deck|pec dec)\b/.test(t) || (/\b(butterfly|ecarte|fly|flye|oiseau|reverse fly)\b/.test(t) && estMachine(e, t) && !/poulie|cable/.test(t)),
  },
  {
    id: "machine-epaules", nom: "Machine épaules", nomEn: "Shoulder press / lateral raise machine", type: "machine_guidee", groupe: "machine",
    muscles: ["epaules", "triceps"],
    description: "Développé épaules guidé ou élévations latérales guidées.",
    reglages: { siege: "Poignées à hauteur des épaules au départ.", dossier: "Dos droit plaqué, sans cambrer.", trajectoire: "Pousser vers le haut sans verrouiller." },
    test: (e, t) => /\b(developpe epaules|developpe militaire|shoulder press|elevation laterale|lateral raise|deltoid|epaules)\b/.test(t) && estMachine(e, t) && !/haussement|shrug|smith/.test(t),
  },
  {
    id: "rowing-machine", nom: "Machine rowing (tirage horizontal guidé)", nomEn: "Seated row machine", type: "machine_guidee", groupe: "machine",
    muscles: ["dorsaux", "trapezes", "biceps"],
    description: "Tirage horizontal assis avec appui poitrine : rowing convergent, prise neutre ou large.",
    reglages: { siege: "Poignées à hauteur du bas de la poitrine.", dossier: "Appui poitrine réglé pour atteindre les poignées bras tendus.",
      trajectoire: "Ramener les coudes le long du corps en serrant les omoplates.", fin: "Revenir bras tendus en laissant les omoplates s'écarter." },
    variantes: ["Rowing convergent", "Rowing T-bar", "Rowing unilatéral machine"],
    test: (e, t) => /\b(rowing|row)\b/.test(t) && estMachine(e, t) && !estCardio(e),
  },
  {
    id: "tirage-vertical", nom: "Tirage vertical (lat pulldown)", nomEn: "Lat pulldown station", type: "poulie", groupe: "poulie",
    muscles: ["dorsaux", "biceps"],
    description: "Barre ou poignées tirées de haut en bas, cuisses calées : grand dorsal.",
    reglages: { siege: "Boudins serrés sur les cuisses pour ne pas décoller.", mains: "Prise un peu plus large que les épaules (variantes : serrée, neutre, supination).",
      trajectoire: "Tirer vers le haut de la poitrine, buste légèrement incliné en arrière.", fin: "Remonter bras presque tendus, sans lâcher la tension." },
    variantes: ["Prise large", "Prise serrée neutre", "Prise supination", "Unilatéral"],
    test: (e, t) => /\b(tirage vertical|pulldown|pull down)\b/.test(t) && (estPoulie(e, t) || estMachine(e, t)),
  },
  {
    id: "tirage-horizontal", nom: "Tirage horizontal (poulie basse assise)", nomEn: "Seated cable row", type: "poulie", groupe: "poulie",
    muscles: ["dorsaux", "trapezes", "biceps"],
    description: "Rowing assis à la poulie basse, pieds calés : épaisseur du dos.",
    reglages: { pieds: "Sur les cale-pieds, genoux légèrement fléchis.", mains: "Triangle (prise neutre) ou barre large.",
      trajectoire: "Ramener vers le nombril, poitrine sortie.", securite: "Ne pas arrondir le bas du dos au retour." },
    test: (e, t) => /\b(rowing|row)\b/.test(t) && /\b(assis|seated|bas|low)\b/.test(t) && estPoulie(e, t),
  },
  {
    id: "machine-biceps", nom: "Machine biceps (curl pupitre guidé)", nomEn: "Biceps curl machine", type: "machine_guidee", groupe: "machine",
    muscles: ["biceps"],
    description: "Curl guidé, bras en appui sur un pupitre.",
    reglages: { siege: "Aisselles au bord du pupitre, coude aligné sur l'axe de la machine.", trajectoire: "Fléchir sans décoller les coudes, redescendre lentement." },
    test: (e, t) => /\bcurl\b/.test(t) && !/leg curl|nordique|smith|poulie|cable/.test(t) && estMachine(e, t),
  },
  {
    id: "machine-triceps", nom: "Machine triceps", nomEn: "Triceps machine", type: "machine_guidee", groupe: "machine",
    muscles: ["triceps"],
    description: "Extensions des coudes ou dips guidés (assistés ou chargés).",
    reglages: { siege: "Coudes alignés sur l'axe de rotation.", trajectoire: "Tendre les bras sans écarter les coudes." },
    test: (e, t) => /\b(triceps|dips?)\b/.test(t) && estMachine(e, t) && !/smith|poulie|cable/.test(t),
  },
  {
    id: "machine-abdos", nom: "Machine à abdominaux", nomEn: "Ab crunch machine", type: "machine_guidee", groupe: "machine",
    muscles: ["abdominaux"],
    description: "Crunch ou rotation du buste guidés avec charge réglable.",
    reglages: { siege: "Poignées ou coussins à hauteur des épaules.", trajectoire: "Enrouler le buste, ne pas tirer avec les bras." },
    test: (e, t) => /\b(crunch|abdominaux|abdominal|rotation du buste|torso)\b/.test(t) && estMachine(e, t) && !/poulie|cable/.test(t),
  },
  {
    id: "machine-dorsaux-pullover", nom: "Machine pull-over", nomEn: "Pullover machine", type: "machine_guidee", groupe: "machine",
    muscles: ["dorsaux"],
    description: "Arc de cercle des bras de l'arrière vers l'avant : grand dorsal sans les biceps.",
    test: (e, t) => /\b(pull over|pullover)\b/.test(t) && estMachine(e, t),
  },
  {
    id: "assistance-tractions", nom: "Machine tractions / dips assistés", nomEn: "Assisted pull-up / dip machine", type: "machine_guidee", groupe: "machine",
    muscles: ["dorsaux", "biceps", "triceps", "pectoraux"],
    description: "Plateforme de contrepoids sous les genoux : tractions et dips allégés.",
    reglages: { pieds: "Genoux sur la plateforme, chevilles croisées.", securite: "Plus le contrepoids est lourd, plus l'exercice est facile." },
    test: (e, t) => /\b(assiste|assisted)\b/.test(t) && /\b(traction|pull up|chin up|dips?)\b/.test(t),
  },
  {
    id: "machines-guidees", nom: "Machines guidées (à plaques)", nomEn: "Selectorized machines", type: "machine_guidee", groupe: "machine",
    muscles: ["pectoraux", "dorsaux", "quadriceps", "epaules"],
    description: "Toutes les machines à pile de plaques et goupille : charge réglée en un geste, trajectoire imposée.",
    reglages: { siege: "Régler le siège pour aligner l'articulation qui travaille sur l'axe de rotation de la machine (repère de couleur).",
      securite: "Goupille enfoncée à fond ; ne jamais laisser retomber la pile." },
    test: (e) => aEq(e, "machine_guidee"),
  },
  {
    id: "machines-disques", nom: "Machines à disques (charges libres)", nomEn: "Plate-loaded machines", type: "machine_disques", groupe: "machine",
    muscles: ["pectoraux", "dorsaux", "quadriceps", "epaules"],
    description: "Machines à leviers chargées avec des disques (type Hammer Strength) : trajectoire guidée, sensation proche des charges libres, souvent convergente.",
    reglages: { securite: "Charger et décharger les deux côtés de façon équilibrée ; butées de sécurité en place." },
    test: (e) => aEq(e, "machine_leviers"),
  },
  /* ------------------------------ Poulies ------------------------------ */
  {
    id: "poulie", nom: "Poulie (haute ou basse)", nomEn: "Cable station", type: "poulie", groupe: "poulie",
    muscles: ["pectoraux", "dorsaux", "epaules", "biceps", "triceps"],
    description: "Câble à hauteur réglable : tension constante sur tout le mouvement, accessoires interchangeables.",
    reglages: { amplitude: "Régler la hauteur de la poulie selon l'exercice (haute, mi-hauteur, basse).",
      mains: "Choisir l'accessoire : corde, barre droite, barre en V, poignée simple.", securite: "Vérifier la goupille de charge et le mousqueton." },
    test: (e, t) => estPoulie(e, t),
  },
  {
    id: "poulie-vis-a-vis", nom: "Poulie vis-à-vis (double poulie)", nomEn: "Cable crossover", type: "poulie", groupe: "poulie",
    muscles: ["pectoraux", "epaules"],
    description: "Deux poulies face à face : écartés croisés, oiseau croisé, face pull.",
    reglages: { amplitude: "Poulies hautes pour le bas des pectoraux, basses pour le haut.", depart: "Un pas en avant, buste légèrement penché, un pied devant." },
    variantes: ["Écarté poulies hautes", "Écarté poulies basses", "Oiseau croisé"],
    test: (e, t) => /\b(vis a vis|crossover|cross over|croise|double poulie|deux poulies|multi poulie)\b/.test(t) && estPoulie(e, t),
  },
  /* ------------------------------ Cardio ------------------------------ */
  {
    id: "tapis-course", nom: "Tapis de course", nomEn: "Treadmill", type: "cardio", groupe: "cardio",
    muscles: ["quadriceps", "mollets", "fessiers"],
    description: "Course ou marche à vitesse et inclinaison réglables.",
    reglages: { depart: "Démarrer à vitesse lente, pieds sur les bords.", securite: "Clip de sécurité attaché aux vêtements." },
    test: (e, t) => aEq(e, "tapis_course") || estCardio(e) && /\b(course|run|running|sprint|marche|walk|walking|tapis|treadmill|jogging|footing)\b/.test(t) && !/sled|traineau|escalier|stair|velo|bike/.test(t),
  },
  {
    id: "velo-elliptique", nom: "Vélo elliptique", nomEn: "Elliptical trainer", type: "cardio", groupe: "cardio",
    muscles: ["quadriceps", "fessiers", "mollets"],
    description: "Mouvement elliptique sans impact, bras et jambes.",
    test: (e, t) => /\b(elliptique|elliptical|cross trainer)\b/.test(t),
  },
  {
    id: "velo-appartement", nom: "Vélo d'appartement", nomEn: "Stationary bike", type: "cardio", groupe: "cardio",
    muscles: ["quadriceps", "mollets"],
    description: "Pédalage sur vélo droit, couché ou à air.",
    reglages: { siege: "Selle à hauteur de hanche : jambe presque tendue en bas du pédalage." },
    test: (e, t) => aEq(e, "velo") || estCardio(e) && /\b(velo|bike|cycling|bicycling)\b/.test(t) && !/elliptique|elliptical|bras|hands|arm/.test(t),
  },
  {
    id: "rameur", nom: "Rameur", nomEn: "Rowing machine", type: "cardio", groupe: "cardio",
    muscles: ["dorsaux", "quadriceps", "fessiers"],
    description: "Tirage complet jambes-dos-bras sur chariot : cardio et endurance musculaire.",
    reglages: { pieds: "Sangle sur le haut du pied.", trajectoire: "Pousser des jambes, puis basculer le buste, puis tirer des bras ; l'inverse au retour." },
    test: (e, t) => aEq(e, "rameur") || estCardio(e) && /\b(rameur|rowing machine|rower|rowing stationary)\b/.test(t),
  },
  {
    id: "stepper", nom: "Stepper / simulateur d'escalier", nomEn: "Stepper / stair climber", type: "cardio", groupe: "cardio",
    muscles: ["quadriceps", "fessiers", "mollets"],
    description: "Montée de marches continue.",
    test: (e, t) => /\b(stepper|step mill|stepmill|stairmaster|stair climber|simulateur d escalier|escaliers?)\b/.test(t) && estCardio(e),
  },
  {
    id: "ergometres", nom: "Ski-erg et ergomètre à bras", nomEn: "SkiErg / arm ergometer", type: "cardio", groupe: "cardio",
    muscles: ["dorsaux", "triceps", "abdominaux"],
    description: "Tirage vertical continu (ski) ou pédalage des bras.",
    test: (e, t) => /\b(ski erg|ski ergometer|ergometre a bras|hands bike|upper body ergometer)\b/.test(t),
  },
  /* ------------------------------ Poids du corps et barres fixes ------------------------------ */
  {
    id: "poids-du-corps", nom: "Poids du corps", nomEn: "Bodyweight", type: "poids_du_corps", groupe: "poids_du_corps",
    muscles: ["pectoraux", "quadriceps", "abdominaux", "dorsaux"],
    description: "Exercices sans charge additionnelle (éventuellement lestés).",
    test: (e) => (e.equipement || []).length > 0 && (e.equipement || []).every((q) => q === "poids_du_corps"),
  },
  {
    id: "sans-materiel", nom: "Sans matériel", nomEn: "No equipment", type: "poids_du_corps", groupe: "poids_du_corps",
    muscles: ["quadriceps", "pectoraux", "abdominaux", "fessiers"],
    description: "Rien à installer : ni barre, ni banc, ni support. Faisable à la maison ou en voyage.",
    test: (e, t) => (e.equipement || []).length > 0 && (e.equipement || []).every((q) => q === "poids_du_corps")
      && !/\b(tractions?|pull ups?|chin ups?|muscle ups?|dips?|bancs?|bench|barres?|bar|paralleles?|anneaux|rings?|box|sangles?|straps?|suspendue?s?|hanging|chaises?|chair|lestee?s?|weighted|marche|step|mur|wall|serviette|towel|table|cage|l sit|toes to bar)\b/.test(t),
  },
  {
    id: "barre-traction", nom: "Barre de traction", nomEn: "Pull-up bar", type: "poids_du_corps", groupe: "poids_du_corps",
    muscles: ["dorsaux", "biceps", "abdominaux"],
    description: "Barre fixe : tractions, suspensions, relevés de jambes suspendu.",
    test: (e, t) => aEq(e, "barre_traction") || /\b(tractions?|pull up|chin up|muscle up|suspendue?|hanging|front lever|back lever|dead hang)\b/.test(t) && !estMachine(e, t) && !estPoulie(e, t) && !/traineau|sled|elastique|band/.test(t),
  },
  {
    id: "barres-paralleles", nom: "Barres parallèles / station de dips", nomEn: "Parallel bars / dip station", type: "poids_du_corps", groupe: "poids_du_corps",
    muscles: ["triceps", "pectoraux", "abdominaux"],
    description: "Deux barres parallèles : dips, relevés de genoux en appui, L-sit.",
    test: (e, t) => /\b(dips?|barres paralleles|parallel bars?|l sit)\b/.test(t) && !aEq(e, ...MACHINE) && !/banc|bench|chaise|chair|sol|floor|scapula/.test(t),
  },
  /* ------------------------------ Accessoires ------------------------------ */
  {
    id: "elastiques", nom: "Élastiques", nomEn: "Resistance bands", type: "accessoire", groupe: "accessoire",
    muscles: ["epaules", "fessiers", "dorsaux"],
    description: "Résistance progressive : échauffement, rééducation, assistance aux tractions, travail à la maison.",
    reglages: { securite: "Vérifier l'absence de fissure ; ancrer solidement, loin du visage." },
    test: (e) => aEq(e, "elastiques"),
  },
  {
    id: "trx", nom: "TRX / sangles de suspension", nomEn: "Suspension trainer", type: "accessoire", groupe: "accessoire",
    muscles: ["dorsaux", "pectoraux", "abdominaux"],
    description: "Sangles suspendues : l'inclinaison du corps règle la difficulté.",
    reglages: { amplitude: "Plus les pieds avancent sous l'ancrage, plus l'exercice est dur." },
    test: (e, t) => aEq(e, "trx") || /\b(trx|sangles|suspended|suspension)\b/.test(t) && !/suspendu|hanging|barre|bar|dead hang/.test(t),
  },
  {
    id: "medecine-ball", nom: "Médecine-ball", nomEn: "Medicine ball", type: "accessoire", groupe: "accessoire",
    muscles: ["abdominaux", "pectoraux", "epaules"],
    description: "Ballon lesté : lancers, rotations, slams.",
    test: (e) => aEq(e, "medecine_ball"),
  },
  {
    id: "swiss-ball", nom: "Swiss ball", nomEn: "Stability ball", type: "accessoire", groupe: "accessoire",
    muscles: ["abdominaux", "lombaires", "fessiers"],
    description: "Gros ballon instable : gainage, crunchs, appui instable pour les développés.",
    test: (e, t) => aEq(e, "swiss_ball") || /\b(swiss ball|stability ball|exercise ball)\b/.test(t),
  },
  {
    id: "pupitre", nom: "Pupitre à biceps", nomEn: "Preacher bench", type: "banc", groupe: "banc",
    muscles: ["biceps", "avant_bras"],
    description: "Pupitre incliné (Larry Scott) : les bras calés, le biceps travaille sans élan.",
    reglages: { siege: "Hauteur réglée pour que les aisselles reposent sur le bord haut du pupitre.", securite: "Ne tends pas les bras à fond en bas : garde une légère flexion du coude." },
    test: (e, t) => /\b(pupitre|larry scott|preacher)\b/.test(t),
  },
  {
    id: "box", nom: "Box de saut", nomEn: "Plyo box", type: "accessoire", groupe: "accessoire",
    muscles: ["quadriceps", "fessiers", "mollets"],
    description: "Caisse stable pour les sauts, les montées et les squats sur box.",
    test: (e, t) => /\b(box|caisse|plyo)\b/.test(t),
  },
  {
    id: "mur", nom: "Mur", nomEn: "Wall", type: "accessoire", groupe: "accessoire",
    muscles: ["epaules", "quadriceps", "mollets"],
    description: "Un mur dégagé : appuis, étirements, chaise et travail de posture.",
    test: (e, t) => /\b(mur|murale?s?|wall)\b/.test(t),
  },
  {
    id: "bosu", nom: "Bosu", nomEn: "Bosu ball", type: "accessoire", groupe: "accessoire",
    muscles: ["abdominaux", "quadriceps"],
    description: "Demi-ballon sur plateau : équilibre et proprioception.",
    test: (e, t) => /\bbosu\b/.test(t),
  },
  {
    id: "rouleau", nom: "Rouleau de massage", nomEn: "Foam roller", type: "accessoire", groupe: "accessoire",
    muscles: ["ischios", "quadriceps", "mollets", "dorsaux"],
    description: "Auto-massage et mobilité.",
    test: (e) => aEq(e, "rouleau"),
  },
  {
    id: "traineau", nom: "Traîneau / prowler", nomEn: "Sled / prowler", type: "accessoire", groupe: "accessoire",
    muscles: ["quadriceps", "fessiers", "mollets"],
    description: "Traîneau à pousser ou à tirer.",
    test: (e, t) => /\b(traineau|prowler|sled (push|drag|row|reverse|overhead))\b/.test(t) || /\bsled\b/.test(t) && !/press|presse|squat|calf|mollets|hack/.test(t),
  },
  {
    id: "roue-abdominale", nom: "Roue abdominale", nomEn: "Ab wheel", type: "accessoire", groupe: "accessoire",
    muscles: ["abdominaux"],
    description: "Roue à poignées : déroulés de gainage intense.",
    test: (e, t) => /\b(roulette abdominale|roue abdominale|ab wheel|rollout|rollerout|wheel roller)\b/.test(t),
  },
  {
    id: "corde", nom: "Cordes (battle rope, grimper, corde à sauter)", nomEn: "Ropes", type: "accessoire", groupe: "accessoire",
    muscles: ["epaules", "dorsaux", "mollets"],
    description: "Cordes ondulatoires, corde lisse à grimper, corde à sauter.",
    test: (e, t) => /\b(battle ropes?|battling ropes?|corde a sauter|grimper a la corde|rope climb|jump rope|rope jumping)\b/.test(t),
  },
  {
    id: "autres-specialises", nom: "Autres équipements spécialisés", nomEn: "Other specialised equipment", type: "accessoire", groupe: "accessoire",
    muscles: ["corps_entier"],
    description: "Box de saut, plots, haies, chaînes, sac de frappe, matériel de strongman (pierre d'Atlas, pneu, keg)…",
    test: (e) => aEq(e, "autre"),
  },
];

/** id → machine */
export const MACHINES_PAR_ID = Object.fromEntries(MACHINES.map((m) => [m.id, m]));

/**
 * Machines et équipements compatibles avec un exercice (calculé).
 * @param {any} e
 * @returns {Machine[]}
 */
export function machinesDe(e) {
  if (!e) return [];
  const t = texteExercice(e);
  return MACHINES.filter((m) => { try { return e.machine === m.id || m.test(e, t); } catch { return false; } });
}

/**
 * Exercices réalisables sur une machine.
 * @param {string} id
 * @param {any[]} catalogue
 */
export function exercicesDeMachine(id, catalogue) {
  const m = MACHINES_PAR_ID[id];
  if (!m) return [];
  return catalogue.filter((e) => { try { return e.machine === id || m.test(e, texteExercice(e)); } catch { return false; } });
}

/** Machines d'un groupe de navigation visuelle. @param {string} groupe */
export function machinesDuGroupe(groupe) {
  return MACHINES.filter((m) => m.groupe === groupe);
}

/** Les machines « vraies » (pas les accessoires ni le poids du corps), pour la fiche réglages. @param {Machine} m */
export function estMachineReglable(m) {
  return Boolean(m && m.reglages && ["machine_guidee", "machine_disques", "poulie", "rack", "banc", "cardio"].includes(m.type));
}
