// Consignes d'exécution RÉDIGÉES PAR L'APP pour les fiches qui n'en ont pas.
//
// 648 exercices importés (wger, free-exercise-db) n'ont aucune consigne
// réutilisable dans leur source. Plutôt que de laisser la fiche vide, on
// rédige les étapes d'un mouvement RECONNU à son nom (curl, squat, tirage…),
// à partir de repères techniques généraux — rien n'est copié d'une autre app.
//
// Garde-fous :
// - on ne rédige que si le NOM correspond à un mouvement connu ; sinon la
//   fiche reste vide (mieux vaut « à compléter » qu'une consigne fausse) ;
// - la fiche est marquée `consignesAuto`: elle reste « À vérifier », jamais
//   « Validée », et l'interface le dit ;
// - une fiche qui a déjà des consignes n'est jamais touchée.
// Demandé par Mehdi le 10 nov. 2026.

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** « avec … » selon le matériel principal, ou chaîne vide (poids du corps). */
const AVEC = {
  barre: " avec la barre", barre_ez: " avec la barre EZ", halteres: " avec les haltères", kettlebell: " avec le kettlebell",
  poulie: " à la poulie", machine_guidee: " sur la machine", machine: " sur la machine", smith: " à la barre guidée",
  elastiques: " avec l'élastique", trx: " aux sangles", swiss_ball: " sur le ballon",
};
const avec = (e) => { for (const q of e.equipement || []) if (AVEC[q]) return AVEC[q]; return ""; };

/**
 * Mouvements reconnus, du plus précis au plus général : le premier qui
 * correspond l'emporte (« leg curl » avant « curl », « pushdown » avant
 * « pulldown », « développé militaire » avant « développé »).
 * @type {{ id: string, re: RegExp, sauf?: RegExp, etapes: string[] }[]}
 */
