---
name: visual-audit
description: Run a browser-based visual audit of Coach Perso with Playwright (playwright-core + preinstalled Chromium). Use this after any visual change, or when asked to check responsive, overflow, tap targets, layout, screenshots, or "does it actually look right". Never rely on "the code compiles" — always look at the rendered screens.
---

# Visual Audit

Auditer réellement le rendu, écran par écran, aux largeurs mobiles, avec le Chromium
pré-installé. Ne jamais se contenter de la compilation.

## Prérequis

- Serveur local : `python3 -m http.server 8099` à la racine du projet. Il meurt
  avec la session : le relancer si `curl localhost:8099` ne répond plus.
- Chromium : **ne PAS fixer d'`executablePath`.** Le numéro de version du dossier
  (`/opt/pw-browsers/chromium-XXXX/…`) change d'une image à l'autre et un chemin
  écrit en dur finit toujours par pointer dans le vide. `chromium.launch({ args:
  ['--no-sandbox'] })` trouve le binaire tout seul. Pour le vérifier :
  `chromium.executablePath()`.
- Import : le projet n'a pas de `node_modules`. Playwright est installé
  globalement et **ne se résout pas** depuis un script placé hors du dépôt. Dans
  le scratchpad, l'importer par chemin absolu, et en CommonJS (ce n'est pas un
  module ES) :
  `import pkg from '/opt/node-tools/node_modules/playwright/index.js'; const { chromium } = pkg;`
- Écrire les scripts dans le scratchpad de session, pas dans le repo.

## Pièges du scan automatique

Deux faux positifs reviennent à chaque audit — les reconnaître évite de
« corriger » du code sain :

- **Débordement** : tout enfant d'une bande défilante (`.rt-rail`,
  `.rt-muscles`, `.musc-row`) dépasse la largeur de l'écran *par construction*.
  La seule mesure qui compte est `document.body.scrollWidth <= innerWidth`.
  Idem pour `.glow`, décorative et dans un conteneur `overflow:hidden`.
- **Cible tactile** : plusieurs boutons sont petits à l'œil mais portent un
  `::after{inset:-N}` qui étend la zone de contact à 44 px (`.cat-fav`,
  `.mbadge`). Mesurer le rectangle de l'élément seul les signale à tort.

## Ce qu'il faut vérifier

**À chaque largeur (320, 360, 375, 390, 412, 430, puis 768, 1024, 1440) :**
- Débordement horizontal : aucun `#view *` avec `getBoundingClientRect().right > clientWidth`.
- Pas de scroll horizontal du body (`document.body.scrollWidth <= innerWidth`).
- Cibles tactiles : aucun bouton/lien/input interactif < 44 px de haut.
- Texte non tronqué, cartes équilibrées, nav non recouverte.

**Erreurs :** capter `pageerror` et `console` (type error) — 0 erreur JS attendue
(ignorer les échecs réseau de médias distants et les 403 du proxy en sandbox).

**Captures :** Accueil, Programme, Séance, Progrès, Nutrition, Profil. En `deviceScaleFactor:2`,
`isMobile:true`. Sauvegarder dans `audit/screenshots-after/` pour comparer à `-before/`.

## État à injecter

Avant `goto`, injecter un état réaliste dans `localStorage` (clé
`coachperso.ia.v1`) via `addInitScript`. Sans cela l'application affiche
l'onboarding et **tous les onglets montrent le même écran**.

Les noms de champs ne sont pas ceux qu'on devine — s'y tromper donne un
programme vide ou des « — » partout, sans la moindre erreur :

| Champ | Valeur attendue | Piège |
|---|---|---|
| `profil` | un objet, jamais `null` | `null` ⇒ onboarding |
| `equipements` | tableau de clés | **pas** `materiel` : `filtrerExercices` lit `equipements`, sinon le pool est vide et le programme sort à 0 exercice |
| `tailleCm`, `poidsKg` | nombres | pas `taille` / `poids` |
| `joursParSemaine` | nombre | pas `frequence` : `genererProgramme` en a besoin |
| `dureeSeanceMin` | nombre | absent ⇒ budget négatif ⇒ séances vides |

Clés de matériel valides : `poids_du_corps halteres barre barre_ez poulie
machine_guidee machine_leviers banc rack barre_traction kettlebell elastiques
rameur`.

Le plus sûr reste de fabriquer l'état avec le moteur lui-même plutôt qu'à la
main — `etatVide()` depuis `src/store/migrate.js`, puis `genererProgramme(profil)`
depuis `src/engine/generator.js`, et sérialiser le tout.

## Boucle

1. Lancer le serveur, scanner chaque onglet (via `#tabs button[data-tab=...]` et le menu
   `#plusBtn` → `.plusitem` pour food/anatoly/cat/set).
2. Reporter overflow / erreurs / cibles trop petites, classés.
3. Corriger, re-scanner, re-capturer.
4. Comparer visuellement avant/après avant de considérer terminé.

Les smokes de référence (`smoke-*.mjs`) suivent ce schéma — s'en inspirer.
