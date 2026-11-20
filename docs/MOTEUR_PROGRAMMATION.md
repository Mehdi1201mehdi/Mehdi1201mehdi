# Moteur de programmation — conformité au cahier des charges (20 nov. 2026)

Cahier des charges : « Rôle : expert en musculation, coach sportif et préparateur
physique » (10 sections). Ce document dit, section par section, ce que fait l'app,
où c'est codé, et ce qui reste limité. Tout est déterministe, hors ligne et testé ;
aucune modification de programme sans validation de l'utilisateur.

## 1. Profil
Âge, sexe (facultatif), taille, poids, niveau (4 niveaux), objectif, jours, durée,
lieu et matériel, muscles prioritaires, limitations, exercices aimés / refusés,
récupération, sommeil, stress — `src/models.js`, questionnaire dans `app.js`.
Objectif **« Développement harmonieux »** ajouté (8 → 9 objectifs).

## 2. Création du programme — `src/engine/generator.js`
- Organisations : corps entier, **half body (chaîne antérieure / postérieure, ajouté)**,
  haut / bas, poussée / tirage / jambes, par groupe musculaire.
- Choix automatique selon les jours, **le niveau et l'objectif** (avant : les jours seuls).
  Ex. 5 séances débutant ou force → haut / bas ; 4 séances grand débutant → corps entier.
- Séries, plage de répétitions, repos, réserve (RIR), ordre (principal → isolation → gainage).
- **Plages corrigées** : l'objectif force produisait des plages inversées (8-6) ou figées (6-6),
  l'échauffement d'endurance 25-28 répétitions. Nouvelle règle `plageReps` + approche 8-10.
- **Volume hebdomadaire et fréquence par muscle** (`src/engine/volume.js`) calculés,
  affichés (Entraînement → « Volume par muscle ») et comparés aux repères du niveau.
  Séries ajoutées aux muscles prioritaires (et à tous pour l'objectif harmonieux)
  dans la limite de la durée de séance.

## 3. Bibliothèque
1 957 exercices, classés par muscle, matériel, difficulté, technique, erreurs,
sécurité, variantes. **Ajout sur chaque fiche : « Pour toi »** (séries, répétitions,
repos, réserve — ceux du programme ou de l'objectif), la variante plus facile et,
si le matériel manque, l'alternative réalisable.

## 4. Progression automatique — `src/engine/progression.js`
- Double progression, **objectif série par série** : 3 × 10 à 50 kg avec 2 en réserve
  → l'app propose 11 · 11 · 11 à 50 kg (pas de +1 sur une série faite à l'échec).
- En séance, les cases charge / répétitions proposent cet objectif (la séance précédente
  reste en colonne « Préc. »). « Reprendre » et la validation sans saisie l'utilisent aussi.
- RPE accepté (RIR = 10 − RPE).
- **Hausse plafonnée à 10 %** : sur une charge légère, la plage s'allonge de 2 répétitions
  avant d'ajouter du poids.
- **Technique dégradée** (menu ⋯ de l'exercice) : aucune hausse la fois suivante.
- **Stagnation** : 3 séances sans progrès de la meilleure performance → diagnostic dans
  l'ordre intensité, volume, récupération, technique, puis conseil.
- Douleur : progression suspendue ; réduction de 10 % après deux séances ratées.

## 5. Cycles de 4 à 12 semaines — `src/engine/cycle.js`
- Phases : adaptation → progression → intensification → récupération (deload).
  Durée conseillée 8 / 6 / 5 semaines (débutant / intermédiaire / avancé), réglable 4-12 ;
  deload intermédiaire à partir de 8 semaines (hors débutant).
- La phase s'applique quand on lance une séance du programme (réserve visée ; semaine
  de récupération : une série de moins, charges −10 %).
- **Deload avancé** proposé (jamais imposé) quand plusieurs signaux réels se cumulent :
  semaines d'affilée sans semaine allégée, séries à l'échec, baisse de performance,
  douleurs, ressenti « très fatigué ».
- **Fin de cycle** : bilan (assiduité, progression par exercice, stagnations, volume réalisé),
  décisions motivées, et programme suivant généré (exercices sans progrès remplacés par
  une variante, volume ajusté). Appliqué seulement après confirmation ; l'ancien programme
  est archivé dans « Mes routines », le profil n'est pas modifié.

## 6. Suivi
Poids, charges, séances, volume hebdomadaire, volume par muscle, records, régularité,
mensurations, photos facultatives — onglet Progrès (existant). Bilans de cycle conservés
(`bilansCycles`, inclus dans la sauvegarde).

**Journal des séances** (`src/engine/journal.js`, Progrès → « Historique des séances »),
idées reprises du travail de Bachelor « Sports Training » (V. Jalley, HEG Genève, 2017) :
toutes les séances par mois ; détail d'une séance ; **correction** (date, durée, nom,
ressenti, exercices, séries) ; **suppression** avec confirmation explicite ; **ajout d'une
séance faite sans l'app**, éventuellement à partir d'une séance du programme ;
**ressenti gardé séance par séance**. Records, statistiques, cycles et rotation se
recalculent à partir de l'historique corrigé.

## 7. Adaptation — `src/engine/adaptation.js`
- **Séance manquée** : la rotation reprend là où on s'est arrêté (avant : le jour de la
  semaine décidait et la séance manquée était sautée). Jamais deux séances le même jour.
- **Manque de temps** : version 20 / 30 / 45 min qui garde les mouvements principaux et
  les muscles prioritaires.
- **Fatigue** : version allégée (−1 série, −10 %, plus de réserve).
- **Douleur** : l'app fait d'abord distinguer douleur et fatigue musculaire, puis propose
  remplacer / arrêter l'exercice / continuer plus léger ; la douleur reste enregistrée.

## 8. Coach — `src/engine/assistant.js` + `app.js`
Les 7 questions du cahier des charges reçoivent une réponse calculée sur les données :
pourquoi cet exercice, pourquoi autant de séries, pourquoi augmenter la charge, pourquoi je
stagne, quel muscle travailler davantage, comment améliorer ma technique, augmenter ou
diminuer le volume.

## Limites (dites franchement)
- Les programmes déjà générés gardent leurs anciennes plages ; « Créer » les régénère.
- Les repères de volume sont des repères de départ issus de la littérature, pas une
  vérité individuelle ; ils sont réévalués par le bilan de cycle.
- Le muscle « fessiers » est souvent compté au-dessus du repère : beaucoup de mouvements
  de jambes le listent en muscle principal.
- Aucune charge de départ n'est inventée : première séance = test prudent (3-4 répétitions
  en réserve), comme le permet le cahier des charges (« estimées ou testées prudemment »).
- L'app ne garantit aucun résultat physique et ne pose aucun diagnostic médical.