export const ARCHETYPES = [
  { id: "etirement", re: /etirement|stretch/, sauf: /iron cross|dynamique|balancier|rotation/, etapes: [
    "Installe-toi dans la position de départ et avance doucement jusqu'à sentir une tension légère dans le muscle visé.",
    "Tiens la position 20 à 30 secondes en respirant lentement, sans à-coups ni rebond.",
    "Relâche progressivement, puis change de côté si l'étirement se fait un côté à la fois.",
    "Reste toujours en dessous du seuil de douleur : la tension doit rester supportable." ] },
  { id: "gainage", re: /planche|gainage|plank/, sauf: /dynamique|groiner|saute|jack|pompe|pied a cote|lever|alterne|rampe|marche|developpe|board|bird dog|touche/, etapes: [
    "Place-toi en appui{avec}, le corps aligné de la tête au bassin.",
    "Serre les abdominaux et les fessiers pour empêcher le bas du dos de se creuser.",
    "Tiens la position en respirant normalement, le regard vers le sol.",
    "Arrête la série dès que le bassin s'affaisse ou que les épaules remontent vers les oreilles." ] },
  { id: "poignet", re: /poignet|wrist/, sauf: /side|rotation/, etapes: [
    "Pose les avant-bras sur un appui (banc ou cuisses){avec}, les mains dépassant dans le vide.",
    "Sans décoller les avant-bras, fais bouger uniquement le poignet sur toute son amplitude.",
    "Marque un temps d'arrêt en fin de mouvement.",
    "Reviens lentement à la position de départ, sans laisser la charge retomber." ] },
  { id: "leg_curl", re: /leg curl|curl (des )?ischio|flexion (des )?jambes|ischio.*(machine|assis|allonge|debout)/, sauf: /swiss|ballon|nordique|nordic|sliding|glisse|elastique|partenaire/, etapes: [
    "Règle l'appui juste au-dessus des talons et cale bien les cuisses et les hanches.",
    "Plie les genoux pour ramener les talons vers les fessiers, sans décoller les hanches.",
    "Marque une courte pause en fin de flexion.",
    "Reviens lentement jusqu'à jambes presque tendues, sans laisser la charge retomber." ] },
  { id: "leg_extension", re: /leg extension|extension (des )?(jambes|quadriceps|genoux)/, etapes: [
    "Assieds-toi le dos calé, l'appui posé sur le bas des tibias, les genoux alignés avec l'axe de la machine.",
    "Tends les genoux jusqu'à avoir les jambes presque droites.",
    "Marque une courte pause en haut, cuisses contractées.",
    "Redescends lentement, sans laisser la charge retomber." ] },
  { id: "triceps", re: /triceps|pushdown|barre au front|skull|kickback|extension (nuque|verticale|au-dessus|a la corde)/, sauf: /dips|developpe|pompe|fessier|jambe|hanche|halo|traineau/, etapes: [
    "Mets-toi en position{avec}, les coudes fixes et proches du corps ou de la tête selon la variante.",
    "Tends les bras en ne bougeant que les avant-bras : les coudes ne s'écartent pas.",
    "Contracte les triceps une seconde quand les bras sont tendus.",
    "Reviens lentement à la position de départ en gardant les coudes immobiles." ] },
  { id: "curl", re: /\bcurls?\b|flexion (des )?(bras|coudes|biceps)/, sauf: /leg|ischio|jambe|nordique|nordic|developpe|squat|fente|poignet|triche|cheat|trifecta/, etapes: [
    "Mets-toi en position{avec}, les bras tendus et les coudes près du buste.",
    "Plie les coudes pour monter la charge, sans balancer le buste ni avancer les coudes.",
    "Contracte les biceps une seconde en haut du mouvement.",
    "Redescends lentement jusqu'à avoir les bras presque tendus." ] },
  { id: "elevation_laterale", re: /elevations? laterales?|lateral raise/, sauf: /allonge|couche/, etapes: [
    "Tiens-toi droit{avec}, les bras le long du corps et les coudes légèrement fléchis.",
    "Monte les bras sur les côtés jusqu'à la hauteur des épaules, sans élan.",
    "Garde les épaules basses : elles ne remontent pas vers les oreilles.",
    "Redescends lentement, sans laisser tomber les bras." ] },
  { id: "elevation_frontale", re: /elevations? frontales?|front raise/, sauf: /au-dessus/, etapes: [
    "Tiens-toi droit{avec}, les bras devant les cuisses et les coudes légèrement fléchis.",
    "Monte les bras devant toi jusqu'à la hauteur des épaules, sans te pencher en arrière.",
    "Marque un court temps d'arrêt en haut.",
    "Redescends lentement à la position de départ." ] },
  { id: "oiseau", re: /oiseau|reverse fly|butterfly inverse|ecartes? inverses?|rear delt|deltoide posterieur/, sauf: /traineau/, etapes: [
    "Penche le buste vers l'avant, dos plat, ou appuie la poitrine sur le support{avec}.",
    "Écarte les bras vers l'arrière, coudes légèrement fléchis, en resserrant les omoplates.",
    "Marque un temps d'arrêt quand les bras sont à la hauteur des épaules.",
    "Reviens lentement, sans arrondir le dos." ] },
  { id: "ecarte", re: /ecartes?|pec deck|butterfly|\bfly\b|crossover|vis-a-vis/, sauf: /squat|jambe|l-sit|pompe|planche|souleve|traction|tirage|fente|saut|pull-apart|jump|stride/, etapes: [
    "Installe-toi{avec}, les bras ouverts et les coudes légèrement fléchis.",
    "Rapproche les mains devant la poitrine en décrivant un arc de cercle, sans plier davantage les coudes.",
    "Contracte les pectoraux une seconde quand les mains se rejoignent.",
    "Reviens lentement, sans dépasser un étirement confortable des épaules." ] },
  { id: "developpe_epaules", re: /developpe (militaire|epaules?|arnold|nuque|vertical|debout)|overhead press|shoulder press|presse (a |aux )?epaules/, sauf: /pousse\b|push press|jete|bradford|traineau/, etapes: [
    "Place la charge à la hauteur des épaules{avec}, abdominaux serrés et pieds bien ancrés.",
    "Pousse à la verticale jusqu'à avoir les bras presque tendus.",
    "Garde le bas du dos neutre : pas de cambrure pour finir la répétition.",
    "Redescends lentement jusqu'à la hauteur des épaules." ] },
  { id: "developpe", re: /developpe (couche|incline|decline|plat|pectoraux|au sol|allonge)|chest press|bench press/, sauf: /curl|squat|fente|traineau|planches|board|epaule|debout/, etapes: [
    "Installe-toi{avec}, omoplates resserrées, pieds à plat et fessiers en appui.",
    "Descends la charge vers la poitrine, les coudes à environ 45° du buste.",
    "Pousse jusqu'à avoir les bras tendus, sans décoller les épaules de l'appui.",
    "Garde le contrôle à la descente : pas de rebond sur la poitrine." ] },
  { id: "pompes", re: /pompes?\b|push.?ups?/, sauf: /hindou|pike|plio|claqu|saute|archer|une main|handstand|poirier|planche/, etapes: [
    "Place les mains un peu plus larges que les épaules, le corps aligné de la tête aux talons.",
    "Descends la poitrine près du sol, les coudes à environ 45° du buste.",
    "Pousse dans le sol pour remonter, sans creuser le bas du dos.",
    "Garde les abdominaux et les fessiers serrés pendant toute la série." ] },
  { id: "dips", re: /\bdips?\b/, sauf: /jerk|squat/, etapes: [
    "Prends appui bras tendus, épaules basses et buste légèrement penché.",
    "Descends en pliant les coudes jusqu'à ce que les bras soient à peu près parallèles au sol.",
    "Pousse pour remonter bras tendus, sans hausser les épaules.",
    "Ne descends pas plus bas que ce que tes épaules acceptent sans gêne." ] },
  { id: "tractions", re: /tractions?|pull.?ups?|chin.?ups?/, sauf: /retraction|traineau|crunch|rowing|barre de traction|harnais/, etapes: [
    "Suspends-toi bras tendus, épaules engagées vers le bas.",
    "Tire les coudes vers les hanches pour amener la poitrine vers la barre.",
    "Monte jusqu'à passer le menton au-dessus de la barre, sans donner d'élan avec les jambes.",
    "Redescends lentement jusqu'à avoir les bras tendus." ] },
  { id: "tirage_menton", re: /tirage (au )?menton|rowing (au )?menton|upright row/, etapes: [
    "Tiens-toi droit{avec}, les mains devant les cuisses.",
    "Monte les coudes sur les côtés en gardant la charge près du corps, jusqu'au bas de la poitrine.",
    "Les coudes restent plus hauts que les poignets, sans dépasser la hauteur des épaules.",
    "Redescends lentement à la position de départ." ] },
  { id: "face_pull", re: /face pull|tirage (au )?visage/, etapes: [
    "Règle la poulie à la hauteur du visage et saisis la corde, bras tendus.",
    "Tire la corde vers le visage en écartant les mains, coudes hauts.",
    "Resserre les omoplates une seconde en fin de mouvement.",
    "Reviens lentement bras tendus, sans te laisser emporter vers l'avant." ] },
  { id: "tirage_vertical", re: /tirage (vertical|poitrine|nuque|haut)|pulldown|lat machine/, etapes: [
    "Installe-toi{avec}, les cuisses calées, les bras tendus vers le haut.",
    "Tire en amenant les coudes vers le bas et l'arrière, jusqu'au haut de la poitrine.",
    "Garde le buste presque droit : pas de grand balancement vers l'arrière.",
    "Remonte lentement jusqu'à avoir les bras tendus." ] },
  { id: "shrug", re: /shrugs?|haussements?/, sauf: /epaule\b|arrache/, etapes: [
    "Tiens-toi droit{avec}, les bras tendus le long du corps.",
    "Monte les épaules vers les oreilles, à la verticale, sans plier les coudes.",
    "Marque une seconde d'arrêt en haut.",
    "Redescends lentement, sans faire rouler les épaules." ] },
  { id: "pull_over", re: /pull.?over/, etapes: [
    "Installe-toi{avec}, les bras tendus au-dessus de la poitrine, coudes légèrement fléchis.",
    "Descends la charge derrière la tête en gardant le même angle aux coudes.",
    "Arrête-toi à un étirement confortable, côtes basses et bas du dos neutre.",
    "Ramène la charge au-dessus de la poitrine en contrôlant le mouvement." ] },
  { id: "rowing", re: /rowing|tirage|\brows?\b/, sauf: /epaule$|arrache|traineau|bras tendus|menton|visage|explosif|high pull|traction|renegade|vers le cou/, etapes: [
    "Mets-toi en position{avec}, le dos plat et la poitrine ouverte.",
    "Tire la charge vers le buste en amenant les coudes vers l'arrière.",
    "Resserre les omoplates une seconde en fin de tirage, sans hausser les épaules.",
    "Reviens lentement bras tendus, sans arrondir le dos." ] },
  { id: "mollets", re: /mollets?|calf/, sauf: /squat thrust/, etapes: [
    "Place l'avant des pieds sur l'appui{avec}, les talons dans le vide.",
    "Monte sur la pointe des pieds le plus haut possible.",
    "Marque une seconde d'arrêt en haut.",
    "Redescends lentement jusqu'à sentir l'étirement du mollet, sans rebond." ] },
  { id: "fente", re: /fentes?|lunges?|split squat|bulgare/, sauf: /turkish|get-up|saute|jump|echauffement|sprint/, etapes: [
    "Tiens-toi droit{avec}, puis fais un grand pas (ou place un pied en arrière selon la variante).",
    "Descends en pliant les deux genoux, le buste droit, le genou avant au-dessus du pied.",
    "Pousse dans le talon du pied avant pour remonter.",
    "Fais toutes les répétitions d'un côté, ou alterne, en gardant l'équilibre." ] },
  { id: "squat", re: /squats?/, sauf: /pistol|crevette|shrimp|unijambiste|une jambe|sissy|saute|jump|thrust|bulgare|fente|developpe|curl|unilateral|dragon|jefferson|plate movers|sit squats|mollets/, etapes: [
    "Place les pieds à la largeur des épaules{avec}, pointes légèrement ouvertes, abdominaux serrés.",
    "Descends en pliant hanches et genoux, les genoux dans l'axe des pieds et le dos neutre.",
    "Va aussi bas que tu peux en gardant les talons au sol et le dos droit.",
    "Remonte en poussant dans tout le pied, sans laisser les genoux rentrer." ] },
  { id: "charniere", re: /souleve de terre|deadlift|good morning/, sauf: /arrache|epaule\b|car deadlift|rickshaw|assis|vitesse/, etapes: [
    "Place les pieds à la largeur des hanches{avec}, la charge près du corps, le dos plat et gainé.",
    "Recule les hanches en gardant la colonne neutre ; les genoux fléchissent légèrement.",
    "Remonte en poussant les hanches vers l'avant et en serrant les fessiers.",
    "Arrête la série dès que le dos s'arrondit." ] },
  { id: "hip_thrust", re: /hip thrust|pont (fessier|de hanche)|glute bridge|releve de bassin/, etapes: [
    "Installe-toi{avec}, le haut du dos en appui ou allongé, les pieds à plat et les genoux fléchis.",
    "Pousse dans les talons pour monter le bassin jusqu'à aligner épaules, hanches et genoux.",
    "Serre les fessiers une seconde en haut, sans cambrer le bas du dos.",
    "Redescends lentement, sans poser complètement le bassin entre deux répétitions." ] },
  { id: "presse", re: /presse (a cuisses|a jambes|inclinee|horizontale)|leg press/, etapes: [
    "Installe-toi le dos et le bassin bien calés, les pieds à plat sur le plateau à la largeur des épaules.",
    "Déverrouille la charge puis descends en pliant les genoux, sans décoller le bassin du siège.",
    "Pousse dans tout le pied jusqu'à avoir les jambes presque tendues, sans verrouiller les genoux.",
    "Remets les sécurités avant de sortir de la machine." ] },
  { id: "adduction_abduction", re: /adduction|abduction|adducteurs?|abducteurs?/, etapes: [
    "Installe-toi{avec}, le dos calé ou le corps bien stable.",
    "Écarte ou rapproche la jambe selon le mouvement, sans donner d'élan avec le buste.",
    "Marque un court temps d'arrêt en fin de mouvement.",
    "Reviens lentement, en freinant la charge." ] },
  { id: "releve_jambes", re: /releves? (de |des )?(jambes|genoux)|leg raises?|knee raises?/, sauf: /arriere|lateral|montee|step/, etapes: [
    "Suspends-toi ou allonge-toi, le bas du dos stable et les abdominaux serrés.",
    "Monte les jambes (ou les genoux) en enroulant légèrement le bassin, sans élan.",
    "Marque un court temps d'arrêt en haut.",
    "Redescends lentement, sans creuser le bas du dos." ] },
  { id: "crunch", re: /crunchs?|sit.?ups?|releves? de buste|enroulement/, sauf: /velo|bicycle|traction|inverse|rotations/, etapes: [
    "Allonge-toi ou installe-toi{avec}, le bas du dos en appui et le menton décollé de la poitrine.",
    "Enroule le buste en rapprochant les côtes du bassin, en expirant.",
    "Contracte les abdominaux une seconde en haut, sans tirer sur la nuque.",
    "Redescends lentement, sans relâcher complètement entre deux répétitions." ] },
  { id: "rotation", re: /russian twist|rotations? (du |de )?(buste|tronc)|bucheron|wood ?chop/, etapes: [
    "Mets-toi en position{avec}, abdominaux serrés et dos droit.",
    "Tourne le buste d'un côté en gardant le bassin stable ; le mouvement vient de la taille.",
    "Reviens au centre en contrôlant, puis tourne de l'autre côté.",
    "Garde un rythme régulier, sans élan." ] },
];

