---
name: visual-audit
description: Run a browser-based visual audit of Coach Perso with Playwright (playwright-core + preinstalled Chromium). Use this after any visual change, or when asked to check responsive, overflow, tap targets, layout, screenshots, or "does it actually look right". Never rely on "the code compiles" — always look at the rendered screens.
---

# Visual Audit

Auditer réellement le rendu, écran par écran, aux largeurs mobiles, avec le Chromium
pré-installé. Ne jamais se contenter de la compilation.

## Prérequis

- Serveur local : `python3 -m http.server 8099` à la racine du projet.
- Chromium : `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (pré-installé).
- Import : `playwright-core` depuis `node_modules`.
- Écrire les scripts dans le scratchpad de session, pas dans le repo.

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

Avant `goto`, injecter un profil réaliste dans `localStorage` (clé `coachperso.ia.v1`)
via `addInitScript`, pour que les écrans aient du contenu (programme, logs, mesures).

## Boucle

1. Lancer le serveur, scanner chaque onglet (via `#tabs button[data-tab=...]` et le menu
   `#plusBtn` → `.plusitem` pour food/anatoly/cat/set).
2. Reporter overflow / erreurs / cibles trop petites, classés.
3. Corriger, re-scanner, re-capturer.
4. Comparer visuellement avant/après avant de considérer terminé.

Les smokes de référence (`smoke-*.mjs`) suivent ce schéma — s'en inspirer.
