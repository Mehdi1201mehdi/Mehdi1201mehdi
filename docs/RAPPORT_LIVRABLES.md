# Rapport de livraison — Coach Perso « fitai-premium » (nov. 2026)

Branche `fitai-premium` uniquement. `main` et le site GitHub Pages n'ont pas
été modifiés. Rien n'est affirmé ici qui n'ait été exécuté ou observé.

## 1. Craft Anything — installation et connexion

- **Environnement de travail (Linux)** : installé depuis les sources
  officielles (`craft-anything-cli 0.4.0`), `doctor` → *healthy*, enregistré
  dans Claude Code (`claude mcp list` → *Connected*). Détail : `CRAFT_ANYTHING.md`.
- **PC Windows de Mehdi** : **non installé**. Le contrôle du PC n'autorisait que
  des clics dans les terminaux et la lecture seule de Chrome (pas de saisie),
  et l'extension Claude in Chrome n'était pas connectée. Procédure à faire soi-même :
  installeur MSI de la page *Releases*, puis `craft-anything-cli doctor` et
  `craft-anything-cli setup` (attention : la v0.3.0 a un plantage au démarrage
  sous Windows, signalé dans la feuille de route du projet).

## 2. Outils utilisés

Craft Anything (`core_target_triage`, `android_package_show`,
`android_classes_find`, `android_class_show`, `android_method_show`, `report`),
JADX, Node 22 (`node --test`), TypeScript (`tsc --noEmit`, contrôle JSDoc),
Playwright + Chrome (captures 320 → 412 px), Capacitor 8, GitHub Actions
(compilation de l'APK), androguard (vérification du manifeste de l'APK
produit), gitleaks (secrets).

## 3. Analyse de FitAI 2.0.6

`ANALYSE_FITAI_APK_2.0.6.md` : analyse **statique** du XAPK (manifeste,
18 entités de base de données, formule Epley confirmée dans le bytecode,
permissions Santé Connect). Aucun écran FitAI n'a été vu (pas d'appareil
Android ici), aucun code, contenu, vidéo ou ressource FitAI n'a été copié,
aucune protection n'a été contournée (l'app est enveloppée par PairIP).

## 4. Matrice de comparaison

`MATRICE_FITAI_COACH_PERSO.md`, avec le statut **avant** et **après** pour
chaque fonction. Passées à COMPLET : indicateurs distance / vitesse / durée,
isométrique, records par type, tonnage / volume / intensité, RPE, calories
MET, 16 mensurations, comparaison de dates, cm/in, notes, AMRAP / EMOM,
remplacement pondéré, variantes, délai de récupération, seuils, coach
(modification validée, stagnations), dictionnaire, formules documentées.

## 5. Fonctions développées (sur cette branche)

| Domaine | Ce qui marche |
|---|---|
| Séance | saisie selon ce que mesure l'exercice (charge × reps, km + min, durée de maintien, lest) ; séries AMRAP et échauffement ; note par exercice rappelée la fois suivante ; note de séance ; minuteur EMOM / Tabata |
| Records | charge, 1RM (1–12 reps), reps, volume, distance, vitesse, durée — jamais mélangés |
| Statistiques | tonnage / volume / intensité (% 1RM), semaine / mois, comparaison au même stade, métriques adaptées à chaque exercice |
| Calories | MET du Compendium 2024 par type et vitesse, série par série, détail affiché |
| Mensurations | 16 mesures, kg/lb et cm/in, comparaison de deux dates, asymétries, CSV |
| Récupération | « prêt dans … h » par muscle, seuil 60 / 75 / 90 % |
| Remplacement | score pondéré sur tout le catalogue, prudence si limitation, variantes plus facile / plus difficile / uni- ou bilatérale |
| Coach IA (facultatif) | contexte enrichi (stagnations, effort, cardio, mesures) ; modification d'une routine proposée en nouvelle version, différences affichées, ajout seulement après validation |
| Dictionnaire | 164 termes, 11 catégories dont biomécanique et cardio |
| Santé Connect (APK) | lecture seule de 6 types, import d'une mesure seulement sur geste explicite |

## 6. Nombre réel d'exercices

**1 126 exercices distincts** affichés : 93 rédigés pour l'app, 240 wger,
793 free-exercise-db. 52 doublons masqués (toujours résolus pour l'historique).
Aucun nom affiché deux fois, même à un article près (test). 1 066 noms
français, 60 noms anglais conservés (termes trop spécialisés pour être
traduits sans risque). Pas 3 000 : ce serait gonfler le compteur avec des
doublons ou des fiches de provenance douteuse.

## 7. Sources et licences

`ASSET_SOURCES.md` : wger (CC-BY-SA 4.0, attribution sur chaque fiche),
free-exercise-db (Unlicense ; **métadonnées seules**, ni textes ni images dont
l'origine amont n'est pas documentée), MET : 2024 Adult Compendium of Physical
Activities (codes cités), plugin Santé Connect `@capgo/capacitor-health`
(MPL-2.0, utilisé sans modification).

## 8. Formules

`FORMULES.md` : 1RM (Epley plafonné à 12 reps + 6 autres au calculateur),
tonnage / volume / intensité, RPE ↔ RIR, stagnation, vitesse / allure /
puissance rameur, calories MET, délai de récupération, mensurations, unités.

## 9. Résultats des tests

- `node --test tests/*.test.js` : **663 / 663** réussis (dont force, records,
  mesures cardio et isométrique, supersets, sauvegarde / restauration,
  simulation de programme sur 30 jours, Santé Connect).
- `tsc --noEmit` (typage JSDoc) : **0 erreur**.
- Smokes Playwright (320, 360, 412 px, aucun débordement, aucune erreur
  console) : séance rameur + gainage reprise, fin de séance, statistiques,
  mensurations, récupération, variantes, coach, Santé Connect (web et
  maquette du plugin), catalogue.
- **Non testés en navigateur** : un programme complet de bout en bout et la
  restauration d'une sauvegarde par l'interface (couverts par les tests
  unitaires seulement).

## 10. Captures

Planche `planche-livrables.png` envoyée avec ce rapport (10 écrans).

## 11. Compilation Android

GitHub Actions, build **8** (commit `e760586`) : réussi. `minSdk 26`,
`targetSdk 36`. Vérifié dans l'APK produit : seules les 6 permissions
`READ_*` de santé sont présentes (une fuite `READ/WRITE_VO2_MAX` du plugin a
été trouvée sur le build 7 puis corrigée) ; la CI échoue désormais si une
autre permission de santé apparaît.

## 12. APK

https://github.com/Mehdi1201mehdi/Mehdi1201mehdi/releases/download/apk-test-fitai-premium/coach-perso-debug.apk
(empreinte SHA-256 dans `SHA256SUMS.txt` de la même pré-version). APK de
**test** signé avec une clé stable : il s'installe par-dessus le précédent
sans perdre les données.

## 13. Reste à faire

- **Tester l'APK sur le téléphone**, Santé Connect compris (seulement testé
  sur une maquette du plugin).
- Écrire une séance dans Santé Connect : impossible avec ce plugin.
- Filtre « à domicile », latéralité détaillée, provenance des coefficients
  musculaires affichée, MET par exercice, organisation du programme par jours
  avec repos explicites, nombre de pas.
- 60 noms d'exercices encore en anglais ; médias pour les fiches importées.
- Installation de Craft Anything sur le PC Windows (à faire par Mehdi).
- Publication sur `main` / le site : **seulement avec ton accord**.