/**
 * Mouvement reconnu pour cet exercice, d'après son nom français et anglais.
 * @param {any} e
 * @returns {typeof ARCHETYPES[number] | null}
 */
export function archetypeDe(e) {
  const t = norm(`${e.nom || ""} ${e.nomEn || ""} ${(e.nomsAlternatifs || []).join(" ")}`);
  // Auto-massage et rouleau : ni étirement ni exercice, aucune consigne type.
  if (/massage|rouleau|foam roll/.test(t)) return null;
  for (const a of ARCHETYPES) if (a.re.test(t) && !(a.sauf && a.sauf.test(t))) return a;
  return null;
}

/** La fiche a-t-elle déjà de vraies consignes ? */
const aDesConsignes = (e) => (e.instructions || []).filter((x) => String(x).trim()).length >= 2;

/**
 * Rédige les consignes d'une fiche qui n'en a pas, si son mouvement est
 * reconnu. Ne modifie jamais une fiche qui en a déjà. Marque `consignesAuto`.
 * @param {any} e
 * @returns {any} la même fiche (modifiée en place)
 */
export function completerConsignes(e) {
  if (!e || aDesConsignes(e)) return e;
  const a = archetypeDe(e);
  if (!a) return e;
  const av = avec(e);
  e.instructions = a.etapes.map((s) => s.replace("{avec}", av));
  e.consignesAuto = true;
  return e;
}
